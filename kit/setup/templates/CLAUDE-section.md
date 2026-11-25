<!-- Paste this section into the repo's CLAUDE.md. Remove any "start every task with /rivetari" line. -->

## How work is done here

1. **Pull, then read `CARD.md`.** Fetch and fast-forward the card's branch first. The card
   is the whole job for this session. If there is no card, its status is `draft`, or
   `Held by:` names another machine, stop and say so. Otherwise set `Held by:` to this
   machine, push, and start from the "Next step" line.
2. **Edit only the card's "Files in scope".** If the work needs another file, stop and ask,
   naming the file and why.
   Read the skills the card names under "Skills" from `skills/`, and no others.
3. **Park everything else.** Anything you notice that isn't the card (a bug, a refactor, a
   missing test, a tool problem) gets one line under "Parked" in `BACKLOG.md`, then you
   carry on with the card. Do not fix it, even if it's small.
4. **Stop and ask before:** adding a dependency; changing a schema, contract or public
   type; touching auth, billing or migrations; changing or deleting an existing test;
   changing lint, CI or agent config; or when a criterion looks wrong or impossible.
   Write the question under "Questions for me" in the card and stop.
5. **Done means shown.** Tick a criterion only after running its check, and paste the
   command and result under "Evidence". Run tests, lint and typecheck. Anything you did
   not run is marked UNTESTED.
6. **Leave a resume point.** Before the session ends, rewrite the card's "Next step",
   append any decision to "Decisions", then commit and push the card's branch. Unpushed
   work doesn't exist for the other machine. Use `/handoff` to release the card.
7. **Never merge, never push to the integration branch or the default branch.** The
   integration branch is `develop` (or its like) when the repo has one, else the default
   branch. Cut the card's branch from it and open a draft PR against it.
8. **Tool problems are not this session's work.** If a tool (Rivetari, the shell, CI) gets
   in the way, work around it, park it with `[tool]`, and continue.

Commands: `/card <request>` drafts a card, `/park <note>` parks a line, `/done` runs the
done check, `/handoff` saves and releases the card for another machine.
