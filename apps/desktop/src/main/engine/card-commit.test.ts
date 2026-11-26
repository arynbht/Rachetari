// The write path, in temp repos only: a bare origin, a clone, card branches.
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cardText } from "../../../test/kit-fixture";
import {
  applyCardCommit,
  type CardEdit,
  markReady,
  previewCardCommit,
} from "./card-commit";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

const BRANCH = "card/T-0001";
const draft = (heldBy?: string) =>
  cardText({ id: "T-0001", title: "A card", status: "draft", heldBy });

let root: string;
let origin: string;
let repo: string;
const worktrees: string[] = [];

function configure(cwd: string): void {
  git(cwd, "config", "user.email", "t@example.com");
  git(cwd, "config", "user.name", "T");
}

/** A clone with develop checked out and card/T-0001 pushed, checked out nowhere. */
function setup(): void {
  root = mkdtempSync(join(tmpdir(), "card-commit-"));
  origin = join(root, "origin.git");
  repo = join(root, "repo");
  git(root, "init", "-q", "--bare", "-b", "develop", origin);
  git(root, "clone", "-q", origin, repo);
  configure(repo);
  git(repo, "checkout", "-q", "-b", "develop");
  writeFileSync(join(repo, "README.md"), "x\n");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "init");
  git(repo, "push", "-q", "origin", "develop");
  git(repo, "checkout", "-q", "-b", BRANCH);
  writeFileSync(join(repo, "CARD.md"), draft());
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "card");
  git(repo, "push", "-q", "-u", "origin", BRANCH);
  git(repo, "checkout", "-q", "develop");
}

/** A second clone that moves the origin card branch ahead. */
function pushFromElsewhere(): void {
  const other = join(root, "other");
  git(root, "clone", "-q", "-b", BRANCH, origin, other);
  configure(other);
  writeFileSync(join(other, "NOTE.md"), "n\n");
  git(other, "add", ".");
  git(other, "commit", "-q", "-m", "elsewhere");
  git(other, "push", "-q", "origin", BRANCH);
}

function addWorktree(): string {
  const wt = join(root, "wt");
  git(repo, "worktree", "add", "-q", wt, BRANCH);
  worktrees.push(wt);
  return wt;
}

async function shown(): Promise<string> {
  const preview = await previewCardCommit(repo, BRANCH, markReady);
  if (!preview.ok) throw new Error(preview.reason);
  return preview.diff;
}

beforeEach(setup);
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  worktrees.length = 0;
});

describe("preview", () => {
  it("returns the CARD.md diff, draft to ready, and commits nothing", async () => {
    const tip = git(repo, "rev-parse", BRANCH);
    const originTip = git(origin, "rev-parse", BRANCH);
    const diff = await shown();
    expect(diff).toContain("diff --git CARD.md CARD.md");
    expect(diff).toMatch(/^-Status: draft/m);
    expect(diff).toMatch(/^\+Status: ready/m);
    expect(git(repo, "rev-parse", BRANCH)).toBe(tip);
    expect(git(origin, "rev-parse", BRANCH)).toBe(originTip);
    expect(git(repo, "status", "--porcelain")).toBe("");
  });

  it("says why when the edit is refused", async () => {
    const edit: CardEdit = { message: "m", edit: () => ({ refuse: "nope" }) };
    expect(await previewCardCommit(repo, BRANCH, edit)).toEqual({
      ok: false,
      reason: "nope",
    });
  });

  it("refuses a card that is not a draft", async () => {
    const diff = await shown();
    await applyCardCommit(repo, BRANCH, markReady, diff);
    const again = await previewCardCommit(repo, BRANCH, markReady);
    expect(again).toEqual({
      ok: false,
      reason: "the card's status is ready, not draft",
    });
  });
});

describe("refusals", () => {
  it("refuses when Held by names anyone, and says who", async () => {
    git(repo, "checkout", "-q", BRANCH);
    writeFileSync(join(repo, "CARD.md"), draft("laptop-2"));
    git(repo, "commit", "-qam", "held");
    git(repo, "push", "-q", "origin", BRANCH);
    git(repo, "checkout", "-q", "develop");
    const tip = git(repo, "rev-parse", BRANCH);
    const r = await applyCardCommit(repo, BRANCH, markReady, "anything");
    expect(r).toEqual({ ok: false, reason: "the card is held by laptop-2" });
    expect(await previewCardCommit(repo, BRANCH, markReady)).toEqual(r);
    expect(git(repo, "rev-parse", BRANCH)).toBe(tip);
  });

  it("refuses when the card worktree is dirty, and names it", async () => {
    const diff = await shown();
    const wt = addWorktree();
    writeFileSync(join(wt, "scratch.txt"), "dirty");
    const tip = git(repo, "rev-parse", BRANCH);
    const r = await applyCardCommit(repo, BRANCH, markReady, diff);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("uncommitted changes");
      expect(r.reason).toContain(wt.replaceAll("\\", "/").split("/").pop());
    }
    expect((await previewCardCommit(repo, BRANCH, markReady)).ok).toBe(false);
    expect(git(repo, "rev-parse", BRANCH)).toBe(tip);
  });

  it("refuses when the local branch is behind origin", async () => {
    const diff = await shown();
    pushFromElsewhere();
    const tip = git(repo, "rev-parse", BRANCH);
    const r = await applyCardCommit(repo, BRANCH, markReady, diff);
    expect(r).toEqual({
      ok: false,
      reason: `${BRANCH} is behind origin; update it first`,
    });
    expect(await previewCardCommit(repo, BRANCH, markReady)).toEqual(r);
    expect(git(repo, "rev-parse", BRANCH)).toBe(tip);
  });

  it("refuses when the diff it was handed is not the one now", async () => {
    const tip = git(repo, "rev-parse", BRANCH);
    const r = await applyCardCommit(repo, BRANCH, markReady, "stale diff");
    expect(r.ok).toBe(false);
    expect(git(repo, "rev-parse", BRANCH)).toBe(tip);
  });

  it("refuses a name that is not a card branch", async () => {
    expect((await previewCardCommit(repo, "develop", markReady)).ok).toBe(
      false,
    );
  });
});

