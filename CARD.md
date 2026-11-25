# T-0040 · test: set a coverage floor

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0040 · Held by: AB_Rouge
Created: 2026-11-25 · Source: BACKLOG.md Next up "Set a coverage floor once the review tests land" (from checklist `quality.coverage.floor`) · Gate: needs you

## Why

Coverage runs on every `pnpm test` and writes `coverage/coverage-summary.json`, but
nothing fails when it drops: T-0001 cut Rivetari's thresholds (52/77/75/52, measured on a
different codebase) because the skeleton had nothing to measure. The review tests have
landed (38 files, 207 tests), so the checklist's `quality.coverage.floor` line can now be
met with a floor that holds today and catches a real drop.

Measured on this branch (Windows, `pnpm test`, 2026-11-25), from `coverage-summary.json`:

| Scope            | Lines  | Branches | Functions | Statements | Lines total |
| ---------------- | ------ | -------- | --------- | ---------- | ----------- |
| **Total**        | 48.50% | 81.72%   | 75.76%    | 48.50%     | 7373        |
| apps/desktop     | 36.87% | 81.74%   | 78.83%    | 36.87%     | 4839        |
| packages/runtime | 75.09% | 80.45%   | 73.85%    | 75.09%     | 1674        |
| packages/engine  | 72.30% | 85.79%   | 74.07%    | 72.30%     | 740         |
| packages/cli     | 0.00%  | 25.00%   | 25.00%    | 0.00%      | 120         |

Proposed floor (global, today's totals rounded down then about 3.5 points off, so it holds
across OSes and catches a drop of roughly 250 lines or 10 functions): **lines 45,
branches 78, functions 72, statements 45**.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `vitest.config.ts` sets `coverage.thresholds` to the floor the owner picked
      (recommended: `lines: 45, branches: 78, functions: 72, statements: 45`), global, and
      nothing else in the file changes except the stale comment above `enabled` (see
      Decisions) · check: `git diff origin/develop...HEAD -- vitest.config.ts` shows only
      the `thresholds` block and that comment
- [ ] A2: The full suite meets the floor · check: `pnpm test` exits 0; paste the
      coverage summary and confirm no `does not meet global threshold` line
- [ ] A3: Coverage below the floor fails the run · check: a temporary local run of part
      of the suite against the committed config, not committed:
      `pnpm exec vitest run packages/engine --passWithNoTests; echo exit=$?` exits 1 and
      prints `ERROR: Coverage for lines (…) does not meet global threshold (45%)` (the
      untested files still count, so totals fall to about 7% lines)
- [ ] A4: `CHECKLIST.md` is not edited by this card (T-0039 is rewriting it); the PR body says the next `/setup` run should tick `quality.coverage.floor` with today's numbers and the floor · check: `git diff --stat origin/develop...HEAD` lists no `CHECKLIST.md`; the PR body has the note
- [ ] A5: `ci` is green on the PR on both OSes · check: `gh pr checks <PR>` shows `ci`
      pass, with lint, typecheck and test passed or skipped on ubuntu and windows

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `vitest.config.ts` (the `coverage.thresholds` block, and the one comment above
  `enabled`)
- `CARD.md`, `cards/done/T-0040.md`
- `BACKLOG.md` (Parked lines only, appended)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Adding tests to raise coverage (`packages/cli` at 0% lines is tempting; park it)
- Per-workspace floors, `thresholds.autoUpdate` or any other `coverage` option
  (`include`, `exclude`, `reporter`, `all`)
- Changing CI: PR test shards run with `--coverage.enabled=false`, and `build-test` on
  develop and main already runs `pnpm test` with the floor; leave `.github/workflows/`
  alone
- Editing BACKLOG.md's Next up line or the existing coverage Parked line

## Constraints

- No new dependencies. No product code, no test changes.
- The floor is enforced by `pnpm test` (locally, `/done`) and by `build-test` on pushes
  to develop and main on both OSes. The PR's own `ci` doesn't check it (shards run with
  coverage off), so A2 is the local proof; Linux numbers aren't measured here and the
  3.5-point margin is meant to cover any OS difference.
