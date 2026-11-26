// Judge tier 2, packing: the change as the reviewer sees it (diff, contract
// files, cited files), with sensitive, generated and secret-shaped files left
// out.
import { isSensitivePath, looksLikeSecret } from "@arynbht/rivetari-engine";
import picomatch from "picomatch";
import { type SimpleGit, simpleGit } from "simple-git";

import { bannedSection, loadBanned } from "./banned.js";
import { isTestFile, parseNameStatus } from "./protected.js";

/** Max characters of diff packed into the prompt (~100k tokens). */
const DIFF_BUDGET = 400_000;
/**
 * A test file's diff past this many characters is sent as its first part and
 * the names of the tests in the rest. Large test diffs are mostly fixtures and
 * golden rows; the review needs their shape and what they assert, not every
 * row, and a criterion they leave unshown comes back unverified for a person.
 */
export const TEST_FILE_CAP = 12_000;
/** Test diff sent in full across all files before every further one is cut too. */
export const TEST_TOTAL_CAP = 60_000;

/** Machine-written files: reviewing them wastes the budget and finds nothing. */
const GENERATED = picomatch(
  [
    "**/dist/**",
    "**/*.min.js",
    "**/*.map",
    "**/pnpm-lock.yaml",
    "**/package-lock.json",
    "**/yarn.lock",
    "**/bun.lock",
    "**/bun.lockb",
    "**/Cargo.lock",
    "**/poetry.lock",
    "**/uv.lock",
    "**/go.sum",
  ],
  { dot: true },
);

export const isGeneratedPath = (path: string): boolean => GENERATED(path);

/**
 * Which of `paths` are machine-written: the paths above, plus the files the
 * repo marks as generated (`linguist-generated` in .gitattributes).
 */
export async function generatedPaths(
  git: SimpleGit,
  paths: readonly string[],
): Promise<Set<string>> {
  const generated = new Set(paths.filter((p) => GENERATED(p)));
  if (paths.length === 0) return generated;
  const attrs = await git
    .raw(["check-attr", "linguist-generated", "--", ...paths])
    .catch(() => "");
  for (const line of attrs.split("\n")) {
    const m = /^(.*): linguist-generated: (set|true)$/.exec(line.trim());
    if (m?.[1]) generated.add(m[1]);
  }
  return generated;
}

/** Review order when the budget is tight: source, then tests, then docs and config. */
function priority(path: string): number {
  if (isTestFile(path)) return 1;
  if (/\.(md|mdx|txt|ya?ml|json|toml|lock)$/i.test(path)) return 2;
  return 0;
}

async function showAt(git: SimpleGit, rev: string, path: string) {
  try {
    return await git.show([`${rev}:${path}`]);
  } catch {
    return null;
  }
}

/**
 * The change as the reviewer sees it. Files at sensitive paths, or whose added
 * lines look like they hold a secret, are left out (and listed, so the review
 * says what it didn't see). The contract files come from the base commit: the
 * change can't rewrite the rules it's judged by.
 */
