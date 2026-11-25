// History on a kit-shaped repo: finished cards and night reports.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { kitFixture, type KitFixture } from "../../../test/kit-fixture";
import { readHistory, readNight } from "./history";

let fx: KitFixture;
beforeAll(() => {
  fx = kitFixture();
});
afterAll(() => fx.remove());

describe("History", { timeout: 30_000 }, () => {
  it("lists the finished cards and the night reports, newest first", async () => {
    const view = await readHistory(fx.repo);
    expect(view.done.map((d) => [d.id, d.status, d.pr])).toEqual([
      ["T-0002", "done", 2],
      ["T-0001", "done", 1],
    ]);
    expect(view.nights).toEqual([
      {
        date: "2026-11-24",
        path: "nights/2026-11-24.md",
        merged: 1,
        held: 1,
        blocked: 0,
      },
    ]);
  });

  it("reads a listed night, and refuses one that isn't listed", async () => {
    const night = await readNight(fx.repo, "2026-11-24");
    expect(night.markdown).toContain("held: test failed twice");
    await expect(readNight(fx.repo, "2026-11-23")).rejects.toThrow(
      /no night report/,
    );
  });
});
