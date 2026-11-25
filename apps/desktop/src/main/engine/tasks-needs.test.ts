// What each card on the Tasks board waits on the owner for: the same items
// Now's Needs you lists, matched to the card by its branch.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { kitFixture, type KitFixture } from "../../../test/kit-fixture";
import { type KitSnapshot, readKit } from "../kit/watch";
import { needsYouItems } from "./now";
import { taskItems } from "./tasks";

let fx: KitFixture;
let snapshot: KitSnapshot;
beforeAll(async () => {
  fx = kitFixture();
  snapshot = await readKit(fx.repo);
}, 30_000);
afterAll(() => fx.remove());

describe("the Tasks board's needs", { timeout: 30_000 }, () => {
  it("each card carries what it waits on the owner for, as Now's Needs you says", () => {
    const items = taskItems(snapshot);
    const waiting = items
      .filter((i) => i.needs.length > 0)
      .map((i) => [i.id, i.needs.map((n) => [n.kind, n.label])]);
    expect(waiting).toEqual([
      ["T-0004", [["approve", "Needs your approval"]]],
      ["T-0005", [["question", "1 open question"]]],
      ["T-0006", [["unreadable", "Can't be read"]]],
    ]);

    // Each item Now lists for a live card is on that card, with the same todo.
    const live = new Set(snapshot.cards.map((c) => c.branch));
    for (const need of needsYouItems(snapshot).filter(
      (n) => n.branch !== null && live.has(n.branch),
    )) {
      const item = items.find((i) => i.branch === need.branch);
      expect(item?.needs).toContainEqual({
        kind: need.kind,
        label: expect.any(String) as string,
        todo: need.todo,
      });
    }

    // Next up lines and finished cards wait on nobody.
    for (const item of items.filter((i) => i.source !== "card"))
      expect(item.needs).toEqual([]);
  });
});
