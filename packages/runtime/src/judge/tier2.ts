// Judge tier 2: a scoped AI review of a change.
//
// Exactly three kinds of finding may block — a defect, a contract breach
// (AGENTS.md / CONSTRAINTS.md), or an unmet acceptance criterion. Anything
// else is a suggestion: collected, never a reason to request changes. Every
// blocking finding is re-checked in a fresh context for a concrete
// reproduction; without one it's downgraded to a suggestion.
//
// The model sees only what this module packs into the prompt: the diff (minus
// sensitive paths and anything secret-shaped), the contract files from the
// base commit, the files changed docs cite, and the task's proof when the
// judge beat passes it. The CLI transport runs locked down (no tools, empty
// cwd).
import { createHash } from "node:crypto";

import {
  type AiClient,
  appendUsage,
  type Effort,
  estimateCost,
} from "@arynbht/rivetari-engine";
import { z } from "zod";

import type { Card } from "../task/card.js";
import type { Tier1Checks } from "./tier1-criteria.js";
import { packChange } from "./tier2-pack.js";
import {
  applyBeforeCheck,
  applyTier1,
  extractJson,
  GATE,
  gatePrompt,
  needsBeforeCheck,
  RUBRIC,
  reviewPrompt,
} from "./tier2-prompt.js";

export {
  CITED_FILE_CAP,
  CITED_TOTAL_CAP,
  citedFiles,
  generatedPaths,
  isGeneratedPath,
  newSideLines,
  packChange,
  TEST_FILE_CAP,
  TEST_TOTAL_CAP,
  trimTestDiff,
} from "./tier2-pack.js";
export {
  applyBeforeCheck,
  extractJson,
  GATE_DIFF_CAP,
  needsBeforeCheck,
} from "./tier2-prompt.js";
export { REVIEW_MARKER, renderReview } from "./tier2-render.js";
export type { ReviewMarks } from "./tier2-render.js";

// The shapes of a proof screenshot and of a person's stop-and-ask answer, as
// the task runtime (not part of this repo) defined them in proof/shoot.ts and
// task/tasks.ts. Review only passes them through when a caller supplies them.
export interface Shot {
  page: string;
  breakpoint: string;
  /** Absolute path of the PNG. */
  file: string;
  /** The page's HTTP status (0 when there was no response). */
  status: number;
  /** What was measured on the page, so a text-only reviewer can judge the shot. */
  layout?: Layout | undefined;
  /** The viewport's width in CSS pixels. */
  width?: number | undefined;
  /** The PNG's size: a loading skeleton is a fraction of the real page's. */
  bytes?: number | undefined;
  /** Whether the page really rendered before the shot. */
  ready?: boolean | undefined;
  /** Why it didn't, when it didn't: the shot is of whatever showed at the timeout. */
  notReady?: string | undefined;
}

export interface Layout {
  /** The viewport's width and the page's scroll width, in CSS pixels. */
  viewport: number;
  scrollWidth: number;
  /** Up to five visible elements that reach past the viewport's edge. */
  overflowing: string[];
  /** The start of the page's visible text. */
  text?: string | undefined;
}

export interface AllowedDecision {
  asked: string;
  by: string;
  at: string;
  note: string;
  flagged?: boolean | undefined;
}

export const BLOCKING_KINDS = ["defect", "contract", "acceptance"] as const;
export const FINDING_KINDS = [...BLOCKING_KINDS, "suggestion"] as const;
export type FindingKind = (typeof FINDING_KINDS)[number];

/** Default judge model, deliberately not the drafting default (independence). */
export const JUDGE_DEFAULT_MODEL = "claude-opus-5-5";
/** Max blocking findings sent to the false-positive gate. */
const MAX_FP_CHECKS = 8;

/** Optional text the model may send as null or leave out: both mean none. */
const optionalText = () =>
  z
    .string()
    .nullish()
    .transform((v) => v ?? "");

