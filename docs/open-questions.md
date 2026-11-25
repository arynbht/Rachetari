# Open questions

## T-0038 · docs: army mode, a design for running N cards at once

The doc is on PR #51: `docs/army-mode.md` on `card/T-0038`. These three decisions are yours; the card doesn't change `SCOPE.md`.

1. The two-session cap in `SCOPE.md` (rule 3: two build sessions by day, one card at a time by night). — Recommended: once a one-at-a-time six-card night meets the "Parallel night cards" condition under "Later", move that row out and rewrite rule 3 as "No more than three build sessions at once by day. Night mode runs at most `width` cards at once, starting at 2." Other options: change it now; keep the cap.
2. `SCOPE.md` says night cards rebase onto the night branch; the line never rebases. — Recommended: merge. Other options: keep rebase for nights only.
3. Small questions at night: `SCOPE.md` holds them; the line decides and logs them. — Recommended: keep holding them at night until the first width-2 nights are reviewed. Other options: decide and log at night too.

Answer:
