// The Questions panel's reading: the card template's question shape, the
// parser that splits a question line, `NowState.questions`, and the text
// "Copy all" puts on the clipboard (docs/open-questions.md's format).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cardText, type CardSpec } from "../../../test/kit-fixture";
import { parseCard, questionParts } from "../kit/parse";
import type { LiveCard } from "../kit/source";
import { EMPTY_SNAPSHOT, type KitSnapshot } from "../kit/watch";
import { openQuestionsText } from "../../shared/open-questions";
import { needsYouItems, nowState } from "./now";

const repoFile = (path: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../../../../${path}`, import.meta.url)),
    "utf8",
  );

/** A section of a markdown file, from its `## ` heading to the next one. */
const section = (text: string, heading: string) =>
  new RegExp(`^## ${heading}\\n([\\s\\S]*?)(?=^## )`, "m").exec(
    text.replace(/\r\n/g, "\n"),
  )?.[1];

/** A card whose "Questions for me" holds exactly these lines. */
function cardWith(spec: CardSpec, lines: string[]): string {
  return cardText(spec).replace("- [ ] (none)", lines.join("\n"));
}

function live(text: string, branch: string, at = "2026-11-25T10:00:00Z") {
  const card = parseCard(text);
  return card
    ? { branch, where: "remote" as const, card, lastCommitAt: at }
    : {
        branch,
        where: "remote" as const,
        card: null,
        error: "unreadable: CARD.md doesn't parse",
        lastCommitAt: at,
      };
}

const snapshotOf = (cards: LiveCard[]): KitSnapshot => ({
  ...EMPTY_SNAPSHOT,
  cards,
});

const SHAPE =
  "- [ ] <question> — Recommended: <answer>. Options: <other>; <other>.";

describe("the card template's question shape", () => {
  it("both templates show the same question shape, and the parser reads it", () => {
    const ours = section(repoFile("cards/TEMPLATE.md"), "Questions for me");
    const kits = section(
      repoFile("kit/setup/templates/CARD.md"),
      "Questions for me",
    );
    expect(ours).toBeDefined();
    expect(kits).toBe(ours);
    const lines = (ours ?? "").split("\n").filter((l) => l.trim());
    // One line says what the shape is, then the shape itself.
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/one question per line/i);
    expect(lines[1]).toBe(SHAPE);
    expect(questionParts(SHAPE.replace(/^- \[ \] /, ""))).toEqual({
      ask: "<question>",
      recommended: "<answer>",
      options: ["<other>", "<other>"],
    });
  });

  it("a card straight from the template has no questions", () => {
    for (const path of ["cards/TEMPLATE.md", "kit/setup/templates/CARD.md"]) {
      const card = parseCard(repoFile(path));
      expect(card, path).not.toBeNull();
      expect(card?.questions, path).toEqual([]);
    }
  });
});

describe("questionParts", () => {
  it("splits a question into its ask, recommendation and options", () => {
    expect(questionParts("Q — Recommended: R. Options: A; B.")).toEqual({
      ask: "Q",
      recommended: "R",
      options: ["A", "B"],
    });
    expect(questionParts("Q — Recommended: R. Other options: A; B.")).toEqual({
      ask: "Q",
      recommended: "R",
      options: ["A", "B"],
    });
    expect(questionParts("Q? — Recommended: yes.")).toEqual({
      ask: "Q?",
      recommended: "yes",
      options: [],
    });
    expect(questionParts("Round half up or half even?")).toEqual({
      ask: "Round half up or half even?",
      recommended: null,
      options: [],
    });
    // A recommendation may hold `;` itself: only the options are split on it.
    expect(
      questionParts(
        "Which? — Recommended: take both; park one. Options: neither; only one.",
      ),
    ).toEqual({
      ask: "Which?",
      recommended: "take both; park one",
      options: ["neither", "only one"],
    });

    // `Question` and the card keep their shape: the line as written.
    const card = parseCard(
      cardText({
        id: "T-0005",
        title: "fix: the export rounds wrong",
        status: "blocked",
        question: "Q — Recommended: R. Options: A; B.",
      }),
    );
    expect(card?.questions).toEqual([
      { text: "Q — Recommended: R. Options: A; B.", open: true },
    ]);
  });
});