export async function packChange(
  repoPath: string,
  base: string,
  head: string,
): Promise<PackedChange> {
  const git = simpleGit(repoPath);
  const all = parseNameStatus(
    await git.raw(["diff", "--name-status", "-M", base, head]),
  );
  const generated = await generatedPaths(
    git,
    all.map((e) => e.path),
  );
  const entries = all
    .map((entry, i) => ({ entry, i }))
    .sort(
      (a, b) => priority(a.entry.path) - priority(b.entry.path) || a.i - b.i,
    )
    .map(({ entry }) => entry);
  const omitted: PackedChange["omitted"] = [];
  const trimmed: NonNullable<PackedChange["trimmed"]> = [];
  const files: string[] = [];
  const lines = new Map<string, Set<number>>();
  let diff = "";
  let testChars = 0;
  for (const entry of entries) {
    if (isSensitivePath(entry.path)) {
      omitted.push({ path: entry.path, why: "sensitive path" });
      continue;
    }
    if (generated.has(entry.path)) {
      // Counts, not text: a lockfile's churn says how big a dependency change
      // is without spending the budget on it.
      const stats = await numstat(git, base, head, entry.path);
      omitted.push({
        path: entry.path,
        why: "generated",
        ...(stats ? { stats } : {}),
      });
      continue;
    }
    const fileDiff = await git.raw([
      "diff",
      "-U5",
      "--no-color",
      "-M",
      base,
      head,
      "--",
      ...(entry.oldPath ? [entry.oldPath] : []),
      entry.path,
    ]);
    if (/^Binary files /m.test(fileDiff)) {
      omitted.push({ path: entry.path, why: "binary" });
      continue;
    }
    // Every body line is sent (removed and context lines too), so scan them all.
    const body = fileDiff
      .split("\n")
      .filter((l) => /^[+\- ]/.test(l) && !/^(\+\+\+|---) /.test(l))
      .join("\n");
    if (looksLikeSecret(body)) {
      omitted.push({ path: entry.path, why: "looks like it holds a secret" });
      continue;
    }
    let sent = fileDiff;
    if (isTestFile(entry.path)) {
      const allowance = Math.max(
        TEST_FILE_CAP / 6,
        Math.min(TEST_FILE_CAP, TEST_TOTAL_CAP - testChars),
      );
      if (fileDiff.length > allowance) {
        const cut = trimTestDiff(fileDiff, allowance);
        sent = cut.diff;
        trimmed.push({ path: entry.path, note: cut.note });
      }
      testChars += sent.length;
    }
    if (diff.length + sent.length > DIFF_BUDGET) {
      omitted.push({ path: entry.path, why: "over the review's size budget" });
      continue;
    }
    diff += sent;
    files.push(entry.path);
    lines.set(entry.path, newSideLines(sent));
  }
  const docs = files.filter((f) => MARKDOWN.test(f));
  return {
    diff,
    files,
    omitted,
    ...(trimmed.length > 0 ? { trimmed } : {}),
    lines,
    agents: await showAt(git, base, "AGENTS.md"),
    constraints: await showAt(git, base, "CONSTRAINTS.md"),
    banned: bannedSection(await loadBanned(repoPath, base)).join("\n") || null,
    ...(docs.length > 0
      ? { cited: await citedFiles(git, head, docs, diff) }
      : {}),
  };
}

/** A file's "+added −removed" from git, or null when git can't count it. */
async function numstat(
  git: SimpleGit,
  base: string,
  head: string,
  path: string,
): Promise<string | null> {
  const out = await git
    .raw(["diff", "--numstat", "--no-renames", base, head, "--", path])
    .catch(() => "");
  const m = /^(\d+)\t(\d+)\t/.exec(out);
  return m ? `+${m[1]} −${m[2]} lines` : null;
}

