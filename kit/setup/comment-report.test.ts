import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  isCommentLine,
  newComments,
  parseHunks,
} from "./templates/skills/done/comment-report.mjs";

const script = fileURLToPath(
  new URL("./templates/skills/done/comment-report.mjs", import.meta.url),
);

const report = (lines: string[]) => newComments(parseHunks(lines.join("\n")));

describe("the comment report's rule", () => {
  it("tells comment lines from code", () => {
    expect(isCommentLine("a.ts", "  // why")).toBe(true);
    expect(isCommentLine("a.ts", "/** doc */")).toBe(true);
    expect(isCommentLine("a.ts", " * more doc")).toBe(true);
    expect(isCommentLine("a.ts", " */")).toBe(true);
    expect(isCommentLine("a.ts", "const a = 2 * 3;")).toBe(false);
    expect(isCommentLine("a.py", "# why")).toBe(true);
    expect(isCommentLine("a.py", "#!/usr/bin/env python")).toBe(false);
    expect(isCommentLine("a.ts", "# not a comment in ts")).toBe(false);
  });

  it("doesn't report a reworded doc comment, but does a doc comment added beside it, with its new-side lines", () => {
    // T-0006's first round: writeReplacing's doc comment reworded, and a new
    // function with its own doc comment. Only the second is new.
    const path = "packages/cli/src/commands/init.ts";
    const reworded = [
      `diff --git a/${path} b/${path}`,
      "index 69f2d92..51df2fd 100644",
      `--- a/${path}`,
      `+++ b/${path}`,
      "@@ -136,3 +136,3 @@ async function keepBackup(",
      "- * Write a file Rivetari owns (`rivetari.yml`): a missing one is written, and",
      "- * with --force a different one is replaced, the old one kept as a backup.",
      "- * Returns a note when it replaced one.",
      "+ * Write a generated file under --force: a missing one is written, and a",
      "+ * different one is replaced, the old one kept as a backup. Returns a note when",
      "+ * it replaced one.",
    ];
    const beside = [
      "@@ -167,0 +168,8 @@ async function writeBeside(",
      "+  return writeKeeping(root, rel, content);",
      "+}",
      "+",
      "+/**",
      "+ * Write a generated file and never replace one that's there.",
      "+ */",
      "+async function writeKeeping(",
      "+  root: string,",
      "",
    ];
    expect(parseHunks([...reworded, ...beside].join("\n")).get(path)).toEqual([
      expect.objectContaining({ start: 136 }),
      expect.objectContaining({ start: 168 }),
    ]);

    expect(report([...reworded, ...beside])).toEqual([
      { path, line: 171, text: "/**" },
      {
        path,
        line: 172,
        text: " * Write a generated file and never replace one that's there.",
      },
      { path, line: 173, text: " */" },
    ]);
    expect(report(reworded)).toEqual([]);
  });

  it("still reports a removed comment swapped for one at another indent, or in another hunk", () => {
    const head = [
      "diff --git a/src/total.ts b/src/total.ts",
      "--- a/src/total.ts",
      "+++ b/src/total.ts",
    ];

    // Same hunk, but the removed comment was inside the function and the
    // added one is at the top level.
    expect(
      report([
        ...head,
        "@@ -4,2 +4,3 @@ export function total(xs) {",
        "-  // An empty list sums to 0.",
        "-  return xs.reduce((a, b) => a + b, 0);",
        "+  return xs.reduce((a, b) => a + b, 0);",
        "+}",
        "+// Exported for the CLI.",
        "",
      ]),
    ).toEqual([
      { path: "src/total.ts", line: 6, text: "// Exported for the CLI." },
    ]);

    // Same indentation, but one hunk only deletes and another only adds.
    expect(
      report([
        ...head,
        "@@ -4 +3,0 @@ export function total(xs) {",
        "-  // An empty list sums to 0.",
        "@@ -9,0 +9 @@ export function mean(xs) {",
        "+  // Rounds down.",
        "",
      ]),
    ).toEqual([{ path: "src/total.ts", line: 9, text: "  // Rounds down." }]);
  });

  it("skips files that aren't code", () => {
    expect(
      report([
        "diff --git a/README.md b/README.md",
        "--- a/README.md",
        "+++ b/README.md",
        "@@ -0,0 +1 @@",
        "+# Title",
        "diff --git a/package.json b/package.json",
        "--- a/package.json",
        "+++ b/package.json",
        "@@ -2,0 +3 @@",
        '+  "//": "a note",',
        "",
      ]),
    ).toEqual([]);
  });
});

describe("the comment report's command", () => {
  let repo = "";
  afterEach(() => {
    if (repo) rmSync(repo, { recursive: true, force: true });
    repo = "";
  });

  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    return r.stdout.trim();
  };
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: repo,
      encoding: "utf8",
    });

  it("prints each comment the branch adds as path:line: text, and exits 0", () => {
    repo = mkdtempSync(join(tmpdir(), "comment-report-"));
    git("init", "-q");
    git("config", "user.name", "Test");
    git("config", "user.email", "test@example.com");
    git("config", "core.autocrlf", "false");
    mkdirSync(join(repo, "src"));
    writeFileSync(join(repo, "src", "a.ts"), "export const a = 1;\n");
    writeFileSync(join(repo, "notes.md"), "Notes\n");
    git("add", ".");
    git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD");

    expect(run(base)).toMatchObject({ status: 0, stdout: "" });

    writeFileSync(
      join(repo, "src", "a.ts"),
      "export const a = 1;\n\n  // Two, for the pair.   \nexport const b = 2;\n",
    );
    writeFileSync(join(repo, "notes.md"), "Notes\n# Heading\n");
    git("commit", "-q", "-am", "add b");

    expect(run(base)).toMatchObject({
      status: 0,
      stdout: "src/a.ts:3: // Two, for the pair.\n",
    });

    const none = run();
    expect(none.status).toBe(2);
    expect(none.stdout).toBe("");
    expect(none.stderr).toMatch(/usage/i);

    const bad = run("nope");
    expect(bad.status).not.toBe(0);
    expect(bad.stdout).toBe("");
    expect(bad.stderr).not.toBe("");
  });
});
