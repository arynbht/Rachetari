// The shell's one write path: a plain commit that changes CARD.md on a card's
// branch, shown first and refused when it isn't safe. Mark ready uses it here;
// answering a question (T-0054) passes its own `CardEdit`.
//
// The rules (owner, 2026-11-25):
//  - the diff is shown before every write: `previewCardCommit` returns it and
//    `applyCardCommit` writes only when handed that same diff back;
//  - a card "Held by" anyone is refused, naming who;
//  - a branch checked out in a clean worktree is committed there; a dirty
//    worktree refuses, naming it; a branch checked out nowhere is committed
//    without a checkout (git plumbing, a compare-and-swap on the ref);
//  - a branch ref is never moved underneath a worktree;
//  - the push is fast-forward only, never forced; behind origin is refused.
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  MarkReadyApplyRequest,
  MarkReadyPreview,
  MarkReadyPreviewRequest,
  MarkReadyResult,
  IpcChannel,
} from "../../shared/ipc";
import { parseCard } from "../kit/parse";

/** What a caller wants changed in CARD.md. */
export interface CardEdit {
  /** The commit message. */
  message: string;
  /** The new CARD.md text, or `{ refuse }` with the reason it can't be made. */
  edit(text: string): string | { refuse: string };
}

export type Refused = { ok: false; reason: string };
export type CardPreview = { ok: true; diff: string } | Refused;
export type CardApplied =
  | { ok: true; commit: string; where: "worktree" | "branch"; pushed: boolean }
  | Refused;

/** Mark ready: Status draft to ready, nothing else. */
export const markReady: CardEdit = {
  message: "docs(card): mark ready",
  edit(text) {
    const status = /^Status:\s*(\S+)/m.exec(text)?.[1];
    if (status !== "draft")
      return {
        refuse: `the card's status is ${status ?? "missing"}, not draft`,
      };
    return text.replace(/^(Status:[ \t]*)draft\b/m, "$1ready");
  },
};

const CARD_FILE = "CARD.md";
const BRANCH = /^card\/[A-Za-z0-9._-]+$/;
const LIMIT_MS = 60_000;

function git(
  cwd: string,
  args: string[],
  opts: { input?: string; env?: NodeJS.ProcessEnv; okCodes?: number[] } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "git",
      args,
      {
        cwd,
        encoding: "utf8",
        windowsHide: true,
        timeout: LIMIT_MS,
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...opts.env },
      },
      (err, stdout, stderr) => {
        const code = (err as { code?: unknown } | null)?.code;
        if (!err || (typeof code === "number" && opts.okCodes?.includes(code)))
          resolve(stdout);
        else
          reject(
            new Error(`git ${args[0] ?? ""} failed: ${stderr || err.message}`),
          );
      },
    );
    if (opts.input !== undefined) child.stdin?.end(opts.input);
  });
}

const succeeds = (p: Promise<unknown>): Promise<boolean> =>
  p.then(
    () => true,
    () => false,
  );

interface Plan {
  before: string;
  after: string;
  /** The (clean) worktree that has the branch checked out, else null. */
  worktree: string | null;
  localTip: string;
  hasOrigin: boolean;
}

/** The worktree that has `branch` checked out, from `git worktree list`. */
async function worktreeOf(
  repo: string,
  branch: string,
): Promise<string | null> {
  const list = await git(repo, ["worktree", "list", "--porcelain"]);
  for (const block of list.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/);
    if (lines.includes(`branch refs/heads/${branch}`)) {
      const path = lines.find((l) => l.startsWith("worktree "));
      if (path) return path.slice("worktree ".length);
    }
  }
  return null;
}

/** Every check, before anything is written: the plan, or why not. */
async function plan(
  repo: string,
  branch: string,
  change: CardEdit,
): Promise<Plan | Refused> {
  const no = (reason: string): Refused => ({ ok: false, reason });
  if (!BRANCH.test(branch)) return no(`${branch} is not a card branch`);
  const ref = `refs/heads/${branch}`;
  const localTip = (
    await git(repo, ["rev-parse", "--verify", "--quiet", ref]).catch(() => "")
  ).trim();
  if (!localTip)
    return no(`there is no local ${branch}; fetch and check it out first`);

  const before = await git(repo, ["show", `${ref}:${CARD_FILE}`]).catch(
    () => null,
  );
  const card = before === null ? null : parseCard(before);
  if (before === null || !card)
    return no(`${branch} has no readable ${CARD_FILE}`);
  if (card.heldBy) return no(`the card is held by ${card.heldBy}`);

  const worktree = await worktreeOf(repo, branch);
  if (worktree) {
    const dirty = (await git(worktree, ["status", "--porcelain"])).trim();
    if (dirty) return no(`the worktree ${worktree} has uncommitted changes`);
  }

  // Behind origin: what the origin has on this branch must be in the local one.
  const hasOrigin = await succeeds(git(repo, ["remote", "get-url", "origin"]));
  if (hasOrigin) {
    const line = await git(repo, ["ls-remote", "origin", ref]).catch(
      () => null,
    );
    const remoteTip =
      line === null
        ? (
            await git(repo, [
              "rev-parse",
              "--verify",
              "--quiet",
              `refs/remotes/origin/${branch}`,
            ]).catch(() => "")
          ).trim()
        : (line.split(/\s/)[0] ?? "");
    if (
      remoteTip &&
      !(await succeeds(
        git(repo, ["merge-base", "--is-ancestor", remoteTip, localTip]),
      ))
    )
      return no(`${branch} is behind origin; update it first`);
  }

  const after = change.edit(before);
  if (typeof after !== "string") return no(after.refuse);
  if (after === before) return no("the edit changes nothing");
  return { before, after, worktree, localTip, hasOrigin };
}