const TEST_NAME = /\b(?:it|test|describe)(?:\.\w+)?\(\s*(["'`])(.+?)\1/;
/** How many cut-off test names the note lists. */
const MAX_TEST_NAMES = 40;

/**
 * A test file's diff cut at a line boundary near `allowance` characters, and
 * a note naming the tests in the part left out, so the reviewer knows what
 * exists even where it can't read the body.
 */
export function trimTestDiff(
  fileDiff: string,
  allowance: number,
): { diff: string; note: string } {
  const end = fileDiff.lastIndexOf("\n", allowance);
  const kept = fileDiff.slice(0, end > 0 ? end + 1 : allowance);
  const rest = fileDiff.slice(kept.length).split("\n").filter(Boolean);
  const names = rest
    .filter((l) => l.startsWith("+"))
    .flatMap((l) => {
      const name = TEST_NAME.exec(l)?.[2];
      return name ? [name] : [];
    });
  const shown = names.slice(0, MAX_TEST_NAMES);
  const note = `first ${kept.length} of ${fileDiff.length} characters; ${rest.length} more line(s) not shown${shown.length > 0 ? `; tests in them: ${shown.map((n) => JSON.stringify(n)).join(", ")}${names.length > shown.length ? ` and ${names.length - shown.length} more` : ""}` : ""}`;
  return { diff: `${kept}… (trimmed: ${note})\n`, note };
}

const MARKDOWN = /\.(md|mdx)$/i;
/** Caps on what changed docs bring along: per file, in all, and how many files. */
export const CITED_FILE_CAP = 20_000;
export const CITED_TOTAL_CAP = 60_000;
const CITED_MAX_FILES = 20;

/**
 * The repo files the added lines of changed Markdown cite in backticks
 * (`src/a.ts`, `src/a.ts:12`), at head. Only files that exist there, never a
 * sensitive, generated, binary or secret-shaped one, and within the caps: a
 * doc's claims about code can't be checked from the doc's own diff.
 */
export async function citedFiles(
  git: SimpleGit,
  head: string,
  docs: readonly string[],
  diff: string,
): Promise<CitedFile[]> {
  const tracked = new Set(
    (await git.raw(["ls-tree", "-r", "--name-only", head]).catch(() => ""))
      .split("\n")
      .filter(Boolean),
  );
  const wanted: string[] = [];
  for (const chunk of diff.split(/^(?=diff --git )/m)) {
    const doc = docs.find((d) => chunk.includes(` b/${d}\n`));
    if (!doc) continue;
    const added = chunk
      .split("\n")
      .filter((l) => l.startsWith("+") && !l.startsWith("+++ "))
      .join("\n");
    for (const m of added.matchAll(/`([^`\s]+)`/g)) {
      const path = (m[1] ?? "")
        .replace(/^\.\//, "")
        .replace(/(#L\d.*|:\d+(-\d+)?)$/, "");
      if (path !== doc && tracked.has(path) && !wanted.includes(path))
        wanted.push(path);
    }
  }
  const generated = await generatedPaths(git, wanted);
  const out: CitedFile[] = [];
  let total = 0;
  for (const path of wanted) {
    if (out.length >= CITED_MAX_FILES) break;
    if (isSensitivePath(path) || generated.has(path)) continue;
    const text = await showAt(git, head, path);
    if (text === null || text.includes("\0") || looksLikeSecret(text)) continue;
    const truncated = text.length > CITED_FILE_CAP;
    const kept = truncated ? text.slice(0, CITED_FILE_CAP) : text;
    if (total + kept.length > CITED_TOTAL_CAP) {
      out.push({ path, text: null, truncated: false });
      continue;
    }
    total += kept.length;
    out.push({ path, text: kept, truncated });
  }
  return out;
}

/** New-side line numbers covered by a file's hunks (added and context lines). */
export function newSideLines(fileDiff: string): Set<number> {
  const out = new Set<number>();
  let line = 0;
  let inHunk = false;
  for (const text of fileDiff.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text);
    if (hunk) {
      line = Number(hunk[1]);
      inHunk = true;
      continue;
    }
    if (!inHunk || text.startsWith("\\")) continue;
    if (text.startsWith("-")) continue;
    if (text.startsWith("+") || text.startsWith(" ")) out.add(line++);
  }
  return out;
}

export interface PackedChange {
  diff: string;
  files: string[];
  /** `stats` is the file's added and removed line counts, when git has them. */
  omitted: { path: string; why: string; stats?: string | undefined }[];
  /** Test files sent only in part, and how much of each was left out. */
  trimmed?: { path: string; note: string }[] | undefined;
  /** New-side line numbers that appear in the diff, per file (for inline comments). */
  lines: Map<string, Set<number>>;
  agents: string | null;
  constraints: string | null;
  banned?: string | null | undefined;
  /** Repo files the changed Markdown cites, at head, so citations can be checked. */
  cited?: CitedFile[] | undefined;
}

export interface CitedFile {
  path: string;
  /** The file at head, cut at the per-file cap; null when over the total cap. */
  text: string | null;
  truncated: boolean;
}
