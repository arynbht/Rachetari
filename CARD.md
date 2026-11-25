# T-0046 · refactor(shell): split Tasks.tsx into board, record and needs-me

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0046 · Held by: AB_Rouge
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Split Tasks.tsx · Gate: low

## Why

`apps/desktop/src/renderer/components/Tasks.tsx` is one file of 1484 lines (1356 counted
by `max-lines`) holding the board, the selected-card list, Needs me and the record, so
only one shell builder at a time can work on the Tasks view, and T-0043 holds it under
two lint exceptions (1406 lines; `TaskRecord` at complexity 37). Splitting it into one
file per view, with no change to what the shell shows or does, lets two builders work on
different views in parallel and lets both exceptions go.

### The split (mapped from `Tasks.tsx` at `18c4c78`)

Counted lines are `max-lines` with blank lines and comments skipped, estimated from the
moved ranges plus imports; the builder measures the real ones under A1.

| File (under `apps/desktop/src/renderer/components/`) | Holds (old lines)                                                                                                                                                                                                                                                                                   | Est. counted lines |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `Tasks.tsx` (stays, the container)                   | `Tasks` with its state, the `tasks.get`/`onUpdate` read, the `focus` effect, the two focus-return effects, `closeCard`, the root Escape handler, the title row and Needs me button, and the choice of board, Needs me or list + record (1300–1484); `useFillHeight` (782–809)                       | ~205               |
| `tasks/stages.tsx` (shared)                          | `STAGES` (with `lib/line.ts`'s limits), `BOARD_COLUMNS`, `DONE_SHOWN`, `latestDone`, `day`, `Load`, `StageHeading`, `NeedLabels` (40–168); `HistoryLink` (306–322)                                                                                                                                  | ~140               |
| `tasks/Board.tsx`                                    | `BoardCard`, `NextUpBand` (170–304); `DoneBand`, `Board` with its arrow-key `move` (324–531)                                                                                                                                                                                                        | ~340               |
| `tasks/SelectedList.tsx`                             | `ListRow`, `SelectedList` with its Up/Down `step` (533–715)                                                                                                                                                                                                                                         | ~185               |
| `tasks/NeedsMe.tsx`                                  | `NeedsList` (717–780)                                                                                                                                                                                                                                                                               | ~70                |
| `tasks/Record.tsx`                                   | `TaskRecord` (the detail read, the next-step clamp measure, `waits`, `onTabKey`, the record's Escape `stopPropagation`, the tablist), with its header and waits JSX cut into components here so `TaskRecord` is ≤ 20; `prLine`, `HeaderField`, `OpenQuestions`, `RECORD_TABS` (872–1163, 1292–1298) | ~290               |
| `tasks/RecordTabs.tsx`                               | `Field`, `Part`, `STATE_LABEL`, `STATE_CLASS`, `List` (811–870); the three tab panels' bodies (Card, Evidence, Commits; 1164–1291), each cut out of `TaskRecord`'s JSX as a component                                                                                                               | ~200               |

`App.tsx` keeps `import { Tasks } from "@/components/Tasks"`; nothing outside this view
imports any of the moved names (`rg` over `apps/desktop/src` at `18c4c78`: only
`Tasks` is imported, by `App.tsx`). `lib/line.ts` is unchanged.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `Tasks.tsx` is the container and the six files under `components/tasks/` hold
      the rest, as the table above maps them; each file is ≤ 500 counted lines and every
      function's complexity is ≤ 20 · check: `pnpm exec eslint apps/desktop/src/renderer/components/Tasks.tsx apps/desktop/src/renderer/components/tasks --rule 'complexity: [error, 20]' --rule 'max-lines: [error, {max: 500, skipBlankLines: true, skipComments: true}]'`
      exits 0, and the same with `-f json` piped to a count gives each file's counted
      lines and its worst function (both pasted under Evidence)
- [ ] A2: the diff moves code and changes nothing it renders or does: every line that
      leaves is an import, a moved declaration's first line (now `export`ed), or a
      Prettier rewrap of the same tokens after de-indenting; every line that arrives is
      one of those or the signature and props of a component cut from `TaskRecord` ·
      check: `B=$(git merge-base HEAD origin/develop); git show $B:apps/desktop/src/renderer/components/Tasks.tsx | sed 's/^ *//' | sort -u > old.txt; cat apps/desktop/src/renderer/components/Tasks.tsx apps/desktop/src/renderer/components/tasks/*.tsx | sed 's/^ *//' | sort -u > new.txt; comm -23 old.txt new.txt; comm -13 old.txt new.txt`
      (run in the scratchpad, never committed), both outputs pasted under Evidence with
      each line's reason; and `git diff --stat $B` lists only "Files in scope"
- [ ] A3: T-0043's two `Tasks.tsx` exception blocks are deleted from `eslint.config.js`,
      nothing else in it changes, and lint passes · check: `git diff origin/develop -- eslint.config.js`
      shows only the two blocks ("Shrink Tasks.tsx under the lint limits (1356 lines)" and
      "Shrink TaskRecord (Tasks.tsx) under the lint limits (complexity 35)") removed;
      `pnpm exec eslint --print-config apps/desktop/src/renderer/components/Tasks.tsx`
      shows `"complexity": [2, 20]` and `"max-lines"` with `"max": 500`; `pnpm lint` exits 0
- [ ] A4: typecheck, unit tests, format and boundaries pass · check: `pnpm typecheck`,
      `pnpm --filter @arynbht/rivetari-desktop typecheck`, `pnpm test`, `pnpm format`,
      `pnpm boundaries`, each exit 0
- [ ] A5: every Tasks e2e and unit test passes unchanged · check: `git diff --stat origin/develop -- apps/desktop/e2e apps/desktop/test 'apps/desktop/src/**/*.test.ts'`
      is empty; `gh pr checks <PR>` shows `desktop-e2e` and `ci` passing (all 10 tests
      in `tasks.e2e.ts`, including "the record header fits at 1140×780 and stays put
      while the record scrolls", plus `now.e2e.ts`'s "Open in Tasks", `history.e2e.ts`,
      `branch-states.e2e.ts`, `display-branch.e2e.ts` and `axe.e2e.ts`)

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/renderer/components/Tasks.tsx`
- `apps/desktop/src/renderer/components/tasks/stages.tsx` (new)
- `apps/desktop/src/renderer/components/tasks/Board.tsx` (new)
- `apps/desktop/src/renderer/components/tasks/SelectedList.tsx` (new)
- `apps/desktop/src/renderer/components/tasks/NeedsMe.tsx` (new)
- `apps/desktop/src/renderer/components/tasks/Record.tsx` (new)
- `apps/desktop/src/renderer/components/tasks/RecordTabs.tsx` (new)
- `eslint.config.js` (deleting the two `Tasks.tsx` exception blocks only)
- `CARD.md`

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Any change to what the Tasks view shows or does: copy, classes, layout, keys, focus,
  the overhaul's "column limits from the line's settings" (`lib/line.ts` stays), and
  renaming any component, prop or `data-*` attribute.
- The other T-0043 exceptions (`Now.tsx`, `Checklist.tsx`, `source.ts`, `parse.ts`,
  `now.ts`, `tier2.ts`, `live-shell.mjs`) and `App.tsx`.
- Renderer unit tests (they would need a DOM test library: a new dependency), and any
  edit to an existing test.

## Constraints

- No new dependencies. No local desktop e2e (§The line, Speed-ups): CI's headless
  `desktop-e2e` is the e2e check.
- Keep every declaration's name, props, JSX, class strings and text as they are; a moved
  function only gains `export`. The only new code is the components cut from
  `TaskRecord`'s JSX (header, waits, the three tab panels), each taking exactly the
  values that JSX already used.
- Keep the behaviour that hangs on tree shape: `key={current.key}` on `TaskRecord` (one
  card's record never shows another's state); `Board`'s and `SelectedList`'s `ref` scoping
  their `data-key` queries; the root Escape handler in `Tasks`, and the record's Escape
  `stopPropagation` on its `Card`.
- No test edits. If one is needed it may only change an import path (pre-approved, §The
  line, Speed-ups: selector-type edits); none is expected, since no test imports
  `Tasks.tsx`.
- Merge `origin/develop` in (never rebase) once T-0043 (#58) has merged, before A3.
- Parked lines go under "## Parked" in this card, not in `BACKLOG.md`.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `quality/code-simplification`: restructuring code without changing behaviour, scoped to
  what changed (cutting `TaskRecord` under 20 without touching what it renders)
- `workflow/incremental-implementation`: one file moved per slice (`stages.tsx`,
  `NeedsMe.tsx`, `SelectedList.tsx`, `Board.tsx`, then the record), typecheck and lint
  after each, committed and pushed as it goes

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0043 (`eslint.config.js` overrides): A3 deletes the two blocks PR #58
  adds, so A3 waits until #58 has merged into `develop`. The moves (A1, A2) can start
  before. No overlap with in-flight cards: T-0041 (`now.ts`, `ipc.ts`, `Home.tsx`) and
  T-0036 (#59: `DisplayBranch.tsx`, `ShellStatus.tsx`, `ipc.ts`, `main/index.ts`, preload)
  touch none of the files in scope. `Tasks.tsx` imports `DisplayBranchLine`, which T-0036
  changes inside but not in its export or props.
- A function can't get to complexity ≤ 20, or a file to ≤ 500 lines, without changing what
  it renders or does, or without a file not listed above.
- A test fails and passing it would need more than an import-path edit.
- `develop` has changed `Tasks.tsx` since this card was drafted (the table's line numbers
  no longer match): re-map before moving.

## Next step

Ready. Start with `tasks/stages.tsx` (A1), then the other moves file by file; merge
`origin/develop` once T-0043 (#58) has merged, then A3.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `low`, status `ready`. No behaviour change, no test edits (only
  import-path edits, pre-approved, if any turn up). A3 edits lint config, which
  CLAUDE.md lists, but only to delete two exception blocks: it tightens lint, and the
  owner's T-0043 answer (each exception names the card that will shrink it; "delete the
  block when that lands") already decides it. Nine files, over the five a `low` card
  allows: decided for the owner: one card, since six are new files holding code moved out
  of one, and only all of them together let both exceptions go (alternative: two cards,
  board/list/needs then the record, which overlap on `Tasks.tsx` and keep the line
  exception until the second lands).
- 2026-11-25: Where the files go, decided for the owner: a `components/tasks/` folder with
  `Tasks.tsx` staying at its path as the container, so `App.tsx` is untouched
  (alternative: flat `TasksBoard.tsx`, `TasksRecord.tsx`… beside the other views).
- 2026-11-25: The shared stage pieces (`STAGES`, `Load`, `StageHeading`, `NeedLabels`,
  `latestDone`, `HistoryLink`…) go in their own `tasks/stages.tsx`, decided for the owner,
  because both the board and the selected list use them (alternative: keep them in
  `Board.tsx` and have `SelectedList.tsx` import from it, so the two views share a file).
- 2026-11-25: The record is two files, decided for the owner: `Record.tsx` (the record,
  header, pinned waits and questions, tabs) and `RecordTabs.tsx` (the three panels and
  `Field`/`Part`/`List`), so each stays well under 500 and the tab panels can change
  without the header (alternative: one `Record.tsx` of about 490 counted lines, near the
  limit before the overhaul's next record card).
- 2026-11-25: `useFillHeight` stays in `Tasks.tsx`, decided for the owner: only the
  container uses it (alternative: its own `tasks/useFillHeight.ts`).
- 2026-11-25: No screenshots, decided for the owner. The foreman asked for identical
  screenshots under `docs/screenshots/T-0046/`, but `tasks.e2e.ts` writes them only with
  `SCREENSHOT_DIR` set, which CI doesn't set or upload, and local desktop e2e is off
  (Speed-ups, 22:00). Sameness is shown instead by A2 (every moved line accounted for),
  A5 (the unchanged e2e, with its layout checks at 1140×780) and the foreman's look at the
  live shell after merge, which should show nothing new (alternative: the builder runs
  `tasks.e2e.ts` locally with `SCREENSHOT_DIR` on the merge base and on the branch and
  pixel-diffs the five shots, which opens windows on the owner's screen; or CI uploads
  them as an artifact, a CI change that needs you).

## Questions for me

One question per line, in this shape; options are separated by `;`.

- (none)

## Parked

Lines noticed while drafting, not this card's work.

- (none yet)

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
