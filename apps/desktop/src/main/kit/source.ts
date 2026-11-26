// The file source: the only code in the shell that reads a repo. It reads the
// kit's files — CARD.md on card/* branches, BACKLOG.md, cards/done/, nights/,
// skills/INDEX.md and floorplan/ — through git, and never writes to the repo.
// Its one write is fetchRepo, which only updates remote-tracking refs, so the
// other machine's branches appear; nothing here runs it on a timer.
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { DisplayBranch } from "../../shared/ipc";
import { defaultBranch, displayBranch, git, orNone, show } from "./git-run";
import {
  type Backlog,
  type Card,
  type NightCounts,
  parseBacklog,
  parseCard,
  parseChecklist,
  parseNight,
  parseSkills,
  type SkillRow,
} from "./parse";

export { defaultBranch, displayBranch, killTree } from "./git-run";

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

/**
 * The backlog on the display branch, or null when there is none. Its
 * checklist comes from CHECKLIST.md when the branch has one, else from
 * BACKLOG.md's "Repo checklist" (a repo /setup hasn't moved yet).
 */
export async function readBacklog(
  repo: string,
  display?: DisplayBranch | null,
): Promise<Backlog | null> {
  const { ref } = await shown(repo, display);
  const [text, checklist] = await Promise.all([
    show(repo, ref, "BACKLOG.md"),
    show(repo, ref, "CHECKLIST.md"),
  ]);
  if (text === null) return null;
  const backlog = parseBacklog(text);
  return checklist === null
    ? backlog
    : { ...backlog, checklist: parseChecklist(checklist) };
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
