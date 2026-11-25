# T-0044 · feat(shell): CI state for develop and each card PR, via gh

Status: draft <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0044 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Shell: CI state; `SHELVED.md` S-16 option (b) · Gate: needs you

## Why

The shell shows no CI state anywhere: S-16 shelved the GitHub sign-in card, so the owner
has to open GitHub to see whether `develop` is green or a card's PR failed. §Shell: CI
state asks for it through the `gh` CLI's existing sign-in (S-16's option (b)), read-only.
This card is part 1 of 2: main reads CI through `gh` for the repo on show (`develop`'s
last run and every open `card/*` PR), sends it over a new IPC channel, and the header
shows `develop`'s run. Part 2 puts a CI badge on each card in Tasks and Now from the same
channel.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `main/kit/gh.ts` runs `gh` with `spawn` and an argument array (never a shell
      string), like `source.ts`'s `git()`: `stdio` ignore/pipe/pipe, `windowsHide`,
      detached on POSIX, killed as a tree (`killTree`) at its limit (15 s, overridable by
      `RIVETARI_GH_LIMIT_MS`), env `GH_PROMPT_DISABLED=1`, `GH_NO_UPDATE_NOTIFIER=1`,
      `NO_COLOR=1` added to `process.env` and nothing else. It runs only two commands,
      both reads, with `cwd` the repo:
      `gh pr list --state open --limit 100 --json number,headRefName,statusCheckRollup,url`
      and `gh run list --branch <display branch> --limit 1 --json databaseId,status,conclusion,headSha,url`.
      Each call ends as `ok` (parsed JSON), `missing` (spawn `ENOENT`), `signed-out` (exit
      4, or stderr naming `gh auth login`), `no-github` (stderr: no remote points to a
      known GitHub host), or `error` (the timeout, a bad exit, unparseable JSON: its first
      line) · check:
      `pnpm exec vitest run apps/desktop/src/main/kit/gh.test.ts --coverage.enabled=false`,
      with the fake `gh` (`test/fake-gh.mjs`, run as `[process.execPath, fake]`): tests
      "signed in: reads the open PRs and the branch's last run", "not installed: missing",
      "not signed in: signed-out", "no GitHub remote: no-github", "a hang is killed at
      the limit: error, and the process is gone", "only ever runs gh pr list and gh run
      list" (all pass, names under Evidence); and
      `git grep -nE "GH_TOKEN|GITHUB_TOKEN|hosts\.yml|auth token|auth status" -- apps/desktop/src`
      prints nothing
- [ ] A2: `CiWatch` in `main/engine/ci.ts` (Electron-free; the reader passed in) reads a
      repo's CI on `read(repo, branch)`, joining a read already running for that repo,
      and keeps one `CiState` per repo: `gh` (`ok`, `missing`, `signed-out`,
      `no-github`, `error`), `message` (for `error`), `readAt` (ISO), `branch`
      (`{ name, run: { state, sha7, url } | null }`) and `prs` (only `card/*` heads:
      `{ branch, number, state, url }`). A PR's state folds its `statusCheckRollup` as
      `gh pr checks` buckets it: any failure, error, cancelled, timed-out,
      action-required or startup-failure → `failed`; else anything not completed or
      pending → `running`; else `passed`; no checks → `none`. A run maps the same way
      from `status`/`conclusion` · check:
      `pnpm exec vitest run apps/desktop/src/main/engine/ci.test.ts --coverage.enabled=false`,
      tests "folds a rollup into passed, failed, running or none", "keeps only card/*
      PRs", "maps the branch's last run, and null with no run", "a read asked for while
      one runs joins it", "a failed read keeps the reason, not stale PRs"
- [ ] A3: Main runs one `CiWatch` and reads the repo on show (as `now:select` names it)
      at once when it's selected and again each time T-0036's background fetch of that
      repo settles: at most one read at a time, about two `gh` calls a minute, for that
      repo only. A `CiState` schema (nullable: null with no repo on show) in
      `shared/ipc.ts`, a get channel and a push channel, zod-parsed through `push()`; the
      preload exposes `ci.state()` and `ci.onState()`. Under `RIVETARI_E2E=1` the
      command comes from `RIVETARI_GH` (a JSON argument array, the fake), and with it
      unset no `gh` runs at all; outside E2E `RIVETARI_GH` is ignored · check:
      `pnpm --filter @arynbht/rivetari-desktop typecheck`; the e2e in A4
