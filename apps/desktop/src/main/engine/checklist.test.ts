// The Checklist reader on a kit-shaped repo, and on a repo /setup hasn't run in.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { kitFixture, type KitFixture } from "../../../test/kit-fixture";
import { readChecklist } from "./checklist";

let fx: KitFixture;
beforeAll(() => {
  fx = kitFixture();
});
afterAll(() => fx.remove());

describe("the Checklist reader", { timeout: 30_000 }, () => {
  it("reads the stage, what decides it, the last /setup and the groups", async () => {
    const view = await readChecklist(fx.repo);
    expect(view).toMatchObject({
      hasBacklog: true,
      stage: "Building",
      lastSetup: "2026-11-22, on main.",
    });
    expect(view.stageWhy).toMatch(/README says how to run it/);
    expect(view.groups.map((g) => [g.name, g.lines.length])).toEqual([
      ["Foundation", 3],
      ["Building", 2],
      ["Hardening", 1],
    ]);
  });

  it("says there's no backlog in a repo /setup hasn't run in", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rachetari-no-backlog-"));
    try {
      const git = (...args: string[]) =>
        execFileSync("git", args, { cwd: dir, encoding: "utf8" });
      git("init", "-q", "-b", "main");
      git("config", "user.email", "t@t");
      git("config", "user.name", "t");
      writeFileSync(join(dir, "README.md"), "# x\n");
      git("add", "-A");
      git("commit", "-q", "--no-verify", "-m", "init");
      expect(await readChecklist(dir)).toMatchObject({
        hasBacklog: false,
        stage: null,
        groups: [],
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
