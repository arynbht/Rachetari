/* global window */
// The kit fixture's cards as data, copied by hand from
// apps/desktop/test/kit-fixture.ts (cardText's defaults filled in), so the
// prototype opens from disk with no IPC and no file source. Commits and times
// are constants. One addition: T-0005 carries a second open question, so the
// screenshots show a blocked card with two (owner, 2026-11-25, A7).
// `?done=20` adds 18 made-up done cards to the fixture's two (doneCards).

(function () {
  // cardText's defaults for the parts a CardSpec doesn't set.
  const defaults = {
    source: "prompt",
    created: "2026-11-20",
    nextStep: "Start with the first criterion.",
    filesInScope: ["src/app.ts"],
    outOfScope: ["the other thing"],
    constraints: ["No new dependencies."],
    skills: ["testing/test-driven-development — tests first"],
    decisions: ["2026-11-20: Keep it small — one card"],
    evidence: "$ pnpm test -> 3 passed",
    questions: [],
    criteria: [
      {
        id: "A1",
        text: "The thing works",
        state: "unticked",
        check: "pnpm test",
      },
    ],
  };

  function card(spec) {
    const c = Object.assign({}, defaults, spec);
    c.key = c.id;
    c.branch = c.branch === undefined ? "card/" + c.id : c.branch;
    c.why = c.unreadable
      ? ""
      : "Because " + c.title.toLowerCase() + " is missing.";
    return c;
  }

  // The live cards, one per card/* branch, in the order the board reads them.
  const cards = [
    card({
      id: "T-0004",
      title: "feat: dark mode",
      status: "draft",
      column: "draft",
      heldBy: null,
      gate: "needs you",
      where: "local only",
      updated: "2026-11-24 09:41",
      commits: [
        {
          at: "2026-11-24 09:41",
          subject: "chore(card): T-0004",
          author: "Fixture",
        },
      ],
    }),
    card({
      id: "T-0003",
      title: "feat: export the report as CSV",
      status: "in progress",
      column: "progress",
      heldBy: "pc",
      nextStep: "Write the CSV writer's test.",
      pr: 7,
      where: "checked out",
      updated: "2026-11-24 16:12",
      criteria: [
        {
          id: "A1",
          text: "A CSV downloads",
          state: "ticked",
          check: "pnpm test",
        },
        {
          id: "A2",
          text: "Commas are quoted",
          state: "unticked",
          check: "pnpm test",
        },
      ],
      commits: [
        {
          at: "2026-11-24 16:12",
          subject: "feat: the CSV button",
          author: "Fixture",
        },
      ],
    }),
    card({
      id: "T-0005",
      title: "fix: the export rounds wrong",
      status: "blocked",
      column: "blocked",
      heldBy: "laptop",
      where: "on the origin only",
      updated: "2026-11-23 18:05",
      questions: [
        { text: "Round half up or half even?", open: true },
        // Added for the prototype (A7): the fixture's card has one question.
        { text: "Round the totals row too, or only each line?", open: true },
      ],
      commits: [
        {
          at: "2026-11-23 18:05",
          subject: "chore(card): T-0005",
          author: "Fixture",
        },
      ],
    }),
    card({
      id: "T-0006",
      title: "CARD.md can't be read",
      status: "unreadable",
      // The engine puts a card it can't read in Blocked: a person has to look.
      column: "blocked",
      heldBy: null,
      unreadable: true,
      where: "local only",
      updated: "2026-11-24 10:02",
      nextStep: null,
      commits: [
        {
          at: "2026-11-24 10:02",
          subject: "chore(card): T-0006",
          author: "Fixture",
        },
      ],
    }),
  ];

  // The backlog's "Next up", as the fixture's BACKLOG has it.
  const nextUp = [
    "Export the report as CSV · from spec §3",
    "Dark mode for the settings page · from parked line",
  ];

  function done(id, title, pr, at, criteria) {
    return card({
      id,
      title,
      status: "done",
      column: "done",
      heldBy: null,
      branch: null,
      pr,
      nextStep: null,
      updated: at,
      merged: at.slice(0, 10),
      criteria: criteria || [
        { id: "A1", text: "It works", state: "ticked", check: "pnpm test" },
      ],
      commits: [{ at, subject: "chore: the kit", author: "Fixture" }],
    });
  }

  // The fixture's two finished cards, in cards/done/.
  const fixtureDone = [
    done("T-0001", "chore: set up the workspace", 1, "2026-11-20 11:30", [
      { id: "A1", text: "It builds", state: "ticked", check: "pnpm test" },
    ]),
    done("T-0002", "feat: add the report page", 2, "2026-11-21 15:20", [
      {
        id: "A1",
        text: "The page renders",
        state: "ticked",
        check: "pnpm test",
      },
      { id: "A2", text: "It's fast", state: "untested", check: "pnpm test" },
    ]),
  ];

  // Made up for `?done=20`: 18 more, T-0007 to T-0024, so 20 in all.
  const madeUp = [
    "fix: the report's date column sorts as text",
    "feat: a totals row under the report",
    "chore: pin the CSV writer's version",
    "fix: the top bar overlaps the title at 961px",
    "feat: filter the report by month",
    "docs: how to run the report locally",
    "fix: empty months show NaN",
    "feat: remember the last filter",
    "test: the report page's empty state",
    "fix: long customer names push the table wide",
    "feat: print the report",
    "chore: drop the unused chart library",
    "fix: the month picker skips February",
    "feat: export as PDF",
    "fix: totals round per line, not per row",
    "feat: keyboard shortcuts for the report",
    "docs: the report's columns, one line each",
    "fix: the PDF's page breaks split rows",
  ];

  function doneCards(n) {
    const extra = [];
    for (
      let i = 0;
      i < Math.max(0, n - fixtureDone.length) && i < madeUp.length;
      i++
    ) {
      const num = 7 + i;
      const day = 22 + Math.floor(i / 6);
      const hour = 9 + (i % 6);
      const at = "2026-11-" + day + " " + String(hour).padStart(2, "0") + ":15";
      extra.push(
        done("T-" + String(num).padStart(4, "0"), madeUp[i], num + 1, at),
      );
    }
    // Newest first, as the Done rail lists them.
    return fixtureDone.concat(extra).reverse();
  }

  window.FIXTURE = { cards, nextUp, doneCards };
})();