- [ ] A4: A new `CiLine.tsx`, rendered by `DisplayBranch.tsx` on its own line under
      "showing develop" (in Now, Tasks and Checklist), says "CI on develop: passed ·
      <sha7>" (or failed in the warning colour, running, cancelled, "no runs yet"); "CI
      state needs the gh CLI signed in" in muted text when `gh` is missing or signed out;
      "CI state couldn't be read: <message>" in muted text on `error`; nothing on
      `no-github` or before the first read. None of it is `role="alert"` · check:
      `pnpm --filter @arynbht/rivetari-desktop e2e e2e/ci-state.e2e.ts` (runs in CI's
      desktop-e2e), tests "shows develop's passing run from gh", "shows a failing run
      after the next background fetch" (`RIVETARI_FETCH_INTERVAL_MS=1000`), "not signed
      in: the quiet line, and the rest of the view works", "gh not installed: the same
      line" (`RIVETARI_GH` naming a missing file), "no RIVETARI_GH under E2E: no CI line",
      each axe clean; run locally with `SCREENSHOT_DIR=$PWD/docs/screenshots/T-0044` it
      writes `docs/screenshots/T-0044/ci-passed.png`, `ci-failed.png` and
      `ci-needs-gh.png`, committed and looked at
- [ ] A5: Nothing outside "Files in scope" changes, every existing test passes unchanged,
      no lint limit is raised (T-0043, PR #58: complexity 20, 500 lines per file, tests
      800, and the caps it holds files at), and `ci` is green on the PR · check:
      `git diff --stat origin/develop...HEAD`; `git diff origin/develop...HEAD -- eslint.config.js`
      prints nothing; `gh pr checks` (unit tests and desktop-e2e). Local before pushing:
      `pnpm lint`, `pnpm --filter @arynbht/rivetari-desktop typecheck`,
      `pnpm exec vitest run apps/desktop --coverage.enabled=false`,
      `pnpm exec prettier --check apps/desktop CARD.md`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/kit/gh.ts`, `gh.test.ts` (new)
- `apps/desktop/src/main/kit/source.ts` (only: `export` on `killTree`, no other change)
- `apps/desktop/test/fake-gh.mjs` (new: the fake `gh`, for the unit tests and the e2e)
- `apps/desktop/src/main/engine/ci.ts`, `ci.test.ts` (new)
- `apps/desktop/src/main/index.ts` (only: the `CiWatch` wiring)
- `apps/desktop/src/shared/ipc.ts` (only new: `CiState` and its two channels)
- `apps/desktop/src/preload/index.ts` (only new: `ci.state()`, `ci.onState()`)
- `apps/desktop/src/renderer/components/CiLine.tsx` (new)
- `apps/desktop/src/renderer/components/DisplayBranch.tsx` (only: render `CiLine`)
- `apps/desktop/e2e/ci-state.e2e.ts` (new)
- `docs/screenshots/T-0044/ci-passed.png`, `ci-failed.png`, `ci-needs-gh.png` (new)
- `CARD.md`, `cards/done/T-0044.md`

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Part 2: the CI badge per card in Tasks (board tile and record header) and Now, from
  `CiState.prs` (`Tasks.tsx`, `Now.tsx`, a new `CiBadge.tsx`). The foreman adds it to
  Next up; this card doesn't edit `BACKLOG.md`
- Anything that writes to GitHub (re-run, approve, merge, comment), a link that opens a
  run in the browser, S-16's device-flow sign-in, and PR state beyond CI (review, draft,
  mergeable)
- CI on Home or for repos not on show; `ShellStatus` (T-0036's) and `FetchLoop`
  themselves: this card hears the loop through main's `onChange`, it doesn't change them

## Constraints

- No new dependencies. No existing schema, channel or test changes.
- The token stays in `gh`'s own store: the shell never reads, stores, logs or passes a
  token, never runs `gh auth`, and never sets `GH_TOKEN`. `gh` gets the shell's own env
  plus the three switches in A1.
- Read-only: `gh.ts` exports only the two reads; the argument arrays are fixed in code
  (only the branch name varies, passed as its own argument after `--branch`).
- `CiWatch` and `gh.ts` are Electron-free, like `engine/now.ts` and T-0036's
  `FetchLoop`. Repos are keyed as the NowHub keys them (case-insensitive on Windows).
- `main/index.ts` is near T-0043's 500-line limit after T-0036: its part stays to the
  wiring (about a dozen lines); everything else lives in `engine/ci.ts`.
- Shell chain: branch from the previous chain card (merged in, never rebased); the PR
  targets that card's branch until it merges, then `develop`.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development`: A1 and A2 are written test first, A1 against a
  fake `gh` for each of its outcomes
