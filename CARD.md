# T-0032 · feat(shell): the Tasks board, its columns and the selected-card list

Status: draft <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0032 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Tasks overhaul 2: layout and columns, §Tasks overhaul: the owner's pick (2026-11-25), §Tasks overhaul 1: design only · Gate: needs you

## Why

The Tasks view shows seven equal columns that scroll sideways at the shell's 1140×780
window, then stacks the selected card's record below the board, so the board and the
record never share a screen. It doesn't say how full each stage is against the line's
limits, or which cards wait on the owner and for what. The owner picked T-0028's board
(`origin/card/T-0028:docs/screenshots/T-0028/`) with six changes; this card builds its
layout and columns. The record's own header and tabs are Tasks overhaul 3.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

The e2e checks run in CI's `desktop-e2e` job on the PR, and locally with
`pnpm --filter @arynbht/rivetari-desktop e2e e2e/tasks.e2e.ts e2e/branch-states.e2e.ts`.
Screenshots come from the same run with `SCREENSHOT_DIR=$PWD/docs/screenshots/T-0032`,
are committed, and are 1140×780 PNGs (read from the PNG header).

- [ ] A1: The board, as T-0028's `1-board.png`: five columns, Draft, Ready, In progress,
      Blocked and PR open, inside a region still named "Board", with no sideways scroll
      at 1140×780. Next up is a band above them (collapsed: its count and first line;
      a click expands it in place) and Done a band below. Column headers show load
      against the limits in `renderer/lib/line.ts`: "Draft + Ready 1/6" across the two
      columns, "In progress 1/3", "PR open 0/3", and Blocked a count only. Each board
      card keeps today's contents and adds what it waits on the owner for ("Needs your
      approval", "1 open question"). The subtitle carries the keyboard hint (arrow keys,
      Enter, Escape) · check: e2e test "the board has five columns with the line's
      loads, and Next up and Done as bands" (axe clean), writing `1-board.png`
- [ ] A2: Done shows its count and the latest five by date, each with its PR and date,
      and a "History" link that opens the History tab. With 20 done cards the band reads
      20, lists exactly five, and the page still fits 780 px with no scroll · check:
      e2e test "Done lists the latest five of 20, and History opens the History tab" (it
      commits 18 more done cards to the fixture repo itself; axe clean), writing
      `4-done-20.png`
- [ ] A3: Selecting a card (click, or arrow keys and Enter: Left and Right across the
      non-empty columns, Up and Down within one) collapses the board to a grouped list
      on the left and opens today's record, its content unchanged, on the right. Groups:
      Next up (count), Draft + Ready, In progress, Blocked, PR open (each with its load),
      Done (latest five, History link). Each row has two lines: the full title, never
      truncated (its `scrollWidth` ≤ `clientWidth`), then held by, status or "Needs your
      approval". Up and Down in the list open the next card. Escape brings the full
      board back with focus on the card that was open. At 1140×780 the record pane is
      at least 480 px wide, starts no lower than 200 px and ends by 780 px, scrolling
      inside itself, so Tasks overhaul 3's header and the Questions answer buttons have
      room · check: e2e test "selecting a card collapses the board to the list, and
      Escape brings it back" (axe clean), writing `2-selected.png` (T-0003 open); the
      existing "a card opens in full: …" and "Open in Tasks from Now opens that card's
      record" pass unchanged
