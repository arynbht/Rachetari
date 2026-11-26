#!/usr/bin/env node
// The live shell: keeps a worktree on `develop` and runs the desktop shell from
// it as `electron-vite dev --watch`, so each new develop commit reaches the
// running app without a relaunch. Every 30 s it fetches, and when develop moved
// it builds and unit-tests the new commit in a scratch worktree, fast-forwarding
// the live one only if both pass. The result goes to a status file.
//
// DEV MODE, FOR THIS MACHINE ONLY. The dev server loosens the app's security
// policy (see --help). This file lives outside out/**, and electron-builder.yml
// packs only out/** and package.json, so it is never packaged or shipped.

import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath } from "node:url";

const FETCH_TIMEOUT_MS = 60_000;
const INTERVAL_MS = 30_000;
const TAIL_LINES = 20;
const INSTALL = ["install", "--frozen-lockfile", "--prefer-offline"];
const BUILD = ["--filter", "@arynbht/rachetari-desktop", "build"];
const TEST = [
  "exec",
  "vitest",
  "run",
  "apps/desktop",
  "--coverage.enabled=false",
];
// A change to any of these needs an install in the live worktree and a fresh
// dev server: the watcher can't pick up new dependencies or its own config.
const RESTART_FILES =
  /^(pnpm-lock\.yaml|(.+\/)?package\.json|apps\/desktop\/electron\.vite\.config\.ts)$/;

export const HELP = `live-shell: run the desktop shell from a worktree that follows develop.

Start (from the main checkout, with any other copy of the shell closed):
  node apps/desktop/scripts/live-shell.mjs

  Keeps .claude/worktrees/shell-live on develop (the newer of local develop and
  origin/develop) and runs \`electron-vite dev --watch\` there. Every 30 s it
  fetches origin develop; when develop moved it installs, builds and unit-tests
  the new commit in .claude/worktrees/shell-live-check and fast-forwards the
  live worktree only if all pass. Renderer changes arrive by HMR, preload
  changes by a renderer reload, main-process changes by an app restart.
  Status: .claude/live-shell/status.json (passed to the shell as
  RACHETARI_LIVE_STATUS).

Stop:
  Ctrl+C, or close the shell's window. Either stops the dev server and every
  process this script started.

Back to the normal build:
  Stop it, then in the main checkout run
    pnpm --filter @arynbht/rachetari-desktop preview
  which runs \`electron-vite build\` and starts the production bundle under the
  strict policy. The two worktrees can stay; to delete them:
    git worktree remove .claude/worktrees/shell-live
    git worktree remove .claude/worktrees/shell-live-check

DEV MODE, FOR THIS MACHINE ONLY. The dev server loosens the app's security
policy: the CSP allows 'unsafe-inline' and 'unsafe-eval' scripts and
ws:/http://localhost connections, the renderer loads from Vite's localhost
server, apps/desktop/.env is loaded, DevTools open, and Electron runs without
the fuses set at package time. This script is never packaged or shipped.

Options:
  --repo <path>  the repository to follow (default: the main checkout of the
                 repository containing the current directory)
  --once         set up, run one check, write the status and exit; no shell
  --help         this text`;

// Terminal colour and cursor codes (ESC [ ... letter); built from a char code
// because ESLint forbids control characters in regex literals.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`, "g");

/** The last `n` lines of `output` as plain text, without trailing blank lines. */
export function tail(output, n) {
  const all = output
    .replace(ANSI, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+$/, "")
    .split("\n");
  return all.slice(-n).join("\n");
}

const short = (sha) => sha.slice(0, 7);
const firstLine = (output) => output.trim().split(/\r?\n/)[0] ?? "";

/**
 * One check. Pure but for `run`, which runs a command and resolves to
 * `{ code, output }` (a fake one in tests). `previous` is the last status, or
 * null. Resolves to the actions taken, the new status, and whether the dev
 * server must restart.
 */
