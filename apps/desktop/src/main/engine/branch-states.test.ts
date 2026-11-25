// A card/* branch with no readable CARD.md is done, drafting or broken: the
// file source tells them apart, Now waits on (and notifies for) only a broken
// one, and Tasks puts each where it belongs. The extra branches are built on
// the kit fixture here, with git.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  cardText,
  kitFixture,
  type KitFixture,
} from "../../../test/kit-fixture";
import { readDoneCard, readDoneCards, readLiveCards } from "../kit/source";
import {
  type KitEvent,
  type KitSnapshot,
  readKit,
  type WatchRepo,
} from "../kit/watch";
import type { NeedsYouItem } from "../../shared/ipc";
import { needsYouItems, nowState, NowHub } from "./now";
import { taskDetail, taskItems } from "./tasks";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function commitFile(cwd: string, path: string, text: string): void {
  mkdirSync(dirname(join(cwd, path)), { recursive: true });
  writeFileSync(join(cwd, path), text);
  git(cwd, "add", path);
  git(cwd, "commit", "-q", "-m", `add ${path}`);
}

function removeFile(cwd: string, path: string): void {
  git(cwd, "rm", "-q", path);
  git(cwd, "commit", "-q", "-m", `remove ${path}`);
}

/** A card branch off main whose CARD.md was committed, then removed. */
function removedCard(repo: string, id: string): void {
  git(repo, "checkout", "-q", "-b", `card/${id}`, "main");
  commitFile(
    repo,
    "CARD.md",
    cardText({ id, title: `feat: ${id}`, status: "in progress" }),
  );
  removeFile(repo, "CARD.md");
}

let fx: KitFixture;
/** The fixture as built. */
let before: KitSnapshot;
/** The fixture with the extra branches. */
let after: KitSnapshot;

beforeAll(async () => {
  fx = kitFixture();
  before = await readKit(fx.repo);
  const repo = fx.repo;
  const origin = fx.origin;

  // develop, on the origin only: T-0007 closed there today, and a second copy
  // of T-0001 that wins over the default branch's.
  git(origin, "checkout", "-q", "-b", "develop", "main");
  commitFile(
    origin,
    "cards/done/T-0007.md",
    cardText({ id: "T-0007", title: "feat: closed today", status: "done" }),
  );
  commitFile(
    origin,
    "cards/done/T-0001.md",
    cardText({ id: "T-0001", title: "the day branch's copy", status: "done" }),
  );
  git(origin, "checkout", "-q", "main");
  git(repo, "fetch", "-q", "origin");

  // An older day branch, local: its done files don't count.
  git(repo, "checkout", "-q", "-b", "day/2026-11-24", "main");
  commitFile(
    repo,
    "cards/done/T-0010.md",
    cardText({ id: "T-0010", title: "feat: closed yesterday", status: "done" }),
  );

  // Done on the default branch: CARD.md moved away.
  removedCard(repo, "T-0001");
  // Done on the default branch, with a CARD.md that doesn't parse: still done.
  git(repo, "checkout", "-q", "-b", "card/T-0002", "main");
  commitFile(repo, "CARD.md", "not a card\n");
  // Done on develop only.
  removedCard(repo, "T-0007");
  // Done only on an older day branch: broken.
  removedCard(repo, "T-0010");
  // Removed and not done: broken.
  removedCard(repo, "T-0013");
  // Drafting: no CARD.md has ever been committed on it.
  git(repo, "checkout", "-q", "-b", "card/T-0012", "main");
  commitFile(repo, "notes.md", "an idea\n");

  git(repo, "checkout", "-q", "card/T-0003");
  after = await readKit(fx.repo);
}, 60_000);
afterAll(() => fx.remove());

/** A watcher the test drives by hand. */
function fakeWatch() {
  const listeners = new Map<string, (e: KitEvent) => void>();
  const watch: WatchRepo = (repo, onEvent) => {
    listeners.set(repo, onEvent);
    return { ready: Promise.resolve(), stop: async () => undefined };
  };
  const send = (repo: string, snap: KitSnapshot) =>
    listeners.get(repo)?.({ kind: "snapshot", snapshot: snap });
  return { watch, send };
}

