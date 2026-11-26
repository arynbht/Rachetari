// Answering questions: the pure text change, then the preview/apply path in
// temp repos (a bare origin and a clone), never this repo.
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cardText } from "../../../test/kit-fixture";
import type { AnswerSpec } from "../../shared/ipc";
import { parseCard } from "../kit/parse";
import { answerCard, answerEdit, answerHandlers } from "./answer";
import { applyCardCommit, previewCardCommit } from "./card-commit";

const Q1 =
  "Which store? — Recommended: SQLite, via `better-sqlite3`. Options: files; Postgres.";
const Q2 =
  "Link style? — Recommended: [the guide](https://example.com/a-b). Options: none.";
const Q3 = "Name the thing? Options: Foo; Bar.";
const Q4 = "Wrapped one — Recommended: yes, ship it. Options: no.";

function withQuestions(heldBy?: string): string {
  const base = cardText({
    id: "T-0001",
    title: "A card",
    status: "ready",
    heldBy,
  });
  return base.replace(
    "- [ ] (none)",
    [
      `- [ ] ${Q1}`,
      `- [ ] ${Q2}`,
      `- [ ] ${Q3}`,
      "- [ ] Wrapped one",
      "  — Recommended: yes, ship it. Options: no.",
      "- [x] Done already — Recommended: old.",
    ].join("\n"),
  );
}

function openOf(text: string): string[] {
  return (parseCard(text)?.questions ?? [])
    .filter((q) => q.open)
    .map((q) => q.text);
}

function ok(r: string | { refuse: string }): string {
  if (typeof r !== "string") throw new Error(r.refuse);
  return r;
}

describe("answerCard", () => {
  it("accepts one recommendation: ticks the box and writes the answer under it", () => {
    const out = ok(
      answerCard(withQuestions(), { kind: "accept", question: Q1 }),
    );
    expect(out).toContain(
      `- [x] ${Q1}\n  Answer: SQLite, via \`better-sqlite3\``,
    );
    expect(openOf(out)).not.toContain(Q1);
    expect(openOf(out)).toContain(Q2);
  });

  it("handles a link question", () => {
    const out = ok(
      answerCard(withQuestions(), { kind: "accept", question: Q2 }),
    );
    expect(out).toContain("  Answer: [the guide](https://example.com/a-b)");
    expect(openOf(out)).not.toContain(Q2);
  });

  it("handles a question wrapped over two lines, answering below the last", () => {
    const out = ok(
      answerCard(withQuestions(), { kind: "accept", question: Q4 }),
    );
    expect(out).toContain(
      "- [x] Wrapped one\n  — Recommended: yes, ship it. Options: no.\n  Answer: yes, ship it",
    );
    expect(openOf(out)).not.toContain(Q4);
  });

  it("accepts all, skipping the question with no Recommended", () => {
    const out = ok(answerCard(withQuestions(), { kind: "acceptAll" }));
    expect(openOf(out)).toEqual([Q3]);
    expect(out.match(/^ {2}Answer: /gm)).toHaveLength(3);
  });

  it("refuses accept-all and accept when nothing is recommended", () => {
    const text = cardText({
      id: "T-0001",
      title: "A",
      status: "ready",
      question: Q3,
    });
    expect(answerCard(text, { kind: "acceptAll" })).toEqual({
      refuse: "no open question has a Recommended answer",
    });
    expect(answerCard(text, { kind: "accept", question: Q3 })).toEqual({
      refuse: "that question has no Recommended answer",
    });
  });

  it("writes a free-text answer on one line", () => {
    const out = ok(
      answerCard(withQuestions(), {
        kind: "text",
        question: Q3,
        text: "Foo\nplease ",
      }),
    );
    expect(out).toContain(`- [x] ${Q3}\n  Answer: Foo please`);
    expect(openOf(out)).not.toContain(Q3);
  });

  it("refuses a question that is not open, an answered one, and blank text", () => {
    const t = withQuestions();
    expect(answerCard(t, { kind: "accept", question: "nope" })).toEqual({
      refuse: "that question is not open on the card",
    });
    expect(
      answerCard(t, {
        kind: "accept",
        question: "Done already — Recommended: old.",
      }),
    ).toEqual({ refuse: "that question is not open on the card" });
    expect(answerCard(t, { kind: "text", question: Q3, text: "  " })).toEqual({
      refuse: "the answer is empty",
    });
  });

  it("leaves placeholders and other sections alone, and keeps CRLF", () => {
    const crlf = withQuestions().replaceAll("\n", "\r\n");
    const out = ok(answerCard(crlf, { kind: "accept", question: Q1 }));
    expect(out.replaceAll("\r\n", "")).not.toContain("\n");
    expect(out).toContain("  Answer: SQLite, via `better-sqlite3`\r\n");
    const placeholder = cardText({ id: "T-0001", title: "A", status: "ready" });
    expect(answerCard(placeholder, { kind: "acceptAll" })).toEqual({
      refuse: "no open question has a Recommended answer",
    });
  });
});

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

const BRANCH = "card/T-0001";
const ACCEPT_Q1: AnswerSpec = { kind: "accept", question: Q1 };
let root: string;
let origin: string;
let repo: string;

function configure(cwd: string): void {
  git(cwd, "config", "user.email", "t@example.com");
  git(cwd, "config", "user.name", "T");
}