export async function checkOnce({ run, repo, live, check, previous, now }) {
  const actions = [];
  const git = (cwd, ...args) => run("git", args, { cwd });
  const pnpm = (cwd, args) => run("pnpm", args, { cwd });
  const isAncestor = async (a, b) =>
    (await git(repo, "merge-base", "--is-ancestor", a, b)).code === 0;

  actions.push("fetch");
  const fetched = await run("git", ["fetch", "--quiet", "origin", "develop"], {
    cwd: repo,
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  const fetchError =
    fetched.code === 0
      ? null
      : fetched.timedOut
        ? `git fetch timed out after ${FETCH_TIMEOUT_MS / 1000} s`
        : tail(fetched.output, 1) || `git fetch exited ${fetched.code}`;

  const running = firstLine((await git(live, "rev-parse", "HEAD")).output);
  const refOf = async (ref) => {
    const r = await git(repo, "rev-parse", "--verify", "--quiet", ref);
    return r.code === 0 ? firstLine(r.output) : null;
  };
  const local = await refOf("refs/heads/develop");
  const origin = await refOf("refs/remotes/origin/develop");

  const status = (develop, failure, at = running) => ({
    running: at,
    develop,
    checkedAt: now(),
    fetchError,
    failure,
  });
  const failed = (develop, sha, step, reason) => {
    actions.push("failed");
    return {
      actions,
      restartDev: false,
      status: status(develop, { sha, step, reason, at: now() }),
    };
  };

  let target;
  if (local && origin && local !== origin) {
    if (await isAncestor(local, origin)) target = origin;
    else if (await isAncestor(origin, local)) target = local;
    else {
      return failed(
        null,
        local,
        "diverged",
        `local develop ${short(local)} and origin/develop ${short(origin)} have diverged; nothing moves until one contains the other`,
      );
    }
  } else {
    target = local ?? origin;
  }
  if (!target) {
    actions.push("no-develop");
    return {
      actions,
      restartDev: false,
      status: status(null, previous?.failure ?? null),
    };
  }

  if (target === running) {
    actions.push("unmoved");
    return { actions, restartDev: false, status: status(target, null) };
  }
  const prior = previous?.failure;
  if (
    prior &&
    prior.sha === target &&
    ["install", "build", "test"].includes(prior.step)
  ) {
    actions.push("already-failed");
    return { actions, restartDev: false, status: status(target, prior) };
  }
  if (!(await isAncestor(running, target))) {
    return failed(
      target,
      target,
      "not-forward",
      `develop ${short(target)} does not descend from the running ${short(running)}; the live shell only moves forward`,
    );
  }
  const dirty = await git(live, "status", "--porcelain");
  if (dirty.output.trim() !== "") {
    return failed(
      target,
      target,
      "dirty",
      `the live worktree has local changes:\n${tail(dirty.output, TAIL_LINES - 1)}`,
    );
  }

  actions.push("check");
  const steps = [
    ["install", () => git(check, "checkout", "--detach", "--force", target)],
    ["install", () => pnpm(check, INSTALL)],
    ["build", () => pnpm(check, BUILD)],
    ["test", () => pnpm(check, TEST)],
  ];
  for (const [step, go] of steps) {
    const r = await go();
    if (r.code !== 0) {
      return failed(
        target,
        target,
        step,
        tail(r.output, TAIL_LINES) || `exited ${r.code}`,
      );
    }
  }

  const changed = (
    await git(repo, "diff", "--name-only", running, target)
  ).output
    .split(/\r?\n/)
    .filter((f) => RESTART_FILES.test(f.trim()));
  const moved = await git(live, "checkout", "--detach", target);
  if (moved.code !== 0) {
    return failed(target, target, "dirty", tail(moved.output, TAIL_LINES));
  }
  actions.push("fast-forward");
  let restartDev = false;
  if (changed.length > 0) {
    actions.push("install-live");
    const installed = await pnpm(live, INSTALL);
    actions.push("restart-dev");
    restartDev = true;
    if (installed.code !== 0) {
      return {
        actions,
        restartDev,
        status: status(
          target,
          {
            sha: target,
            step: "install",
            reason: tail(installed.output, TAIL_LINES),
            at: now(),
          },
          target,
        ),
      };
    }
  }
  return { actions, restartDev, status: status(target, null, target) };
}

// ---------------------------------------------------------------------------
// Everything below runs only when this file is the entry point.

const isWindows = process.platform === "win32";
const children = new Set();

function log(message) {
  const time = new Date().toTimeString().slice(0, 8);
  console.log(`[live-shell ${time}] ${message}`);
}

/** Stops a child and everything it started. */
function killTree(child, signal = "SIGTERM") {
  if (!child || child.pid === undefined) return;
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    try {
      process.kill(-child.pid, signal); // its own process group
    } catch {
      // already gone
    }
  }
}

/**
 * Spawns a command in its own process group (POSIX) or under cmd.exe
 * (Windows, where pnpm is a .cmd that Node won't spawn without a shell).
 */
function spawnTracked(cmd, args, { cwd, env, stdio = "pipe" }) {
  const viaShell = isWindows && cmd !== "git";
  const child = viaShell
    ? spawn([cmd, ...args].join(" "), {
        cwd,
        env,
        stdio,
        shell: true,
        windowsHide: true,
      })
    : spawn(cmd, args, {
        cwd,
        env,
        stdio,
        detached: !isWindows,
        windowsHide: true,
      });
  children.add(child);
  child.on("exit", () => children.delete(child));
  return child;
}

/** The real runner: output is stdout and stderr together. */
function realRun(cmd, args, { cwd, timeoutMs }) {
  return new Promise((done) => {
    let output = "";
    let timedOut = false;
    const child = spawnTracked(cmd, args, { cwd });
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    const timer =
      timeoutMs === undefined
        ? null
        : setTimeout(() => {
            timedOut = true;
            killTree(child, "SIGKILL");
          }, timeoutMs);
    child.on("error", (e) => {
      output += String(e);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      done({ code: code ?? 1, output, timedOut });
    });
  });
}

async function step(label, cmd, args, opts) {
  const started = Date.now();
  log(`${label}: ${cmd} ${args.join(" ")}`);
  const r = await realRun(cmd, args, opts);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (r.code !== 0) {
    log(`${label} failed (${secs} s):\n${tail(r.output, TAIL_LINES)}`);
  } else {
    log(`${label} ok (${secs} s)`);
  }
  return r;
}

/** The runner the check uses: the real one, logging each command. */
function loggedRun(cmd, args, opts) {
  if (cmd === "git") return realRun(cmd, args, opts);
  return step(basename(opts.cwd), cmd, args, opts);
}

function parseArgs(argv) {
  const opts = { repo: null, once: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--once") opts.once = true;
    else if (a === "--repo") opts.repo = argv[++i] ?? null;
    else throw new Error(`unknown option ${a} (try --help)`);
  }
  return opts;
}

/** The main checkout of the repository containing `from`. */
async function mainCheckout(from) {
  const r = await realRun(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: from },
  );
  if (r.code !== 0) throw new Error(`not a git repository: ${from}`);
  return dirname(firstLine(r.output));
}