describe("apply", () => {
  it("commits without a checkout when no worktree has the branch, and pushes", async () => {
    const head = git(repo, "rev-parse", "HEAD");
    const r = await applyCardCommit(repo, BRANCH, markReady, await shown());
    expect(r).toMatchObject({ ok: true, where: "branch", pushed: true });
    expect(git(repo, "show", `${BRANCH}:CARD.md`)).toMatch(/^Status: ready/m);
    expect(git(origin, "rev-parse", BRANCH)).toBe(
      git(repo, "rev-parse", BRANCH),
    );
    // The checked-out branch and its files are untouched.
    expect(git(repo, "rev-parse", "HEAD")).toBe(head);
    expect(git(repo, "status", "--porcelain")).toBe("");
    expect(existsSync(join(repo, "CARD.md"))).toBe(false);
    expect(git(repo, "log", "-1", "--format=%s", BRANCH)).toBe(
      "docs(card): mark ready",
    );
  });

  it("commits in the card worktree when it is checked out clean", async () => {
    const wt = addWorktree();
    const r = await applyCardCommit(repo, BRANCH, markReady, await shown());
    expect(r).toMatchObject({ ok: true, where: "worktree", pushed: true });
    // The worktree moved with its branch: clean, and showing the new text.
    expect(git(wt, "status", "--porcelain")).toBe("");
    expect(readFileSync(join(wt, "CARD.md"), "utf8")).toMatch(
      /^Status: ready/m,
    );
    expect(git(wt, "rev-parse", "HEAD")).toBe(git(repo, "rev-parse", BRANCH));
    expect(git(origin, "rev-parse", BRANCH)).toBe(git(wt, "rev-parse", "HEAD"));
  });

  it("commits in the main checkout when the branch is checked out there", async () => {
    git(repo, "checkout", "-q", BRANCH);
    const r = await applyCardCommit(repo, BRANCH, markReady, await shown());
    expect(r).toMatchObject({ ok: true, where: "worktree" });
    expect(git(repo, "status", "--porcelain")).toBe("");
    expect(readFileSync(join(repo, "CARD.md"), "utf8")).toMatch(
      /^Status: ready/m,
    );
  });
});

describe("failures after the checks", () => {
  it("a failed commit in the worktree is refused and leaves it clean", async () => {
    const wt = addWorktree();
    const hook = join(
      git(wt, "rev-parse", "--path-format=absolute", "--git-path", "hooks"),
      "pre-commit",
    );
    writeFileSync(hook, "#!/bin/sh\necho hook says no >&2\nexit 1\n");
    chmodSync(hook, 0o755);
    const tip = git(repo, "rev-parse", BRANCH);
    const r = await applyCardCommit(repo, BRANCH, markReady, await shown());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("hook says no");
    expect(git(wt, "status", "--porcelain")).toBe("");
    expect(readFileSync(join(wt, "CARD.md"), "utf8")).toMatch(
      /^Status: draft/m,
    );
    expect(git(repo, "rev-parse", BRANCH)).toBe(tip);
  });

  it("a push the origin refuses is reported, committed locally, and not forced", async () => {
    const hook = join(origin, "hooks", "pre-receive");
    writeFileSync(hook, "#!/bin/sh\necho origin says no >&2\nexit 1\n");
    chmodSync(hook, 0o755);
    const originTip = git(origin, "rev-parse", BRANCH);
    const r = await applyCardCommit(repo, BRANCH, markReady, await shown());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/committed [0-9a-f]{7} locally/);
      expect(r.reason).toContain("origin says no");
    }
    expect(git(origin, "rev-parse", BRANCH)).toBe(originTip);
    expect(git(repo, "show", `${BRANCH}:CARD.md`)).toMatch(/^Status: ready/m);
  });
});

describe("push", () => {
  it("is fast-forward only: a branch that moved on the origin is not forced", async () => {
    const diff = await shown();
    // The origin moves after the checks would pass on a stale view; whichever
    // check catches it, the origin keeps its commit.
    pushFromElsewhere();
    const originTip = git(origin, "rev-parse", BRANCH);
    const r = await applyCardCommit(repo, BRANCH, markReady, diff);
    expect(r.ok).toBe(false);
    expect(git(origin, "rev-parse", BRANCH)).toBe(originTip);
  });
});
