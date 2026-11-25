// Only a draft whose Created line carries a Gate other than `low` waits on
// the owner's approval: the parser reads the gate from that line alone, Now
// lists an approve item for it, and the hub notifies and counts only those.
import { describe, expect, it } from "vitest";

import { cardText, type CardSpec } from "../../../test/kit-fixture";
import { parseCard } from "../kit/parse";
import type { LiveCard } from "../kit/source";
import {
  EMPTY_SNAPSHOT,
  type KitEvent,
  type KitSnapshot,
  type WatchRepo,
} from "../kit/watch";
import type { NeedsYouItem, NowBadges } from "../../shared/ipc";
import { needsYouItems, NowHub } from "./now";

const REPO = "/repos/gated";

function live(spec: CardSpec): LiveCard {
  return {
    branch: `card/${spec.id}`,
    where: "local",
    card: parseCard(cardText(spec)),
    lastCommitAt: null,
  };
}

function snapshot(...specs: CardSpec[]): KitSnapshot {
  return { ...EMPTY_SNAPSHOT, cards: specs.map(live) };
}

const draft = (id: string, gate?: string): CardSpec => ({
  id,
  title: `feat: ${id}`,
  status: "draft",
  ...(gate === undefined ? {} : { gate }),
});

const approvals = (snap: KitSnapshot) =>
  needsYouItems(snap)
    .filter((i) => i.kind === "approve")
    .map((i) => i.id);

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

describe("approve only a gated draft", () => {
  it("reads Gate from the Created line, and only from there", () => {
    expect(parseCard(cardText(draft("T-0101", "needs you")))?.gate).toBe(
      "needs you",
    );
    expect(parseCard(cardText(draft("T-0102", "low")))?.gate).toBe("low");
    // Trimmed, but otherwise as written.
    expect(parseCard(cardText(draft("T-0103", "  Needs You  ")))?.gate).toBe(
      "Needs You",
    );
    // No Gate on the Created line: null.
    expect(parseCard(cardText(draft("T-0104")))?.gate).toBeNull();

    // A Gate anywhere else in the card is ignored.
    const elsewhere = (gate?: string) =>
      cardText(draft("T-0105", gate))
        .replace(
          "## Why\n\n",
          "## Why\n\nGate: needs you\n\nStatus: x · Gate: needs you\n\n",
        )
        .replace(
          "- 2026-11-20: Keep it small — one card",
          "- 2026-11-20: Keep it small · Gate: needs you",
        );
    expect(elsewhere()).toContain("Gate: needs you");
    expect(parseCard(elsewhere())?.gate).toBeNull();
    expect(parseCard(elsewhere("low"))?.gate).toBe("low");
    // The other Created-line fields read as before.
    const card = parseCard(cardText(draft("T-0106", "needs you")));
    expect(card?.created).toBe("2026-11-20");
    expect(card?.source).toBe("prompt");
  });

  it("asks to approve a gated draft unless its gate is exactly low", () => {
    const snap = snapshot(
      draft("T-0201", "needs you"),
      draft("T-0202", "neds you"),
      draft("T-0203", "Low"),
      draft("T-0204", "whatever"),
      draft("T-0205", "low"),
      draft("T-0206"),
      { ...draft("T-0207", "needs you"), status: "ready" },
      { ...draft("T-0208", "needs you"), status: "in progress" },
    );
    expect(approvals(snap).sort()).toEqual([
      "T-0201",
      "T-0202",
      "T-0203",
      "T-0204",
    ]);
  });

  it("notifies and counts only a gated draft that isn't low", async () => {
    const fake = fakeWatch();
    const told: NeedsYouItem[] = [];
    const badges: NowBadges[] = [];
    const hub = new NowHub({
      onState: () => undefined,
      onBadges: (b) => badges.push(b),
      onNew: (_repo, item) => told.push(item),
      watch: fake.watch,
    });
    await hub.setRepos([REPO]);
    const count = () =>
      hub.badges().find((b) => b.repoPath === REPO)?.count ?? -1;

    fake.send(REPO, snapshot());
    expect(count()).toBe(0);

    // A low and an ungated draft arrive: nothing is raised or counted.
    fake.send(REPO, snapshot(draft("T-0301", "low"), draft("T-0302")));
    expect(told).toEqual([]);
    expect(count()).toBe(0);
    expect(badges.at(-1)?.find((b) => b.repoPath === REPO)?.count).toBe(0);

    // A needs-you draft arrives: it's raised and counted.
    fake.send(
      REPO,
      snapshot(
        draft("T-0301", "low"),
        draft("T-0302"),
        draft("T-0303", "needs you"),
      ),
    );
    expect(told.map((i) => [i.kind, i.id])).toEqual([["approve", "T-0303"]]);
    expect(count()).toBe(1);
    await hub.stop();
  });
});
