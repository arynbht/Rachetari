// The file source: the only code in the shell that reads a repo. It reads the
// kit's files — CARD.md on card/* branches, BACKLOG.md, cards/done/, nights/,
// skills/INDEX.md and floorplan/ — through git, and never writes to the repo.
// Its one write is fetchRepo, which only updates remote-tracking refs, so the
// other machine's branches appear; nothing here runs it on a timer.
import { type ChildProcess, execFile, spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { DisplayBranch } from "../../shared/ipc";
import {
  type Backlog,
  type Card,
  type NightCounts,
  parseBacklog,
  parseCard,
  parseNight,
  parseSkills,
  type SkillRow,
} from "./parse";

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
function orNone<T>(fallback: T): (err: unknown) => T {
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
function killTree(child: ChildProcess): void {
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

/**
 * Read-only git: no shell, no prompts, no pager, and a time limit. It fails
 * as `execFile` does: `Command failed: git <args>` and git's stderr.
 */
function git(
  repo: string,
  args: string[],
  kind: keyof typeof LIMITS = "read",
): Promise<string> {
  const ms = limitMs(kind);
  return new Promise((resolve, reject) => {
    // spawn, not execFile: execFile drops `detached`.
    const child = spawn("git", args, {
      cwd: repo,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      // On POSIX, its own process group, so a timeout can kill the whole tree.
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_OPTIONAL_LOCKS: "0",
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
      if (code === 0) {
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
    const timer = setTimeout(
      () =>
        stop(new GitTimeout(`git ${args[0]} timed out after ${ms / 1000} s`)),
      ms,
    );
  });
}

/** A file's text at a ref, or null when it isn't there. */
async function show(
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

/** The display branch as given, or read now when it wasn't. */
async function shown(
  repo: string,
  display?: DisplayBranch | null,
): Promise<DisplayBranch> {
  return display ?? displayBranch(repo);
}

export interface LiveCard {
  /** The branch the card lives on, e.g. card/T-0012. */
  branch: string;
  /** Where it was read: the working tree, a local branch, or only the remote. */
  where: "checked-out" | "local" | "remote";
  card: Card | null;
  /** Set when no CARD.md has ever been committed on the branch: it is being drafted. */
  drafting?: true;
  /** Set when the card can't be read, e.g. "unreadable: CARD.md doesn't parse …". */
  error?: string;
  /** When the branch last had a commit (ISO time), or null. */
  lastCommitAt: string | null;
}

/** A local card/* branch, or a remote-tracking one: the name after the remote. */
function branchOf(ref: string): { name: string; local: boolean } | null {
  const local = /^refs\/heads\/(card\/.+)$/.exec(ref)?.[1];
  const remote = /^refs\/remotes\/[^/]+\/(card\/.+)$/.exec(ref)?.[1];
  const name = local ?? remote;
  return name ? { name, local: local !== undefined } : null;
}

/** The file names in cards/done/ at a ref; none when it has no such folder. */
async function doneNames(repo: string, ref: string): Promise<string[]> {
  return (
    await git(repo, ["ls-tree", "--name-only", `${ref}:cards/done`]).catch(
      orNone(""),
    )
  )
    .split("\n")
    .filter((n) => n.endsWith(".md"));
}

/**
 * The refs cards/done/ is read from: the display branch first, then the
 * default branch (once, when they're the same).
 */
async function doneRefs(
  repo: string,
  display?: DisplayBranch | null,
): Promise<string[]> {
  const [{ ref }, base] = await Promise.all([
    shown(repo, display),
    defaultBranch(repo),
  ]);
  return ref === base ? [ref] : [ref, base];
}

/** A card/* branch as listed, with its CARD.md's text and the card it parses to. */
interface CardBranch {
  branch: string;
  ref: string;
  at: string;
  where: LiveCard["where"];
  text: string | null;
  card: Card | null;
}

/** Every card/* branch and its CARD.md (from the working tree when checked out). */
async function readCardBranches(repo: string): Promise<CardBranch[]> {
  const current = (
    await git(repo, ["rev-parse", "--abbrev-ref", "HEAD"])
  ).trim();
  const refs = (
    await git(repo, [
      "for-each-ref",
      "--format=%(refname)%09%(committerdate:iso-strict)",
      "refs/heads/card/",
      "refs/remotes/",
    ])
  )
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [ref = "", at = ""] = l.split("\t");
      return { ref, at };
    });

  const byBranch = new Map<
    string,
    { ref: string; at: string; where: LiveCard["where"] }
  >();
  for (const { ref, at } of refs) {
    const card = branchOf(ref);
    if (!card) continue;
    const seen = byBranch.get(card.name);
    // A local branch wins over its remote-tracking copy.
    if (!seen || (card.local && seen.where === "remote"))
      byBranch.set(card.name, {
        ref,
        at,
        where: card.local ? "local" : "remote",
      });
  }
  if (current.startsWith("card/") && !byBranch.has(current))
    byBranch.set(current, {
      ref: `refs/heads/${current}`,
      at: "",
      where: "local",
    });

  const branches: CardBranch[] = [];
  for (const [branch, { ref, at, where }] of byBranch) {
    const checkedOut = branch === current;
    const text = checkedOut
      ? await readFile(join(repo, "CARD.md"), "utf8").catch(() => null)
      : await show(repo, ref, "CARD.md");
    branches.push({
      branch,
      ref,
      at,
      where: checkedOut ? "checked-out" : where,
      text,
      card: text === null ? null : parseCard(text),
    });
  }
  return branches;
}

/**
 * Every live card: CARD.md in the working tree and on each card/* branch. A
 * branch with no readable CARD.md is, in this order: done (its id is in
 * cards/done/ on the display or default branch), and then not a live card at
 * all; drafting (no CARD.md has ever been committed on it); or broken.
 */
export async function readLiveCards(
  repo: string,
  display?: DisplayBranch | null,
): Promise<LiveCard[]> {
  const branches = await readCardBranches(repo);

  // The done ids are read once per read, and only when a branch needs them.
  let doneIds: Promise<Set<string>> | null = null;
  const isDone = async (branch: string): Promise<boolean> => {
    const id = /T-\d{4,}/.exec(branch)?.[0];
    if (!id) return false;
    doneIds ??= doneRefs(repo, display)
      .then((refs) => Promise.all(refs.map((r) => doneNames(repo, r))))
      .then(
        (names) => new Set(names.flat().map((n) => n.replace(/\.md$/, ""))),
      );
    return (await doneIds).has(id);
  };

  const cards: LiveCard[] = [];
  for (const { branch, ref, at, where, text, card } of branches) {
    const live = { branch, where, card, lastCommitAt: at || null };
    if (card) {
      cards.push(live);
      continue;
    }
    if (await isDone(branch)) continue;
    const committed = (
      await git(repo, ["log", "-1", "--format=%H", ref, "--", "CARD.md"]).catch(
        orNone(""),
      )
    ).trim();
    cards.push(
      committed
        ? {
            ...live,
            error:
              text === null
                ? "unreadable: CARD.md was removed from this branch, but the card isn't in cards/done/"
                : "unreadable: CARD.md doesn't parse: it has no `# T-NNNN · title` and `Status:` line",
          }
        : { ...live, drafting: true },
    );
  }
  return cards.sort((a, b) => a.branch.localeCompare(b.branch));
}

/** The backlog on the display branch, or null when there is none. */
export async function readBacklog(
  repo: string,
  display?: DisplayBranch | null,
): Promise<Backlog | null> {
  const { ref } = await shown(repo, display);
  const text = await show(repo, ref, "BACKLOG.md");
  return text === null ? null : parseBacklog(text);
}

export interface DoneCard {
  id: string;
  title: string;
  status: string;
  pr: number | null;
  /** When the file landed on the branch it was read from (ISO time), or null. */
  closedAt: string | null;
  path: string;
}

/**
 * The finished cards in cards/done/ on the display branch and the default
 * branch, newest first. A file on both is read from the display branch.
 */
export async function readDoneCards(
  repo: string,
  display?: DisplayBranch | null,
): Promise<DoneCard[]> {
  const seen = new Set<string>();
  const done: DoneCard[] = [];
  for (const ref of await doneRefs(repo, display))
    for (const name of await doneNames(repo, ref)) {
      const path = `cards/done/${name}`;
      if (seen.has(path)) continue;
      seen.add(path);
      const text = await show(repo, ref, path);
      const card = text === null ? null : parseCard(text);
      const closedAt =
        (
          await git(repo, ["log", "-1", "--format=%cI", ref, "--", path]).catch(
            orNone(""),
          )
        ).trim() || null;
      done.push({
        id: card?.id ?? name.replace(/\.md$/, ""),
        title: card?.title ?? "(unreadable)",
        status: card?.status ?? "unreadable",
        pr: card?.pr ?? null,
        closedAt,
        path,
      });
    }
  return done.sort((a, b) => b.id.localeCompare(a.id));
}

export interface Night extends NightCounts {
  date: string;
  path: string;
}

/** The night reports in nights/ on the display branch, newest first. */
export async function readNights(
  repo: string,
  display?: DisplayBranch | null,
): Promise<Night[]> {
  const { ref } = await shown(repo, display);
  const names = (
    await git(repo, ["ls-tree", "--name-only", `${ref}:nights`]).catch(
      orNone(""),
    )
  )
    .split("\n")
    .filter((n) => n.endsWith(".md"));
  const nights: Night[] = [];
  for (const name of names) {
    const text = await show(repo, ref, `nights/${name}`);
    if (text === null) continue;
    nights.push({
      date: name.replace(/\.md$/, ""),
      path: `nights/${name}`,
      ...parseNight(text),
    });
  }
  return nights.sort((a, b) => b.date.localeCompare(a.date));
}

/** The skills listed in skills/INDEX.md on the display branch. */
export async function readSkills(
  repo: string,
  display?: DisplayBranch | null,
): Promise<SkillRow[]> {
  const { ref } = await shown(repo, display);
  const text = await show(repo, ref, "skills/INDEX.md");
  return text === null ? [] : parseSkills(text);
}

/** Whether the working tree has a map at floorplan/index.html. */
export async function hasMap(repo: string): Promise<boolean> {
  return access(join(repo, "floorplan", "index.html")).then(
    () => true,
    () => false,
  );
}

export interface RepoEvent {
  sha: string;
  at: string;
  author: string;
  subject: string;
  /** The card it belongs to, from its branch or a T-NNNN in its subject. */
  cardId: string | null;
}

/**
 * Up to `limit` commits touching cards/ or nights/ on the display branch, or
 * on card/* branches and not on it, newest first.
 */
export async function readEvents(
  repo: string,
  limit = 50,
  display?: DisplayBranch | null,
): Promise<RepoEvent[]> {
  const format = "--format=%H%x09%cI%x09%an%x09%s%x09%D";
  const parse = (out: string, branchId: string | null): RepoEvent[] =>
    out
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha = "", at = "", author = "", subject = ""] = line.split("\t");
        return {
          sha,
          at,
          author,
          subject,
          cardId: branchId ?? /\bT-\d{4,}\b/.exec(subject)?.[0] ?? null,
        };
      });

  const { ref } = await shown(repo, display);
  const events = new Map<string, RepoEvent>();
  const onDefault = await git(repo, [
    "log",
    `-n${limit}`,
    format,
    ref,
    "--",
    "cards",
    "nights",
  ]).catch(orNone(""));
  for (const e of parse(onDefault, null)) events.set(e.sha, e);

  // Every card branch, done or not: a done branch's commits are still events.
  const branches = await readCardBranches(repo);
  for (const c of branches) {
    const branchRef =
      c.where === "remote" ? await remoteRef(repo, c.branch) : c.branch;
    if (!branchRef) continue;
    const out = await git(repo, [
      "log",
      `-n${limit}`,
      format,
      branchRef,
      `^${ref}`,
    ]).catch(orNone(""));
    const id = c.card?.id ?? /T-\d{4,}/.exec(c.branch)?.[0] ?? null;
    for (const e of parse(out, id))
      if (!events.has(e.sha)) events.set(e.sha, e);
  }
  return [...events.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

async function remoteRef(repo: string, branch: string): Promise<string | null> {
  const out = await git(repo, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/remotes/",
  ]);
  return (
    out
      .split("\n")
      .find((r) =>
        new RegExp(
          `^refs/remotes/[^/]+/${branch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        ).test(r),
      ) ?? null
  );
}

/**
 * Fetch every remote, so the other machine's card branches appear. The shell's
 * one git write: it only updates remote-tracking refs, never a branch or a file.
 */
export async function fetchRepo(repo: string): Promise<void> {
  await git(repo, ["fetch", "--all", "--prune", "--quiet"], "fetch");
}

/**
 * The commits on a card's branch that aren't on the display branch, newest
 * first; for a card read from cards/done/, the commits that touched its file
 * on the display branch (on the default branch when it has none).
 */
export async function readCardCommits(
  repo: string,
  at: { ref: string } | { path: string },
  limit = 50,
  display?: DisplayBranch | null,
): Promise<RepoEvent[]> {
  const [{ ref: base }, fallback] = await Promise.all([
    shown(repo, display),
    "path" in at ? defaultBranch(repo) : null,
  ]);
  const format = "--format=%H%x09%cI%x09%an%x09%s";
  const touching = (ref: string) =>
    "path" in at
      ? git(repo, ["log", `-n${limit}`, format, ref, "--", at.path]).catch(
          orNone(""),
        )
      : "";
  let out =
    "ref" in at
      ? await git(repo, [
          "log",
          `-n${limit}`,
          format,
          at.ref,
          `^${base}`,
        ]).catch(orNone(""))
      : await touching(base);
  if (fallback && fallback !== base && !out.trim())
    out = await touching(fallback);
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha = "", when = "", author = "", subject = ""] = line.split("\t");
      return {
        sha,
        at: when,
        author,
        subject,
        cardId: /\bT-\d{4,}\b/.exec(subject)?.[0] ?? null,
      };
    });
}

/**
 * A finished card's file on the display branch, else on the default branch,
 * parsed; null when it isn't a card.
 */
export async function readDoneCard(
  repo: string,
  path: string,
  display?: DisplayBranch | null,
): Promise<Card | null> {
  let text: string | null = null;
  for (const ref of await doneRefs(repo, display)) {
    text = await show(repo, ref, path);
    if (text !== null) break;
  }
  return text === null ? null : parseCard(text);
}

/** The ref a live card's branch is read from: the local branch, or its remote-tracking copy. */
export async function cardRef(
  repo: string,
  card: Pick<LiveCard, "branch" | "where">,
): Promise<string | null> {
  return card.where === "remote" ? remoteRef(repo, card.branch) : card.branch;
}

/** A night report's text on the display branch, or null when there's none. */
export async function readNightText(
  repo: string,
  date: string,
  display?: DisplayBranch | null,
): Promise<string | null> {
  const { ref } = await shown(repo, display);
  return show(repo, ref, `nights/${date}.md`);
}
