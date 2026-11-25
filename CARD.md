# T-0015 · test: run each kit command once on a scratch repo and record what happened

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0015 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt phase 5
Stacked on: card/T-0013 (PR #31)

## Why

The kit's five commands have only been read, not run, outside this repo's own `/setup`.
Before the owner runs the day, setup and handoff done tests on real work, each command
should have run once on a repo that isn't this one, with what it did written down.

## Acceptance criteria

- [ ] A1: A scratch repo with a local origin is built inside this repo's gitignored `.scratch/`, so nothing is written outside the repo · check: `git check-ignore .scratch`, the build script
- [ ] A2: `/setup`, `/card`, `/park`, `/done` and `/handoff` each ran once on it, each in a fresh `claude -p` session · check: the transcripts' last lines and the scratch repo's git log
- [ ] A3: What each command did is recorded: files written, branches pushed, what it refused or asked, and anything it got wrong · check: `docs/kit-trial-2026-11-25.md`
- [ ] A4: Every problem found is parked, not fixed · check: `[tool]` lines in `BACKLOG.md`
- [ ] A5: CI passes · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `.gitignore` (the `.scratch/` line only), `scripts/kit-trial.mjs` (new)
- `docs/kit-trial-2026-11-25.md` (new)
- `EXTRACTED.md`, `BACKLOG.md`, `DECISIONS.md`, `SHELVED.md`, `MORNING.md`, `CARD.md`, `cards/done/T-0015.md`

## Out of scope

- Changing the kit's wording to fix what the trial finds (park it)
- The day, setup and handoff done tests on real work (the owner's)

## Constraints

- No new dependencies. Nothing written outside this repo.

## Skills

None.

## Stop and ask

Besides the standing list in CLAUDE.md:

- A command would push to GitHub or write outside the scratch repo (tonight: stop the run, record it)

## Next step

Push, open the draft PR, wait for CI, run the done check, then write MORNING.md.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Card written and set ready by the session (D-06)
- 2026-11-25: /setup stopped twice at headless permissions; the command skills were copied by hand in the scratch repo and the other four commands run (D-19)
- 2026-11-25: MORNING.md, the overnight hand-back, is written on this card, the last in the stack

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
<commands and results>
```
