// The CI reader: the shell's only use of the GitHub CLI. It runs `gh` on the
// person's own sign-in (the token stays in gh's store: nothing here reads,
// passes or logs one, and gh gets the shell's env plus three switches), and
// only these reads, checked against an allow-list before anything starts:
//   gh run list --repo <owner/repo> [--branch <branch>] --limit <n> --json <fields>
//   gh api --method GET repos/<owner/repo>/pulls?state=open&per_page=100 --jq <fixed>
// Every argument is a constant or a known value: owner/repo parsed from the
// origin's URL, the display branch from git's refs. Electron-free.
import { spawn } from "node:child_process";

import { displayBranch, killTree } from "./source";

/** How long one call may take before it's killed (overridable by env). */
export const GH_LIMIT_MS = 15_000;
const GIT_LIMIT_MS = 10_000;
const MAX_OUTPUT = 16 * 1024 * 1024;

function ghLimitMs(): number {
  const set = Number(process.env.RACHETARI_GH_LIMIT_MS);
  return Number.isFinite(set) && set > 0 ? set : GH_LIMIT_MS;
}

/** A call the allow-list refused: nothing was started. */
export class GhRefused extends Error {}

class Timeout extends Error {}

/** The flags each allowed read may take, each followed by a value. */
const RUN_LIST_FLAGS = new Set(["--repo", "--branch", "--limit", "--json"]);
const API_FLAGS = new Set(["--method", "--jq"]);
/** The only endpoints `gh api` may read: a repo's own. */
const API_PATH = /^repos\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/[A-Za-z0-9/_?=&.-]+$/;

/**
 * The allow-list: `gh run list`, or `gh api` with `--method GET` and a repo
 * path, each with only its known flags and a value after each one that gh
 * can't read as another flag. Anything else is refused.
 */
export function ghAllowed(args: readonly string[]): boolean {
  const api = args[0] === "api";
  if (!api && !(args[0] === "run" && args[1] === "list")) return false;
  const flags = api ? API_FLAGS : RUN_LIST_FLAGS;
  const rest = args.slice(api ? 1 : 2);
  const seen = new Map<string, string>();
  const positionals: string[] = [];
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i] ?? "";
    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }
    const value = rest[i + 1];
    if (!flags.has(arg) || seen.has(arg)) return false;
    if (value === undefined || value === "" || value.startsWith("-"))
      return false;
    seen.set(arg, value);
    i += 1;
  }
  if (!api) return positionals.length === 0;
  return (
    seen.get("--method") === "GET" &&
    positionals.length === 1 &&
    API_PATH.test(positionals[0] ?? "")
  );
}

interface Ran {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Run a command without a shell: no prompts, a time limit (the whole tree
 * killed at it), stdout capped. Rejects as spawn does (ENOENT when it isn't
 * there) or with Timeout.
 */
function run(
  command: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  ms: number,
): Promise<Ran> {
  const [file = "", ...args] = command;
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      // On POSIX, its own process group, so a timeout can kill the whole tree.
      detached: process.platform !== "win32",
      env,
    });
    let settled = false;
    const settle = (err: Error | null, ran?: Ran) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else if (ran) resolve(ran);
    };
    const stop = (err: Error) => {
      killTree(child);
      child.stdout.destroy();
      child.stderr.destroy();
      settle(err);
    };
    const out: Buffer[] = [];
    const errOut: Buffer[] = [];
    let outBytes = 0;
    child.stdout.on("data", (chunk: Buffer) => {
      outBytes += chunk.length;
      if (outBytes > MAX_OUTPUT)
        stop(new Error(`${file} gave more than 16 MiB`));
      else out.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => errOut.push(chunk));
    child.on("error", (err) => settle(err));
    child.on("close", (code) =>
      settle(null, {
        code,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(errOut).toString("utf8"),
      }),
    );
    const timer = setTimeout(
      () => stop(new Timeout(`gh timed out after ${ms / 1000} s`)),
      ms,
    );
  });
}

/** One gh call's end. */
export type GhOutcome =
  | { kind: "ok"; json: unknown }
  | { kind: "missing" }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

const firstLine = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean) ?? "";

function outcomeOf(ran: Ran): GhOutcome {
  if (ran.code === 4 || /gh auth login/.test(ran.stderr))
    return { kind: "signed-out" };
  if (ran.code !== 0)
    return {
      kind: "error",
      message: firstLine(ran.stderr) || `gh exited with ${String(ran.code)}`,
    };
  try {
    return { kind: "ok", json: JSON.parse(ran.stdout) as unknown };
  } catch {
    return {
      kind: "error",
      message: `gh's answer wasn't JSON: ${firstLine(ran.stdout)}`,
    };
  }
}

/**
 * Run one allowed read through `command` (`["gh"]`, or the e2e's fake), in
 * `cwd`. Refuses (rejects with GhRefused, starting nothing) any other call.
 */
