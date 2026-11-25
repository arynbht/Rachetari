export interface Hunk {
  removed: string[];
  added: string[];
}
const CODE = /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|rb|sh|cs|swift|php)$/i;
/** Files diff.no-new-comments reads: code, not data, config or prose. */
export const isCodePath = (path: string) => CODE.test(path);
const HASH_COMMENTS = /\.(?:py|rb|sh)$/i;
const MARKDOWN = /\.mdx?$/i;
const SKIPPED_TEST =
  /\b(?:it|test|describe|suite|context)\.(?:skip|only)\s*\(|\b(?:xit|xtest|xdescribe|fit|fdescribe)\s*\(|@pytest\.mark\.skip|\bt\.Skip(?:Now|f)?\s*\(/;

export function isCommentLine(path: string, line: string): boolean {
  const t = line.trim();
  if (t.startsWith("//") || t.startsWith("/*") || /^\*(?:\s|\/|$)/.test(t))
    return true;
  return HASH_COMMENTS.test(path) && t.startsWith("#") && !t.startsWith("#!");
}

const asHunks = (added: ReadonlyMap<string, string[]>) =>
  new Map([...added].map(([path, ls]) => [path, [{ removed: [], added: ls }]]));

/** Runs of consecutive comment lines, each with its first line's indentation. */
function commentBlocks(path: string, lines: readonly string[]) {
  const blocks: { indent: string; lines: string[] }[] = [];
  let open: { indent: string; lines: string[] } | null = null;
  for (const line of lines) {
    if (!isCommentLine(path, line)) {
      open = null;
      continue;
    }
    if (!open) {
      open = { indent: /^\s*/.exec(line)?.[0] ?? "", lines: [] };
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
function newComments(hunks: ReadonlyMap<string, readonly Hunk[]>) {
  const found: { path: string; line: string }[] = [];
  for (const [path, list] of hunks) {
    if (!CODE.test(path)) continue;
    for (const hunk of list) {
      const removed = commentBlocks(path, hunk.removed);
      for (const block of commentBlocks(path, hunk.added)) {
        const at = removed.findIndex((r) => r.indent === block.indent);
        const covered = at >= 0 ? (removed[at]?.lines.length ?? 0) : 0;
        if (at >= 0) removed.splice(at, 1);
        for (const line of block.lines.slice(covered))
          found.push({ path, line });
      }
    }
  }
  return found;
}
/** Each file's hunks from a `git diff -U0`, with the lines each one swaps. */
export function parseHunks(output: string): Map<string, Hunk[]> {
  const hunks = new Map<string, Hunk[]>();
  let current: Hunk[] | null = null;
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
      current?.push({ removed: [], added: [] });
      continue;
    }
    const hunk = header ? undefined : current?.at(-1);
    if (!hunk) continue;
    if (line.startsWith("+")) hunk.added.push(line.slice(1));
    else if (line.startsWith("-")) hunk.removed.push(line.slice(1));
  }
  return hunks;
}
