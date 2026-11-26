// The shell was called Rivetari, and Electron keeps userData in a folder named
// after the app, so the rename to Rachetari starts it in a new, empty folder.
// On startup main copies the person's registered repos and settings across
// from the old folder, once, while the new one has neither. The old folder is
// never changed: a copy, not a move. Kept free of any electron import so it
// unit-tests as plain functions.
import { constants, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** The files in userData that hold the person's own state. */
export const USER_DATA_FILES = ["repos.json", "settings.json"] as const;

/**
 * The userData folder the shell used before the rename: beside `newDir`, with
 * Rachetari spelled Rivetari in its name (`Rachetari` → `Rivetari` packaged,
 * `rachetari-desktop` → `rivetari-desktop` unpackaged). Null when the name
 * doesn't carry the app's name, so there is no old folder to find.
 */
export function oldUserDataDir(newDir: string): string | null {
  const name = basename(newDir);
  const old = name
    .replace(/Rachetari/g, "Rivetari")
    .replace(/rachetari/g, "rivetari");
  return old === name ? null : join(dirname(newDir), old);
}

/**
 * Copy the old folder's state files into `newDir` when `newDir` has none of
 * them and the old folder has at least one. Returns the names copied (empty
 * when nothing was). Never overwrites, moves or deletes a file.
 */
export function copyOldUserData(newDir: string, oldDir: string): string[] {
  if (USER_DATA_FILES.some((file) => existsSync(join(newDir, file)))) return [];
  const found = USER_DATA_FILES.filter((file) =>
    existsSync(join(oldDir, file)),
  );
  if (found.length === 0) return [];
  mkdirSync(newDir, { recursive: true });
  for (const file of found) {
    copyFileSync(
      join(oldDir, file),
      join(newDir, file),
      constants.COPYFILE_EXCL,
    );
  }
  return found;
}

/**
 * Main's startup step: copy the Rivetari folder's repos and settings into
 * `newDir` (the userData folder) and log what was copied. A failure is said,
 * not thrown, so the shell still starts.
 */
export function copyRivetariUserData(newDir: string): void {
  const oldDir = oldUserDataDir(newDir);
  if (!oldDir) return;
  try {
    const copied = copyOldUserData(newDir, oldDir);
    if (copied.length > 0)
      console.info(
        `[main] copied ${copied.join(", ")} from ${oldDir} to ${newDir} (the Rivetari → Rachetari rename)`,
      );
  } catch (err) {
    console.error(
      `[main] couldn't copy the Rivetari userData from ${oldDir}: ${String(err)}`,
    );
  }
}