- [ ] A4: "Needs me" (a toggle button with its count, beside the title) shows only the
      cards waiting on the owner as one list, each with what to do, read from
      `needsYouItems` in `now.ts` (imported, not edited) into a new `needs` field on
      `TaskItem` (kind, short label, what to do). On the fixture: T-0004 (approve),
      T-0005 (question) and T-0006 (can't be read), nothing else. Columns, Next up and
      Done are hidden while it's on; turning it off brings the board back · check: unit
      `pnpm exec vitest run apps/desktop/src/main/engine/tasks-needs.test.ts --coverage.enabled=false`,
      test "each card carries what it waits on the owner for, as Now's Needs you says";
      e2e test "Needs me shows only the waiting cards, each with what to do" (axe
      clean), writing `5-needs-me.png`
- [ ] A5: Only the files in scope change; the existing-test edits are only those listed
      under Constraints; every other test passes unchanged; `ci` is green on the PR ·
      check: `git diff --stat origin/develop...HEAD`; `gh pr checks` (unit tests and
      desktop-e2e). Local before pushing: `pnpm lint`,
      `pnpm --filter @arynbht/rivetari-desktop typecheck`,
      `pnpm exec vitest run apps/desktop --coverage.enabled=false`,
      `pnpm exec prettier --check apps/desktop CARD.md`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/renderer/components/Tasks.tsx`
- `apps/desktop/src/renderer/lib/line.ts` (new: the line's limits, as constants)
- `apps/desktop/src/renderer/App.tsx` (only: pass Tasks an `onOpenHistory` that selects
  the History tab)
- `apps/desktop/src/main/engine/tasks.ts`
- `apps/desktop/src/shared/ipc.ts` (only `TaskItem`: the new `needs` field)
- `apps/desktop/src/main/engine/tasks-needs.test.ts` (new)
- `apps/desktop/e2e/tasks.e2e.ts`, `apps/desktop/e2e/branch-states.e2e.ts` (existing
  tests: the edits under Constraints, plus the new tests named above)
- `docs/screenshots/T-0032/1-board.png`, `2-selected.png`, `4-done-20.png`,
  `5-needs-me.png` (new)
- `CARD.md`, `cards/done/T-0032.md`, `BACKLOG.md` (Parked lines only: on the line, cards
  never edit Next up)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- The record's fixed header, open questions pinned first, the Card, Evidence and Commits
  tabs and any answer buttons: Tasks overhaul 3 and the Questions answers card
- Reading the limits from a file in the repo or from Settings, and any change to Now,
  its Needs you, `now.ts`, `kit/parse.ts` or `kit/source.ts`
- The History view itself, a "mark ready" button, a light theme

## Constraints

- No new dependencies.
- The IPC change is additive and only on `TaskItem`: `needs`, a list of
  `{ kind, label, todo }` (kind as `NeedsYouItem`'s), empty for a card nothing waits on.
  A live card's items are matched to it by branch. `TasksState` keeps T-0031's `display`.
- The limits live in `renderer/lib/line.ts` as named constants with a comment naming
  `docs/queue-2026-11-25.md` §The line: Draft + Ready 6, In progress 3, PR open 3.
- Names other tests rely on stay: the region "Board", the heading "Tasks", the record
  region "<id> record", a card button's name starting with its id, and Done rows as
  buttons inside a region named "Done …". So `axe.e2e.ts`, `frame.e2e.ts` and
  `now.e2e.ts` don't change.
- `TaskRecord`'s content doesn't change; only where it sits.
- The existing-test edits, all in the two e2e files in scope:
  - `tasks.e2e.ts` "the board has the seven columns, with every card where it stands":
    becomes A1's test; its expected headers become the five columns' loads and the two
    bands, its screenshot `1-board.png`
  - `tasks.e2e.ts` "the list shows status, holder, branch and update, and the choice is
    kept": deleted with the Board/List toggle, if the owner says yes (Questions)
  - `tasks.e2e.ts` `shot()`: writes in CSS pixels (`scale: "css"`) so every machine
    writes 1140×780
  - `branch-states.e2e.ts` "Tasks greys a drafting branch and shows a done branch under
    Done": the seven expected headers become the new ones (Done still counts 3); the
    1600 px viewport and the scroller override before its screenshot go, since the
    board no longer scrolls sideways
- Screenshots: dark theme, the shell's default 1140×780 window, the fixture's cards.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `ui/frontend-design` — the board and the collapsed list are a layout at a fixed
  window: hierarchy, density, then a critique against T-0028's screenshots
- `workflow/incremental-implementation` — four slices, each tested: the `needs` field,
  the board, the selected list, Needs me
- `testing/test-driven-development` — A4's unit test and each e2e test written before
  the change it checks

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0031 (`Tasks.tsx`, `tasks.ts`, `ipc.ts`, `branch-states.e2e.ts`): start
  once it has merged into `develop`
- Depends on: T-0026 (`ipc.ts`; `now.ts`, whose `needsYouItems` this card imports): start
  once it has merged into `develop`
- Depends on: T-0024 (`App.tsx`): start once it has merged into `develop`
- If an existing test other than those listed under Constraints fails because of this
  change
- If the record pane can't meet A3's sizes without changing `TaskRecord`'s content

## Next step

Waiting on the owner's answer under "Questions for me"; then the foreman sets ready, and
a builder starts once T-0031, T-0026 and T-0024 have merged into `develop`.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `needs you`, as the queue says. The owner's pick ("Build cards may
  start") covers the layout, the loads, the additive `needs` field on `TaskItem` it
  needs, and the existing-test edits that only update expected headers, selectors and
  screenshots. Deleting the List test is more than that, so it is the one question.
  Over five files (seven code and test files, four screenshots) and at five criteria:
  the drafter proposes a split to the foreman.
- 2026-11-25: The line's limits: decided for the owner: constants in
  `apps/desktop/src/renderer/lib/line.ts`, the one place the owner edits (alternative: a
  `line:` block in a repo file read by the watcher, which needs `kit/source.ts`,
  `watch.ts` and `parse.ts`, two of them in T-0024's and T-0031's scope; parked).
- 2026-11-25: The limit values: decided for the owner: §The line as widened, Draft +
  Ready 6, In progress 3, PR open 3 (alternative: T-0028's 5, 2 and 3).
- 2026-11-25: PR open's load: decided for the owner: against the inspection cap, as T-0028
  had it (alternative: a count only, since a PR waiting on `ci` holds no inspection slot).
- 2026-11-25: Who "Needs me" counts: decided for the owner: every card Now's Needs you
  lists, from the same `needsYouItems` (approve, question, merge, unreadable, held), so
  the two views agree (alternative: T-0028's three kinds, approve, question and
  unreadable).
- 2026-11-25: "Hide the empty columns": decided for the owner: read as the Needs me view,
  which is one list with no empty columns; the full board keeps its empty columns with
  "None", as in the picked `1-board.png` (alternative: hide empty columns on the full
  board too, keeping their load in the header).
- 2026-11-25: Keys and bands: decided for the owner: T-0028's choices (Left and Right
  across columns, Up and Down within, Enter opens; Up and Down in the list open each
  card; Next up expands in place; the selected list shows Next up as a count) (alternative:
  Up and Down only move focus in the list, Enter opens).
- 2026-11-25: The record pane: decided for the owner: today's `TaskRecord` in a pane that
  scrolls inside itself, with A3's minimum sizes as the room left for overhaul 3
  (alternative: the page scrolls, as today).
- 2026-11-25: History link: decided for the owner: it selects the History tab through an
  `onOpenHistory` prop from `App.tsx` (alternative: leave the link out until History can
  open at a card).
- 2026-11-25: Board cards: decided for the owner: today's contents ("Can't be read:
  card/T-0006", "Drafting: …", the PR line) plus the `needs` label, so the existing
  assertions on that text hold (alternative: T-0028's shorter "Can't be read").
- 2026-11-25: Decided for the owner by the foreman: one card, not split off "Needs me" (alternative: a separate Needs me card) — it shares the board, its fixture and its screenshots, and a split adds an inspection cycle.

## Questions for me

- [ ] Drop the Board/List toggle and its table, deleting the e2e test "the list shows
      status, holder, branch and update, and the choice is kept"? — Recommended: yes;
      the picked board has no toggle and the selected-card list replaces the table.
      Options: drop both; keep the toggle beside Needs me with its test unchanged.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  draft 20:03:58 →
```