describe("done, drafting and broken branches", { timeout: 30_000 }, () => {
  it("tells done, drafting and broken branches apart", async () => {
    const cards = await readLiveCards(fx.repo);
    const byBranch = new Map(cards.map((c) => [c.branch, c]));
    // Done branches aren't live cards.
    expect([...byBranch.keys()]).toEqual([
      "card/T-0003",
      "card/T-0004",
      "card/T-0005",
      "card/T-0006",
      "card/T-0010",
      "card/T-0012",
      "card/T-0013",
    ]);

    expect(byBranch.get("card/T-0012")).toMatchObject({
      card: null,
      drafting: true,
      where: "local",
    });
    expect(byBranch.get("card/T-0012")?.error).toBeUndefined();

    const doesntParse = byBranch.get("card/T-0006");
    expect(doesntParse?.drafting).toBeFalsy();
    expect(doesntParse?.error).toMatch(/^unreadable: CARD.md doesn't parse/);
    for (const removed of ["card/T-0010", "card/T-0013"]) {
      expect(byBranch.get(removed)?.drafting).toBeFalsy();
      expect(byBranch.get(removed)?.error).toMatch(
        /^unreadable: CARD.md was removed .* isn't in cards\/done\//,
      );
    }

    // A branch whose CARD.md parses reads as before.
    expect(byBranch.get("card/T-0003")).toMatchObject({
      where: "checked-out",
      card: { id: "T-0003", status: "in progress" },
    });
    expect(byBranch.get("card/T-0003")?.drafting).toBeUndefined();
    expect(byBranch.get("card/T-0003")?.error).toBeUndefined();
  });

  it("reads done cards from develop too", async () => {
    const done = await readDoneCards(fx.repo);
    expect(done.map((d) => [d.id, d.title])).toEqual([
      ["T-0007", "feat: closed today"],
      ["T-0002", "feat: add the report page"],
      // develop's copy wins over the default branch's.
      ["T-0001", "the day branch's copy"],
    ]);
    expect(done[0]?.closedAt).toMatch(/^\d{4}-/);

    // Its record opens, with the commits that touched it.
    expect(await readDoneCard(fx.repo, "cards/done/T-0007.md")).toMatchObject({
      id: "T-0007",
      title: "feat: closed today",
    });
    const detail = await taskDetail(
      fx.repo,
      after,
      "done:cards/done/T-0007.md",
    );
    expect(detail.error).toBeNull();
    expect(detail.card?.id).toBe("T-0007");
    expect(detail.commits.map((c) => c.subject)).toEqual([
      "add cards/done/T-0007.md",
    ]);
  });

  it("only a broken branch waits on you, and only it notifies", async () => {
    const unreadable = needsYouItems(after)
      .filter((i) => i.kind === "unreadable")
      .map((i) => i.id)
      .sort();
    expect(unreadable).toEqual(["card/T-0006", "card/T-0010", "card/T-0013"]);
    const ids = needsYouItems(after).map((i) => i.id);
    for (const quiet of ["card/T-0012", "T-0012", "T-0001", "T-0007"])
      expect(ids).not.toContain(quiet);

    // Now's card list shows the drafting branch as drafting, and no done one.
    const lines = nowState(fx.repo, after, true, null).cards;
    expect(lines.find((c) => c.branch === "card/T-0012")).toMatchObject({
      id: "T-0012",
      status: "drafting",
    });
    expect(lines.map((c) => c.branch)).not.toContain("card/T-0001");
    expect(lines.map((c) => c.branch)).not.toContain("card/T-0007");

    const fake = fakeWatch();
    const told: NeedsYouItem[] = [];
    const hub = new NowHub({
      onState: () => undefined,
      onBadges: () => undefined,
      onNew: (_repo, item) => told.push(item),
      watch: fake.watch,
    });
    await hub.setRepos([fx.repo]);
    fake.send(fx.repo, before);
    fake.send(fx.repo, after);
    expect(told.map((i) => [i.kind, i.id]).sort()).toEqual([
      ["unreadable", "card/T-0010"],
      ["unreadable", "card/T-0013"],
    ]);
    // The badge counts the two broken branches, not the drafting or done ones.
    expect(hub.badges().find((b) => b.repoPath === fx.repo)?.count).toBe(
      needsYouItems(before).length + 2,
    );
    await hub.stop();
  });

  it("never notifies for a PR to merge", async () => {
    const merging = {
      ...after,
      cards: after.cards.map((c) =>
        c.card?.id === "T-0003"
          ? { ...c, card: { ...c.card, status: "done" } }
          : c,
      ),
    };
    // It stays listed in Needs you.
    expect(needsYouItems(merging).filter((i) => i.kind === "merge")).toEqual([
      expect.objectContaining({ id: "T-0003" }),
    ]);

    const fake = fakeWatch();
    const told: NeedsYouItem[] = [];
    const hub = new NowHub({
      onState: () => undefined,
      onBadges: () => undefined,
      onNew: (_repo, item) => told.push(item),
      watch: fake.watch,
    });
    await hub.setRepos([fx.repo]);
    fake.send(fx.repo, after);
    fake.send(fx.repo, merging);
    expect(told).toEqual([]);
    expect(hub.badges().find((b) => b.repoPath === fx.repo)?.count).toBe(
      needsYouItems(after).length + 1,
    );
    await hub.stop();
  });

  it("puts drafting under Draft and done under Done, once", async () => {
    const items = taskItems(after);
    const of = (id: string) => items.filter((i) => i.id === id);

    expect(of("T-0012")).toEqual([
      expect.objectContaining({
        column: "draft",
        status: "drafting",
        unreadable: false,
        branch: "card/T-0012",
        source: "card",
      }),
    ]);
    for (const id of ["T-0001", "T-0002", "T-0007"])
      expect(of(id)).toEqual([
        expect.objectContaining({ column: "done", source: "done" }),
      ]);
    for (const id of ["T-0006", "T-0010", "T-0013"])
      expect(of(id)).toEqual([
        expect.objectContaining({
          column: "blocked",
          status: "unreadable",
          unreadable: true,
        }),
      ]);

    const drafting = await taskDetail(fx.repo, after, "branch:card/T-0012");
    expect(drafting.card).toBeNull();
    expect(drafting.error).toBeNull();
    expect(drafting.commits.map((c) => c.subject)).toEqual(["add notes.md"]);
  });
});
