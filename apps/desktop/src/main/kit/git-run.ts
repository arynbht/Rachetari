// The git-running plumbing for the file source: limits, the timeout, process-
// tree kill, and the read-only git calls built on them. source.ts re-exports
// the public names; nothing here imports from source.ts.
import { type ChildProcess, execFile, spawn } from "node:child_process";

import type { DisplayBranch } from "../../shared/ipc";

/**
 * How long a git call may take before it's killed: the one place the limits
 * are set. Each can be overridden through its env var, read at call time.
 */
const LIMITS = {
  read: { env: "RIVETARI_GIT_READ_LIMIT_MS", ms: 10_000 },
  fetch: { env: "RIVETARI_GIT_FETCH_LIMIT_MS", ms: 60_000 },
} as const;

function limitMs(kind: keyof typeof LIMITS): number {
  const { env, ms } = LIMITS[kind];
  const set = Number(process.env[env]);
  return Number.isFinite(set) && set > 0 ? set : ms;
}

/** A git call that passed its limit: never read as "not there". */
class GitTimeout extends Error {}

/**
 * A catch-all for a read whose failure means "not there": it gives `fallback`,
 * but passes a timeout on.
 */
export function orNone<T>(fallback: T): (err: unknown) => T {
  return (err) => {
    if (err instanceof GitTimeout) throw err;
    return fallback;
  };
}

/**
 * Kill git and everything it started: a fetch's sub-fetch and remote helper
 * outlive git itself and hold its remote connection (and, on Linux, any pipe
 * git inherited, so the shell can't exit) until the remote closes it.
 */
export function killTree(child: ChildProcess): void {
  const { pid } = child;
  if (pid === undefined) return;
  if (process.platform === "win32") {
    execFile("taskkill", ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
    }).on("error", () => child.kill());
    return;
  }
  // git leads its own process group (spawned detached): signal the group.
  const signalGroup = (signal: NodeJS.Signals) => {
    try {
      process.kill(-pid, signal);
    } catch {
      // The group is gone already.
    }
  };
  signalGroup("SIGTERM");
  setTimeout(() => signalGroup("SIGKILL"), 5000).unref();
}

/** The most stdout a git call may give before it's stopped. */
const MAX_OUTPUT = 16 * 1024 * 1024;

/** Optional extras for a git call; none changes what a call without them does. */
export interface GitOptions {
  /** Text written to git's stdin (stdin is closed and empty without it). */
  input?: string;
  /** Env vars set on top of the usual ones. */
  env?: NodeJS.ProcessEnv;
  /** Non-zero exit codes that count as success. */
  okCodes?: number[];
}

/**
 * Git: no shell, no prompts, no pager, and a time limit. It fails as
 * `execFile` does: `Command failed: git <args>` and git's stderr.
 */
export function git(
  repo: string,
  args: string[],
  kind: keyof typeof LIMITS = "read",
  opts: GitOptions = {},
): Promise<string> {
  const ms = limitMs(kind);
  return new Promise((resolve, reject) => {
    // spawn, not execFile: execFile drops `detached`.
    const child = spawn("git", args, {
      cwd: repo,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      // On POSIX, its own process group, so a timeout can kill the whole tree.
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_OPTIONAL_LOCKS: "0",
        ...opts.env,
      },
    });
    let settled = false;
    const settle = (err: Error | null, stdout = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(stdout);
    };
    // Stop git and let go of its pipes rather than wait for them to close.
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
        stop(new RangeError(`git ${args[0]} gave more than 16 MiB`));
      else out.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => errOut.push(chunk));
    child.on("error", (err) => settle(err));
    child.on("close", (code, signal) => {
      if (code === 0 || (code !== null && opts.okCodes?.includes(code))) {
        settle(null, Buffer.concat(out).toString("utf8"));
        return;
      }
      const stderr = Buffer.concat(errOut).toString("utf8");
      const err = Object.assign(
        new Error(`Command failed: git ${args.join(" ")}
${stderr}`),
        { code, signal, stderr },
      );
      settle(err);
    });
    // Closed at once without input, so git never waits on it.
    child.stdin.on("error", () => undefined);
    child.stdin.end(opts.input);
    const timer = setTimeout(
      () =>
        stop(new GitTimeout(`git ${args[0]} timed out after ${ms / 1000} s`)),
      ms,
    );
  });
}

/** A file's text at a ref, or null when it isn't there. */
export async function show(
  repo: string,
  ref: string,
  path: string,
): Promise<string | null> {
  return git(repo, ["show", `${ref}:${path}`]).catch(orNone(null));
}

/** The default branch: origin's HEAD, else main or master, else the current branch. */
export async function defaultBranch(repo: string): Promise<string> {
  const head = await git(repo, [
    "symbolic-ref",
    "--quiet",
    "--short",
    "refs/remotes/origin/HEAD",
  ])
    .then((s) => s.trim())
    .catch(orNone(""));
  if (head) return head;
  for (const name of ["main", "master"]) {
    const ok = await git(repo, [
      "rev-parse",
      "--verify",
      "--quiet",
      `refs/heads/${name}`,
    ])
      .then(() => true)
      .catch(orNone(false));
    if (ok) return name;
  }
  return (await git(repo, ["rev-parse", "--abbrev-ref", "HEAD"])).trim();
}

/** A ref's commit, or null when there's no such ref. */
async function commitOf(repo: string, ref: string): Promise<string | null> {
  return (
    (
      await git(repo, [
        "rev-parse",
        "--verify",
        "--quiet",
        `${ref}^{commit}`,
      ]).catch(orNone(""))
    ).trim() || null
  );
}

/** Whether commit `a` is `b` or an ancestor of it. */
async function isAncestor(
  repo: string,
  a: string,
  b: string,
): Promise<boolean> {
  return git(repo, ["merge-base", "--is-ancestor", a, b])
    .then(() => true)
    .catch(orNone(false));
}

const LOCAL_DEVELOP = "refs/heads/develop";
const ORIGIN_DEVELOP = "refs/remotes/origin/develop";

/**
 * The branch the shell shows: `develop`, from whichever of local `develop` and
 * `origin/develop` is newer (a descendant of the other), local when they're
 * the same commit or have diverged (`diverged` then says so); the default
 * branch when there's no `develop` at all. It reads local refs only.
 */
export async function displayBranch(repo: string): Promise<DisplayBranch> {
  const [local, origin] = await Promise.all([
    commitOf(repo, LOCAL_DEVELOP),
    commitOf(repo, ORIGIN_DEVELOP),
  ]);
  const develop = (ref: string, diverged = false): DisplayBranch => ({
    name: "develop",
    ref,
    diverged,
  });
  if (!local && !origin) {
    const ref = await defaultBranch(repo);
    return { name: ref.replace(/^origin\//, ""), ref, diverged: false };
  }
  if (!origin) return develop(LOCAL_DEVELOP);
  if (!local) return develop(ORIGIN_DEVELOP);
  if (local === origin || (await isAncestor(repo, origin, local)))
    return develop(LOCAL_DEVELOP);
  if (await isAncestor(repo, local, origin)) return develop(ORIGIN_DEVELOP);
  return develop(LOCAL_DEVELOP, true);
}
