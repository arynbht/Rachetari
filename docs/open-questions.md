# Open questions

## T-0045 · test(shell): make the real-git and child-process tests reliable on Windows

A4 asks for 20 local runs of the real-git tests after the change. Run 1 passed. Run 2 stalled in the test fixtures' own git calls (`git checkout -q main` sat 859 s, `git init` failed) while the machine had under 1 GB of 32 GB free, and Claude Code then stopped the loop for low memory. The change itself is only `vitest.config.ts`. PR #66 is open as a draft.

1. What should A4 do now? — Recommended: re-run the 20 runs when no other builder is running tests, and treat run 2 as void if those 20 pass. Other options: accept CI's Windows shards on PR #66 as A4's evidence; re-run with 10 runs; hold the card.

Answer:

## T-0041 · feat(shell): Home shows each repo's stage and its worst section (merged)

Its criterion A3 asked for a screenshot, `docs/screenshots/T-0041/home-sections.png`, which was never made: builders don't run the desktop e2e locally, because it opens windows on your screen. The e2e itself passed in CI.

1. (answer individually) How should shell cards' screenshots be made? — Recommended: a small CI card: `desktop-e2e` sets `SCREENSHOT_DIR` and uploads the shots as a run artifact, and the builder commits them from there (a CI change). Other options: you run the e2e locally for this one shot; waive screenshots in shell cards.

Answer:
