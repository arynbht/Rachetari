// CI state: the repo on show's CI, read through the gh CLI (kit/gh) and folded
// into the CiState the header shows. One read per repo at a time, and at most
// one a minute per repo: a read asked for within the minute gets the last one.
// Main asks for a read when a repo is shown and each time its background fetch
// settles. Electron-free, like engine/now and engine/fetch-loop.
import { resolve } from "node:path";

import { z } from "zod";

import type { CiState } from "../../shared/ipc";
import { ghCommand, type GhRead, readGitHub } from "../kit/gh";

type RepoCi = NonNullable<CiState>;
type RunState = NonNullable<NonNullable<RepoCi["branch"]>["run"]>["state"];
type PrState = RepoCi["prs"][number]["state"];

/** The least time between two reads of a repo. */
export const CI_MIN_INTERVAL_MS = 60_000;

/** Conclusions `gh pr checks` buckets as a failure. */
const FAILED = new Set([
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
  "startup_failure",
  "error",
]);

/** A run's state from its status and conclusion. */
export function runState(status: string, conclusion: string): RunState {
  if (status !== "completed") return "running";
  if (conclusion === "cancelled") return "cancelled";
  return FAILED.has(conclusion) ? "failed" : "passed";
}

/** A PR's checks folded: any failure, else anything running, else passed. */
export function prState(
  runs: readonly { status: string; conclusion: string }[],
): PrState {
  if (runs.length === 0) return "none";
  if (runs.some((r) => r.status === "completed" && FAILED.has(r.conclusion)))
    return "failed";
  if (runs.some((r) => r.status !== "completed")) return "running";
  return "passed";
}

// gh's answers, item by item: anything that isn't a known value is dropped.
const SHA = z.string().regex(/^[0-9a-f]{40}$/);
const githubUrl = z.string().regex(/^https:\/\/github\.com\/[\w./-]+$/);
const BranchRun = z.object({
  status: z.string(),
  conclusion: z.string(),
  headSha: SHA,
  url: githubUrl,
});
const Run = z.object({
  status: z.string(),
  conclusion: z.string(),
  headBranch: z.string(),
  headSha: SHA,
  workflowName: z.string(),
  event: z.string(),
});
const Pull = z.object({
  number: z.number().int().positive(),
  url: githubUrl,
  ref: z.string().startsWith("card/"),
  sha: SHA,
});

function items<T>(schema: z.ZodType<T>, list: unknown): T[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Each open card/* PR, folded from its head commit's latest run of each workflow. */
function prsOf(read: Extract<GhRead, { gh: "ok" }>): RepoCi["prs"] {
  const runs = items(Run, read.runs);
  return items(Pull, read.pulls).map((pr) => {
    const latest = new Map<string, z.infer<typeof Run>>();
    for (const r of runs) {
      const key = `${r.workflowName}\0${r.event}`;
      if (r.headBranch === pr.ref && r.headSha === pr.sha && !latest.has(key))
        latest.set(key, r);
    }
    return {
      branch: pr.ref,
      number: pr.number,
      state: prState([...latest.values()]),
      url: pr.url,
    };
  });
}

/** One read folded into the repo's CiState. */
function fold(repoPath: string, read: GhRead, readAt: string): RepoCi {
  if (read.gh !== "ok")
    return {
      repoPath,
      gh: read.gh,
      message: read.message,
      readAt,
      branch: null,
      prs: [],
    };
  const [last] = items(BranchRun, read.branchRuns);
  return {
    repoPath,
    gh: "ok",
    message: null,
    readAt,
    branch: {
      name: read.branch,
      run: last
        ? {
            state: runState(last.status, last.conclusion),
            sha7: last.headSha.slice(0, 7),
            url: last.url,
          }
        : null,
    },
    prs: prsOf(read),
  };
}

export interface CiWatchOptions {
  /** Reads one repo's CI (kit/gh's readGitHub); null: no gh to run, no reads. */
  read: ((repoPath: string) => Promise<GhRead>) | null;
  /** Hears the repo on show's state: on show, and after each read of it. */
  onState?: (state: CiState) => void;
  now?: () => Date;
  /** The least time between two reads of a repo: a minute by default. */
  minIntervalMs?: number;
}

interface Entry {
  state: RepoCi | null;
  running: Promise<CiState> | null;
  /** When the last read started (ms), or null before one has. */
  startedAt: number | null;
}

/** Windows paths are case-insensitive: keyed as the NowHub keys them. */
const keyOf = (path: string) => {
  const full = resolve(path);
  return process.platform === "win32" ? full.toLowerCase() : full;
};

const firstLine = (err: unknown) =>
  (err instanceof Error ? err.message : String(err)).split(/\r?\n/)[0] ?? "";

export class CiWatch {
  private readonly repos = new Map<string, Entry>();
  private readonly now: () => Date;
  private readonly minIntervalMs: number;
  private shown: string | null = null;

  constructor(private readonly options: CiWatchOptions) {
    this.now = options.now ?? (() => new Date());
    this.minIntervalMs = options.minIntervalMs ?? CI_MIN_INTERVAL_MS;
  }

  /** The repo on show changed: say its last state now, then read it if due. */
  show(repoPath: string | null): void {
    this.shown = repoPath;
    this.options.onState?.(this.state());
    if (repoPath !== null) void this.read(repoPath);
  }

  /** A repo's background fetch settled: read it again if it's on show and due. */
  fetched(repoPath: string): void {
    if (this.shown !== null && keyOf(this.shown) === keyOf(repoPath))
      void this.read(this.shown);
  }

  /** The repo on show's last state; null with none on show or before a read. */
  state(): CiState {
    if (this.shown === null) return null;
    return this.repos.get(keyOf(this.shown))?.state ?? null;
  }

  /**
   * Read a repo's CI: joins the read that runs, gives the last state when one
   * started less than the interval ago, else reads now.
   */
  read(repoPath: string): Promise<CiState> {
    const reader = this.options.read;
    if (!reader) return Promise.resolve(null);
    const key = keyOf(repoPath);
    let entry = this.repos.get(key);
    if (!entry) {
      entry = { state: null, running: null, startedAt: null };
      this.repos.set(key, entry);
    }
    if (entry.running) return entry.running;
    const started = this.now().getTime();
    if (
      entry.startedAt !== null &&
      started - entry.startedAt < this.minIntervalMs
    )
      return Promise.resolve(entry.state);
    entry.startedAt = started;
    const settle = (state: RepoCi) => {
      if (!entry) return state;
      entry.state = state;
      entry.running = null;
      if (this.shown !== null && keyOf(this.shown) === key)
        this.options.onState?.(state);
      return state;
    };
    entry.running = reader(repoPath).then(
      (read) => settle(fold(repoPath, read, this.now().toISOString())),
      (err: unknown) =>
        settle(
          fold(
            repoPath,
            { gh: "error", message: firstLine(err) },
            this.now().toISOString(),
          ),
        ),
    );
    return entry.running;
  }
}

/**
 * Main's CiWatch: gh as kit/gh's ghCommand gives it (under E2E, the fake or
 * none), a read at most once a minute (under E2E only, RACHETARI_CI_MIN_MS).
 */
export function ciWatchFor(
  e2e: boolean,
  onState: (state: CiState) => void,
  env: NodeJS.ProcessEnv = process.env,
): CiWatch {
  const command = ghCommand(e2e, env);
  const set = Number(env.RACHETARI_CI_MIN_MS);
  return new CiWatch({
    read: command && ((repoPath) => readGitHub(command, repoPath)),
    onState,
    minIntervalMs: e2e && set > 0 ? set : CI_MIN_INTERVAL_MS,
  });
}
