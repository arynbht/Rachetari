// The file source: the only code in the shell that reads a repo. It reads the
// kit's files — CARD.md on card/* branches, BACKLOG.md, cards/done/, nights/,
// skills/INDEX.md and floorplan/ — through git, and never writes to the repo.
// Its one write is fetchRepo, which only updates remote-tracking refs, so the
// other machine's branches appear; nothing here runs it on a timer.
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

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

const run = promisify(execFile);

/** Read-only git: no shell, no prompts, no pager. */
async function git(repo: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", args, {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" },
  });
  return stdout;
}

/** A file's text at a ref, or null when it isn't there. */
async function show(
  repo: string,
  ref: string,
  path: string,
): Promise<string | null> {
  return git(repo, ["show", `${ref}:${path}`]).catch(() => null);
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
    .catch(() => "");
  if (head) return head;
  for (const name of ["main", "master"]) {
    const ok = await git(repo, [
      "rev-parse",
      "--verify",
      "--quiet",
      `refs/heads/${name}`,
    ])
      .then(() => true)
      .catch(() => false);
    if (ok) return name;
  }
  return (await git(repo, ["rev-parse", "--abbrev-ref", "HEAD"])).trim();
}

export interface LiveCard {
  /** The branch the card lives on, e.g. card/T-0012. */
  branch: string;
  /** Where it was read: the working tree, a local branch, or only the remote. */
  where: "checked-out" | "local" | "remote";
  card: Card | null;
  /** Set when the card can't be read, e.g. "unreadable: no card header". */
  error?: string;
  /** When the branch last had a commit (ISO time), or null. */
  lastCommitAt: string | null;
}

/** Every live card: CARD.md in the working tree and on each card/* branch. */
export async function readLiveCards(repo: string): Promise<LiveCard[]> {
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
    const local = /^refs\/heads\/(card\/.+)$/.exec(ref)?.[1];
    const remote = /^refs\/remotes\/[^/]+\/(card\/.+)$/.exec(ref)?.[1];
    const branch = local ?? remote;
    if (!branch) continue;
    const seen = byBranch.get(branch);
    // A local branch wins over its remote-tracking copy.
    if (!seen || (local && seen.where === "remote"))
      byBranch.set(branch, { ref, at, where: local ? "local" : "remote" });
  }
  if (current.startsWith("card/") && !byBranch.has(current))
    byBranch.set(current, {
      ref: `refs/heads/${current}`,
      at: "",
      where: "local",
    });

  const cards: LiveCard[] = [];
  for (const [branch, { ref, at, where }] of byBranch) {
    const checkedOut = branch === current;
    const text = checkedOut
      ? await readFile(join(repo, "CARD.md"), "utf8").catch(() => null)
      : await show(repo, ref, "CARD.md");
    const card = text === null ? null : parseCard(text);
    cards.push({
      branch,
      where: checkedOut ? "checked-out" : where,
      card,
      ...(card
        ? {}
        : {
            error:
              text === null
                ? "unreadable: there is no CARD.md on this branch"
                : "unreadable: CARD.md has no `# T-NNNN · title` and `Status:` line",
          }),
      lastCommitAt: at || null,
    });
  }
  return cards.sort((a, b) => a.branch.localeCompare(b.branch));
}

/** The backlog on the default branch, or null when there is none. */
export async function readBacklog(repo: string): Promise<Backlog | null> {
  const text = await show(repo, await defaultBranch(repo), "BACKLOG.md");
  return text === null ? null : parseBacklog(text);
}

export interface DoneCard {
  id: string;
  title: string;
  status: string;
  pr: number | null;
  /** When the file landed on the default branch (ISO time), or null. */
  closedAt: string | null;
  path: string;
}

/** The finished cards in cards/done/ on the default branch, newest first. */
export async function readDoneCards(repo: string): Promise<DoneCard[]> {
  const ref = await defaultBranch(repo);
  const names = (
    await git(repo, ["ls-tree", "--name-only", `${ref}:cards/done`]).catch(
      () => "",
    )
  )
    .split("\n")
    .filter((n) => n.endsWith(".md"));
  const done: DoneCard[] = [];
  for (const name of names) {
    const path = `cards/done/${name}`;
    const text = await show(repo, ref, path);
    const card = text === null ? null : parseCard(text);
    const closedAt =
      (
        await git(repo, ["log", "-1", "--format=%cI", ref, "--", path]).catch(
          () => "",
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

/** The night reports in nights/ on the default branch, newest first. */
export async function readNights(repo: string): Promise<Night[]> {
  const ref = await defaultBranch(repo);
  const names = (
    await git(repo, ["ls-tree", "--name-only", `${ref}:nights`]).catch(() => "")
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

/** The skills listed in skills/INDEX.md on the default branch. */
export async function readSkills(repo: string): Promise<SkillRow[]> {
  const text = await show(repo, await defaultBranch(repo), "skills/INDEX.md");
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

/** Up to `limit` commits on card/* branches or touching cards/ or nights/, newest first. */
export async function readEvents(
  repo: string,
  limit = 50,
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

  const ref = await defaultBranch(repo);
  const events = new Map<string, RepoEvent>();
  const onDefault = await git(repo, [
    "log",
    `-n${limit}`,
    format,
    ref,
    "--",
    "cards",
    "nights",
  ]).catch(() => "");
  for (const e of parse(onDefault, null)) events.set(e.sha, e);

  const cards = await readLiveCards(repo);
  for (const c of cards) {
    const branchRef =
      c.where === "remote" ? await remoteRef(repo, c.branch) : c.branch;
    if (!branchRef) continue;
    const out = await git(repo, [
      "log",
      `-n${limit}`,
      format,
      branchRef,
      `^${ref}`,
    ]).catch(() => "");
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
  await git(repo, ["fetch", "--all", "--prune", "--quiet"]);
}

/**
 * The commits on a card's branch that aren't on the default branch, newest
 * first; for a card read from cards/done/, the commits that touched its file.
 */
export async function readCardCommits(
  repo: string,
  at: { ref: string } | { path: string },
  limit = 50,
): Promise<RepoEvent[]> {
  const base = await defaultBranch(repo);
  const format = "--format=%H%x09%cI%x09%an%x09%s";
  const args =
    "ref" in at
      ? ["log", `-n${limit}`, format, at.ref, `^${base}`]
      : ["log", `-n${limit}`, format, base, "--", at.path];
  const out = await git(repo, args).catch(() => "");
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

/** A finished card's file on the default branch, parsed; null when it isn't a card. */
export async function readDoneCard(
  repo: string,
  path: string,
): Promise<Card | null> {
  const text = await show(repo, await defaultBranch(repo), path);
  return text === null ? null : parseCard(text);
}

/** The ref a live card's branch is read from: the local branch, or its remote-tracking copy. */
export async function cardRef(
  repo: string,
  card: Pick<LiveCard, "branch" | "where">,
): Promise<string | null> {
  return card.where === "remote" ? remoteRef(repo, card.branch) : card.branch;
}

/** A night report's text on the default branch, or null when there's none. */
export async function readNightText(
  repo: string,
  date: string,
): Promise<string | null> {
  return show(repo, await defaultBranch(repo), `nights/${date}.md`);
}
