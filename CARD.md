# T-0016 · test: give tests a longer timeout on Windows

Status: in progress <!-- draft | ready | in progress | blocked | done -->
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
- `BACKLOG.md` (the two Next up lines below, and parked lines)
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

- If A2's 20 runs show the test taking more than 10 s on Windows, or hanging.

## Next step

Run A1's 20-run loop of the fetch test on Windows, then decide A2 from its numbers.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: The timeout is set once in `vitest.config.ts` for win32, not per test file — owner's choice when the card was drafted; it touches no test.
- 2026-11-25: `hookTimeout` too, not only `testTimeout` — the kit-fixture tests build their git repos in `beforeAll`.
- 2026-11-25: Id T-0016, not T-0014 — T-0014 is the shelved GitHub sign-in card (S-16).
- 2026-11-25: Owner set ready with a change: measure first; raise the timeout only if the test is slow but finishing, else park the hang and stop.
- 2026-11-25: Owner: remove the already-done lines from "Next up" in this card and list them in the PR body.

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
  /card question   17:36:17 → 17:40:00   3 min 43 s
  draft → ready    17:40:35 → 17:42:06   1 min 31 s
```