/** The unified diff of CARD.md, before and after. */
async function diffOf(before: string, after: string): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "card-diff-"));
  try {
    mkdirSync(join(dir, "old"));
    mkdirSync(join(dir, "new"));
    writeFileSync(join(dir, "old", CARD_FILE), before);
    writeFileSync(join(dir, "new", CARD_FILE), after);
    const raw = await git(
      dir,
      [
        "diff",
        "--no-index",
        "--no-color",
        "--no-prefix",
        `old/${CARD_FILE}`,
        `new/${CARD_FILE}`,
      ],
      { okCodes: [1] },
    );
    // Name the file as the repo has it, not the temp folders.
    return raw
      .replaceAll(`old/${CARD_FILE}`, CARD_FILE)
      .replaceAll(`new/${CARD_FILE}`, CARD_FILE);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** What the commit would change. Writes nothing. */
export async function previewCardCommit(
  repo: string,
  branch: string,
  change: CardEdit,
): Promise<CardPreview> {
  const p = await plan(repo, branch, change);
  if (!("before" in p)) return p;
  return { ok: true, diff: await diffOf(p.before, p.after) };
}

/**
 * Commit the change and push it. `shownDiff` is the diff the person saw from
 * `previewCardCommit`; if the card has changed since, nothing is written.
 */
export async function applyCardCommit(
  repo: string,
  branch: string,
  change: CardEdit,
  shownDiff: string,
): Promise<CardApplied> {
  const p = await plan(repo, branch, change);
  if (!("before" in p)) return p;
  if ((await diffOf(p.before, p.after)) !== shownDiff)
    return { ok: false, reason: "the card changed since the diff was shown" };

  let commit: string;
  if (p.worktree) {
    writeFileSync(join(p.worktree, CARD_FILE), p.after);
    await git(p.worktree, ["add", "--", CARD_FILE]);
    await git(p.worktree, [
      "commit",
      "-q",
      "-m",
      change.message,
      "--",
      CARD_FILE,
    ]);
    commit = (await git(p.worktree, ["rev-parse", "HEAD"])).trim();
  } else {
    commit = await commitWithoutCheckout(repo, branch, p, change.message);
  }

  let pushed = false;
  if (p.hasOrigin) {
    // No --force: a remote that moved since the check rejects this.
    const done = await succeeds(
      git(repo, [
        "push",
        "origin",
        `refs/heads/${branch}:refs/heads/${branch}`,
      ]),
    );
    if (!done)
      return {
        ok: false,
        reason: `committed ${commit.slice(0, 7)} locally, but the push was refused (not a fast-forward); nothing was forced`,
      };
    pushed = true;
  }
  return {
    ok: true,
    commit,
    where: p.worktree ? "worktree" : "branch",
    pushed,
  };
}

/** A commit on a branch nothing has checked out: a temp index, then a guarded ref update. */
async function commitWithoutCheckout(
  repo: string,
  branch: string,
  p: Plan,
  message: string,
): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "card-index-"));
  const env = { GIT_INDEX_FILE: join(dir, "index") };
  try {
    const blob = (
      await git(repo, ["hash-object", "-w", "--stdin"], { input: p.after })
    ).trim();
    await git(repo, ["read-tree", p.localTip], { env });
    await git(
      repo,
      ["update-index", "--cacheinfo", `100644,${blob},${CARD_FILE}`],
      { env },
    );
    const tree = (await git(repo, ["write-tree"], { env })).trim();
    const commit = (
      await git(repo, ["commit-tree", tree, "-p", p.localTip, "-m", message])
    ).trim();
    // The old value is given, so a branch that moved meanwhile is not overwritten.
    await git(repo, ["update-ref", `refs/heads/${branch}`, commit, p.localTip]);
    return commit;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The mark-ready IPC handlers, without electron: each validates the request,
 * takes the repo only through `registered` (which refuses any folder that
 * isn't a registered repo), and validates its reply.
 */
export function markReadyHandlers(
  registered: (asked: string) => Promise<string>,
) {
  return {
    async preview(raw: unknown): Promise<MarkReadyPreview> {
      const { repoPath, branch } = MarkReadyPreviewRequest.parse(raw);
      return MarkReadyPreview.parse(
        await previewCardCommit(await registered(repoPath), branch, markReady),
      );
    },
    async apply(raw: unknown): Promise<MarkReadyResult> {
      const { repoPath, branch, diff } = MarkReadyApplyRequest.parse(raw);
      return MarkReadyResult.parse(
        await applyCardCommit(
          await registered(repoPath),
          branch,
          markReady,
          diff,
        ),
      );
    },
  };
}

/** Register the two mark-ready channels on electron's `ipcMain` (or any `handle`). */
export function registerMarkReady(
  ipc: {
    handle(channel: string, fn: (e: unknown, raw: unknown) => unknown): void;
  },
  registered: (asked: string) => Promise<string>,
): void {
  const h = markReadyHandlers(registered);
  ipc.handle(IpcChannel.CardMarkReadyPreview, (_e, raw) => h.preview(raw));
  ipc.handle(IpcChannel.CardMarkReadyApply, (_e, raw) => h.apply(raw));
}
