// The file source against a repo laid out the way the kit leaves it.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  cardText,
  kitFixture,
  type KitFixture,
} from "../../../test/kit-fixture";
import {
  fetchRepo,
  hasMap,
  readBacklog,
  readDoneCards,
  readEvents,
  readLiveCards,
  readNights,
  readSkills,
} from "./source";

let fx: KitFixture;
beforeAll(() => {
  fx = kitFixture();
});
afterAll(() => fx.remove());

/** Every ref and the working tree's status: what a read must never change. */
function snapshot(repo: string): string {
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" });
  return [
    git("for-each-ref", "--format=%(refname) %(objectname)"),
    git("status", "--porcelain"),
    git("rev-parse", "HEAD"),
    readFileSync(join(repo, "CARD.md"), "utf8"),
  ].join("\n");
}

describe("the file source", { timeout: 30_000 }, () => {
  it("reads live cards from the working tree, local branches and the origin", async () => {
    const cards = await readLiveCards(fx.repo);
    const byBranch = new Map(cards.map((c) => [c.branch, c]));
    expect([...byBranch.keys()].sort()).toEqual([
      "card/T-0003",
      "card/T-0004",
      "card/T-0005",
      "card/T-0006",
    ]);

    const current = byBranch.get("card/T-0003");
    expect(current?.where).toBe("checked-out");
    expect(current?.card).toMatchObject({
      id: "T-0003",
      title: "feat: export the report as CSV",
      status: "in progress",
      heldBy: "pc",
      nextStep: "Write the CSV writer's test.",
      pr: 7,
    });
    expect(current?.card?.criteria).toEqual([
      expect.objectContaining({ id: "A1", state: "ticked" }),
      expect.objectContaining({ id: "A2", state: "unticked" }),
    ]);
    expect(current?.lastCommitAt).toMatch(/^\d{4}-\d\d-\d\dT/);

    expect(byBranch.get("card/T-0004")).toMatchObject({
      where: "local",
      card: { status: "draft", heldBy: null },
    });
    const remote = byBranch.get("card/T-0005");
    expect(remote).toMatchObject({
      where: "remote",
      card: { status: "blocked", heldBy: "laptop" },
    });
    expect(remote?.card?.questions).toEqual([
      { text: "Round half up or half even?", open: true },
    ]);
  });

  it("shows a card that doesn't parse as unreadable, with its branch", async () => {
    const cards = await readLiveCards(fx.repo);
    const bad = cards.find((c) => c.branch === "card/T-0006");
    expect(bad?.card).toBeNull();
    expect(bad?.error).toMatch(/unreadable/);
  });

  it("reads the backlog's three lists and the checklist's stage", async () => {
    const backlog = await readBacklog(fx.repo);
    expect(backlog?.nextUp).toEqual([
      "Export the report as CSV · from spec §3",
      "Dark mode for the settings page · from parked line",
    ]);
    expect(backlog?.parked).toEqual([
      expect.objectContaining({
        date: "2026-11-21",
        tag: "product",
        what: "Top bar overlaps the title at 961px",
        seenOn: "T-0002",
        where: "`src/TopBar.tsx`",
      }),
      expect.objectContaining({ tag: "tool", seenOn: "T-0003" }),
    ]);
    const checklist = backlog?.checklist;
    expect(checklist?.stage).toBe("Building");
    expect(checklist?.stageWhy).toMatch(/README says how to run it/);
    expect(checklist?.lastSetup).toMatch(/2026-11-22/);
    expect(checklist?.groups.map((g) => g.name)).toEqual([
      "Foundation",
      "Building",
      "Hardening",
    ]);
    expect(checklist?.groups[0]?.lines).toEqual([
      expect.objectContaining({
        text: "It builds",
        status: "pass",
        check: "pnpm build",
      }),
      expect.objectContaining({ status: "pass" }),
      expect.objectContaining({
        text: "main's CI is green",
        status: "unchecked",
      }),
    ]);
    expect(checklist?.groups[1]?.lines).toEqual([
      expect.objectContaining({ status: "fail", isNew: false }),
      expect.objectContaining({ status: "pass", isNew: true }),
    ]);
    expect(checklist?.groups[2]?.lines).toEqual([
      expect.objectContaining({
        status: "n/a",
        text: "nothing is deployed yet",
      }),
    ]);
  });

  it("reads finished cards, night reports, skills and the map", async () => {
    const done = await readDoneCards(fx.repo);
    expect(done.map((d) => [d.id, d.status, d.pr])).toEqual([
      ["T-0002", "done", 2],
      ["T-0001", "done", 1],
    ]);
    expect(done[0]?.closedAt).toMatch(/^\d{4}-/);

    expect(await readNights(fx.repo)).toEqual([
      expect.objectContaining({
        date: "2026-11-24",
        merged: 1,
        held: 1,
        blocked: 0,
      }),
    ]);
    expect((await readSkills(fx.repo)).map((s) => s.name)).toEqual([
      "test-driven-development",
      "frontend-design",
    ]);
    expect(await hasMap(fx.repo)).toBe(true);
  });

  it("lists recent events from card branches and the kit's folders, newest first", async () => {
    const events = await readEvents(fx.repo);
    const subjects = events.map((e) => e.subject);
    expect(subjects).toContain("feat: the CSV button");
    expect(subjects).toContain("chore(card): T-0005");
    expect(subjects).toContain("chore: the kit");
    const times = events.map((e) => e.at);
    expect([...times].sort().reverse()).toEqual(times);
    expect(
      events.find((e) => e.subject === "feat: the CSV button")?.cardId,
    ).toBe("T-0003");
  });

  it("never changes the repo when it reads", async () => {
    const before = snapshot(fx.repo);
    await readLiveCards(fx.repo);
    await readBacklog(fx.repo);
    await readDoneCards(fx.repo);
    await readNights(fx.repo);
    await readSkills(fx.repo);
    await hasMap(fx.repo);
    await readEvents(fx.repo);
    expect(snapshot(fx.repo)).toBe(before);
  });

  it("only sees a card pushed from another machine after a fetch", async () => {
    fx.pushToOrigin(
      "T-0010",
      cardText({
        id: "T-0010",
        title: "feat: from the laptop",
        status: "ready",
      }),
    );
    const before = await readLiveCards(fx.repo);
    expect(before.some((c) => c.branch === "card/T-0010")).toBe(false);
    await fetchRepo(fx.repo);
    const after = await readLiveCards(fx.repo);
    expect(after.find((c) => c.branch === "card/T-0010")).toMatchObject({
      where: "remote",
      card: { status: "ready" },
    });
  });
});
