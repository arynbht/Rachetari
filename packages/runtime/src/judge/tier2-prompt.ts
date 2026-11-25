// Judge tier 2, prompts: the rubric, the gate's instructions, the text of what
// the reviewer and the gate are shown, and reading their replies back.
import { looksLikeSecret } from "@arynbht/rivetari-engine";

import type { Card } from "../task/card.js";
import { CITED_FILE_CAP } from "./tier2-pack.js";
import type {
  AllowedDecision,
  BeforeCheck,
  CitedFile,
  Finding,
  PackedChange,
  ReviewProof,
  Tier2Result,
} from "./tier2.js";
import {
  type Tier1Checks,
  tier1Section,
  tier1Status,
} from "./tier1-criteria.js";

/**
 * The diff a finding with no file is checked against. The gate re-reads the
 * whole change otherwise, once per finding, which multiplied a big review's
 * cost by its findings.
 */
export const GATE_DIFF_CAP = 60_000;

function decisionsSection(
  decisions: readonly AllowedDecision[] | undefined,
): string[] {
  const allowed = decisions?.filter((d) => !d.flagged) ?? [];
  const flagged = decisions?.filter((d) => d.flagged) ?? [];
  return [
    ...(allowed.length > 0
      ? [
          `## Decisions a person already made\nA person was asked about each of these and allowed it. Do not block on a change a person allowed: it is not a defect, a contract breach or an unmet criterion because of what was allowed.\n${allowed.map((d) => `- ${d.asked} — allowed by ${d.by} at ${d.at}${d.note ? `: ${d.note}` : ""}`).join("\n")}`,
        ]
      : []),
    ...(flagged.length > 0
      ? [
          `## Decisions flagged for the person reviewing the PR\nThe repo's autonomy level let the build go on without asking about these; the PR lists each one for a person to decide at merge. Do not block only because nobody was asked. Judge the change itself as usual.\n${flagged.map((d) => `- ${d.asked} — flagged at ${d.at}`).join("\n")}`,
        ]
      : []),
  ];
}

export const RUBRIC = `You are the judge in a Rivetari, reviewing one change (a diff) before a human merges it.

You may raise exactly three kinds of BLOCKING finding:
- "defect": a correctness bug, security issue, data loss, race, or unhandled failure path that this diff introduces or leaves reachable.
- "contract": the diff violates AGENTS.md, CONSTRAINTS.md, or a stated house pattern (quote the rule).
- "acceptance": an acceptance criterion on the task card is unmet by this change (give its id).

For every acceptance criterion on the card, report one status:
- "met": the evidence shows it is met: the diff, a test in the diff that actually exercises it, or the proof given below.
- "unmet": the evidence shows it is not met.
- "unverified": you can't confirm it from the evidence. Use this rather than guessing "met": a manual or screenshot criterion the proof doesn't show, a test that doesn't really exercise the criterion, a claim about code you weren't shown. Say in the note what is missing. An unverified criterion isn't a finding; a person decides it.

Everything else — style, naming, readability, "could be tighter", alternative designs, missing nice-to-haves, speculative risks — is a "suggestion". Suggestions never block.

Rules:
- Every blocking finding needs a concrete "repro": the input, state or steps that make the problem happen in THIS diff. If you can't write one, it is a suggestion.
- "line" is the line number in the new version of the file, from the diff's hunk headers. Use null if no single line applies.
- Don't report problems in code the diff didn't touch unless the diff makes them reachable.
- Be specific and brief. No praise, no summary of the change.

Reply with ONLY a JSON object, no prose and no code fence:
{"findings":[{"kind":"defect|contract|acceptance|suggestion","file":"path","line":12,"acceptance_id":"A1 or null","title":"one line","detail":"what is wrong and why","repro":"how to trigger it","fix":"the smallest change that fixes it"}],"acceptance":[{"id":"A1","status":"met|unmet|unverified","note":"short"}],"before":null}

Only when the prompt has a section headed "The before proof", replace null with {"shows_defect":true|false,"note":"what the before evidence shows","criteria":["ids whose verification depends on the before showing the defect"]}.`;

export const GATE = `You are checking one code-review finding before it can block a merge. Default to rejecting it.

Decide whether the finding is real and reproducible in THIS diff, and how. It is reproducible only if you can name concrete inputs, state or steps that trigger the problem given the code shown. Style, preference and speculative concerns are not reproducible.

A contract finding must break a rule quoted from the contract given below; a rule that isn't in the text given doesn't exist. An acceptance finding must leave a criterion unmet: every criterion on the task card is listed below, in full, whatever the finding's kind. When the prompt says there is no task card, judge a finding that names a criterion on the code alone: don't reject it because the criterion's text isn't shown.

Reply with ONLY a JSON object: {"reproducible": true|false, "repro": "exact steps, or empty", "reason": "one line"}`;