export async function runGh(
  command: readonly string[],
  args: readonly string[],
  cwd: string,
): Promise<GhOutcome> {
  if (!ghAllowed(args))
    throw new GhRefused(`not one of the shell's gh reads: ${args.join(" ")}`);
  const env = {
    ...process.env,
    GH_PROMPT_DISABLED: "1",
    GH_NO_UPDATE_NOTIFIER: "1",
    NO_COLOR: "1",
  };
  try {
    return outcomeOf(await run([...command, ...args], cwd, env, ghLimitMs()));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT")
      return { kind: "missing" };
    return {
      kind: "error",
      message: firstLine(String((err as Error).message)),
    };
  }
}

/** A GitHub origin, in each form git takes it: `owner/repo`. */
const GITHUB_ORIGIN =
  /^(?:https:\/\/(?:[^@/\s]+@)?github\.com\/|ssh:\/\/git@github\.com(?::\d+)?\/|git@github\.com:)([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/;

/** The origin's `owner/repo` on github.com, or null when it isn't one. */
async function originRepo(repoPath: string): Promise<string | null> {
  const ran = await run(
    ["git", "config", "--get", "remote.origin.url"],
    repoPath,
    { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    GIT_LIMIT_MS,
  ).catch(() => null);
  const match = ran?.code === 0 ? GITHUB_ORIGIN.exec(ran.stdout.trim()) : null;
  const [, owner, repo] = match ?? [];
  if (!owner || !repo || /^\.+$/.test(repo) || owner.startsWith("-"))
    return null;
  return `${owner}/${repo}`;
}

/** A branch name the shell passes to gh: what git's refs allow, no flag. */
const BRANCH = /^(?!-)[A-Za-z0-9._/-]+$/;

/** What one read of a repo's CI gave: gh's answers, or why there are none. */
export type GhRead =
  | {
      gh: "ok";
      /** The display branch read. */
      branch: string;
      /** Its last run (`gh run list --branch`). */
      branchRuns: unknown;
      /** The repo's last 100 runs, for the PRs' heads. */
      runs: unknown;
      /** The open PRs (`gh api .../pulls`). */
      pulls: unknown;
    }
  | {
      gh: "missing" | "signed-out" | "no-github" | "error";
      message: string | null;
    };

const RUN_FIELDS = "databaseId,status,conclusion,headSha,url";
const RUNS_FIELDS = "status,conclusion,headBranch,headSha,workflowName,event";
const PULLS_JQ =
  "[.[] | {number, url: .html_url, ref: .head.ref, sha: .head.sha}]";

/**
 * Read a repo's CI: its display branch's last run, its last 100 runs and its
 * open PRs, three reads at once. A repo whose origin isn't on github.com is
 * `no-github`, and gh never runs.
 */
export async function readGitHub(
  command: readonly string[],
  repoPath: string,
): Promise<GhRead> {
  const [repo, display] = await Promise.all([
    originRepo(repoPath),
    displayBranch(repoPath),
  ]);
  if (!repo) return { gh: "no-github", message: null };
  if (!BRANCH.test(display.name))
    return {
      gh: "error",
      message: "the display branch's name isn't one gh takes",
    };
  const gh = (args: string[]) => runGh(command, args, repoPath);
  const [branchRuns, runs, pulls] = await Promise.all([
    gh([
      "run",
      "list",
      "--repo",
      repo,
      "--branch",
      display.name,
      "--limit",
      "1",
      "--json",
      RUN_FIELDS,
    ]),
    gh([
      "run",
      "list",
      "--repo",
      repo,
      "--limit",
      "100",
      "--json",
      RUNS_FIELDS,
    ]),
    gh([
      "api",
      "--method",
      "GET",
      `repos/${repo}/pulls?state=open&per_page=100`,
      "--jq",
      PULLS_JQ,
    ]),
  ]);
  for (const kind of ["missing", "signed-out", "error"] as const) {
    const failed = [branchRuns, runs, pulls].find((o) => o.kind === kind);
    if (failed)
      return {
        gh: kind,
        message: failed.kind === "error" ? failed.message : null,
      };
  }
  const json = (o: GhOutcome) => (o.kind === "ok" ? o.json : null);
  return {
    gh: "ok",
    branch: display.name,
    branchRuns: json(branchRuns),
    runs: json(runs),
    pulls: json(pulls),
  };
}

/**
 * The command that runs gh: `gh` itself, except under E2E, where it's
 * RACHETARI_GH (a JSON argument array, the fake) and, without it, none at all,
 * so no e2e ever runs the machine's own gh.
 */
export function ghCommand(
  e2e: boolean,
  env: NodeJS.ProcessEnv = process.env,
): string[] | null {
  if (!e2e) return ["gh"];
  try {
    const set: unknown = JSON.parse(env.RACHETARI_GH ?? "");
    const ok =
      Array.isArray(set) &&
      set.length > 0 &&
      set.every((s) => typeof s === "string" && s !== "");
    return ok ? (set as string[]) : null;
  } catch {
    return null;
  }
}
