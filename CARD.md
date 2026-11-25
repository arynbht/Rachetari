# T-0045 · test(shell): make the real-git and child-process tests reliable on Windows

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0045 · Held by: builder C (this session)
Created: 2026-11-25 · Gate: low · Source: `docs/queue-2026-11-25.md` §Windows test hangs and the git read limit

## Why

Three Windows CI runs hung or timed out today in tests that drive real git or child processes: the fetch test in `source.test.ts` (PR #30, 30 s, then 961 ms on the re-run), `call-limit.test.ts › still reports a failed call by its stderr` (PR #41, run 45693636977 attempt 1, 30 s; its child had already exited with code 3) and, on PR #56 (run 45704718735 attempt 2, windows 3/3), `source.test.ts › never changes the repo when it reads` ("git log timed out after 10 s", 12 040 ms) beside `call-limit.test.ts › a budget ends the call in flight…` ("the child never wrote its pid", 6077 ms). Each failure blocks `ci` until someone re-runs it. All of these files run in vitest's `threads` pool, so their children are spawned from worker threads of one process, at the same moment as other files' children. On Windows a child spawned at that moment can inherit another child's pipe handles. `git()` (`source.ts`) and `spawnWithLimit` (`call-limit.ts`) settle on `close`, so a child that has exited still waits for an unrelated process to let go of its pipes. That is the working hypothesis; A2 tests it.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: Before any change, the affected tests' times on Windows are recorded: 20 local runs of `apps/desktop/src/main` and `packages/engine/src/ai/call-limit.test.ts` on `develop`'s code, giving pass count and min, median and max per test for `source.test.ts`, `display-branch.test.ts`, `source-timeout.test.ts` and `call-limit.test.ts`, and per file for the other real-git files (`kit/checklist-file`, `engine/branch-states`, `checklist`, `history`, `now`, `tasks`, `tasks-needs`, `tasks-questions`). The Windows CI times for the same tests are recorded from PR #56 attempt 2 and `develop`'s last green `build-test (windows-latest)` · check: the loop's command and its summary pasted under Evidence (the loop and its summariser stay in the scratchpad, not committed)
- [ ] A2: The cause is tested. A scratch repro on this machine, one node process with two worker threads, has one thread spawn a short child that exits (`node -e "process.exit(3)"`, and `git log`) while the other spawns a child that lives about 5 s. It records the gap between each short child's `exit` and its `close` over at least 200 spawns. Paste the count of gaps over 1 s, and the same repro with both threads in separate processes. If the repro shows no gap, write that, and A3 still stands on `vitest.config.ts`'s own rule that tests driving real git and child processes run in the single fork · check: the repro's output pasted under Evidence (the script stays in the scratchpad)
- [ ] A3: `vitest.config.ts` runs `apps/desktop/src/main/**` and `packages/engine/src/ai/call-limit.test.ts` in the single fork (two more `inOneFork(…)` lines in `poolMatchGlobs`), and on win32 its `test.env` sets `RIVETARI_GIT_READ_LIMIT_MS` to 20 000 unless it is already set. `source.ts`'s limits are unchanged: 10 s per read, 60 s per fetch. `source-timeout.test.ts` still sets its own 2 s and passes · check: `git diff origin/develop -- vitest.config.ts` (read); `git diff --stat origin/develop -- apps/desktop/src/main/kit/source.ts` (empty); `pnpm exec vitest run apps/desktop/src/main/kit/source-timeout.test.ts`
- [ ] A4: After the change, the same 20-run loop as A1 passes 20 of 20, with min, median and max per test or file as in A1, and no test file changes · check: the loop's summary pasted under Evidence; `git diff --stat origin/develop -- '*.test.ts' 'apps/desktop/test' 'apps/desktop/e2e'` (empty)
- [ ] A5: `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm --filter @arynbht/rivetari-desktop typecheck` pass locally. On the PR the Ubuntu jobs and `ci` are green. The Windows test shards are reported (they don't gate): each shard's result and the times of the tests named in A1. A red Windows shard is re-run once and both runs are pasted. The Windows shards' wall-clock time is compared with PR #56 attempt 2 · check: the commands' output; `gh pr checks <PR>`; `gh run view <run> --log` for the Windows shards, pasted under Evidence

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `vitest.config.ts` (`poolMatchGlobs` and `test.env` only, with its comment)
- `CARD.md` (including "## Parked")

## Out of scope

Named on purpose, so the session doesn't drift into them.

- The 0.3 s race in `call-limit.test.ts`. `kills a call that runs past its limit` and `a budget ends the call in flight…` give the child 0.005 min, and the tree test gives it 0.01 min, to start node and write its pid before the kill. Under load node starts later than that, which is PR #56's "the child never wrote its pid". Fixing it means changing an expected value (`minutes: 0.005`, the message) or how the helper finds the pid, which changes the test beyond its timing. It goes to a follow-on card that needs the owner (see Parked).
- Product changes in `source.ts` or `call-limit.ts`, such as settling on `exit` plus a short wait for the pipes, or raising the 10 s read limit. If A2 shows the inherited-pipe wait, park it as `[product]`: the shell runs reads beside a fetch, so a read could hit its limit the same way.
- CI workflow changes, including the Windows-not-required change (its own card), `testTimeout`/`hookTimeout`, and `test/kit-fixture.ts`.

## Constraints

- No new dependencies. No change to any test file, `source.ts`, `call-limit.ts`, the IPC contract or CI config.
- The longer read limit is set by the test setup (`vitest.config.ts`), only on win32 and only when `RIVETARI_GIT_READ_LIMIT_MS` is unset. 20 s stays under vitest's 30 s test timeout, so a real hang still fails with git's own message.
- `vitest.config.ts` is test-runner config, not lint, CI or agent config. Moving files into the fork and setting an env var change no test and nothing any test asserts.
- No local desktop e2e (Speed-ups); CI's `desktop-e2e` covers it.
- Keep `vitest.config.ts` inside T-0043's lint limits (complexity 20, 500 lines).
- Cards never edit `BACKLOG.md`: parked lines go under "## Parked" below.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

None: the change is a few lines of test-runner config, and no skill in the index covers it.

## Stop and ask

Besides the standing list in CLAUDE.md:

- If an affected test still fails in A4's 20 local runs, or fails again on a Windows shard's re-run, stop. The fix would be a guess past that point.
- If the Windows shards' wall-clock time grows by more than 2 minutes against PR #56 attempt 2, stop: the single fork may be too slow for the line.
- If the fix turns out to need a test file, `source.ts` or `call-limit.ts`.

## Next step

Start at A1: run the 20-run timing loop on `develop`'s code before changing anything.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: How tests get a longer read limit: decided for the owner: `vitest.config.ts`'s `test.env` sets `RIVETARI_GIT_READ_LIMIT_MS=20000` on win32 when unset (alternative: set it at import in `test/kit-fixture.ts`, a file shared with other cards; or on every platform). `source.ts` already reads the var at call time (T-0024), and `source-timeout.test.ts` saves and restores it around its own 2 s.
- 2026-11-25: The product's read limit stays 10 s: decided for the owner (alternative: raise it to 20 s). No run shows a read that was slow but finishing: the failed `git log` stopped at the limit, and T-0016's normal read takes well under 100 ms.
- 2026-11-25: The fix for the close-wait: decided for the owner: the real-git desktop tests and `call-limit.test.ts` join the single fork, as `vitest.config.ts` already does for such tests (alternative: settle on `exit` plus a grace in `source.ts` and `call-limit.ts`, a product change, out of scope and parked if A2 confirms).
- 2026-11-25: Split: decided for the owner: the 0.3 s child-start race in `call-limit.test.ts` goes to a follow-on card. Its fix changes an expected value or the test's helper, which needs the owner. This card stays `low` (alternative: one `needs you` card holding both).
- 2026-11-25: Gate `low`: one config file plus the card, five criteria, nothing on the stop-and-ask list. No test is edited.

## Questions for me

None.

## Parked

- 2026-11-25 [tool] `call-limit.test.ts` gives its hanging node child 0.3 s (0.005 min; the tree test 0.6 s) to start and write its pid before the kill. On a loaded Windows runner node starts later than that: "the child never wrote its pid" (PR #56, run 45704718735 attempt 2, `a budget ends the call in flight…`, 6077 ms). Follow-on card, `needs you`: raise the limits to 0.05 min together with the expected `minutes` and message (recommended), or take the pid from `spawn` instead of the child's file · seen on T-0045 drafting · `packages/engine/src/ai/call-limit.test.ts`

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  none (low card)
```
