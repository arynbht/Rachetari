# T-0018 · fix(shell): tell done, drafting and broken card branches apart

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0018 · Held by: AB_Rouge
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Done branches show as done · Gate: low

## Why

Today every `card/*` branch without a readable `CARD.md` is "unreadable": it sits in Tasks'
Blocked column in rose, waits in Now's Needs you, and raises a notification. In this repo
that is every finished card's branch (closing a card moves `CARD.md` to `cards/done/`), so
done work looks broken and the owner is told about it. A PR to merge also notifies, though
the foreman merges on the line. Only a broken branch should be unreadable and notify.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: The file source tells a `card/*` branch with no readable `CARD.md` apart, in this order: **done** when `cards/done/<id>.md` is on the default branch or the day branch (it is then not a live card, and a done file only on the day branch is listed with the done cards and its record opens); **drafting** when `git log -1 --format=%H <ref> -- CARD.md` prints nothing; otherwise **broken**, with an error saying whether `CARD.md` doesn't parse or was removed without the card being done. A branch whose `CARD.md` parses reads as before · check: `pnpm exec vitest run apps/desktop/src/main/engine/branch-states.test.ts`, tests "tells done, drafting and broken branches apart" and "reads done cards from the newest day branch too"
- [ ] A2: Only a broken branch is an `unreadable` Needs you item and raises a notification; drafting and done branches raise neither and aren't counted in the sidebar badge. A `merge` item stays listed in Needs you but never notifies · check: same file, tests "only a broken branch waits on you, and only it notifies" and "never notifies for a PR to merge"
- [ ] A3: In Tasks a drafting branch sits under Draft with status `drafting`, greyed (muted text, no rose border, "Drafting: card/T-NNNN"); a done branch shows once, under Done; a broken one stays under Blocked as "Can't be read" · check: same file, test "puts drafting under Draft and done under Done, once"; and `pnpm --filter @arynbht/rivetari-desktop e2e` test "Tasks greys a drafting branch and shows a done branch under Done" in `apps/desktop/e2e/branch-states.e2e.ts` (runs in CI's desktop-e2e; with `SCREENSHOT_DIR` set locally it writes `tasks-branch-states.png`)
- [ ] A4: Nothing else moves: every existing test passes unchanged, and lint, typecheck and `ci` are green · check: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter @arynbht/rivetari-desktop typecheck`, `git diff --stat origin/day/2026-11-25` (only the files below), `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/kit/source.ts`
- `apps/desktop/src/main/engine/now.ts`
- `apps/desktop/src/main/engine/tasks.ts`
- `apps/desktop/src/renderer/components/Tasks.tsx`
- `apps/desktop/src/main/engine/branch-states.test.ts` (new)
- `apps/desktop/e2e/branch-states.e2e.ts` (new)
- `CARD.md`, `cards/done/T-0018.md`, `BACKLOG.md` (Parked lines only)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Raising "approve" only for a `Gate: needs you` draft (the `Gate` field in `parse.ts`, the kit fixture, `home.e2e.ts`): the second card of the split
- `shared/ipc.ts`, `main/index.ts`, `test/kit-fixture.ts` and every existing test, including stale wording like History's "on the default branch"
- Timeouts on the shell's git calls (Next up 10) and the Tasks overhaul's layout

## Constraints

- No new dependencies.
- Still read-only: no git call that writes.
- The done check comes first and costs no git call per branch; a branch that isn't done costs at most one more git call per read.
- The new tests build their extra branches on `kitFixture()` with git in the test itself; the fixture file is not edited.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development` — new logic in three adapters; write each criterion's failing test first
- `workflow/incremental-implementation` — six files; go source → Now → Tasks → board, each slice tested

## Stop and ask

Besides the standing list in CLAUDE.md:

- If any existing test fails because of the change.
- If telling a branch apart needs a git call per `day/*` branch or per done branch.

## Next step

Start with A1: write "tells done, drafting and broken branches apart" in `branch-states.test.ts` and watch it fail.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: "The day branch" is the newest `day/*` branch by name, local or remote-tracking (local wins); with none, only the default branch counts — the names are `day/YYYY-MM-DD`, so the name sorts by date, and one ref keeps each read bounded.
- 2026-11-25: "A `CARD.md` has ever been committed" is `git log -1 --format=%H <ref> -- CARD.md` printing a hash — `CARD.md` has never been on `main`, so the default branch's history can't make a branch look committed.
- 2026-11-25: The order is done, drafting, broken, so a done branch whose `CARD.md` doesn't parse is still done, as the spec reads ("a `card/*` branch with no readable `CARD.md` is one of three things").
- 2026-11-25: The done list reads `cards/done/` on the default branch and the day branch (the default branch wins on a shared id), and a done record falls back to the day branch, so a card done today shows under Done and opens; History lists it too, since it reads the same list.
- 2026-11-25: A done branch isn't a live card: it leaves Now's card list, Home's live-card count and Needs you, and shows in Tasks from its done file only.
- 2026-11-25: `merge` stops notifying in `NowHub`, not in `index.ts`: the item stays in Needs you and the `NeedsYouItem` kind list is unchanged.
- 2026-11-25: `ipc.ts` isn't edited; `TaskItem.status` and `NowCardLine.status`, free strings, gain the value `drafting` — the owner's `low` ruling (2026-11-25) covers it.
- 2026-11-25: Six code and test files where the gate says five; the two past five are new test files — the owner's `low` ruling covers it.
- 2026-11-25: Split: "notify for exactly four things" needs the approve rule too (a draft approves only with `Gate: needs you` on its `Created:` line); that goes to a second card, reported to the foreman rather than added to `BACKLOG.md`.

## Questions for me

- [ ] (none)

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
