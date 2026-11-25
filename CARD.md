# T-0036 · feat(shell): fetch every repo in the background and show it in the header

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0036 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Shell: live shell (part 3 of 3), §Shell: background fetch · Gate: low

## Why

The shell fetches a repo only when it's opened (`App.tsx` → `repos:fetch`), so the other
machine's work doesn't arrive while a repo stays on screen, and a failed fetch shows only
in the error box of the moment. While the shell runs live (T-0030), nothing on screen says
which commit it's running or that it's stuck behind `develop` because a build failed: that
is only in `.claude/live-shell/status.json`. This card fetches every registered repo in
the background every 60 s and puts on T-0031's "showing develop" line: the running commit
(live shell only), "fetched N s ago", a failed fetch, and a warning when the live shell is
behind.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: A `FetchLoop` in `main/engine/fetch-loop.ts` (Electron-free; `fetch`, `now` and
      the interval passed in, 60 s by default) fetches each repo it's given at once, then
      again 60 s after that fetch settles; never runs two fetches of one repo at a time
      (a `fetchNow` while one runs gets that same fetch, and restarts the 60 s); keeps per
      repo `fetchedAt` (last success, ISO) and `error` (the last fetch's message, null
      once one succeeds); stops fetching a repo it's no longer given, and everything on
      `stop()`, dropping results that land after · check:
      `pnpm exec vitest run apps/desktop/src/main/engine/fetch-loop.test.ts --coverage.enabled=false`
      with fake timers, tests "fetches every repo at once, then every 60 s", "never starts
      a second fetch of a repo while one runs", "a fetch asked for while one runs joins
      it", "a failed fetch is in the state, with its message, until one succeeds", "stops
      fetching a removed repo, and everything on stop" (all pass, names under Evidence)
- [ ] A2: `liveStatus()` in `main/engine/live-status.ts` reads the file named by
      `RIVETARI_LIVE_STATUS`: not set, missing, unreadable or not T-0030's shape → null
      (nothing shows); otherwise `{ running, behind }`, `running` the short (7) sha of
      `status.running`, `behind` null when `failure` is null, else for an
      `install`/`build`/`test` step "Live shell is behind: the <step> of <sha7> failed;
      still running <running7>." and for `diverged`/`not-forward` "Live shell is behind:
      <reason>" · check: `pnpm exec vitest run apps/desktop/src/main/engine/live-status.test.ts --coverage.enabled=false`,
      tests "no RIVETARI_LIVE_STATUS, no live status", "a missing or malformed status file
      shows nothing", "a status with a failed build gives the behind warning", "a diverged
      status gives its reason as the warning", "a status without a failure gives the
      running commit only"
- [ ] A3: Main runs one `FetchLoop` beside the NowHub over the sidebar's repos (the list
      `watchRepos` gives the hub), stopped with the hub when the window closes; `repos:fetch`
      goes through it; it reads the live status every 2 s when `RIVETARI_LIVE_STATUS` is
      set. A `ShellStatus` schema in `shared/ipc.ts` (`live`: `{ running, behind }` or
      null; `fetch`: `{ repoPath, fetchedAt, error }` or null, for the repo on show, the
      one `now:select` names) goes out on a new push channel and a new get channel, zod-parsed
      through `push()`; the preload exposes `shell.status()` and `shell.onStatus()` · check:
      `pnpm --filter @arynbht/rivetari-desktop typecheck`; the e2e in A4
- [ ] A4: On T-0031's `DisplayBranch` line in Now, Tasks and Checklist, a new
      `ShellStatus.tsx` shows, when live, "running <sha7>" before "showing develop"; after
      it "fetched N s ago" (from `fetchedAt`, ticking each second with `useNow` and `span`
      in `lib/time.ts`, so "N min" after a minute), or "not fetched yet"; a failed fetch
      as "fetch failed: <message>" in the warning colour (not `role="alert"`); and the
      behind warning on its own line · check:
      `pnpm --filter @arynbht/rivetari-desktop e2e e2e/shell-status.e2e.ts` (runs in CI's
      desktop-e2e), tests "shows fetched N s ago, and it ticks", "a failing fetch shows in
      the header" (a second remote at a missing path), "a card pushed to the origin shows
      after the next background fetch, without reopening the repo"
      (`RIVETARI_FETCH_INTERVAL_MS=1000`), "shows the running commit and the behind
      warning from the live status, and neither without it", each axe clean; run locally
      with `SCREENSHOT_DIR=$PWD/docs/screenshots/T-0036` it writes
      `docs/screenshots/T-0036/header.png` (live, behind, fetched) and `fetch-failed.png`,
      committed and looked at
