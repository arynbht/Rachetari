# T-0048 · fix(shell): Copy all gives every open question in full

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0048 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Copy all cuts questions off · Gate: low

## Why

Copy all in the Questions panel cut T-0044's question off at "to run the gh CLI on your
existing sign-in to", and dropped its recommendation and options with it, so the owner
can't answer from the copied text. Any question a drafter wraps over several lines (and
Prettier keeps hand-wrapped lines, re-indented to six spaces under `- [ ] `) comes out cut
the same way, in Copy all, in Needs you and in the Tasks record's open questions.

### Where the text is cut: the parser

`parseCard` in `apps/desktop/src/main/kit/parse.ts` (lines 156–165 at `0dcf230`) reads
"Questions for me" one line at a time and keeps only lines matching
`/^- \[( |x|X)\] (.+)$/`. A question's continuation lines don't start with `- [ ]`, so
they're skipped: `Question.text` is the first line only. `questionParts` then finds no
`Recommended:` in it, so the whole first line becomes `ask` with no recommendation and no
options. The formatter (`apps/desktop/src/shared/open-questions.ts`), the panel
(`Now.tsx`'s `QuestionsPanel`, which passes `openQuestionsText(groups)` straight to
`navigator.clipboard.writeText`) and the IPC types (no length limit) all pass on what
they get unchanged.

Reproduced by running this branch's `parse.ts` and `open-questions.ts` (Node 22,
`--experimental-strip-types`, a scratchpad script) on `git show 4e8a220:CARD.md`
(`card/T-0044` as drafted, question 1 still open):

```
questions: [{ "text": "(answer individually) May the shell run the `gh` CLI on your existing sign-in to", "open": true }, …]

## T-0044 · feat(shell): CI state for develop and each card PR, via gh

1. (answer individually) May the shell run the `gh` CLI on your existing sign-in to

Answer:
```

The same card's question, in full, is what Copy all must give instead:

```
## T-0044 · feat(shell): CI state for develop and each card PR, via gh

1. (answer individually) May the shell run the `gh` CLI on your existing sign-in to read CI (`gh pr list`, `gh run list` only; the token stays in `gh`'s store, never read or stored by the shell)? — Recommended: yes, as drafted (S-16 option (b)). Other options: no, build S-16's device flow (option (a)) instead; no, leave CI out of the shell (option (c)).

Answer:
```

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: A question written over several lines is read in full: T-0044's card as drafted
      (`git show 4e8a220:CARD.md`, kept verbatim as a fixture) gives, through
      `parseCard` → `nowState(...).questions` → `openQuestionsText`, exactly the T-0044
      section of the fixture `open-questions.md` (the text under "Where the text is cut"
      above); its closed question 2 is left out · check: `pnpm exec vitest run apps/desktop/src/main/engine/copy-all.test.ts -t "multi-line"`
      fails before the `parse.ts` change and passes after (both runs pasted)
- [ ] A2: A question of over 500 characters, with backticks, a markdown link and a bare
      URL, wrapped over several lines and marked "(answer individually)", with a
      `Recommended:` and `Options:` (written by the card) that come out as
      `Recommended:` and `Other options:`, matches its section of the fixture
      `open-questions.md` character for character, the marker included · check: `pnpm exec vitest run apps/desktop/src/main/engine/copy-all.test.ts -t "over 500"`
      fails before, passes after; the test asserts the question's length is over 500
- [ ] A3: Two cards (A1's and A2's), read together and again with every line ending in
      CRLF, give exactly the fixture `open-questions.md` after its `# Open questions`
      title: one `## <id> · <title>` heading per card, numbered questions, an `Answer:`
      line under each card, and nothing else · check: `pnpm exec vitest run apps/desktop/src/main/engine/copy-all.test.ts -t "two cards"`
      fails before, passes after