function writeStatus(file, status) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(status, null, 2)}\n`);
  renameSync(temp, file);
}

function readStatus(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** Creates the two worktrees if missing, and installs in the live one. */
async function setUp({ repo, live, check }) {
  await realRun("git", ["fetch", "--quiet", "origin", "develop"], {
    cwd: repo,
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  const ref = async (r) => {
    const out = await realRun("git", ["rev-parse", "--verify", "--quiet", r], {
      cwd: repo,
    });
    return out.code === 0 ? firstLine(out.output) : null;
  };
  const local = await ref("refs/heads/develop");
  const origin = await ref("refs/remotes/origin/develop");
  let start = local ?? origin;
  if (local && origin && local !== origin) {
    const r = await realRun(
      "git",
      ["merge-base", "--is-ancestor", local, origin],
      { cwd: repo },
    );
    if (r.code === 0) start = origin;
  }
  if (!start) throw new Error(`${repo} has no develop or origin/develop`);

  await realRun("git", ["worktree", "prune"], { cwd: repo });
  for (const dir of [live, check]) {
    if (existsSync(dir)) continue;
    log(`creating ${dir} at ${short(start)}`);
    const r = await realRun(
      "git",
      ["worktree", "add", "--detach", dir, start],
      { cwd: repo },
    );
    if (r.code !== 0) throw new Error(`git worktree add failed:\n${r.output}`);
  }
  if (!existsSync(join(live, "node_modules"))) {
    const r = await step("install (live)", "pnpm", INSTALL, { cwd: live });
    if (r.code !== 0)
      throw new Error("pnpm install in the live worktree failed");
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(HELP);
    return;
  }
  const repo = await mainCheckout(resolve(opts.repo ?? process.cwd()));
  const live = join(repo, ".claude", "worktrees", "shell-live");
  const check = join(repo, ".claude", "worktrees", "shell-live-check");
  const statusFile = join(repo, ".claude", "live-shell", "status.json");
  log(`pid ${process.pid}, following develop in ${repo}`);

  let dev = null;
  let stopping = false;

  const stopAll = (signal = "SIGTERM") => {
    killTree(dev, signal);
    for (const child of children) killTree(child, signal);
  };
  const stop = (why, code) => {
    if (stopping) return;
    stopping = true;
    log(`stopping (${why})`);
    stopAll();
    if (!isWindows) {
      // SIGTERM first; whatever is left a moment later is killed outright.
      setTimeout(() => {
        stopAll("SIGKILL");
        process.exit(code);
      }, 2000).unref();
      const waitForDev = () => {
        if (!dev || dev.exitCode !== null || dev.signalCode !== null) {
          process.exit(code);
        }
      };
      if (dev) dev.on("exit", waitForDev);
      waitForDev();
    } else {
      process.exit(code);
    }
  };
  // Ctrl+C, a kill, or the terminal window closing (SIGHUP; on Windows also
  // Ctrl+Break) all take every child down with the script.
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
    process.on(signal, () => stop(signal, 130));
  }
  process.on("exit", () => stopAll("SIGKILL"));

  await setUp({ repo, live, check });

  const startDev = () => {
    log(`starting electron-vite dev --watch in ${live}`);
    const child = spawnTracked(
      "pnpm",
      ["exec", "electron-vite", "dev", "--watch"],
      {
        cwd: join(live, "apps", "desktop"),
        env: { ...process.env, RACHETARI_LIVE_STATUS: statusFile },
      },
    );
    const relay = (stream) => {
      let rest = "";
      stream.on("data", (d) => {
        const text = rest + d;
        const lines = text.split(/\r?\n/);
        rest = lines.pop() ?? "";
        for (const line of lines) console.log(`[dev] ${line}`);
      });
    };
    relay(child.stdout);
    relay(child.stderr);
    child.on("exit", (code) => {
      if (dev !== child || stopping) return; // a restart, or already stopping
      stop(`the shell exited${code === null ? "" : ` with code ${code}`}`, 0);
    });
    dev = child;
  };
  const restartDev = async () => {
    const old = dev;
    dev = null;
    if (old) {
      const gone = new Promise((done) => old.once("exit", done));
      killTree(old);
      await gone;
    }
    startDev();
  };

  const runCheck = async () => {
    const result = await checkOnce({
      run: loggedRun,
      repo,
      live,
      check,
      previous: readStatus(statusFile),
      now: () => new Date().toISOString(),
    });
    writeStatus(statusFile, result.status);
    const s = result.status;
    log(
      `check: ${result.actions.join(", ")}; running ${short(s.running)}, develop ${s.develop ? short(s.develop) : "none"}` +
        (s.fetchError ? `; fetch failed: ${s.fetchError}` : "") +
        (s.failure
          ? `; ${s.failure.step} failed for ${short(s.failure.sha)}:\n${s.failure.reason}`
          : ""),
    );
    return result;
  };

  if (opts.once) {
    await runCheck();
    const head = await realRun("git", ["rev-parse", "HEAD"], { cwd: live });
    log(`running commit ${firstLine(head.output)}`);
    return;
  }

  const head = await realRun("git", ["rev-parse", "HEAD"], { cwd: live });
  log(`running commit ${firstLine(head.output)}`);
  startDev();
  const loop = async () => {
    if (stopping) return;
    try {
      const result = await runCheck();
      if (result.restartDev && !stopping) await restartDev();
    } catch (e) {
      log(`check failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!stopping) setTimeout(loop, INTERVAL_MS);
  };
  void loop();
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((e) => {
    log(e instanceof Error ? e.message : String(e));
    for (const child of children) killTree(child, "SIGKILL");
    process.exit(1);
  });
}
