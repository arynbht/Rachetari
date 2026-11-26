// Docs adapter: list the repo's Markdown docs and read one. Uses the engine's
// contained glob/readFile (symlink-safe, repo-rooted), so the renderer can only
// read Markdown inside the repo. Electron-free.
import { readFile as fsReadFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { glob as tinyglob } from "tinyglobby";

import { containedReadPath } from "./paths";
import type { DocContent, DocEntry } from "../../shared/ipc";

// The engine's AuditContext glob and readFile (engine/src/context.ts), inlined:
// the rest of that context stayed behind with the audit.
function buildContext(repoPath: string) {
  const root = resolve(repoPath);
  return {
    async glob(pattern: string | string[]) {
      const patterns = Array.isArray(pattern) ? pattern : [pattern];
      return tinyglob(patterns, {
        cwd: root,
        dot: true,
        onlyFiles: true,
        // Don't traverse into symlinked directories: a repo can't point the
        // glob at files outside itself (secret-leak / escape guard, #95).
        followSymbolicLinks: false,
        ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
      });
    },

    async readFile(relPath: string) {
      // Follow symlinks only while they stay inside the repo; a file symlinked to
      // e.g. `~/.aws/credentials` reads as absent rather than disclosing it.
      const real = await containedReadPath(root, relPath);
      if (real === null) return null;
      try {
        return await fsReadFile(real, "utf8");
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
  };
}

const DOC_GLOBS = [
  "*.md",
  "docs/**/*.md",
  ".rachetari/**/*.md",
  ".rivetari/**/*.md",
  ".github/**/*.md",
];

/**
 * Task ledgers live under these. Tasks already shows each task's record, so
 * listing them again would bury the repo's own docs among them. Repos written
 * before the rename keep theirs under `.rivetari/`.
 */
const TASKS_DIRS = [".rachetari/tasks/", ".rivetari/tasks/"];

export async function listDocs(repoPath: string): Promise<DocEntry[]> {
  const ctx = buildContext(repoPath);
  const matches = await ctx.glob(DOC_GLOBS);
  const unique = [...new Set(matches)]
    .filter((path) => !TASKS_DIRS.some((dir) => path.startsWith(dir)))
    .sort((a, b) => a.localeCompare(b));
  return unique.map((path) => ({ path, name: path }));
}

export async function readDoc(
  repoPath: string,
  path: string,
): Promise<DocContent> {
  const ctx = buildContext(repoPath);
  const markdown = await ctx.readFile(path);
  if (markdown === null) {
    throw new Error(`document not found: ${basename(path)}`);
  }
  return { path, markdown };
}
