# T-0059 · test(shell): the fixture cleanup waits for its children and retries EBUSY on Windows

Status: in progress
Branch: card/T-0059 · Held by: builder session (T-0059)
Created: 2026-11-25 · Source: owner's answer to T-0045's question (docs/open-questions.md) · Gate: needs you (shared test helper `kit-fixture.ts`), approved by the owner

## Why

`gh.test.ts › readGitHub › a hang is killed at the limit` failed once on Windows with EBUSY from `kit-fixture.ts` `remove()`: a killed process (and its child) can hold its folder for a moment after the kill, and `rmSync`'s `maxRetries` did not retry EBUSY on Node 22. A flaky cleanup hides real results for everyone running the suite.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: Before it removes anything, `remove()` waits (up to a limit) for every child process the test started to exit. The "hang" test's three killed `gh` calls and their children are all covered, not only the last call's · check: read the diff; `pnpm --filter desktop test -- gh.test.ts` passes
- [ ] A2: `remove()` itself retries on EBUSY and EPERM with a short backoff for up to about 5 s, staying synchronous (its signature and its ~30 callers do not change); other errors throw at once · check: read the diff; a new assertion-free run of the suite passes
- [ ] A3: If it still fails after the retries, the error names the path (and the code), so it is not silent · check: read the diff; the message is built from the path and the last error
- [ ] A4: No test's assertions change: the diff of every `*.test.ts` has no changed `expect`, `it` title or fixture value · check: `git diff develop -- '*.test.ts'` shows no changed assertion
- [ ] A5: `gh.test.ts` and the real-git tests (`source.test.ts`, `source-timeout.test.ts`, `display-branch.test.ts`, `branch-states.test.ts`, `checklist.test.ts`) pass 20 times in a row on Windows with nothing else testing; counts pasted under Evidence · check: a loop of `pnpm --filter desktop exec vitest run <those files>` x 20 (shape as in T-0045's Evidence on card/T-0045); plus CI green on the PR

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/test/kit-fixture.ts` (changed): the wait for children and the retrying `remove()`
- `apps/desktop/test/fake-gh.mjs` (changed): the hang mode also appends every pid it starts (itself and its child) to a second file named by a new env var, so no call's pids are lost
- `apps/desktop/src/main/kit/gh.test.ts` (changed): setup/teardown only, to hand the fixture those pids before `remove()` in `afterEach`; no assertion changes

## Out of scope

- `source.ts`'s `killTree` (product code): do not make it wait or report; the fix is in the test helper.
- Making `remove()` async or touching its callers (unit tests and e2e files).
- Other flaky tests, and `rmSync` use outside `kit-fixture.ts`.

## Constraints

- No new dependencies. Use `Atomics.wait` on a `SharedArrayBuffer` (or similar) for the synchronous backoff, and `process.kill(pid, 0)` for liveness.
- Assertion-free helper changes only. If waiting for children needs a test to assert something different, stop and ask.
- The wait must not fail a test whose children are already gone, and must be bounded (about 5 s), then fall through to the retrying removal.

## Skills

- none

## Stop and ask

Besides the standing list in CLAUDE.md:

- Any change to what a test asserts, or a need to edit a file beyond the three above (for example `source-timeout.test.ts` if its git child also needs registering).

## Next step

Start at A1: add the pid registration to the fixture and `fake-gh.mjs`, then the retrying `remove()`.

## Decisions

- 2026-11-25: Owner approved this shared-helper change (answer to T-0045's question), so the card is ready though the gate is `needs you`.
- 2026-11-25: Decided for the owner: `remove()` stays synchronous, with a blocking backoff via `Atomics.wait` (alternative: make it async and edit about 30 callers, too wide for one card).
- 2026-11-25: Decided for the owner: children are known to the fixture through the pids file the fake `gh` already writes, extended to keep every call's pids (alternative: the fixture scans for processes by working directory, which is not portable on Windows).
- 2026-11-25: Decided for the owner: the 20-run loop is a local run on the owner's Windows machine; CI's check is the PR's own green run.

## Questions for me

none

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

## Parked

- The `rmSync` maxRetries line from T-0024 in BACKLOG.md is closed by this card when it merges.
