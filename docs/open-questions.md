# Open questions

## T-0041 · feat(shell): Home shows each repo's stage and its worst section (merged)

Its criterion A3 asked for a screenshot, `docs/screenshots/T-0041/home-sections.png`, which was never made: builders don't run the desktop e2e locally, because it opens windows on your screen. The e2e itself passed in CI.

1. (answer individually) How should shell cards' screenshots be made? — Recommended: a small CI card: `desktop-e2e` sets `SCREENSHOT_DIR` and uploads the shots as a run artifact, and the builder commits them from there (a CI change). Other options: you run the e2e locally for this one shot; waive screenshots in shell cards.

Answer:
