---
name: done
description: Run the done check for the current CARD.md and report what passed, failed or is untested. Use when the user types /done or the card's work looks finished.
---

Check the current card. Report honestly; do not fix failures in this step.

If the card's status isn't `in progress`, run the checks in steps 1 to 3 and report them
as in step 4, but write nothing: no file, status, evidence, commit or PR. Say that you
stopped because the card is `<status>`, not `in progress`, and stop there.

1. Read `CARD.md`. For each acceptance criterion, run its check and paste the command and
   result under "Evidence". Tick it only if it passed. A check you can't run is UNTESTED.
2. Run the repo's tests, lint and typecheck. Paste the summary lines.
3. Run `git diff --stat` against the base branch. List any file not in "Files in scope".
   `CARD.md`, `cards/done/` and `BACKLOG.md` are always allowed.
4. Report three lists: passed, failed, untested or out of scope.
5. If everything passed and nothing is out of scope: open a draft PR whose body is the
   card's criteria and evidence, set the status to `done`, and move the card to
   `cards/done/<id>.md`. Then delete this card's own line from "Next up" in `BACKLOG.md`:
   the one line that ends with `· from <Source>`, where `<Source>` is the card's `Source:`
   value exactly. Leave the other lines and their numbers as they are. If no line or more
   than one line matches, delete none and say so in your report. Never merge.
6. Otherwise set the status to `blocked`, write what's needed under "Questions for me",
   and stop.
