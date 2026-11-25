# T-0031 · feat(shell): show develop, from the newer of local and origin

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0031 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Shell: the display branch, §Shell: live shell (first bullet) (part 2 of 3) · Gate: low

## Why

The shell reads BACKLOG.md (Next up, Parked, the checklist and the stage), cards/done/,
nights/, skills/INDEX.md and the History from the default branch (`origin/HEAD`, here
`main`), so nothing the foreman merges into `develop` shows on screen until it reaches
`main`. Done cards are also looked for on the newest `day/*` branch (T-0018), which
`develop` has replaced. This card makes the file source read a display branch: `develop`,
from whichever of local `develop` and `origin/develop` is newer, so a merge on this
machine shows within the 2-second poll without a fetch; the default branch when there's
no `develop`. Now, Tasks and Checklist say which in their header: "showing develop" or
"showing main". Part 1 (T-0030) is the live-shell script; part 3 adds the 60 s background
fetch and the rest of the header (running commit, "fetched N s ago", behind warning).

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `displayBranch(repo)` in `source.ts` picks the branch the shell shows and
      returns `{ name, ref, diverged }`: no `develop` anywhere → the default branch
      (`name: "main"`, `ref: "main"`, `diverged: false`); only `origin/develop` → it;
      local `develop` ahead of `origin/develop` → local, read with no fetch; `origin/develop`
      ahead (after a fetch) → origin's; the same commit → local; diverged → local with
      `diverged: true` · check:
      `pnpm exec vitest run apps/desktop/src/main/kit/display-branch.test.ts --coverage.enabled=false`,
      tests "falls back to the default branch when there's no develop", "reads
      origin/develop when there's no local develop", "reads local develop ahead of
      origin/develop without a fetch", "reads origin/develop once it's ahead", "reads local
      develop, flagged, when the two have diverged" (all pass, names listed under Evidence)
