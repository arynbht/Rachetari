// The Tasks board's columns and one card's record, on a kit-shaped repo.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { kitFixture, type KitFixture } from "../../../test/kit-fixture";
import { type KitSnapshot, readKit } from "../kit/watch";
import { columnOf, taskDetail, taskItems } from "./tasks";

let fx: KitFixture;
let snapshot: KitSnapshot;
beforeAll(async () => {
  fx = kitFixture();
  snapshot = await readKit(fx.repo);
}, 30_000);
afterAll(() => fx.remove());

describe("the Tasks board", { timeout: 30_000 }, () => {
  it("puts each status in its column", () => {
    expect(columnOf("draft", null)).toBe("draft");
    expect(columnOf("Ready", null)).toBe("ready");
    expect(columnOf("in progress", 3)).toBe("progress");
    expect(columnOf("blocked", null)).toBe("blocked");
    expect(columnOf("done", 7)).toBe("pr");
    expect(columnOf("done", null)).toBe("done");
    // A status the template doesn't list needs a person to look at it.
    expect(columnOf("waiting on legal", null)).toBe("blocked");
  });

  it("shows Next up, every live card and the finished cards", () => {
    const items = taskItems(snapshot);
    expect(items.map((i) => [i.id, i.column, i.source])).toEqual([
      ["Next up 1", "next", "next-up"],
      ["Next up 2", "next", "next-up"],
      ["T-0003", "progress", "card"],
      ["T-0004", "draft", "card"],
      ["T-0005", "blocked", "card"],
      ["T-0006", "blocked", "card"],
      ["T-0002", "done", "done"],
      ["T-0001", "done", "done"],
    ]);
    expect(items.find((i) => i.id === "T-0006")).toMatchObject({
      unreadable: true,
      status: "unreadable",
      branch: "card/T-0006",
    });
    expect(items.find((i) => i.id === "T-0005")).toMatchObject({
      heldBy: "laptop",
      branch: "card/T-0005",
    });
  });

  it("reads a live card in full, with the commits on its branch", async () => {
    const detail = await taskDetail(fx.repo, snapshot, "branch:card/T-0003");
    expect(detail.card).toMatchObject({
      id: "T-0003",
      nextStep: "Write the CSV writer's test.",
      filesInScope: ["`src/app.ts`"],
      outOfScope: ["the other thing"],
      constraints: ["No new dependencies."],
      decisions: ["2026-11-20: Keep it small — one card"],
    });
    expect(detail.card?.criteria.map((c) => c.state)).toEqual([
      "ticked",
      "unticked",
    ]);
    expect(detail.card?.evidence).toContain("pnpm test -> 3 passed");
    expect(detail.commits.map((c) => c.subject)).toEqual([
      "feat: the CSV button",
    ]);
  });

  it("reads a card that is only on the remote, and a finished card", async () => {
    const remote = await taskDetail(fx.repo, snapshot, "branch:card/T-0005");
    expect(remote.card?.questions).toEqual([
      { text: "Round half up or half even?", open: true },
    ]);
    expect(remote.commits.map((c) => c.subject)).toEqual([
      "chore(card): T-0005",
    ]);

    const done = await taskDetail(
      fx.repo,
      snapshot,
      "done:cards/done/T-0002.md",
    );
    expect(done.card?.criteria.map((c) => c.state)).toEqual([
      "ticked",
      "untested",
    ]);
    expect(done.commits.map((c) => c.subject)).toEqual(["chore: the kit"]);
  });

  it("says why an unreadable card has no record, and refuses a key it doesn't know", async () => {
    const bad = await taskDetail(fx.repo, snapshot, "branch:card/T-0006");
    expect(bad.card).toBeNull();
    expect(bad.error).toMatch(/unreadable/);
    await expect(
      taskDetail(fx.repo, snapshot, "done:../../etc/passwd"),
    ).rejects.toThrow(/there is no card/);
  });
});
