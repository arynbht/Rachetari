# T-0057 · docs(shell): T-0041's and T-0044's screenshots from the desktop-e2e artifact

Status: ready
Branch: card/T-0057 · Held by: nobody
Created: 2026-11-25 · Source: BACKLOG Next up; owner's answer in cards/done/T-0041.md Decisions · Gate: low

## Why

T-0041 and T-0044 were meant to commit screenshots but could not (no local desktop e2e). T-0056 now uploads `desktop-e2e-screenshots` from CI. The owner said to commit T-0041's shot from that artifact and mark its A3 met.

## Acceptance criteria

- [ ] A1: `docs/screenshots/T-0041/home-sections.png` is committed, taken from a `desktop-e2e-screenshots` artifact of a green CI run after T-0056, and shows both repo cards · check: look at the PNG; `gh run view <run>` shows the run's conclusion and head sha
- [ ] A2: `docs/screenshots/T-0044/ci-passed.png`, `ci-failed.png` and `ci-needs-gh.png` are committed from the same run, and each shows the CI line it is named for · check: look at the three PNGs
- [ ] A3: In `cards/done/T-0041.md`, A3 is ticked `[x]` with evidence naming the run id, the artifact and the file; the "UNTESTED: not made" line is replaced · check: read the file
- [ ] A4: `cards/done/T-0044.md` gets one evidence line naming the run id and the three files; its screenshot "not taken" decision is left as written · check: read the file
- [ ] A5: Nothing else changes · check: `git diff --stat origin/develop...HEAD` lists only the four PNGs and two card records, plus this card

## Files in scope

- `docs/screenshots/T-0041/home-sections.png` (new)
- `docs/screenshots/T-0044/ci-passed.png`, `ci-failed.png`, `ci-needs-gh.png` (new)
- `cards/done/T-0041.md` (changed)
- `cards/done/T-0044.md` (changed)

## Out of scope

- Editing the e2e files, `ci.yml`, or retaking shots locally.
- Committing the artifact's other PNGs.
- Re-ticking any other criterion in either record.

## Constraints

- No new dependencies. Download into the scratchpad (an empty directory), copy only the four named files, and look at each before committing.
- Docs-only: CI runs no lint, typecheck or test job.

## Skills

none

## Stop and ask

- If the artifact lacks a file or a shot looks wrong or blank, stop and ask; do not tick A3.

## Next step

Find a green run after T-0056 (`gh run list --branch develop`), `gh run download <run> -n desktop-e2e-screenshots -D <empty scratchpad dir>`, copy the four PNGs, look at them, then edit the two records.

## Decisions

- 2026-11-25: Decided for the owner: T-0044's record gets an evidence line only, no criterion ticked (alternative: tick its A4 screenshot half).

## Questions for me

none

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  none
```