- [ ] A2: Every reader that read the default branch reads the display branch:
      `readBacklog`, `readNights`, `readNightText`, `readSkills`, `readEvents`,
      `readCardCommits` (a card's own commits are those not on the display branch),
      `readDoneCards`, `readDoneCard` and the done-id lookup in `readLiveCards`. Done files
      come from the display branch, then the default branch, a file on both read from the
      display branch; no `day/*` branch is read any more · check: same file, tests "reads
      the backlog, nights, skills and done cards from local develop", "counts a card done
      on develop as done, not broken", "lists a develop card's own commits only"; and
      `grep -nE "day/|dayBranch|newestDay" apps/desktop/src/main/kit/source.ts` prints
      nothing
- [ ] A3: The display branch reaches the views: `KitSnapshot.display`, and a
      `DisplayBranch` schema in `shared/ipc.ts` (`{ name, ref, diverged }`) as a `display`
      field, null before the first read, on `NowState`, `TasksState` and `ChecklistView`,
      each zod-parsed in main as today · check: same file, test "Now, Tasks and Checklist
      carry the display branch"; `pnpm --filter @arynbht/rivetari-desktop typecheck`
- [ ] A4: The header of Now, Tasks and Checklist shows "showing develop" (or "showing
      main") under the title; when the two `develop`s have diverged it adds a warning,
      "Local develop and origin/develop have diverged: showing this machine's develop."; a
      commit to local `develop` that changes BACKLOG.md's Next up appears in Tasks without
      a fetch · check: `pnpm --filter @arynbht/rivetari-desktop e2e e2e/display-branch.e2e.ts`
      (runs in CI's desktop-e2e), tests "shows develop, ahead of origin, in the header of
      Now, Tasks and Checklist", "a commit to local develop shows in Tasks without a
      fetch", "shows main in a repo with no develop", "warns when local and origin develop
      have diverged", each with axe clean; run locally with
      `SCREENSHOT_DIR=$PWD/docs/screenshots/T-0031` it writes
      `docs/screenshots/T-0031/showing-develop.png` (Now's header), committed and looked at
- [ ] A5: Nothing outside "Files in scope" changes, the existing tests still pass (with
      the two edits named under Constraints), and `ci` is green on the PR · check:
      `git diff --stat origin/develop...HEAD`; `gh pr checks` (unit tests and
      desktop-e2e). Local before pushing: `pnpm lint`,
      `pnpm --filter @arynbht/rivetari-desktop typecheck`,
      `pnpm exec vitest run apps/desktop --coverage.enabled=false`,
      `pnpm exec prettier --check apps/desktop CARD.md`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/kit/source.ts`
- `apps/desktop/src/main/kit/watch.ts`
- `apps/desktop/src/main/engine/now.ts`, `apps/desktop/src/main/engine/tasks.ts`,
  `apps/desktop/src/main/engine/checklist.ts`
- `apps/desktop/src/shared/ipc.ts`
- `apps/desktop/src/renderer/components/Now.tsx`, `Tasks.tsx`, `Checklist.tsx`, and
  `DisplayBranch.tsx` (new: the shared header line)
- `apps/desktop/src/main/kit/display-branch.test.ts` (new)
- `apps/desktop/test/kit-fixture.ts` (an optional `develop` helper; existing callers unchanged)
- `apps/desktop/src/main/engine/branch-states.test.ts`, `apps/desktop/e2e/branch-states.e2e.ts`
  (existing tests: the day branch becomes `develop`, see Constraints)
- `apps/desktop/e2e/display-branch.e2e.ts` (new)
- `docs/screenshots/T-0031/showing-develop.png` (new)
- `CARD.md`, `cards/done/T-0031.md`, `BACKLOG.md` (Parked lines only: on the line, cards
  never edit Next up)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Any fetch: the 60 s background fetch, "fetched N s ago", a failed fetch, the running
  commit and the behind warning are part 3. This card reads local refs only
- The History, Home and Docs views' headers (the spec names Now, Tasks and Checklist);
  `history.ts` and `home.ts` follow the display branch through the file source unchanged
- `App.tsx`, the sidebar, and `scripts/live-shell.mjs` (T-0030)

## Constraints

- No new dependencies.
- Branch names: local `refs/heads/develop` and `refs/remotes/origin/develop` only. "Newer"
  means descendant (`git merge-base --is-ancestor`), as in T-0030. `displayBranch` is
  read once per `readKit` and passed to the readers, not run again in each.
- Every new git call goes through T-0024's `git()` with its read limit and `orNone`, so a
  timeout is never read as "no develop".
- Gate `low` is the owner's ruling (2026-11-25, §Shell: live shell). It covers:
  - the IPC change in `shared/ipc.ts`: the new `DisplayBranch` schema and a `display`
    field on `NowState`, `TasksState` and `ChecklistView`;
  - the edit to the existing test `branch-states.test.ts`: the newest day branch
    (`day/2026-11-25` on the origin) becomes `develop` on the origin; "reads done cards
    from the newest day branch too" becomes "reads done cards from develop too", and T-0001
    is read from `develop`'s copy ("the day branch's copy" title) instead of the default
    branch's. The older local `day/2026-11-24` stays and T-0010 stays broken;
  - the edit to the existing e2e `branch-states.e2e.ts`: its `day/2026-11-25` becomes
    `develop` (Done still counts 3);
  - the new optional helper in `test/kit-fixture.ts`; no existing caller changes.
- The default fixture has no `develop`, so every other existing test reads `main` as
  before and must pass unchanged.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development`: A1 and A2 are written test first against fixtures
  with and without `develop`
- `workflow/incremental-implementation`: three slices, each tested: the source, the IPC
  field, the header

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0024 (source.ts, App.tsx). This card edits `source.ts` on top of its
  `git()` with time limits; start once T-0024 has merged into `develop`
- Depends on: T-0026 (now.ts, ipc.ts, Now.tsx)
- If an existing test other than the two named under Constraints fails because of this
  change

## Next step

Ready. Start once T-0024 and T-0026 have merged: A1's tests in `display-branch.test.ts`
against a fixture with local `develop` ahead of `origin/develop`, then `displayBranch`.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `low`, the owner's ruling for the live shell; it covers the IPC field and the two existing-test edits named under Constraints. Status `ready`. Over five files (fifteen with tests and the screenshot), so the drafter proposes a split to the foreman.
- 2026-11-25: Diverged, decided for the owner: local `develop` wins, with a warning in the header, because changes made on this machine must show without a fetch and the foreman merges locally. Alternative: `origin/develop` wins.
- 2026-11-25: The same commit on both, decided for the owner: read as local. Alternative: origin.
- 2026-11-25: Done files, decided for the owner: from the display branch, then the default branch, a file on both read from the display branch (it's the newer). Alternative: the default branch's copy wins, as T-0018 had it, which needs no change to that test's expectation.
- 2026-11-25: `develop` is shown whenever it exists, even if it lacks a commit on `main`, decided for the owner: the foreman keeps `develop` containing `main`. Alternative: fall back to `main` when `develop` doesn't contain it.
- 2026-11-25: Only `origin` counts as the remote, decided for the owner. Alternative: any remote's `develop`.
- 2026-11-25: The header line is "showing develop" in all three views per Next up item 2, though T-0030's split had put it in part 3; part 3 keeps the running commit, "fetched N s ago" and the behind warning. Decided for the owner; alternative: leave the whole header to part 3.
- 2026-11-25: Tests go in a new `display-branch.test.ts`, decided for the owner, so `source.test.ts` stays unedited. Alternative: add the cases to `source.test.ts`.
- 2026-11-25: Decided for the owner by the foreman: one card, not the drafter's proposed 2a/2b split (alternative: split into the source and its tests, then the IPC field, headers and e2e) — the owner wants develop on screen soonest, and a split adds an inspection cycle.

## Questions for me

None.

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