describe("NowState.questions", () => {
  it("groups each card's open questions, in card order", () => {
    const later = cardWith(
      { id: "T-0009", title: "feat: later card", status: "blocked" },
      [
        "- [x] Already answered? — Recommended: yes.",
        "- [ ] First? — Recommended: yes. Options: no; later.",
        "- [ ] Second, with no recommendation?",
      ],
    );
    const earlier = cardWith(
      { id: "T-0002", title: "feat: earlier card", status: "in progress" },
      ["- [ ] Only one? — Recommended: one. Other options: two."],
    );
    const answered = cardWith(
      { id: "T-0003", title: "feat: all answered", status: "ready" },
      ["- [x] Done? — Recommended: yes."],
    );
    const blockedNoQuestion = cardText({
      id: "T-0004",
      title: "fix: blocked, nothing written",
      status: "blocked",
    });
    const snap = snapshotOf([
      live(later, "card/T-0009"),
      live(earlier, "card/T-0002"),
      live(answered, "card/T-0003"),
      live(blockedNoQuestion, "card/T-0004"),
      live("this isn't a card\n", "card/T-0006"),
      {
        branch: "card/T-0001",
        where: "remote",
        card: null,
        drafting: true,
        lastCommitAt: null,
      },
    ]);

    const state = nowState("/repo", snap, true, null);
    expect(state.questions).toEqual([
      {
        id: "T-0002",
        title: "feat: earlier card",
        branch: "card/T-0002",
        questions: [
          { n: 1, ask: "Only one?", recommended: "one", options: ["two"] },
        ],
      },
      {
        id: "T-0009",
        title: "feat: later card",
        branch: "card/T-0009",
        questions: [
          { n: 1, ask: "First?", recommended: "yes", options: ["no", "later"] },
          {
            n: 2,
            ask: "Second, with no recommendation?",
            recommended: null,
            options: [],
          },
        ],
      },
    ]);

    // Needs you is unchanged: still one question item per card.
    const asked = needsYouItems(snap).filter((i) => i.kind === "question");
    expect(asked.map((i) => [i.id, i.why])).toEqual([
      [
        "T-0009",
        "First? — Recommended: yes. Options: no; later. · Second, with no recommendation?",
      ],
      ["T-0002", "Only one? — Recommended: one. Other options: two."],
      ["T-0004", "Status is blocked, with no open question written down."],
    ]);
  });

  it("reads free-form questions in existing cards as one question with no recommendation", () => {
    // Real lines from day/2026-11-25 at c3e853e, opened again for the test.
    const T0016 =
      "A1's CI half can't run here: this PR changes only Markdown, so CI skips the tests. Accept PR #30's re-run (961 ms, same test, Windows shard 3/3) as the CI number and close the card, or leave A1's CI half UNTESTED and close, or something else? — Owner, 17:54: accept it, recorded as \"961 ms, from PR #30's re-run, not measured on this PR\", and close.";
    const T0020 =
      'A1\'s premise doesn\'t hold: the Docs viewer\'s task-list boxes are not checkboxes today. `renderMarkdown` passes `ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i`, and DOMPurify checks every attribute not in its URI-safe list against that regexp, so `type="checkbox"` (no scheme) is stripped. The boxes render as `<input checked disabled>`: disabled empty text fields (aria tree: `textbox [disabled]`), the ticked state invisible. So "it stays a disabled checkbox with its ticked state, with no visual change" can\'t be met, and labelling in the hook alone (which only sees inputs after `type` is gone) can\'t make `getByRole("checkbox")` find anything. Which way?';
    const T0020_BELOW = [
      '  1. Keep `type` through the sanitizer with `ADD_URI_SAFE_ATTR: ["type"]` in the `sanitize` config (one line in `markdown.ts`, outside the hook), and label `type=checkbox` inputs in the hook as planned.',
      "  2. Leave the sanitizer alone and label every `INPUT` in the hook.",
      "  3. Something else (e.g. option (b) of S-18, text ☑/☐), which is out of this card's scope.",
      "",
      "  Owner, 18:29: don't keep the inputs.",
    ];
    const FIXTURE = "Round half up or half even?";
    const T0019 =
      "Should a draft with no `Gate:` line (what the kit's `/card` writes today) raise nothing? Recommended: yes. It still shows under Tasks' Draft; the session parks a `[product]` line for `/card` and the template to write the gate. — Owner, 18:29: raise nothing, as recommended; park the `[product]` line (the foreman parked it on the day branch).";

    const text = cardWith(
      { id: "T-0016", title: "chore: free-form questions", status: "blocked" },
      [`- [ ] ${T0016}`, `- [ ] ${T0020}`, ...T0020_BELOW, `- [ ] ${FIXTURE}`],
    );
    const snap = snapshotOf([live(text, "card/T-0016")]);
    const state = nowState("/repo", snap, true, null);

    expect(state.needsYou.filter((i) => i.kind === "unreadable")).toEqual([]);
    expect(state.questions).toEqual([
      {
        id: "T-0016",
        title: "chore: free-form questions",
        branch: "card/T-0016",
        questions: [
          { n: 1, ask: T0016, recommended: null, options: [] },
          { n: 2, ask: T0020, recommended: null, options: [] },
          { n: 3, ask: FIXTURE, recommended: null, options: [] },
        ],
      },
    ]);

    // `Recommended:` with no `—` still splits.
    expect(questionParts(T0019)).toEqual({
      ask: "Should a draft with no `Gate:` line (what the kit's `/card` writes today) raise nothing?",
      recommended:
        "yes. It still shows under Tasks' Draft; the session parks a `[product]` line for `/card` and the template to write the gate. — Owner, 18:29: raise nothing, as recommended; park the `[product]` line (the foreman parked it on the day branch)",
      options: [],
    });
  });
});

