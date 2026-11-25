// A card's record carries its open questions already split into the parts
// Now's Questions panel shows (the ask, the recommendation, the other
// options), so the Tasks record can pin them above its tabs.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  cardText,
  kitFixture,
  type KitFixture,
} from "../../../test/kit-fixture";
import { fetchRepo } from "../kit/source";
import { type KitSnapshot, readKit } from "../kit/watch";
import { taskDetail, taskItems } from "./tasks";

let fx: KitFixture;
let snapshot: KitSnapshot;
beforeAll(async () => {
  fx = kitFixture();
  fx.pushToOrigin(
    "T-0050",
    cardText({
      id: "T-0050",
      title: "fix: the totals row",
      status: "blocked",
    }).replace(
      "- [ ] (none)",
      [
        "- [x] Keep the old column? — Recommended: no.",
        "- [ ] Round half up or half even? — Recommended: half even. Options: half up; truncate.",
        "- [ ] Which currency symbol goes first?",
      ].join("\n"),
    ),
  );
  await fetchRepo(fx.repo);
  snapshot = await readKit(fx.repo);
}, 30_000);
afterAll(() => fx.remove());

describe("a Tasks record's open questions", { timeout: 30_000 }, () => {
  it("a record carries its open questions in parts, numbered from 1, without the answered ones", async () => {
    const detail = await taskDetail(fx.repo, snapshot, "branch:card/T-0050");
    expect(detail.openQuestions).toEqual([
      {
        n: 1,
        ask: "Round half up or half even?",
        recommended: "half even",
        options: ["half up", "truncate"],
      },
      {
        n: 2,
        ask: "Which currency symbol goes first?",
        recommended: null,
        options: [],
      },
    ]);
    // The answered one is still on the card, for the Card tab.
    expect(detail.card?.questions.filter((q) => !q.open)).toHaveLength(1);

    // The fixture's blocked card: one question, no recommendation written.
    const t5 = await taskDetail(fx.repo, snapshot, "branch:card/T-0005");
    expect(t5.openQuestions).toEqual([
      {
        n: 1,
        ask: "Round half up or half even?",
        recommended: null,
        options: [],
      },
    ]);

    // A card with none, a drafting or unreadable card, a Next up line and a
    // done card carry none.
    for (const key of [
      "branch:card/T-0003",
      "branch:card/T-0006",
      ...(["next-up", "done"] as const).map(
        (source) => taskItems(snapshot).find((i) => i.source === source)!.key,
      ),
    ]) {
      const detail = await taskDetail(fx.repo, snapshot, key);
      expect(detail.openQuestions, key).toEqual([]);
    }
  });
});
