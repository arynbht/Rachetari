# T-0016 · test: give tests a longer timeout on Windows

Status: draft <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0016 · Held by: nobody
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

- [ ] A1: On Windows, `testTimeout` and `hookTimeout` are 90 s; elsewhere they stay 30 s · check: read `vitest.config.ts`, and `node -e` printing the resolved values under `process.platform` win32 and linux
- [ ] A2: How long the fetch test takes on Windows is recorded: 20 local runs (min, median, max) and its time in this PR's Windows CI shard · check: the loop's output and the CI log line, pasted under Evidence
- [ ] A3: Tests, lint and typecheck pass locally, and `ci` is green on the PR, Ubuntu and Windows · check: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `gh pr checks`

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

Owner marks this `ready`; then change `vitest.config.ts` and run the A2 loop.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: The timeout is set once in `vitest.config.ts` for win32, not per test file — owner's choice when the card was drafted; it touches no test.
- 2026-11-25: `hookTimeout` too, not only `testTimeout` — the kit-fixture tests build their git repos in `beforeAll`.
- 2026-11-25: Id T-0016, not T-0014 — T-0014 is the shelved GitHub sign-in card (S-16).

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
Waiting on the owner (wall clock): /card question 17:36:17 → 17:40:00 UTC (3 min 43 s)
```