/** A fix card proved with screenshots: its "before" has to show the defect. */
export const needsBeforeCheck = (card?: Card, proof?: ReviewProof): boolean =>
  card?.type === "fix" && proof?.kind === "ui-screenshots";

function shotLine(shot: NonNullable<ReviewProof["shots"]>[number]): string {
  const where = `${shot.side} · ${shot.page} at ${shot.breakpoint} · HTTP ${shot.status} · ${shot.file.replace(/\\/g, "/").split("/").pop() ?? ""}`;
  // Whether the page rendered, and the image's size, go last: a shot of a
  // loading state reads as one, and a skeleton is far smaller than the page.
  const rendered = `${
    shot.ready === false
      ? ` · NOT RENDERED, the image is of the loading state: ${shot.notReady ?? "it never settled"}`
      : ""
  }${shot.bytes !== undefined ? ` · ${shot.bytes} bytes` : ""}`;
  const l = shot.layout;
  if (!l) return `- ${where} · nothing measured${rendered}`;
  const overflow =
    l.scrollWidth > l.viewport
      ? `scrolls sideways: ${l.scrollWidth}px of content in a ${l.viewport}px viewport`
      : `no sideways scroll (${l.scrollWidth}px in a ${l.viewport}px viewport)`;
  const past =
    l.overflowing.length > 0
      ? `elements past the viewport's edge: ${l.overflowing.join("; ")}`
      : "no element past the viewport's edge";
  return `- ${where} · ${overflow} · ${past}${l.text ? ` · text starts: ${JSON.stringify(l.text)}` : ""}${rendered}`;
}

/** Proof text goes to the model like the diff does: never secret-shaped. */
const unlessSecret = (text: string) =>
  looksLikeSecret(text) ? "(left out: looks like it holds a secret)" : text;

function proofSection(proof: ReviewProof, card?: Card): string[] {
  const parts = [
    `## The proof\nProduced by a tool on the change, never written by the agent. Kind: ${proof.kind} · ${proof.passed ? "passed" : "failed"}.\n${proof.lines.map((l) => `- ${unlessSecret(l)}`).join("\n")}`,
  ];
  if (proof.tests) {
    parts.push(
      `### Test run\nExit ${proof.tests.exitCode} · new tests: ${proof.tests.added.join("; ") || "none"}\n\`\`\`\n${unlessSecret(proof.tests.output.slice(-3000))}\n\`\`\``,
    );
  }
  if (proof.shots?.length) {
    parts.push(
      `### Screenshots\nYou can't see the images. For each one you have its side (before = the base, after = the change), page, breakpoint (sm 375px, md 768px, lg 1280px wide, w<n> n px wide), HTTP status, and what the proof runner measured on the page.\n${proof.shots.map(shotLine).join("\n")}`,
    );
  }
  if (needsBeforeCheck(card, proof)) {
    parts.push(
      `## The before proof\nThis card is a fix, so its before screenshots (the base, before the change) must show the defect the card describes, or the proof shows nothing was fixed. Judge from what was measured on the before shots above, and answer in "before". If the before evidence doesn't show the defect, every criterion that depends on it is "unverified", not "met".`,
    );
  }
  return parts;
}

function citedSection(cited: readonly CitedFile[]): string[] {
  if (cited.length === 0) return [];
  return [
    `## Files the changed docs cite\nThe changed Markdown cites these repo files; here they are at the change's head. Check that what the docs say about them is true.\n\n${cited
      .map((c) =>
        c.text === null
          ? `### ${c.path}\n(not shown: over the review's size cap for cited files)`
          : `### ${c.path}${c.truncated ? ` (first ${CITED_FILE_CAP} characters)` : ""}\n\`\`\`\n${c.text}\n\`\`\``,
      )
      .join("\n\n")}`,
  ];
}

export function reviewPrompt(
  packed: PackedChange,
  card?: Card,
  decisions?: readonly AllowedDecision[],
  proof?: ReviewProof,
  tier1?: Tier1Checks,
): string {
  const parts: string[] = [];
  if (card) {
    parts.push(
      `## Task card ${card.id}: ${card.title}\n${card.description}\n\nAcceptance criteria:\n${criteriaLines(card)}` +
        (card.out_of_scope.length
          ? `\n\nOut of scope:\n${card.out_of_scope.map((o) => `- ${o}`).join("\n")}`
          : "") +
        (card.constraints.length
          ? `\n\nConstraints:\n${card.constraints.map((c) => `- ${c}`).join("\n")}`
          : ""),
    );
  }
  if (packed.agents)
    parts.push(`## AGENTS.md (the repo's contract)\n${packed.agents}`);
  if (packed.constraints)
    parts.push(`## CONSTRAINTS.md\n${packed.constraints}`);
  if (packed.banned) parts.push(packed.banned);
  parts.push(...decisionsSection(decisions));
  if (packed.omitted.length) {
    parts.push(
      `## Not shown to you\n${packed.omitted.map((o) => `- ${o.path}: ${o.why}${o.stats ? ` (${o.stats})` : ""}`).join("\n")}`,
    );
  }
  if (packed.trimmed?.length) {
    parts.push(
      `## Test files shown in part\nThese are cut to keep the review's size down; a criterion that rests on the part not shown is unverified, not met.\n${packed.trimmed.map((t) => `- ${t.path}: ${t.note}`).join("\n")}`,
    );
  }
  if (tier1) parts.push(...tier1Section(tier1));
  if (proof) parts.push(...proofSection(proof, card));
  parts.push(...citedSection(packed.cited ?? []));
  parts.push(`## The diff\n${packed.diff || "(empty)"}`);
  return parts.join("\n\n");
}