- [ ] A4: The panel and the clipboard don't cut it either: in the built app, Copy all
      on a repo holding the two fixture cards puts on the clipboard exactly T-0005's
      section (the kit fixture's own question) followed by the fixture
      `open-questions.md` after its title (CRLF read back as LF, as `questions.e2e.ts`
      does) · check: `apps/desktop/e2e/copy-all.e2e.ts` passing in CI's `desktop-e2e`
      job on the PR (`gh pr checks <PR>`); not run locally (§The line, Speed-ups)
- [ ] A5: Nothing else changes, and it's checked on Windows: every existing test passes
      unchanged, including `questions.test.ts`'s T-0020 case (an indented numbered list
      and a line after a blank stay out of the question); lint passes with no new or
      wider override · check: on this Windows machine, `node -p process.platform` (win32),
      `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter @arynbht/rivetari-desktop typecheck`,
      `pnpm format`, each exit 0; `git diff --stat origin/develop -- eslint.config.js apps/desktop/src/main/engine/questions.test.ts apps/desktop/e2e/questions.e2e.ts apps/desktop/test/kit-fixture.ts`
      is empty; `gh pr checks <PR>` shows the `test (windows-latest, n/3)` shards (reported
      by the inspector if red, since Windows isn't required on PRs)

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/kit/parse.ts` (the "Questions for me" loop only, moved into a
  helper that folds continuation lines)
- `apps/desktop/src/shared/open-questions.ts` (only if a test shows the formatter changes
  the text; none expected)
- `apps/desktop/src/main/engine/copy-all.test.ts` (new)
- `apps/desktop/test/fixtures/copy-all/` (new: `T-0044.CARD.md`, `T-0090.CARD.md`,
  `open-questions.md`; already Prettier-ignored by `**/test/fixtures/**`)
- `apps/desktop/e2e/copy-all.e2e.ts` (new)
- `CARD.md`

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Questions whose options sit in a nested list under them (T-0020's shape, BACKLOG's
  parked line from T-0026): `questions.test.ts` pins that those stay out, and changing
  that is an existing-test edit. Parked below.
- Anything in `Now.tsx`'s panel (layout, how a long question shows, the "Copied" status),
  the card template, `questionParts`' splitting rules, and the answer buttons (the
  "Questions panel: answers" card).
- Shrinking `parseCard` under the lint limits (Next up's "Shrink parseCard" card).

## Constraints

- No new dependencies. No local desktop e2e (§The line, Speed-ups): CI's headless
  `desktop-e2e` is the e2e check.
- What folds into a question: after a `- [ ]`/`- [x]` line in "Questions for me", each
  following non-blank line that isn't a list item (`-`, `*`, `+` or `1.`/`1)` after its
  indent) or a heading, trimmed and joined with one space, until the first blank line,
  list item or heading. After a stop, nothing more folds until the next `- [ ]`/`- [x]`.
- `parseCard`'s complexity must not rise (the question loop moves out into its own
  function); `parse.ts` stays under 500 counted lines; `eslint.config.js` is not touched.
- `Question`, `NowQuestion` and the IPC types keep their shape: `text` simply holds the
  whole question.
- Fixtures are data: the T-0044 card verbatim from `4e8a220`, never reformatted.
- No edits to existing tests. Parked lines go under "## Parked" in this card, not in
  `BACKLOG.md`.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development`: a bug fix whose criteria are "fails before, passes
  after"; write the three fixture tests first and paste their failure.

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: none. No overlap with in-flight cards: T-0044 (the chain: `ipc.ts`,
  `main/index.ts`, `DisplayBranch.tsx`…), T-0046 (`Tasks.tsx` split) and T-0041 (#60:
  `now.ts`, `ipc.ts`, `Home.tsx`) touch none of the files in scope (checked with
  `git diff --name-only origin/develop...origin/card/*` at drafting).
- An existing test fails after the fold (any edit beyond selectors needs the owner).
- `parseCard`'s complexity can't stay within its current override without touching
  `eslint.config.js`.
- The formatter needs a change that alters text an existing test asserts.

## Next step

Ready. Build `test/fixtures/copy-all/` and `copy-all.test.ts` (A1–A3) first and paste
their failures; then fold continuation lines in `parse.ts`; then `copy-all.e2e.ts` (A4).

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `low`, status `ready` (owner's words in the spec). Six paths, one over
  the five a `low` card allows: decided for the owner: one card, since the fixture folder
  is the test's data and `open-questions.ts` is in scope only as a guard (alternative:
  the clipboard e2e as a second card).
- 2026-11-25: The cut is the parser's: decided for the owner: fix it in `parse.ts` by
  folding paragraph continuation lines into the question (alternative: fold in the
  formatter or the panel, which would leave Needs you and the Tasks record cut).
- 2026-11-25: Nested lists under a question (T-0020's numbered options) and text after a
  blank line stay out of the question, decided for the owner, because
  `questions.test.ts` asserts it and the template's shape is one paragraph per question
  (alternative: fold nested lists too, which edits that test: a `needs you` card; parked).
- 2026-11-25: Copy all gives the card's own words, not the foreman's paraphrase: decided
  for the owner: no context paragraph under a heading, and no `# Open questions` title
  (the fixture file has the title; the tests compare with what follows it), since the
  spec says "nothing else" (alternative: add the card's Why under each heading).
- 2026-11-25: "Options:" on the card maps to "Other options:" in Copy all, as
  `docs/open-questions.md` writes it and `open-questions.ts` already does; the parser
  reads both, decided for the owner (alternative: change the template to "Other
  options:", which edits the template test).
- 2026-11-25: The "(answer individually)" marker is kept as the card writes it, at the
  start of the question, so it comes out right after the number, decided for the owner
  (alternative: parse it into its own field, which changes the IPC type).
- 2026-11-25: "Check it on Windows", decided for the owner: the parser and formatter
  tests (with a CRLF variant) run on this Windows machine and on CI's `windows-latest`
  test shards; the clipboard e2e runs in CI's Ubuntu `desktop-e2e`, since local e2e is
  off; the Windows clipboard's CRLF is compared as LF, as `questions.e2e.ts` does
  (alternative: a local Windows e2e run, which opens windows on the owner's screen).
- 2026-11-25: "Exactly" is compared with line ends read as LF: Copy all writes LF and
  Chromium writes CRLF to Windows' clipboard, decided for the owner (alternative: write
  CRLF on Windows).

## Questions for me

One question per line, in this shape; options are separated by `;`.

- [ ] (none)

## Parked

Lines noticed while drafting, not this card's work.

- 2026-11-25 [product] A question whose options are a nested list under it (T-0020's
  shape) still shows without them; folding nested lists edits `questions.test.ts`'s
  T-0020 case, so it needs the owner · seen on T-0048 ·
  `apps/desktop/src/main/kit/parse.ts`
- 2026-11-25 [process] `docs/open-questions.md` paraphrases a card's question (T-0044's
  section at `16384b3` differs from the card), so the file and Copy all disagree; the
  foreman could paste Copy all's text instead · seen on T-0048 · `docs/open-questions.md`

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  none (low card)
```