const FindingSchema = z.object({
  kind: z.enum(FINDING_KINDS).catch("suggestion"),
  file: optionalText(),
  // A bad line or a missing title shouldn't throw away the whole review.
  line: z.number().int().nonnegative().nullable().default(null).catch(null),
  acceptance_id: z.string().nullable().optional(),
  title: z.string().min(1).catch("(untitled)"),
  detail: optionalText(),
  repro: optionalText(),
  fix: optionalText(),
});
export type Finding = z.infer<typeof FindingSchema> & {
  /** Set when the false-positive gate turned a blocking finding into a suggestion. */
  downgraded?: string | undefined;
  pattern?: string | undefined;
};

export function findingPattern(kind: string, message: string): string {
  const normal = message
    .toLowerCase()
    .replace(/`[^`]*`/g, " x ")
    .replace(/"[^"]*"|'[^']*'/g, " x ")
    .replace(/[\w./-]+\.[a-z]{1,5}(?::\d+)?/g, " file ")
    .replace(/\d+/g, " n ")
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256")
    .update(`${kind}\0${normal}`)
    .digest("hex")
    .slice(0, 12);
}

const ReviewSchema = z.object({
  findings: z.array(FindingSchema).default([]),
  acceptance: z
    .array(
      z.object({
        id: z.string(),
        status: z.enum(["met", "unmet", "unverified"]).catch("unverified"),
        note: optionalText(),
      }),
    )
    .default([]),
  /** Asked only on a fix card with a UI proof: does the "before" show the defect? */
  before: z
    .object({
      // Anything but a plain yes means the before doesn't show it.
      shows_defect: z.boolean().catch(false),
      note: optionalText(),
      criteria: z.array(z.string()).catch([]).default([]),
    })
    .nullish()
    .catch(null),
});

export type BeforeCheck = NonNullable<z.infer<typeof ReviewSchema>["before"]>;

const GateSchema = z.object({
  reproducible: z.boolean(),
  repro: optionalText(),
  reason: optionalText(),
});

export interface PackedChange {
  diff: string;
  files: string[];
  /** `stats` is the file's added and removed line counts, when git has them. */
  omitted: { path: string; why: string; stats?: string | undefined }[];
  /** Test files sent only in part, and how much of each was left out. */
  trimmed?: { path: string; note: string }[] | undefined;
  /** New-side line numbers that appear in the diff, per file (for inline comments). */
  lines: Map<string, Set<number>>;
  agents: string | null;
  constraints: string | null;
  banned?: string | null | undefined;
  /** Repo files the changed Markdown cites, at head, so citations can be checked. */
  cited?: CitedFile[] | undefined;
}

export interface CitedFile {
  path: string;
  /** The file at head, cut at the per-file cap; null when over the total cap. */
  text: string | null;
  truncated: boolean;
}

export interface Tier2Result {
  verdict: "approve" | "request-changes";
  blocking: Finding[];
  suggestions: Finding[];
  acceptance: z.infer<typeof ReviewSchema>["acceptance"];
  /** The reviewer's answer on a fix card's "before" proof, when it was asked. */
  before?: BeforeCheck | undefined;
  /**
   * Changed files the reviewer wasn't shown for a reason other than being
   * generated (sensitive, secret-shaped, binary, over budget). A change with
   * any can't be approved by the judge: a person looks at them.
   */
  unreviewed: string[];
  /**
   * The card's criteria nobody confirmed: marked unverified, or not reported
   * at all. Set when there's a card; a change with any can't be approved
   * without a person.
   */
  unverified?: { id: string; note: string }[] | undefined;
  model: string;
  /** The effort the review ran at, when one was set. */
  effort?: Effort | undefined;
  calls: number;
  /** Tokens and estimated cost across every call. */
  usage: { tokens: number; costUsd: number };
  packed: Omit<PackedChange, "diff">;
}

/**
 * The parts of a task's proof record (`proof/proof.json`) the reviewer is
 * shown. Its own type, not the prove beat's: prove imports tier 1, which
 * imports this module.
 */
export interface ReviewProof {
  kind: string;
  passed: boolean;
  lines: string[];
  shots?: (Shot & { side: "before" | "after" })[] | undefined;
  tests?: { exitCode: number; added: string[]; output: string } | undefined;
}

export interface Tier2Options {
  repoPath: string;
  /** The merge-base (or base commit) and the change's head commit. */
  base: string;
  head: string;
  ai: AiClient;
  model?: string | undefined;
  card?: Card | undefined;
  decisions?: readonly AllowedDecision[] | undefined;
  /** The task's proof record, so criteria can be checked against it. */
  proof?: ReviewProof | undefined;
  /** Tier 1's checks on the same change, this round: shown, and settling criteria about them. */
  tier1?: Tier1Checks | undefined;
  /** How hard the reviewer thinks (the CLI's `--effort`); its default when unset. */
  effort?: Effort | undefined;
  /** YYYY-MM-DD for the usage log; no log when omitted. */
  usageDate?: string | undefined;
  log?: ((line: string) => void) | undefined;
}

/**
 * The card's criteria the reviewer didn't confirm: marked unverified, or not
 * reported at all (silence isn't a verification).
 */
export function unverifiedCriteria(
  card: Pick<Card, "acceptance">,
  acceptance: Tier2Result["acceptance"],
): { id: string; note: string }[] {
  return card.acceptance.flatMap((c) => {
    const a = acceptance.find((r) => r.id === c.id);
    if (!a) return [{ id: c.id, note: "the reviewer didn't report on it" }];
    return a.status === "unverified"
      ? [{ id: c.id, note: a.note || "no reason given" }]
      : [];
  });
}

/** An unmet criterion as a finding, so it blocks and shows like one. */
const unmetFinding = (id: string, note: string): Finding => ({
  kind: "acceptance",
  file: "",
  line: null,
  acceptance_id: id,
  title: `${id} is unmet`,
  detail: note,
  repro: note,
  fix: "",
});

interface Run {
  calls: number;
  usage: { tokens: number; costUsd: number };
  complete: (system: string, prompt: string, task: string) => Promise<string>;
}

/** The model calls of one review, counted with their tokens and cost. */
function startRun(options: Tier2Options, model: string): Run {
  const run: Run = {
    calls: 0,
    usage: { tokens: 0, costUsd: 0 },
    complete: async (system, prompt, task) => {
      run.calls++;
      const res = await options.ai.complete({
        system,
        prompt,
        model,
        maxTokens: 8000,
        ...(options.effort ? { effort: options.effort } : {}),
      });
      const cost = res.costUsd ?? estimateCost(res.model, res.usage);
      run.usage.tokens +=
        res.usage.inputTokens +
        res.usage.outputTokens +
        (res.usage.cacheCreationTokens ?? 0) +
        (res.usage.cacheReadTokens ?? 0);
      run.usage.costUsd += cost;
      if (options.usageDate) {
        await appendUsage(options.repoPath, {
          date: options.usageDate,
          task,
          model: res.model,
          inputTokens: res.usage.inputTokens,
          outputTokens: res.usage.outputTokens,
          costUsd: cost,
        }).catch(() => undefined);
      }
      return res.text;
    },
  };
  return run;
}

/**
 * Nothing to read means nothing a card asks for can be met, and no call to
 * pay for. An empty change is unmet; one whose files were all held back
 * (generated, sensitive, secret-shaped) is unverified, for a person.
 */
function nothingToRead(
  card: Card,
  packed: PackedChange,
  log: (line: string) => void,
): Pick<Tier2Result, "acceptance" | "blocking"> {
  const empty = packed.omitted.length === 0;
  const note = empty
    ? "the change is empty: no file differs from the base"
    : `no file was shown to the reviewer: ${packed.omitted.map((o) => `${o.path} (${o.why})`).join(", ")}`;
  log(`reviewing 0 file(s): ${note}`);
  const acceptance = card.acceptance.map((a) => ({
    id: a.id,
    status: empty ? ("unmet" as const) : ("unverified" as const),
    note,
  }));
  const blocking = empty
    ? card.acceptance.map((a) => ({
        ...unmetFinding(a.id, note),
        pattern: findingPattern("acceptance", `${a.id} is unmet`),
      }))
    : [];
  return { acceptance, blocking };
}

/** Where a finding goes before the gate: kept as is, downgraded, or checked. */
function triage(
  finding: Finding,
  unmetIds: ReadonlySet<string>,
  files: readonly string[],
  checked: number,
): { to: "blocking" | "suggestions" | "gate"; finding: Finding } {
  if (finding.kind === "suggestion") return { to: "suggestions", finding };
  // Not through the gate, the file check or the budget: those filter false
  // positives, and an unmet criterion isn't one. The pilot's empty diff
  // passed when each unmet criterion was downgraded for naming a file the
  // change didn't have.
  if (
    finding.kind === "acceptance" &&
    finding.acceptance_id &&
    unmetIds.has(finding.acceptance_id)
  )
    return { to: "blocking", finding };
  const downgrade = (downgraded: string) => ({
    to: "suggestions" as const,
    finding: { ...finding, kind: "suggestion" as const, downgraded },
  });
  // A finding about a file the reviewer wasn't shown can't be confirmed.
  if (finding.file && !files.includes(finding.file))
    return downgrade("names a file outside the diff");
  if (checked >= MAX_FP_CHECKS)
    return downgrade("over the review's check budget");
  return { to: "gate", finding };
}

/** One fresh-context call: does the finding reproduce? Blocking only if so. */
async function gateFinding(
  finding: Finding,
  packed: PackedChange,
  options: Tier2Options,
  run: Run,
): Promise<{ blocks: boolean; finding: Finding }> {
  const fileDiff = finding.file
    ? (packed.diff
        .split(/^(?=diff --git )/m)
        .find((d) => d.includes(` b/${finding.file}\n`)) ?? packed.diff)
    : packed.diff;
  // A failed call is an error, not a verdict: it must never turn into an approval.
  const reply = await run.complete(
    GATE,
    gatePrompt(finding, fileDiff, packed, options.card, options.decisions),
    "judge-fp-gate",
  );
  let gate: z.infer<typeof GateSchema>;
  try {
    gate = GateSchema.parse(extractJson(reply));
  } catch {
    gate = {
      reproducible: false,
      repro: "",
      reason: "the check didn't return a verdict",
    };
  }
  if (gate.reproducible && gate.repro.trim().length >= 20)
    return { blocks: true, finding: { ...finding, repro: gate.repro.trim() } };
  return {
    blocks: false,
    finding: {
      ...finding,
      kind: "suggestion",
      downgraded: `no reproduction confirmed${gate.reason ? `: ${gate.reason}` : ""}`,
    },
  };
}

/**
 * A criterion with a confirmed blocking finding against it isn't met,
 * whatever the reviewer marked: T-0012's A5 was "met" beside the defect
 * that broke it.
 */
function markBlocked(
  acceptance: Tier2Result["acceptance"],
  blocking: readonly Finding[],
  cardIds: ReadonlySet<string>,
): Tier2Result["acceptance"] {
  let out = acceptance;
  for (const f of blocking) {
    if (!f.acceptance_id || !cardIds.has(f.acceptance_id)) continue;
    const i = out.findIndex((a) => a.id === f.acceptance_id);
    const unmetNote = `a blocking ${f.kind} finding: ${f.title}`;
    if (i === -1)
      out = [...out, { id: f.acceptance_id, status: "unmet", note: unmetNote }];
    else if (out[i]?.status !== "unmet")
      out = out.map((a, j) =>
        j === i ? { ...a, status: "unmet" as const, note: unmetNote } : a,
      );
  }
  return out;
}

/** The reviewer's statuses, after the before proof and tier 1 have their say. */
function settleAcceptance(
  review: z.infer<typeof ReviewSchema>,
  options: Tier2Options,
  checkBefore: boolean,
): Tier2Result["acceptance"] {
  const { card, tier1 } = options;
  const acceptance =
    checkBefore && card
      ? applyBeforeCheck(review.acceptance, card, review.before)
      : review.acceptance;
  return card && tier1 ? applyTier1(acceptance, card, tier1) : acceptance;
}

/**
 * Run the review: one call for findings, then one fresh-context call per
 * blocking finding (up to a cap) to confirm it reproduces. Findings that fail
 * the gate, or exceed the cap, become suggestions. A criterion marked unmet
 * blocks without the gate: the card says what done is, and the gate only
 * filters findings, so it can't turn "not done" into a suggestion.
 */
export async function runTier2(options: Tier2Options): Promise<Tier2Result> {
  const log = options.log ?? (() => undefined);
  const model = options.model ?? JUDGE_DEFAULT_MODEL;
  const card = options.card;
  const packed = await packChange(options.repoPath, options.base, options.head);
  const run = startRun(options, model);
  const unreviewed = packed.omitted
    .filter((o) => o.why !== "generated")
    .map((o) => o.path);
  const packedOut: Tier2Result["packed"] = {
    files: packed.files,
    omitted: packed.omitted,
    ...(packed.trimmed ? { trimmed: packed.trimmed } : {}),
    lines: packed.lines,
    agents: packed.agents,
    constraints: packed.constraints,
  };
  const effort = options.effort ? { effort: options.effort } : {};

  if (card && packed.files.length === 0) {
    const { acceptance, blocking } = nothingToRead(card, packed, log);
    return {
      verdict: blocking.length > 0 ? "request-changes" : "approve",
      blocking,
      suggestions: [],
      acceptance,
      unreviewed,
      unverified: unverifiedCriteria(card, acceptance),
      model,
      ...effort,
      calls: run.calls,
      usage: run.usage,
      packed: packedOut,
    };
  }

  log(
    `reviewing ${packed.files.length} file(s) with ${model}${options.effort ? ` at ${options.effort} effort` : ""}`,
  );
  const review = ReviewSchema.parse(
    extractJson(
      await run.complete(
        RUBRIC,
        reviewPrompt(
          packed,
          card,
          options.decisions,
          options.proof,
          options.tier1,
        ),
        "judge-review",
      ),
    ),
  );
  const checkBefore = needsBeforeCheck(card, options.proof);
  let acceptance = settleAcceptance(review, options, checkBefore);

  // An unmet criterion blocks like any acceptance finding, even when the
  // reviewer only marked it unmet.
  const cardIds = new Set(card?.acceptance.map((a) => a.id) ?? []);
  const unmetIds = new Set(
    acceptance
      .filter((a) => a.status === "unmet" && cardIds.has(a.id))
      .map((a) => a.id),
  );
  const cited = new Set(
    review.findings
      .filter((f) => f.kind === "acceptance" && f.acceptance_id)
      .map((f) => f.acceptance_id),
  );
  const unmet: Finding[] = [...unmetIds]
    .filter((id) => !cited.has(id))
    .map((id) =>
      unmetFinding(id, acceptance.find((a) => a.id === id)?.note ?? ""),
    );

  const blocking: Finding[] = [];
  const suggestions: Finding[] = [];
  let checked = 0;
  for (const found of [...review.findings, ...unmet]) {
    const finding = {
      ...found,
      pattern: findingPattern(found.kind, found.title),
    };
    const routed = triage(finding, unmetIds, packed.files, checked);
    if (routed.to === "blocking") blocking.push(routed.finding);
    else if (routed.to === "suggestions") suggestions.push(routed.finding);
    else {
      log(`checking: ${finding.title}`);
      checked++;
      const gated = await gateFinding(finding, packed, options, run);
      (gated.blocks ? blocking : suggestions).push(gated.finding);
    }
  }

  acceptance = markBlocked(acceptance, blocking, cardIds);

  log(
    `review: ${run.calls} call(s) · ${run.usage.tokens} tokens · $${run.usage.costUsd.toFixed(2)}`,
  );
  return {
    verdict: blocking.length > 0 ? "request-changes" : "approve",
    blocking,
    suggestions,
    acceptance,
    ...(checkBefore
      ? {
          before: review.before ?? {
            shows_defect: false,
            note: "the reviewer didn't answer",
            criteria: [],
          },
        }
      : {}),
    unreviewed,
    ...(card ? { unverified: unverifiedCriteria(card, acceptance) } : {}),
    model,
    ...effort,
    calls: run.calls,
    usage: run.usage,
    packed: packedOut,
  };
}
