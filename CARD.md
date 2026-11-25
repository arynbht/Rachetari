# T-0026 · feat(shell): a read-only Questions panel on Now, with Copy all

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0026 · Held by: nobody
Created: 2026-11-25 · Gate: needs you · Source: `docs/queue-2026-11-25.md` §Questions panel on Now (part 1 of 2)

## Why

A card's open questions reach the owner only as one Needs you item per card, with every question run together on one line (`·`-joined) and no recommendation or options picked out (BACKLOG Parked, 2026-11-25). To answer, the owner opens each card or copies questions by hand into the shape `docs/open-questions.md` uses. The card template gives questions no fixed shape, so the shell can't tell a question from its recommendation. This card gives questions that shape, reads it, and shows one row per question on Now with a "Copy all" that writes the owner's answer sheet. Answering from the panel (the shell's first write) is the next card.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: Both card templates (`cards/TEMPLATE.md` and `kit/setup/templates/CARD.md`) show the same fixed shape under "Questions for me": one question per line, `- [ ] <question> — Recommended: <answer>. Options: <other>; <other>.`, with one line saying so. A card made straight from either template still has no questions (the placeholder line isn't read as one) · check: `pnpm exec vitest run apps/desktop/src/main/engine/questions.test.ts`, tests "both templates show the same question shape, and the parser reads it" and "a card straight from the template has no questions"
- [ ] A2: `questionParts(text)` in `parse.ts` splits a question line into `{ ask, recommended, options }`: `Q — Recommended: R. Options: A; B.` gives `Q`, `R`, `[A, B]`; `Other options:` reads like `Options:`; no options part gives `[]`; no `Recommended:` gives the whole line as `ask`, `recommended: null`, `options: []`. `Question` and `parseCard`'s output keep their shape (`source.test.ts`, Tasks and Needs you see the same text as today) · check: same file, test "splits a question into its ask, recommendation and options"
- [ ] A3: `NowState` gains `questions`: one group per readable live card with at least one open (unticked) question, in card-id order, each `{ id, title, branch, questions: [{ n, ask, recommended, options }] }`, with `n` counting the card's open questions from 1. Answered (`[x]`) questions, and a blocked card with no open question, add no row. Needs you is unchanged: still one `question` item per card · check: same file, test "groups each card's open questions, in card order"; `pnpm exec vitest run apps/desktop/src/main/engine/now.test.ts` passes unedited
- [ ] A4: `openQuestionsText(groups)` in `shared/open-questions.ts` writes `docs/open-questions.md`'s format: per card `## T-NNNN · title`, a blank line, `N. <ask> — Recommended: <r>. Other options: <a>; <b>.` per question, a blank line, `Answer:`, and one blank line between cards. No `Recommended` gives `N. <ask>`; no options drops `Other options`; a period already ending `<r>` or the options isn't doubled. Rebuilt from T-0022's two question lines, it equals that card's section of `docs/open-questions.md` at `4aeaa5d` (inlined in the test) byte for byte · check: same file, tests "Copy all writes the open-questions format" and "rebuilds T-0022's section of open-questions.md exactly"
- [ ] A5: Now shows a "Questions" region below Needs you: a heading per card (`T-NNNN · title`), then one row per open question with its text, `Recommended: …` (or "No recommendation written") and its other options. A "Copy all" button puts A4's text for every open question on the clipboard and announces "Copied" in a live region. The panel has no button that writes to the repo, and the page has no axe violations · check: `pnpm --filter @arynbht/rivetari-desktop e2e -- questions.e2e.ts`, tests "the Questions panel shows one row per open question, grouped by card, each with its recommendation" and "Copy all puts every open question on the clipboard in open-questions.md's format" (the clipboard is read through `app.evaluate(({ clipboard }) => clipboard.readText())`); `desktop-e2e` green on the PR; screenshot `docs/screenshots/T-0026/questions.png`, taken by that run with `SCREENSHOT_DIR`, committed and looked at
- [ ] A6: Nothing else moves. Every existing test passes, and none is edited except `home.test.ts` gaining `questions: []` (approved, question 2). Lint and typecheck pass · check: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter @arynbht/rivetari-desktop typecheck`, `git diff --stat origin/day/2026-11-25` (only the files below), `gh pr checks` (`ci` green)
- [ ] A7: Free-form questions already in cards still read (owner, question 3). A question line not in the template's shape is one question: one row in `NowState.questions` with the whole first line as `ask`, `recommended: null`, `options: []`. Its card still parses (no `unreadable` item in Needs you), and the panel shows "No recommendation written". Covered by real lines from `day/2026-11-25` at `c3e853e`, inlined in the test: T-0016's first question (has `—` but no `Recommended:`), T-0020's first (continuation lines below it), and the fixture's `Round half up or half even?`; T-0019's first question (`Recommended:` with no `—`) gives its ask and recommendation · check: `pnpm exec vitest run apps/desktop/src/main/engine/questions.test.ts`, test "reads free-form questions in existing cards as one question with no recommendation"; A5's first e2e test also shows the seeded blocked T-0005's `Round half up or half even?` row with "No recommendation written"

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `cards/TEMPLATE.md`, `kit/setup/templates/CARD.md` ("Questions for me" only)
- `apps/desktop/src/main/kit/parse.ts` (`questionParts`, and skipping the template's placeholder line)
- `apps/desktop/src/main/engine/now.ts` (`nowState` fills `questions`)
- `apps/desktop/src/shared/ipc.ts` (`NowState.questions` and its group schema)
- `apps/desktop/src/shared/open-questions.ts` (new: `openQuestionsText`)
- `apps/desktop/src/renderer/components/Now.tsx` (the Questions region)
- `apps/desktop/src/main/engine/questions.test.ts` (new), `apps/desktop/e2e/questions.e2e.ts` (new)
- `apps/desktop/src/main/engine/home.test.ts` (`questions: []` in its `NowState` literal; approved, question 2)
- `docs/screenshots/T-0026/questions.png` (new)
- `CARD.md`, `cards/done/T-0026.md`, `BACKLOG.md` (Parked lines only: on the line, cards never edit Next up)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- The next card, "answer from the Questions panel": "Accept recommended" per question, "Accept all recommended" per card and a free-text answer, each written into the card's `CARD.md` as a previewed plain commit (the shell's first write, new IPC in `shared/ipc.ts`, `preload/index.ts` and `main/index.ts`). It should share one write path with §Shell action: mark ready (question 4)
- Changing Needs you, its `question` item, the badge or notifications; `now.test.ts`, `now.e2e.ts`, `home.e2e.ts`, `test/kit-fixture.ts` stay as they are (the e2e pushes its own card through `fx.pushToOrigin`; `cardText`'s `question` holds one line, so the e2e replaces that line in `cardText`'s output with its own question lines)
- The template's `Created:` line writing a `Gate:` (Parked on T-0019), the kit's `/card` skill text, and `.claude/skills/**`
- Tasks' record view of questions

## Constraints

- No new dependencies. Still read-only: no git call that writes, no new IPC channel (`now:get` and `now:update` carry `questions`).
- `Question` (`{ text, open }`) and `TaskCard.questions` keep their shape; the shape is read only through `questionParts`.
- Options are separated by `;`. "Copy all" prints the card's `Options:` as `Other options:`, the wording `docs/open-questions.md` uses.
- The clipboard is written from the renderer with `navigator.clipboard.writeText`.
- `openQuestionsText` is pure and has no imports, so the renderer and vitest share it.
- Every existing test other than `home.test.ts` (A6) passes without an edit. `now.e2e.ts` selects `"4 waiting"` page-wide and Needs you by `/Needs you/`, so the panel's region is labelled "Questions" and shows no "N waiting" text.
- `questions` skips a branch still being drafted (`live.drafting`) and an unreadable card, as Needs you does. It ignores `gate`: a card's open questions show whatever its gate.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development` — a parser, an adapter and a formatter with exact outputs: each criterion's test fails first
- `workflow/incremental-implementation` — four slices (template and parser, `NowState`, formatter, panel), each tested before the next
- `ui/frontend-design` — a new panel on Now that has to sit with Needs you and Running

## Stop and ask

Besides the standing list in CLAUDE.md:

- If `navigator.clipboard.writeText` is refused in the shell (sandboxed renderer, a permission handler, or an unfocused window in e2e). A clipboard IPC channel through main is a contract change.
- If T-0021's `axe.e2e.ts`, once merged, scans Now and fails on the new panel in a way the panel's own fix doesn't cover.
- If showing the panel needs `App.tsx` (T-0024 edits it) or any change to Needs you.

## Next step

Ready to build. Start with A2's failing test in `questions.test.ts` ("splits a question into its ask, recommendation and options"), then A7's.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: decided for the owner: the shape is read by a separate `questionParts(text)`, and `Question` keeps `{ text, open }` (alternative: optional `recommended`/`options` fields on `Question`). `source.test.ts` compares questions with `toEqual`, and Tasks and Needs you keep showing the line as written.
- 2026-11-25: decided for the owner: options are separated by `;` on the question's own line (alternative: a nested list under the question). `docs/open-questions.md` already separates them that way, and one line per question is what the parser reads.
- 2026-11-25: decided for the owner: `questionParts` also reads `Other options:` and a `Recommended:` without the `—`, the forms on cards written today (alternative: only the exact template shape).
- 2026-11-25: decided for the owner: a question with no `Recommended:` still gets a row ("No recommendation written") and copies as `N. <question>` (alternative: leave it out of the panel).
- 2026-11-25: decided for the owner: "Copy all" writes the card sections only, without the `# Open questions` heading, cards in id order (alternative: the heading too, or Needs you's oldest-first order). It pastes under the file's heading or straight into chat.
- 2026-11-25: decided for the owner: the panel sits below Needs you and above Running (alternative: above Needs you).
- 2026-11-25: decided for the owner: Needs you keeps its one `question` item per card, so the badge and notifications count a card once. Each question gets its own row in the panel, which answers the Parked line "Needs you runs several questions for one card together" (alternative: drop `question` items from the Needs you list, which edits `now.e2e.ts`).
- 2026-11-25: decided for the owner: the clipboard is written by `navigator.clipboard.writeText` in the renderer (alternative: a clipboard IPC channel through main's `clipboard`). Sandboxed preloads no longer get `clipboard`, and this keeps the card free of new channels.
- 2026-11-25: Split: this card is the read-only half (template, parser, `NowState.questions`, panel, Copy all); answering from the panel is the next card. Pending the owner's answer to question 1.
- 2026-11-25: Overlaps checked against the in-flight cards: only T-0019 shares files (`parse.ts`, `now.ts`). T-0023 and T-0025 edit `kit/setup/**` but not `kit/setup/templates/CARD.md`. T-0024's `App.tsx` and T-0021's two new e2e files aren't touched here.
- 2026-11-25: Owner's answers (19:26:12): split in two; required `NowState.questions` and the `home.test.ts` edit approved; both templates identical, and the parser still reads free-form questions in existing cards as one question with no recommendation (not unreadable) — a criterion the builder must cover; the write path is settled for the next card. Set ready by the foreman.
- 2026-11-25: T-0019 merged into `day/2026-11-25`, so its "Depends on" line is removed. `Card` gained `gate`, `cardText` an optional `gate`, and `needsYouItems` asks approval only for a gated draft that isn't `low`. The `question` item, `Question` and the "Questions for me" loop are unchanged, so no criterion moves. No dependency on T-0024: this card needs neither `kit/source.ts` nor `App.tsx` (the stop-and-ask on `App.tsx` stays).
- 2026-11-25: Added A7 for the owner's answer 3 (free-form questions in existing cards read as one question with no recommendation), with real lines from the done cards as its cases.
- 2026-11-25: decided for the owner: a question written over several lines (T-0020's, with numbered options below it) shows its first line only, the text Needs you shows today (alternative: fold indented continuation lines into the ask, which changes `Question.text` and Needs you). Parked.
- 2026-11-25: decided for the owner: `questions` skips branches still being drafted, as Needs you does, and ignores `gate` (alternative: show a drafting branch's questions too).
- 2026-11-25: Pre-build re-check against day/2026-11-25 at c3e853e: T-0019 and T-0022 merged; no criterion contradicted; A7 added for the owner's answer 3, constraints added for drafting branches and `now.e2e.ts`'s page-wide "4 waiting"; still ready.

## Questions for me

- [x] Split the spec in two: this read-only card (template shape, parser, `NowState.questions`, the panel, Copy all), then "answer from the panel" (accept recommended, accept all for a card, free-text answer, each a previewed commit)? — Recommended: yes. Options: one card for all of it; three cards (template and parser; panel and Copy all; the writes).
- [x] May `NowState` (`shared/ipc.ts`, a contract) gain a required `questions` array (per card: id, title, branch, and each open question's `n`, `ask`, `recommended`, `options`), with the existing `home.test.ts` gaining `questions: []` in its `NowState` literal? — Recommended: yes. Options: make `questions` optional so no existing test is edited; a separate `now:questions` channel.
- [x] The kit's own template (`kit/setup/templates/CARD.md`, copied into every repo by `/setup`) gets the fixed shape too, not only this repo's `cards/TEMPLATE.md`? — Recommended: yes, both, identical. Options: this repo's template only, and park the kit's.
- [x] How should the next card write (the shell's first write, shared with §Shell action: mark ready)? — Recommended: one main-process write path for both. It changes only `CARD.md` on `card/T-NNNN` through git plumbing (temporary index, `commit-tree`, `update-ref` against the previewed commit), so no checkout, and HEAD and the working tree are untouched. It shows the `CARD.md` diff with Commit and Cancel, and commits `docs(card): T-NNNN answer question N` (body `Card: T-NNNN`). It refuses when the branch is checked out in any worktree, or is behind or diverged from origin. Then it pushes that branch alone, fast-forward only, never force. It never writes any other ref or file. Options: commit without pushing; commit in a temporary worktree of the branch; build mark ready first and let it own the path.

Owner, 19:26:12:

1. Yes, split in two as recommended.
2. Yes, a required field, and editing home.test.ts is approved.
3. Yes, both templates identical. The parser must still read the free-form questions already in existing cards: show each as one question with no recommendation, rather than as unreadable.
4. One shared write path, as recommended, with one change (for the next card or "mark ready", whichever runs first): refuse if "Held by" names anyone, saying who holds it; if the branch is checked out in a clean worktree, commit there; if that worktree has uncommitted changes, refuse and name it; never move a branch ref underneath a worktree; otherwise commit without a checkout. Diff shown first, push fast-forward only, refuse if behind origin.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC):
draft → ready 19:22:54 → 19:26:12 3 min 18 s (questions in docs/open-questions.md from 19:22:54)

```
<commands and results>
```
