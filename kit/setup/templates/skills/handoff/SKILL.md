---
name: handoff
description: Save the current card's state and push it so another machine can pick it up. Use when the user types /handoff, or before ending a session with unfinished work.
---

Hand this card off. Change no product code in this step.

Note from me: $ARGUMENTS

1. In `CARD.md`, rewrite "Next step" so someone with no memory of this session can start
   from it: what was just done, what to do next, and the exact command or file to begin
   with. Add anything decided to "Decisions" and anything unresolved to "Questions for me".
2. Under "Evidence", note anything that is half-done or failing right now, with the
   failing output. Do not tidy it up to look finished.
3. Set `Held by:` to `nobody`.
4. Commit everything on the card's branch, including unfinished work, with a message
   starting `wip(handoff):`. Push the branch. If the push fails, say so and stop; the
   handoff has not happened.
5. Parked lines travel in this card's `CARD.md` under "Parked". Whoever merges the PR
   appends them to `BACKLOG.md` on the integration branch (`develop` or its like; the
   default branch when there is none). Do not push to the integration branch or the
   default branch.
6. Tell me the branch name and the "Next step" line. On the other machine:
   `git fetch`, check out the branch, start a session.

List anything that will not travel: untracked files that are git-ignored, local env
files, running servers, and installed dependencies.
