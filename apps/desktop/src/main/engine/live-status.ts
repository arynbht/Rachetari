// The live shell's status (T-0030's scripts/live-shell.mjs writes it and names
// it in RACHETARI_LIVE_STATUS) as the header shows it: the commit running, and
// why the shell is behind develop when it is. Not live, or a file that can't
// be read as that script writes it: nothing. Electron-free; read only.
import { readFile } from "node:fs/promises";

import { z } from "zod";

import type { ShellStatus } from "../../shared/ipc";

export type LiveStatus = NonNullable<ShellStatus["live"]>;

/** The part of the status file the header reads. */
const StatusFile = z.object({
  running: z.string().min(1),
  failure: z
    .object({ sha: z.string(), step: z.string(), reason: z.string() })
    .nullable(),
});

const short = (sha: string) => sha.slice(0, 7);

/** The steps that check a new develop before the live shell moves to it. */
const CHECKS = new Set(["install", "build", "test"]);

export async function liveStatus(
  env: NodeJS.ProcessEnv = process.env,
): Promise<LiveStatus | null> {
  const path = env.RACHETARI_LIVE_STATUS;
  if (!path) return null;
  let parsed: z.infer<typeof StatusFile>;
  try {
    const read = StatusFile.safeParse(JSON.parse(await readFile(path, "utf8")));
    if (!read.success) return null;
    parsed = read.data;
  } catch {
    return null;
  }
  const running = short(parsed.running);
  const { failure } = parsed;
  if (!failure) return { running, behind: null };
  const behind = CHECKS.has(failure.step)
    ? `Live shell is behind: the ${failure.step} of ${short(failure.sha)} failed; still running ${running}.`
    : `Live shell is behind: ${failure.reason.split(/\r?\n/)[0] ?? ""}`;
  return { running, behind };
}