/** What the gate sees: the finding, the rules it cites, and its file's diff. */
export function gatePrompt(
  finding: Finding,
  fileDiff: string,
  packed: PackedChange,
  card?: Card,
  decisions?: readonly AllowedDecision[],
): string {
  const parts = [
    `## Finding (${finding.kind})\n${JSON.stringify(finding, null, 2)}`,
    ...decisionsSection(decisions),
  ];
  if (finding.kind === "contract") {
    parts.push(
      `## AGENTS.md (the repo's contract)\n${packed.agents ?? "(none)"}`,
      `## CONSTRAINTS.md\n${packed.constraints ?? "(none)"}`,
      ...(packed.banned ? [packed.banned] : []),
    );
  }
  // Every finding, not only an acceptance one: a defect tied to a criterion
  // was rejected because "no A5 text is given" when the runtime hadn't sent it.
  parts.push(
    card
      ? `## Acceptance criteria (task card ${card.id}: ${card.title})\n${criteriaLines(card)}`
      : "## Acceptance criteria\nThere is no task card for this change: neither you nor the reviewer were given criteria.",
  );
  parts.push(
    `## The diff\n${fileDiff.length > GATE_DIFF_CAP ? `${fileDiff.slice(0, GATE_DIFF_CAP)}\n… (the rest of the diff isn't shown here)` : fileDiff}`,
  );
  return parts.join("\n\n");
}

const criteriaLines = (card: Pick<Card, "acceptance">) =>
  card.acceptance.map((a) => `- ${a.id} (${a.verify}): ${a.text}`).join("\n");

/**
 * On a fix card proved with screenshots, a before the reviewer didn't say
 * shows the defect leaves every criterion that depends on it unverified (all
 * of them when it named none). An unmet criterion stays unmet.
 */
export function applyBeforeCheck(
  acceptance: Tier2Result["acceptance"],
  card: Card,
  before: BeforeCheck | null | undefined,
): Tier2Result["acceptance"] {
  if (before?.shows_defect === true) return acceptance;
  const ids = card.acceptance.map((a) => a.id);
  const named = (before?.criteria ?? []).filter((id) => ids.includes(id));
  const depends = new Set(named.length > 0 ? named : ids);
  const why = `the before proof doesn't show the defect${before?.note ? `: ${before.note}` : before ? "" : " (the reviewer didn't say it does)"}`;
  const out = acceptance.map((a) =>
    depends.has(a.id) && a.status === "met"
      ? { ...a, status: "unverified" as const, note: why }
      : a,
  );
  for (const id of depends)
    if (!out.some((a) => a.id === id))
      out.push({ id, status: "unverified", note: why });
  return out;
}

/** The last JSON object in a reply (models sometimes add text around it). */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)?.[1];
  const candidates = [fenced, text].filter((t): t is string => Boolean(t));
  for (const candidate of candidates) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) continue;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      // try the next candidate
    }
  }
  throw new Error("the reviewer did not reply with JSON");
}

/** Criteria that only say tier 1's checks pass take their status from tier 1. */
export function applyTier1(
  acceptance: Tier2Result["acceptance"],
  card: Pick<Card, "acceptance">,
  checks: Tier1Checks,
): Tier2Result["acceptance"] {
  const out = [...acceptance];
  for (const c of card.acceptance) {
    const settled = tier1Status(c.text, checks);
    if (!settled) continue;
    const i = out.findIndex((a) => a.id === c.id);
    if (i === -1) out.push({ id: c.id, ...settled });
    else out[i] = { id: c.id, ...settled };
  }
  return out;
}
