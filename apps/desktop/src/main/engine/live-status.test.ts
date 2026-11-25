// The live shell's status file (T-0030's scripts/live-shell.mjs) as the header
// shows it: the running commit, and a warning when the shell is behind.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { liveStatus } from "./live-status";

const RUNNING = "d5e49a186c786d31cc2ee90994408780f049f139";
const TARGET = "cb8b60c0a1b2c3d4e5f60718293a4b5c6d7e8f90";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "rivetari-live-status-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** A status file with these contents, and the env that names it. */
function statusFile(name: string, contents: unknown) {
  const path = join(dir, name);
  writeFileSync(
    path,
    typeof contents === "string" ? contents : JSON.stringify(contents),
  );
  return { RIVETARI_LIVE_STATUS: path };
}

const status = (failure: unknown) => ({
  running: RUNNING,
  develop: TARGET,
  checkedAt: "2026-11-25T21:39:37.821Z",
  fetchError: null,
  failure,
});

describe("liveStatus", () => {
  it("no RIVETARI_LIVE_STATUS, no live status", async () => {
    expect(await liveStatus({})).toBeNull();
    expect(await liveStatus({ RIVETARI_LIVE_STATUS: "" })).toBeNull();
  });

  it("a missing or malformed status file shows nothing", async () => {
    expect(
      await liveStatus({ RIVETARI_LIVE_STATUS: join(dir, "missing.json") }),
    ).toBeNull();
    expect(await liveStatus({ RIVETARI_LIVE_STATUS: dir })).toBeNull();
    expect(await liveStatus(statusFile("torn.json", '{"running": "d5'))).toBe(
      null,
    );
    expect(
      await liveStatus(
        statusFile("shape.json", { running: 42, failure: null }),
      ),
    ).toBeNull();
    expect(
      await liveStatus(
        statusFile("failure.json", status({ step: "build", sha: TARGET })),
      ),
    ).toBeNull();
  });

  it("a status with a failed build gives the behind warning", async () => {
    const failure = (step: string) =>
      status({ sha: TARGET, step, reason: "exit 1", at: "2026-11-25T21:40Z" });
    expect(
      await liveStatus(statusFile("build.json", failure("build"))),
    ).toEqual({
      running: "d5e49a1",
      behind:
        "Live shell is behind: the build of cb8b60c failed; still running d5e49a1.",
    });
    for (const step of ["install", "test"])
      expect(
        (await liveStatus(statusFile(`${step}.json`, failure(step))))?.behind,
      ).toBe(
        `Live shell is behind: the ${step} of cb8b60c failed; still running d5e49a1.`,
      );
  });

  it("a diverged status gives its reason as the warning", async () => {
    const reason =
      "local develop d5e49a1 and origin/develop cb8b60c have diverged; nothing moves until one contains the other";
    expect(
      await liveStatus(
        statusFile(
          "diverged.json",
          status({ sha: RUNNING, step: "diverged", reason, at: "x" }),
        ),
      ),
    ).toEqual({
      running: "d5e49a1",
      behind: `Live shell is behind: ${reason}`,
    });

    const notForward =
      "develop cb8b60c does not descend from the running d5e49a1; the live shell only moves forward";
    expect(
      (
        await liveStatus(
          statusFile(
            "not-forward.json",
            status({ sha: TARGET, step: "not-forward", reason: notForward }),
          ),
        )
      )?.behind,
    ).toBe(`Live shell is behind: ${notForward}`);

    // Any other step says its reason's first line.
    expect(
      (
        await liveStatus(
          statusFile(
            "dirty.json",
            status({
              sha: TARGET,
              step: "dirty",
              reason: "the live worktree has local changes:\n M a.ts",
            }),
          ),
        )
      )?.behind,
    ).toBe("Live shell is behind: the live worktree has local changes:");
  });

  it("a status without a failure gives the running commit only", async () => {
    expect(await liveStatus(statusFile("calm.json", status(null)))).toEqual({
      running: "d5e49a1",
      behind: null,
    });
  });
});
