# T-0016 · test: measure the Windows fetch test and park its hang

Status: blocked <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0016 · Held by: AB_Rouge
Created: 2026-11-25 · Source: owner, after PR #30's Windows test timeout

## Why

Twice today a test that drives real git hit the 30 s timeout on Windows:
`r28-forged-marker` once overnight, and `source.test.ts › only sees a card pushed from
another machine after a fetch` on PR #30's CI. `ci` is now required on main, so one
timeout blocks a merge. On the re-run the second test took 961 ms, so the first run hung
rather than ran slow; a longer timeout may not cure that, which is why this card also
records how long the test really takes on Windows.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: How long the fetch test takes on Windows is recorded first: 20 local runs (min, median, max) and its time in this PR's Windows CI shard · check: the loop's output and the CI log line, pasted under Evidence
- [ ] A2: Only if A1 shows the test slow but finishing: `testTimeout` and `hookTimeout` are 90 s on Windows and stay 30 s elsewhere. If A1 shows it normally finishes well under 30 s, the timeout is left alone, the hang is parked with what was seen, and the session stops and tells the owner · check: A1's numbers, and `git diff main -- vitest.config.ts`
- [ ] A3: "Next up" in `BACKLOG.md` lists only work not yet done; the PR body lists every line removed · check: read `BACKLOG.md` and the PR body
- [ ] A4: Tests, lint and typecheck pass locally, and `ci` is green on the PR, Ubuntu and Windows · check: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `vitest.config.ts`
- `BACKLOG.md` (Next up: the two owner lines, removing done lines; parked lines)
- `CARD.md`, `cards/done/T-0016.md`

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Finding or fixing the hang itself (if A2's loop catches one, park it with what it shows)
- Per-file timeouts in the 15 test files that drive real git
- Showing a closed card's branch as done in the shell (its own Next up line)

## Constraints

- No new dependencies.
- No test file changes.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

None: nothing in the index fits a one-line test-config change.

## Stop and ask

Besides the standing list in CLAUDE.md:

- If A1's 20 runs show the test taking more than 10 s on Windows, or hanging.

## Next step

Blocked on the owner: A1's CI half (see Questions). Everything else has passed; on an answer, close the card.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: The timeout is set once in `vitest.config.ts` for win32, not per test file — owner's choice when the card was drafted; it touches no test.
- 2026-11-25: `hookTimeout` too, not only `testTimeout` — the kit-fixture tests build their git repos in `beforeAll`.
- 2026-11-25: Id T-0016, not T-0014 — T-0014 is the shelved GitHub sign-in card (S-16).
- 2026-11-25: Owner set ready with a change: measure first; raise the timeout only if the test is slow but finishing, else park the hang and stop.
- 2026-11-25: Owner: remove the already-done lines from "Next up" in this card and list them in the PR body.
- 2026-11-25: Title changed from "give tests a longer timeout on Windows" to what the card does, since A2 kept the timeout.
- 2026-11-25: A2 resolved as "leave the timeout": the fetch test took 515–656 ms in 20 local Windows runs (max 2% of 30 s), so PR #30's 30 s was a hang. Hang parked; stopped to tell the owner, per their rule.

## Questions for me

- [ ] A1's CI half can't run here: this PR changes only Markdown, so CI skips the tests. Accept PR #30's re-run (961 ms, same test, Windows shard 3/3) as the CI number and close the card, or leave A1's CI half UNTESTED and close, or something else?
- [x] The timeout stays at 30 s and the hang is parked. Shall I go on with A3 and open the PR? — Owner, 17:48: yes, finish it as a records-and-cleanup card, and add three lines to Next up.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  /card question   17:36:17 → 17:40:00   3 min 43 s
  draft → ready    17:40:35 → 17:42:06   1 min 31 s
  hang: go on?     17:44:43 → 17:48:17   3 min 34 s
  total                                  8 min 48 s

# A1 — the fetch test, alone, 20 runs on this machine (Windows 11, Node 22.23.2, git 2.54.0.windows.1)
for i in 1..20: pnpm exec vitest run apps/desktop/src/main/kit/source.test.ts --coverage.enabled=false --reporter=json
  20 of 20 passed
  "only sees a card pushed from another machine after a fetch":
    min 515 ms · median 566 ms · max 656 ms
    per run: 519 581 515 607 534 590 530 647 550 656 522 597 561 607 539 597 528 573 523 571
  whole file (7 tests): min 2311 · median 2377 · max 2612 ms
# A1 — the same test in CI, Windows shard 3/3, commit 7eefc8d (PR #30)
  run 45663184235 attempt 1: timed out at 30 000 ms (Test timed out in 30000ms; 39 other tests passed)
  run 45663184235 attempt 2: 961 ms
  this PR (#33), run 45669023662: UNTESTED — the PR changes only Markdown, so CI's path filter skipped every test job (ci: success, test: skipped)
# A2 — decision
  normal time ≤ 656 ms locally, 961 ms in CI; 30 s is ~30–45x that → a hang, not slowness
  vitest.config.ts unchanged (git diff main -- vitest.config.ts: empty)
# A3 — Next up (BACKLOG.md, c78e667)
  removed, numbered as on main: 1–11 (the build prompt's phases 2–5, merged as #4 … #32) and 13 (ci has been required on main since step 3 today)
  kept: done-branches fix, coverage floor; added: git-call timeouts, Tasks record placement, army mode design
  T-0016's own line comes out when this card closes
# Review — node packages/cli/dist/bin.js review --pr 33
  2 call(s) · 33640 tokens · $0.33 · posted COMMENT (pullrequestreview-6062392773)
  blocking: A1's CI half not recorded (expected: CI hadn't run)
  suggestions: removed-line numbers didn't match main (fixed); T-0016's own Next up line (out at close); checklist's ci line is stale (parked)
# A4 — PR #33, run 45669023662: changes, secret-scan, ci success; lint/typecheck/test skipped (Markdown only)
# A4 — local, on card/T-0016 at c78e667
  pnpm lint                     exit 0
  pnpm typecheck                exit 0 (tsc --build)
  pnpm --filter …desktop typecheck exit 0
  pnpm test                     Test Files 30 passed (30) · Tests 154 passed (154) · 30.0 s
  git diff --stat origin/main   BACKLOG.md, CARD.md only
```
