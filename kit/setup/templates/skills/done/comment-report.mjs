#!/usr/bin/env node
// Lists each comment line a branch adds to code, for /done's deslop pass to
// judge. A report, not a gate: it exits 0 whether or not it finds any.
// Usage: node comment-report.mjs <base>   (reads `git diff -U0 <base>...HEAD`)
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CODE = /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|rb|sh|cs|swift|php)$/i;
const HASH_COMMENTS = /\.(?:py|rb|sh)$/i;

export function isCommentLine(path, line) {
  const t = line.trim();
  if (t.startsWith("//") || t.startsWith("/*") || /^\*(?:\s|\/|$)/.test(t))
    return true;
  return HASH_COMMENTS.test(path) && t.startsWith("#") && !t.startsWith("#!");
}

/** Runs of consecutive comment lines, each with its first line's indentation. */
function commentBlocks(path, lines) {
  const blocks = [];
  let open = null;
  for (const [i, line] of lines.entries()) {
    if (!isCommentLine(path, line)) {
      open = null;
      continue;
    }
    if (!open) {
      open = { indent: /^\s*/.exec(line)?.[0] ?? "", at: i, lines: [] };
      blocks.push(open);
    }
    open.lines.push(line);
  }
  return blocks;
}

/**
 * Comment lines a change adds to code. A comment block a hunk adds is matched
 * to one it removes at the same indentation, and each removed line covers one
 * added line, so rewording a doc comment isn't a new one but swapping one
 * comment for an unrelated one elsewhere is.
 */
export function newComments(hunks) {
  const found = [];
  for (const [path, list] of hunks) {
    if (!CODE.test(path)) continue;
    for (const hunk of list) {
      const removed = commentBlocks(path, hunk.removed);
      for (const block of commentBlocks(path, hunk.added)) {
        const at = removed.findIndex((r) => r.indent === block.indent);
        const covered = at >= 0 ? (removed[at]?.lines.length ?? 0) : 0;
        if (at >= 0) removed.splice(at, 1);
        block.lines.slice(covered).forEach((text, i) =>
          found.push({
            path,
            line: hunk.start + block.at + covered + i,
            text,
          }),
        );
      }
    }
  }
  return found;
}

/** Each file's hunks from a `git diff -U0`, with the lines each one swaps. */
export function parseHunks(output) {
  const hunks = new Map();
  let current = null;
  let header = false;
  for (const line of output.split("\n")) {
    if (line.startsWith("diff --git ")) {
      current = null;
      header = true;
      continue;
    }
    if (header && line.startsWith("+++ ")) {
      const target = line.slice(4).trim();
      current = null;
      if (target !== "/dev/null") {
        const path = target.replace(/^b\//, "");
        current = hunks.get(path) ?? [];
        hunks.set(path, current);
      }
      continue;
    }
    if (line.startsWith("@@")) {
      header = false;
      const start = Number(/^@@ -\S+ \+(\d+)/.exec(line)?.[1] ?? 0);
      current?.push({ start, removed: [], added: [] });
      continue;
    }
    const hunk = header ? undefined : current?.at(-1);
    if (!hunk) continue;
    if (line.startsWith("+")) hunk.added.push(line.slice(1));
    else if (line.startsWith("-")) hunk.removed.push(line.slice(1));
  }
  return hunks;
}

function main(base) {
  if (!base) {
    process.stderr.write("usage: node comment-report.mjs <base>\n");
    return 2;
  }
  const git = spawnSync(
    "git",
    ["diff", "-U0", "--no-color", "--no-ext-diff", `${base}...HEAD`],
    {
      encoding: "utf8",
      maxBuffer: 1 << 30,
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  if (git.error) {
    process.stderr.write(`${git.error.message}\n`);
    return 1;
  }
  if (git.status !== 0) return git.status ?? 1;
  for (const c of newComments(parseHunks(git.stdout)))
    process.stdout.write(`${c.path}:${c.line}: ${c.text.trim()}\n`);
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  process.exitCode = main(process.argv[2]);