function setup(): void {
  root = mkdtempSync(join(tmpdir(), "answer-"));
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
  writeFileSync(join(repo, "CARD.md"), withQuestions());
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "card");
  git(repo, "push", "-q", "-u", "origin", BRANCH);
  git(repo, "checkout", "-q", "develop");
}

async function shown(answer: AnswerSpec = ACCEPT_Q1): Promise<string> {
  const p = await previewCardCommit(repo, BRANCH, answerEdit(answer));
  if (!p.ok) throw new Error(p.reason);
  return p.diff;
}

beforeEach(setup);
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("preview and apply", () => {
  it("previews the exact diff and commits nothing", async () => {
    const tip = git(repo, "rev-parse", BRANCH);
    const diff = await shown();
    expect(diff).toMatch(/^-- \[ \] Which store\?/m);
    expect(diff).toMatch(/^\+- \[x\] Which store\?/m);
    expect(diff).toMatch(/^\+ {2}Answer: SQLite/m);
    expect(git(repo, "rev-parse", BRANCH)).toBe(tip);
    expect(git(origin, "rev-parse", BRANCH)).toBe(tip);
  });

  it("applies the shown diff as a plain commit and pushes; the question is no longer open", async () => {
    const r = await applyCardCommit(
      repo,
      BRANCH,
      answerEdit(ACCEPT_Q1),
      await shown(),
    );
    expect(r).toMatchObject({ ok: true, pushed: true });
    const text = git(repo, "show", `${BRANCH}:CARD.md`);
    expect(openOf(text)).not.toContain(Q1);
    expect(git(origin, "rev-parse", BRANCH)).toBe(
      git(repo, "rev-parse", BRANCH),
    );
  });

  it("goes through the IPC handlers with the repo taken only from `registered`", async () => {
    const h = answerHandlers(async (asked) => {
      if (asked !== "reg") throw new Error("not a registered repo");
      return repo;
    });
    const req = { repoPath: "reg", branch: BRANCH, answer: ACCEPT_Q1 };
    const p = await h.preview(req);
    if (!p.ok) throw new Error(p.reason);
    const r = await h.apply({ ...req, diff: p.diff });
    expect(r.ok).toBe(true);
    await expect(h.preview({ ...req, repoPath: "other" })).rejects.toThrow();
  });
});

describe("refusals come back with their reasons", () => {
  it("refuses when Held by names anyone", async () => {
    git(repo, "checkout", "-q", BRANCH);
    writeFileSync(join(repo, "CARD.md"), withQuestions("laptop-2"));
    git(repo, "commit", "-qam", "held");
    git(repo, "push", "-q", "origin", BRANCH);
    git(repo, "checkout", "-q", "develop");
    const tip = git(repo, "rev-parse", BRANCH);
    const r = await applyCardCommit(repo, BRANCH, answerEdit(ACCEPT_Q1), "x");
    expect(r).toEqual({ ok: false, reason: "the card is held by laptop-2" });
    expect(git(repo, "rev-parse", BRANCH)).toBe(tip);
  });

  it("refuses a dirty worktree", async () => {
    const diff = await shown();
    const wt = join(root, "wt");
    git(repo, "worktree", "add", "-q", wt, BRANCH);
    writeFileSync(join(wt, "scratch.txt"), "dirty");
    const r = await applyCardCommit(repo, BRANCH, answerEdit(ACCEPT_Q1), diff);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("uncommitted changes");
    expect(openOf(readFileSync(join(wt, "CARD.md"), "utf8"))).toContain(Q1);
  });

  it("refuses when behind origin", async () => {
    const diff = await shown();
    const other = join(root, "other");
    git(root, "clone", "-q", "-b", BRANCH, origin, other);
    configure(other);
    writeFileSync(join(other, "NOTE.md"), "n\n");
    git(other, "add", ".");
    git(other, "commit", "-q", "-m", "elsewhere");
    git(other, "push", "-q", "origin", BRANCH);
    const tip = git(repo, "rev-parse", BRANCH);
    const r = await applyCardCommit(repo, BRANCH, answerEdit(ACCEPT_Q1), diff);
    expect(r).toEqual({
      ok: false,
      reason: `${BRANCH} is behind origin; update it first`,
    });
    expect(git(repo, "rev-parse", BRANCH)).toBe(tip);
  });

  it("refuses a stale diff: the card changed after it was shown", async () => {
    const diff = await shown();
    const r = await applyCardCommit(
      repo,
      BRANCH,
      answerEdit({ kind: "text", question: Q1, text: "other" }),
      diff,
    );
    expect(r).toEqual({
      ok: false,
      reason: "the card changed since the diff was shown",
    });
  });

  it("says the push was refused when origin's pre-receive hook rejects it; nothing is forced", async () => {
    const hook = join(origin, "hooks", "pre-receive");
    writeFileSync(hook, "#!/bin/sh\necho no >&2\nexit 1\n");
    chmodSync(hook, 0o755);
    const r = await applyCardCommit(
      repo,
      BRANCH,
      answerEdit(ACCEPT_Q1),
      await shown(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("the push was refused");
    expect(git(origin, "rev-parse", BRANCH)).not.toBe(
      git(repo, "rev-parse", BRANCH),
    );
  });
});
