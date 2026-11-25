# T-0056 · ci: desktop-e2e uploads its screenshots as a run artifact

Status: in progress
Branch: card/T-0056 · Held by: session T-0056
Created: 2026-11-25 · Source: owner's answer to T-0041's question · Gate: needs you (CI change), approved by the owner 2026-11-25

## Why

Shell cards' e2e tests write screenshots only when `SCREENSHOT_DIR` is set, and builders cannot run desktop e2e locally, so they have no screenshots to commit. CI's headless `desktop-e2e` job is the only place the shots can be made; today it throws them away.

## Acceptance criteria

- [ ] A1: the `desktop-e2e` job creates a directory, sets `SCREENSHOT_DIR` to it for the e2e step, and uploads its contents as a run artifact (named `desktop-e2e-screenshots`) even when the tests fail, with no error if there are none · check: read the diff of `.github/workflows/ci.yml`; on this PR's run, `gh api repos/{owner}/{repo}/actions/runs/<run-id>/artifacts --jq '.artifacts[].name'` lists `desktop-e2e-screenshots`
- [ ] A2: the artifact holds the PNGs the e2e files write · check: download it with `gh run download <run-id> -n desktop-e2e-screenshots -D <scratch dir>` and list at least one `.png` (for example `tasks-branch-states.png`)
- [ ] A3: any action added is pinned to a full commit SHA with a version comment, like the others · check: `grep -n "upload-artifact" .github/workflows/ci.yml` shows a 40-character SHA and a `# v` comment
- [ ] A4: `ci` aggregator behaviour is unchanged: `needs`, `if` and its steps are untouched, and `desktop-e2e` stays not required · check: `git diff develop -- .github/workflows/ci.yml` touches only the `desktop-e2e` job; this PR's `ci` check is green

## Files in scope

- `.github/workflows/ci.yml` (changed)

## Out of scope

- Committing T-0041's and T-0044's screenshots from the artifact (the follow-on fix card does that).
- Making each e2e file write to its own subfolder, or changing `apps/desktop/e2e/helpers.ts` or any e2e file (parked on T-0036).
- Making `desktop-e2e` a required check, or changing the `ci` aggregator.

## Constraints

- No new dependencies. One new action, `actions/upload-artifact`, pinned: v4.6.2 is `ea165f8d65b6e75b540449e92b4886f43607fa02` (the builder re-checks the tag).
- Keep `permissions: contents: read`; the upload needs no more.
- Use `if: always()` on the upload so shots from a failing run are kept; `if-no-files-found: ignore`; a short `retention-days` (for example 7).
- Set `SCREENSHOT_DIR` to an absolute path (for example `${{ runner.temp }}/screenshots`) and create it before the e2e step, since the tests write straight into it and do not create it.

## Skills

none

## Stop and ask

Besides the standing list in CLAUDE.md:

- If the e2e step needs a change beyond `env` and a `mkdir` (for example a different command), stop and ask.

## Next step

Start at A1: add the mkdir and `SCREENSHOT_DIR` to the e2e step and the pinned upload step after it, then read the run's artifacts.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: the owner approved this CI change ("Yes, the CI card as recommended; the CI change is approved"), so the card goes ready despite Gate: needs you (CI change).
- 2026-11-25: Decided for the owner: every e2e file writes into the one directory, so the artifact holds all files' shots flat; same-named shots in two files would overwrite (alternative: per-file subfolders, which is the parked helpers.ts change).
- 2026-11-25: Decided for the owner: criteria A1 and A2 are checked on this card's own PR run, which runs `desktop-e2e` because `.github/**` counts as a full-run change.

## Questions for me

none

## Parked

- 2026-11-25 [tool] Per-file screenshot subfolders (or a filter) would keep a card's shots apart in the artifact; already parked from T-0036.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC): none

```
<commands and results>
```