- If the floor fails in `build-test` on develop after merge, the line's rule applies: the foreman stops merging cards and puts a fix card first (owner, 2026-11-25).

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

None. The change is two config values and one checklist line; no listed skill fits.

## Stop and ask

Besides the standing list in CLAUDE.md:

- `pnpm test` on develop (after T-0039) measures below the chosen floor, or more than 6
  points above it on any metric: re-measure and ask before committing new numbers.
- A3's partial run passes (the floor isn't enforced as expected).

## Next step

Owner: answer the floor question below and mark the card ready. Builder: wait for T-0039
to merge, merge `origin/develop` in, re-run `pnpm test`, then add the thresholds.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Measured today's coverage with `pnpm test` on this branch: 48.50% lines,
  81.72% branches, 75.76% functions, 48.50% statements (7373 lines, 1302 branches, 260
  functions) — the checklist's 47.12/80.93/74.49 is older
- 2026-11-25: decided for the owner: one global floor (alternative: per-workspace glob
  thresholds for `packages/*` and `apps/desktop`) — `apps/desktop` is two thirds of the
  lines and `packages/cli` has 120 lines at 0%, so per-workspace floors would be noisy on
  the small packages and add four blocks to keep in step
- 2026-11-25: decided for the owner: the builder rewords the comment above `enabled` in
  `vitest.config.ts` ("the judge's coverage floor reads it after its run"; the judge was
  cut and nothing reads the file now) to say the floor is `thresholds` below (alternative:
  leave it and park it)
- 2026-11-25: A3 uses a partial run against the committed config instead of a temporary
  edit: `coverage.all` counts untested files, so running only `packages/engine` drops the
  totals below the floor with no file change. Tried with the proposed floor passed as CLI
  flags: exit 1, all four metrics reported below threshold
- 2026-11-25: Owner (21:06:58): floor 45/78/72/45; build-test on develop enforces it; a failure stops merges and puts a fix card first. Set ready by the foreman.
- 2026-11-25: Decided for the owner by the foreman: this card no longer edits `CHECKLIST.md` (alternative: wait for T-0039, which is rewriting that file, then tick the line) — so the card can be built now in parallel; the next `/setup` run ticks the coverage line. A4 rewritten and the T-0039 dependency removed.

## Questions for me

One question per line, in this shape; options are separated by `;`.

- [x] What coverage floor goes in `vitest.config.ts` (global; lines/branches/functions/statements)? — Recommended: 45/78/72/45, today's 48.5/81.7/75.8/48.5 less about 3.5 points, so it holds on both OSes and catches a real drop. Options: 48/81/75/48 (today rounded down; catches any drop but may fail on a small refactor or on Linux); 40/75/70/40 (loose; catches only a large drop).

Owner, 21:06:58: 45/78/72/45, as recommended. Coverage stays off on PR runs, so ci stays fast, and build-test on develop enforces the floor. If it fails, the existing rule applies: stop merging cards and put a fix card first. Park a [tool] line for a ratchet that raises the floor when coverage climbs, as Rivetari's quality.json did (the foreman parked it on develop).

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  question         21:04:02 → 21:06:58   2 min 56 s

Drafting (2026-11-25, Windows, no file changes):
$ pnpm test
 Test Files  38 passed (38)
      Tests  207 passed (207)
Statements   : 48.5% ( 3576/7373 )
Branches     : 81.72% ( 1064/1302 )
Functions    : 75.76% ( 197/260 )
Lines        : 48.5% ( 3576/7373 )
exit=0

$ pnpm exec vitest run packages/engine --passWithNoTests \
    --coverage.thresholds.lines=45 --coverage.thresholds.statements=45 \
    --coverage.thresholds.branches=78 --coverage.thresholds.functions=72
 Test Files  9 passed (9)
Lines        : 7.25% ( 535/7373 )
ERROR: Coverage for lines (7.25%) does not meet global threshold (45%)
ERROR: Coverage for functions (46.66%) does not meet global threshold (72%)
ERROR: Coverage for statements (7.25%) does not meet global threshold (45%)
ERROR: Coverage for branches (71.36%) does not meet global threshold (78%)
exit=1
```