describe("openQuestionsText", () => {
  it("Copy all writes the open-questions format", () => {
    expect(
      openQuestionsText([
        {
          id: "T-0002",
          title: "feat: earlier card",
          questions: [
            { n: 1, ask: "Only one?", recommended: "one", options: ["two"] },
          ],
        },
        {
          id: "T-0009",
          title: "feat: later card",
          questions: [
            {
              n: 1,
              ask: "First?",
              recommended: "yes.",
              options: ["no", "later."],
            },
            { n: 2, ask: "Second?", recommended: "maybe", options: [] },
            { n: 3, ask: "Third?", recommended: null, options: [] },
          ],
        },
      ]),
    ).toBe(
      [
        "## T-0002 · feat: earlier card",
        "",
        "1. Only one? — Recommended: one. Other options: two.",
        "",
        "Answer:",
        "",
        "## T-0009 · feat: later card",
        "",
        "1. First? — Recommended: yes. Other options: no; later.",
        "2. Second? — Recommended: maybe.",
        "3. Third?",
        "",
        "Answer:",
        "",
      ].join("\n"),
    );
    expect(openQuestionsText([])).toBe("");
  });

  it("rebuilds T-0022's section of open-questions.md exactly", () => {
    // T-0022's two questions, written in the template's shape.
    const lines = [
      "- [ ] Reading found lines beyond the three the card allows: `playwright-cli/references/test-generation.md:159` runs the unpinned `npm init playwright@latest`; `constraint-driven-development/SKILL.md:149-160` lists an install per dimension the user picks (`pip`, `pipx`, `brew`, `npm i -D`); `:264` says to wire checks \"into your agent's post-edit hook\"; `playwright-cli/SKILL.md:4` pre-allows `Bash(npx playwright:*)`. — Recommended: take both unchanged; allow `test-generation.md:159` as a fourth line and park it; record the others in Evidence and in INDEX's reading note. Options: take constraint-driven-development only and leave playwright-cli shelved.",
      "- [ ] `Closes #6` and `Closes #7` don't fire on a PR into the day branch. — Recommended: the day-branch PR into `main` repeats them. Other options: close both by hand after that merge.",
    ];
    // docs/open-questions.md at 4aeaa5d, T-0022's section.
    const expected = `## T-0022 · feat(skills): take constraint-driven-development and playwright-cli

1. Reading found lines beyond the three the card allows: \`playwright-cli/references/test-generation.md:159\` runs the unpinned \`npm init playwright@latest\`; \`constraint-driven-development/SKILL.md:149-160\` lists an install per dimension the user picks (\`pip\`, \`pipx\`, \`brew\`, \`npm i -D\`); \`:264\` says to wire checks "into your agent's post-edit hook"; \`playwright-cli/SKILL.md:4\` pre-allows \`Bash(npx playwright:*)\`. — Recommended: take both unchanged; allow \`test-generation.md:159\` as a fourth line and park it; record the others in Evidence and in INDEX's reading note. Other options: take constraint-driven-development only and leave playwright-cli shelved.
2. \`Closes #6\` and \`Closes #7\` don't fire on a PR into the day branch. — Recommended: the day-branch PR into \`main\` repeats them. Other options: close both by hand after that merge.

Answer:
`;
    const text = cardWith(
      {
        id: "T-0022",
        title:
          "feat(skills): take constraint-driven-development and playwright-cli",
        status: "blocked",
      },
      lines,
    );
    const state = nowState(
      "/repo",
      snapshotOf([live(text, "card/T-0022")]),
      true,
      null,
    );
    expect(openQuestionsText(state.questions)).toBe(expected);
  });
});