- [ ] A5: Nothing outside "Files in scope" changes, every existing test passes unchanged
      (`fetch-timeout.e2e.ts` included: its `role="alert"` box stays the only alert), and
      `ci` is green on the PR · check: `git diff --stat origin/develop...HEAD`;
      `gh pr checks` (unit tests and desktop-e2e). Local before pushing: `pnpm lint`,
      `pnpm --filter @arynbht/rivetari-desktop typecheck`,
      `pnpm exec vitest run apps/desktop --coverage.enabled=false`,
      `pnpm exec prettier --check apps/desktop CARD.md`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/engine/fetch-loop.ts`, `fetch-loop.test.ts` (new)
- `apps/desktop/src/main/engine/live-status.ts`, `live-status.test.ts` (new)
- `apps/desktop/src/main/index.ts`
- `apps/desktop/src/shared/ipc.ts` (only new: `ShellStatus` and its two channels)
- `apps/desktop/src/preload/index.ts` (only new: `shell.status()`, `shell.onStatus()`)
- `apps/desktop/src/renderer/components/ShellStatus.tsx` (new)
- `apps/desktop/src/renderer/components/DisplayBranch.tsx` (T-0031's; only: render
  `ShellStatus` on its line)
- `apps/desktop/e2e/shell-status.e2e.ts` (new)
- `docs/screenshots/T-0036/header.png`, `fetch-failed.png` (new)
- `CARD.md`, `cards/done/T-0036.md`, `BACKLOG.md` (Parked lines only: on the line, cards
  never edit Next up)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- `App.tsx`: its fetch on open and its "Couldn't fetch this repo" box stay as they are
  (`fetch-timeout.e2e.ts` asserts the box); dropping the duplicate gets parked, not done
- `kit/source.ts` (T-0031's): no cancel for a running `git fetch`; `scripts/live-shell.mjs`
  (T-0030) and its status format, its own `fetchError`, and a stale status file from a
  live shell that stopped
- The CI state in the header (§Shell: CI state), and the History, Map and Home headers

## Constraints

- No new dependencies.
- `FetchLoop` and `liveStatus` are Electron-free, like `engine/now.ts`, so they test
  without a window. Fetches go through T-0024's `fetchRepo` (its 60 s limit and
  `GitTimeout`) unchanged. Repos are keyed as the NowHub keys them (case-insensitive on
  Windows).
- No `setInterval` for the fetch: each repo's next fetch is a `setTimeout` set when its
  last one settles. The interval can be overridden by `RIVETARI_FETCH_INTERVAL_MS`, read
  in main at start, for the e2e only (as T-0024's limits are).
- Gate `low` is the owner's ruling (2026-11-25, §Shell: live shell). It covers the IPC
  change: the new `ShellStatus` schema, its push and get channels in `shared/ipc.ts`, and
  `shell.status()`/`shell.onStatus()` in the preload. No existing schema or channel
  changes.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development`: A1 and A2 are written test first, A1 with fake timers
- `workflow/incremental-implementation`: three slices, each tested: the loop, the live
  status, the IPC and header

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0031 (`ipc.ts`, `DisplayBranch.tsx`; this card's header sits on its
  "showing develop" line): start once it has merged into `develop`
- Shares `ipc.ts` with T-0032, T-0034 and T-0035, each in its own schema (this card adds
  new ones only): the foreman's no-overlap rule decides the order
- If an existing test fails because the shell now fetches in the background
- If `DisplayBranch` can't render `ShellStatus` without changing its props or the views
  that pass them

## Next step

Ready; waiting on T-0031. Then A1's tests in `fetch-loop.test.ts` with fake timers, then
`FetchLoop`; then `live-status.ts`; then the IPC, the header and the e2e.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `low`, the owner's ruling for the live shell; it covers the IPC change named under Constraints. Status `ready`. Over five files (twelve with tests and screenshots), so the drafter proposes a split to the foreman.
- 2026-11-25: Every 60 s, decided for the owner per §Shell: live shell and Next up, shown as "fetched N s ago" turning "N min" past a minute (alternative: every 2 minutes and "N min ago", §Shell: background fetch).
- 2026-11-25: The loop lives in main beside the NowHub as its own Electron-free class over the same sidebar list, decided for the owner (alternative: inside the NowHub, which says it never fetches).
- 2026-11-25: No overlap, decided for the owner: per repo, the next fetch is set 60 s after the last settles, and `repos:fetch` on opening joins one that runs (alternative: a fixed 60 s interval that skips a repo whose fetch still runs).
- 2026-11-25: Stopping, decided for the owner: with the NowHub on window close, timers cleared and late results dropped; a running `git fetch` is left to its 60 s limit, since `fetchRepo` has no cancel (alternative: an `AbortSignal` on `fetchRepo`, which edits T-0031's `source.ts`).
- 2026-11-25: "fetched N s ago" ticks in the renderer from `fetchedAt` with the existing `useNow` and `span` (alternative: main pushes every second).
- 2026-11-25: The live status: main reads `RIVETARI_LIVE_STATUS` every 2 s when set; not set or unreadable shows nothing, decided for the owner (alternative: `fs.watch` on the file).
- 2026-11-25: The header sits on T-0031's `DisplayBranch` line, and the fetch shown is the repo on show as `now:select` names it, so neither `App.tsx` (T-0032's) nor the three views change, decided for the owner (alternative: its own line under the repo's name in `App.tsx`, on every tab).
- 2026-11-25: Behind means any `failure` in the status, `diverged` and `not-forward` included, decided for the owner (alternative: only a failed install, build or test). The live script's own `fetchError` isn't shown; the shell's own fetch is (alternative: show both).
- 2026-11-25: A failed fetch in the header isn't `role="alert"`, so `fetch-timeout.e2e.ts`'s one alert stays unchanged, decided for the owner (alternative: an alert, which edits that test).
- 2026-11-25: Decided for the owner by the foreman: one card, not the drafter's 3a/3b split (alternative: the fetch loop and header first, the live status second) — both feed the same header line, and a split adds an inspection cycle.

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
