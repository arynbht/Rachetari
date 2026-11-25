# Open questions

## T-0045 · test(shell): make the real-git and child-process tests reliable on Windows

The re-run you asked for stopped at run 5 of 20. Runs 1–4 and 6–8 passed (59–74 s each), and free memory stayed at 12–14 GB throughout, so this is not the memory problem. Run 5 failed `gh.test.ts › readGitHub › a hang is killed at the limit` with `EBUSY: resource busy or locked, rmdir`, raised by the fixture's cleanup (`apps/desktop/test/kit-fixture.ts:341`, `remove()`) after the test itself had finished: Windows still held the directory. `gh.test.ts` came in with T-0044 after this card was drafted, so it isn't in A1's list. The same EBUSY was parked on T-0024, which also found that `rmSync`'s `maxRetries` didn't retry it on Node 22 / Windows.

1. What should A4 do now? — Recommended: take A4 as the passed runs plus PR #66's Windows CI shards, and queue the cleanup EBUSY as its own card (`kit-fixture.ts` waits and retries `remove()`; that edits a shared test helper, so it is `needs you`). Other options: re-run the 20 runs and accept this flake by name if it is the only failure; widen this card to take in `kit-fixture.ts` (a test-helper change, `needs you`).

Answer:
