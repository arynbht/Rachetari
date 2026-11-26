# T-0068 · ci: desktop-e2e install step gets a time limit and retries

Status: in progress
Branch: card/T-0068 · Held by: builder session T-0068
Created: 2026-11-26 · Source: prompt · Gate: needs you (CI change), approved by the owner 2026-11-26

## Why

The desktop-e2e job's step "Install Electron runtime libraries + xvfb" has hung until the job's 15-minute limit four times on 2026-11-26 (develop 66321e8; PR #79 twice; PR #82), before any test ran. Every PR then waits 15 minutes and fails for a reason unrelated to its code. A short limit with retries turns a hang into a quick retry.

## Acceptance criteria

- [x] A1: Only the "Install Electron runtime libraries + xvfb" step changes in `.github/workflows/ci.yml`; no other job, the `ci` aggregator's needs/conditions, or tests change · check: read `git diff develop...HEAD`
- [x] A2: The step has `timeout-minutes: 6` and runs the install (`playwright install-deps`, then `sudo apt-get install -y xvfb`) up to 3 attempts, each under `timeout 110` (3 x 110 s fits the 6-minute step), and exits non-zero with a clear message if all three fail · check: read the step in the diff
- [x] A3: The package filter name stays as on develop · check: the diff does not touch the `--filter` argument
- [x] A4: The workflow file is valid · check: `actionlint .github/workflows/ci.yml` if installed locally, else a YAML parse of the file (say which was run)
- [ ] A5: The PR's own desktop-e2e run passes, its log shows which attempt succeeded, and `ci` is green · check: `gh pr checks` and the step log

## Files in scope

- `.github/workflows/ci.yml` (changed)
- `CARD.md` (changed)

## Out of scope

- The package filter rename (PR #83 does that).
- Changing other steps, other jobs or the 15-minute job limit.
- Caching the apt or Playwright dependencies.

## Constraints

- No new dependencies.
- The step's retry loop must not hide a final failure.

## Skills

none

## Stop and ask

Besides the standing list in CLAUDE.md:

- None: the owner approved the CI change.

## Next step

Step edited, PR #85 open. CI runs on it were cancelled externally ~30s in (3 times, incl. a rerun and a fresh push). Find who cancels, then re-run and read the desktop-e2e install log for A5.

## Decisions

- 2026-11-26: Owner approved this CI change ("Yes: time limit + retry"); gate `needs you (CI change)`, so the card goes ready.
- 2026-11-26: Decided for the owner: no sleep between attempts (alternative: short backoff).
- 2026-11-26: Decided for the owner: 110 s per attempt so all 3 fit in the 6-minute step (alternative: 2 attempts of 170 s).

## Questions for me

none

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [x] Draft PR opened: #85

### Evidence

Waiting on the owner (wall clock, UTC): none

```
A4: no actionlint installed; python PyYAML safe_load parsed ci.yml, step shows timeout-minutes 6 and the 3-attempt loop.
A5: UNTESTED. Runs 45766599050 (x2) and 45767027215 were cancelled ~30s in, before the install step finished; not a code failure.
```

## Parked
