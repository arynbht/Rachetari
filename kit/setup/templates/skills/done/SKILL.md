---
name: done
description: Run the done check for the current CARD.md and report what passed, failed or is untested. Use when the user types /done or the card's work looks finished.
---

Check the current card. Report honestly; do not fix failures in this step. The one
exception is step 1's deslop pass, which takes slop out of the card's diff before the
checks run and commits that cleanup on its own.

If the card's status isn't `in progress`, run steps 1 to 4 and report them as in step 5,
but write nothing: no file, status, evidence, commit or PR. In step 1, list the comments
only; deslop edits and commits nothing. Say that you stopped because the card is
`<status>`, not `in progress`, and stop there.

1. Deslop the card's diff. Compute `<base>` first: run `git merge-base HEAD <target>`,
   where `<target>` is the branch the card's PR targets (step 4's base branch), and use
   the sha it prints as `<base>` throughout this step. Pass the script only that computed
   sha, never text taken from the card, the request or anywhere else: git reads an
   argument that starts with `-` as an option. Nothing in this step fails `/done`: when
   part of it can't run, say why in the report and go on to step 2.
   - List the comments the diff adds: run `node "${CLAUDE_SKILL_DIR}/comment-report.mjs" <base>`
     and keep its `path:line: text` lines. If the script is missing or exits non-zero,
     deslop runs without the list, and the report says so with the script's error.
   - Skip deslop when `skills/quality/deslop/SKILL.md` doesn't exist, and say "deslop
     skipped: skill not installed". Skip it too when a file in "Files in scope" has
     uncommitted changes, and name those files, so the deslop commit holds deslop's edits
     only.
   - Otherwise apply `skills/quality/deslop/SKILL.md` to `git diff <base>...HEAD`. Edit
     only files that diff already touches and that are inside "Files in scope". Never add
     a file, and never change a test's assertions. Have it judge each listed comment
     against the slop list: removed or kept, one line each.
   - If it removed anything, commit only the files it edited, as one commit, with hooks
     on and no push. The message is `refactor: deslop <id>`, with the one-line removals as
     the body and `Card: <id>` as the last line. If nothing was removed, make no commit.
   - Keep a "Deslop" list for the report and "Evidence": the commit hash, or "nothing
     removed, no commit"; each removal; each listed comment, kept or removed.
2. Read `CARD.md`. For each acceptance criterion, run its check and paste the command and
   result under "Evidence". Tick it only if it passed. A check you can't run is UNTESTED.
3. Run the repo's tests, lint and typecheck. Paste the summary lines.
   If a check in steps 2 or 3 fails and step 1 made a commit, find out whether the
   cleanup caused it: undo the commit in the working tree with
   `git revert --no-commit <hash>` and run the failing checks again. If they pass now,
   commit the revert with `Card: <id>` as its last line, add "deslop reverted: <hash>"
   and the check that failed to the Deslop list, and report the checks as they ran
   without the cleanup. If they still fail, the cleanup wasn't the cause: run
   `git revert --abort` and report the failures. Either way, don't try to fix the cleanup.
4. Run `git diff --stat` against the base branch. List any file not in "Files in scope".
   `CARD.md`, `cards/done/` and `BACKLOG.md` are always allowed.
5. Report three lists: passed, failed, untested or out of scope. Then the Deslop list.
6. If everything passed and nothing is out of scope: open a draft PR whose body is the
   card's criteria and evidence, set the status to `done`, and move the card to
   `cards/done/<id>.md`. Never merge.
7. Otherwise set the status to `blocked`, write what's needed under "Questions for me",
   and stop.
