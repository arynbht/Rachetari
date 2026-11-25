// The Now projection over a kit-shaped repo, and the hub's polling shape with a
// fake watcher: intervals, the repo on show, first-read priming, new and gone.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { kitFixture, type KitFixture } from "../../../test/kit-fixture";
import {
  EMPTY_SNAPSHOT,
  type KitEvent,
  type KitSnapshot,
  readKit,
  type WatchRepo,
} from "../kit/watch";
import type { NeedsYouItem } from "../../shared/ipc";
import { needsYouItems, nowState, NowHub } from "./now";

let fx: KitFixture;
let snapshot: KitSnapshot;
beforeAll(async () => {
  fx = kitFixture();
  snapshot = await readKit(fx.repo);
}, 30_000);
afterAll(() => fx.remove());

describe("the Now projection", () => {
  it("lists what waits on the owner, each with what to do and where", () => {
    const items = needsYouItems(snapshot);
    const byKind = (kind: NeedsYouItem["kind"]) =>
      items.filter((i) => i.kind === kind);

    expect(byKind("approve")).toEqual([
      expect.objectContaining({
        id: "T-0004",
        todo: "Set Status to ready in CARD.md on card/T-0004.",
      }),
    ]);
    expect(byKind("question")).toEqual([
      expect.objectContaining({
        id: "T-0005",
        why: "Round half up or half even?",
        todo: 'Answer under "Questions for me" in CARD.md on card/T-0005, then set Status back to ready.',
      }),
    ]);
    expect(byKind("held")).toEqual([
      expect.objectContaining({
        id: "T-0009",
        why: "held: test failed twice",
        todo: "Read nights/2026-11-24.md, then fix or re-plan T-0009 on card/T-0009.",
      }),
    ]);
    expect(byKind("unreadable")).toEqual([
      expect.objectContaining({ id: "card/T-0006", branch: "card/T-0006" }),
    ]);
    // In progress with a PR isn't waiting to merge: only a done card is.
    expect(byKind("merge")).toEqual([]);
  });

  it("puts the oldest first, and an item with no time last", () => {
    const items = needsYouItems(snapshot);
    const times = items.map((i) => i.at);
    const dated = times.filter((t): t is string => t !== null);
    expect(dated).toEqual([...dated].sort());
    expect(times.indexOf(null)).toBe(dated.length);
  });

  it("says a done card with a PR waits to be merged", () => {
    const done = {
      ...snapshot,
      cards: snapshot.cards.map((c) =>
        c.card?.id === "T-0003"
          ? { ...c, card: { ...c.card, status: "done" } }
          : c,
      ),
    };
    expect(needsYouItems(done).filter((i) => i.kind === "merge")).toEqual([
      expect.objectContaining({
        id: "T-0003",
        todo: "Review and merge PR #7 (from card/T-0003).",
      }),
    ]);
  });

  it("shows the cards in progress, the health and the recent events", () => {
    const state = nowState(fx.repo, snapshot, true, null);
    expect(state.running).toEqual([
      expect.objectContaining({
        id: "T-0003",
        heldBy: "pc",
        nextStep: "Write the CSV writer's test.",
      }),
    ]);
    expect(state.health).toMatchObject({
      stage: "Building",
      counts: { pass: 3, fail: 1, unchecked: 1, na: 1 },
      skills: { count: 2, onLiveCards: ["testing/test-driven-development"] },
      lastNight: { date: "2026-11-24", merged: 1, held: 1, blocked: 0 },
    });
    expect(state.recent.length).toBeGreaterThan(0);
    expect(state.recent.length).toBeLessThanOrEqual(50);
  });
});

/** A watcher the test drives by hand, recording each start's interval. */
function fakeWatch() {
  const started: { repo: string; intervalMs: number; stopped: boolean }[] = [];
  const listeners = new Map<string, (e: KitEvent) => void>();
  const watch: WatchRepo = (repo, onEvent, { intervalMs }) => {
    const entry = { repo, intervalMs, stopped: false };
    started.push(entry);
    listeners.set(repo, onEvent);
    return {
      ready: Promise.resolve(),
      stop: async () => {
        entry.stopped = true;
      },
    };
  };
  const send = (repo: string, snap: KitSnapshot) =>
    listeners.get(repo)?.({ kind: "snapshot", snapshot: snap });
  return { watch, started, send };
}

describe("the Now hub", () => {
  it("reads the repo on show every 2 s and the rest every 10 s", async () => {
    const fake = fakeWatch();
    const hub = new NowHub({
      onState: () => undefined,
      onBadges: () => undefined,
      onNew: () => undefined,
      watch: fake.watch,
    });
    await hub.setRepos(["/a", "/b"]);
    expect(fake.started.map((s) => s.intervalMs)).toEqual([10_000, 10_000]);
    await hub.select("/a");
    const live = fake.started.filter((s) => !s.stopped);
    expect(live.map((s) => [s.repo, s.intervalMs])).toEqual([
      ["/b", 10_000],
      ["/a", 2000],
    ]);
    await hub.stop();
  });

  it("primes on the first read: what was already waiting isn't news", async () => {
    const fake = fakeWatch();
    const told: NeedsYouItem[] = [];
    const gone: string[] = [];
    const hub = new NowHub({
      onState: () => undefined,
      onBadges: () => undefined,
      onNew: (_repo, item) => told.push(item),
      onGone: (_repo, key) => gone.push(key),
      watch: fake.watch,
    });
    await hub.setRepos([fx.repo]);
    fake.send(fx.repo, snapshot);
    expect(told).toEqual([]);

    // A new draft appears: that is news, once.
    const draft = snapshot.cards.find((c) => c.card?.id === "T-0004");
    if (!draft?.card) throw new Error("fixture has no T-0004");
    const more = {
      ...snapshot,
      cards: [
        ...snapshot.cards,
        {
          ...draft,
          branch: "card/T-0011",
          card: { ...draft.card, id: "T-0011" },
        },
      ],
    };
    fake.send(fx.repo, more);
    fake.send(fx.repo, more);
    expect(told.map((i) => [i.kind, i.id])).toEqual([["approve", "T-0011"]]);

    // It goes when it's approved.
    fake.send(fx.repo, snapshot);
    expect(gone).toEqual([
      "approve#T-0011#Drafted and waiting for you to approve it.",
    ]);
    expect(hub.badges().find((b) => b.repoPath === fx.repo)?.count).toBe(
      needsYouItems(snapshot).length,
    );
    await hub.stop();
  });

  it("starts empty and not ready for a repo it hasn't read", () => {
    const hub = new NowHub({
      onState: () => undefined,
      onBadges: () => undefined,
      onNew: () => undefined,
      watch: fakeWatch().watch,
    });
    expect(hub.state("/nowhere")).toMatchObject({ ready: false, cardCount: 0 });
    expect(hub.snapshot("/nowhere")).toBe(EMPTY_SNAPSHOT);
  });
});