- `workflow/incremental-implementation`: three slices, each tested: the `gh` reader, the
  watch, the IPC and header line

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0036 (`FetchLoop` and its `onChange` in `main/index.ts`, `ShellStatus`
  on `DisplayBranch`'s line): start once it has merged into `develop`. Chain order, not a
  dependency: T-0041 (`ipc.ts`, `now.ts`, `Home.tsx`) is built before it
- The wiring doesn't fit `main/index.ts` under its 500-line limit without raising the cap
- An existing e2e fails because the header now has a CI line
- `gh`'s exit codes or messages on the machine differ from A1's mapping (the `gh`
  version in CI's runner or on the owner's machine)

## Next step

Draft: waiting on the owner's answers below. Once ready and T-0036 has merged: merge the
previous chain card's branch in (no rebase), then A1's tests in `gh.test.ts` with the
fake `gh`.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `needs you`: running `gh` on the owner's sign-in touches auth, which
  the owner answers individually. The IPC part (a new `CiState` schema and two new
  channels, nothing renamed or removed) is covered by the owner's standing pre-approval.
- 2026-11-25: How `gh` runs, decided for the owner: its own small runner in `gh.ts` on
  `source.ts`'s pattern, reusing `killTree` by exporting it (alternative: copy
  `killTree` into `gh.ts`, two copies of the tree-kill).
- 2026-11-25: How often, decided for the owner: piggyback on T-0036's background fetch of
  the repo on show, plus once on selecting it: about 120 `gh` calls an hour, far under
  GitHub's 5,000 an hour (alternative: its own slower loop, every 2 min, over every
  repo).
- 2026-11-25: Which branch, decided for the owner: the display branch (T-0031's), so
  `develop` where it exists and the default branch otherwise (alternative: always
  `develop`, nothing when it's missing).
- 2026-11-25: Which run, decided for the owner: the branch's latest run of any workflow
  (alternative: `--workflow ci.yml`, which fails on repos whose workflow has another
  name).
- 2026-11-25: Missing and signed out show the same quiet line, as §Shell: CI state words
  it (alternative: two lines naming which). No GitHub remote shows nothing.
- 2026-11-25: The e2e seam, decided for the owner: `RIVETARI_GH` (a JSON argument array)
  is honoured only under `RIVETARI_E2E=1`, and under E2E with it unset no `gh` runs, so
  existing e2e never meet the runner's real `gh` (alternative: a stub `gh` on `PATH`,
  POSIX only, and existing e2e would run whatever `gh` the machine has).
- 2026-11-25: The data for part 2 (`prs`) ships in this card's `CiState`, so part 2
  touches only view files (§The line, shared first).
- 2026-11-25: Decided for the owner by the foreman: split in two as proposed (alternative: one card); part 2, a CI badge per card in Tasks and Now, is queued in Next up.

## Questions for me

One question per line, in this shape; options are separated by `;`.

- [ ] (answer individually) May the shell run the `gh` CLI on your existing sign-in to
      read CI (`gh pr list`, `gh run list` only; the token stays in `gh`'s store, never
      read or stored by the shell)? — Recommended: yes, as drafted (S-16 option (b)).
      Options: no, build S-16's device flow (option (a)) instead; no, leave CI out of the
      shell (option (c)).
- [x] Split CI state in two: this card (the `gh` reader, IPC and the header line), then — Foreman: decided for the owner, yes (see Decisions).
      part 2 (the badges in Tasks and Now)? — Recommended: yes, two cards. Options: one
      card with the badges too (about 15 files, and `Tasks.tsx` is held at its lint
      cap); three cards (reader and IPC, header, badges).

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
  since 2026-11-25 21:55 (drafted; two questions above)
```
