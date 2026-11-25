# Army mode

Army mode is the night runner in `SCOPE.md`, working several cards at once: a proposal
drawn from today's line in `docs/queue-2026-11-25.md`. Nothing is built.

## The width setting

Width is the most cards in build at once, set before each night; width 1 is today's night
mode. Nights start at width 2, up by one after a night with no card held over a file
conflict.

## Picking cards

A free slot takes the first card in "Next up" order that passes four rules:

1. Its status is `ready` and it is held by nobody.
2. None of its files in scope overlap a running card's. If unsure, assume overlap.
3. It doesn't depend on a card that hasn't merged into `night/<date>`.
4. Width is never above 20, Claude Code's limit on concurrent subagents. Every subagent
   counts: builders, reviewers and drafters together (noted by the foreman, 2026-11-25).

If two running cards touch the same file, the later one goes back to `ready`.

## One worktree, one agent per card

The runner creates each worktree by hand from the base branch, `night/<date>`, checking
out the card's branch and merging the night branch in. A subagent's own worktree would
branch from the default branch, not `develop` (noted by the foreman, 2026-11-25). The
agent gets the card and rules and pushes only its branch; a fresh second agent reviews it
there.

## The lead session

One lead session runs the night and builds nothing: it picks cards, creates worktrees,
starts agents and runs the checks. It merges `night/<date>` into each green card, reruns
the checks, then merges the card with `--no-ff`, one at a time. Only the lead writes
"Next up", the night report and `docs/open-questions.md`.

## Questions and holds

A stop-and-ask trigger holds the card: the agent writes its question under "Questions
for me", sets `Status: blocked` and `Held by: nobody`, pushes and stops. The lead copies
it to `docs/open-questions.md`, skips its dependents, and lists held cards in one
morning-report line.

## Usage limits

Width N spends tokens N times as fast. At the usage limit, about 21:07 UTC, the foreman
stopped the drafter and the kit inspector and kept two builders running (noted by the
foreman). So on a warning, the lead drops width by one; at a hard stop it holds running
cards as "usage limit" and writes the report.

## What the shell shows

Running cards already show under In progress. Army mode adds a line on Now: width, slots
in use, and why each ready card waits. Held cards show in Needs you.

## From today's line

What worked or was tried, and what army mode keeps:

- **Chain mode.** One builder took dependent shell cards in order: T-0032, T-0034 and
  T-0035 ran stacked. A chain gets one slot.
- **Shared first, not yet tried.** The rule (a small card adds shared types, then view
  cards run in parallel) was adopted, but chain mode replaced it for the shell chain a
  minute later; T-0031 was one 15-file card. A night tries it first.
- **The `ci` queue.** A card waiting for `ci` held no inspection slot; a built card frees
  its slot during checks.
- **Approvals in chat.** The owner answered waiting cards in one message (T-0020: blocked
  to ready in 8 min 25 s), as the morning report will.
- **`docs/open-questions.md`.** Real forks went to one place, as held cards will.
- **`develop`.** A standing branch replaced day branches; the night branch is cut from it.

What stalled, and what army mode does about it:

- **Merge permission refusals.** The foreman's merges were refused, waiting on the owner
  (noted by the foreman). The lead's merge and push to `night/<date>` is tried before the
  night.
- **Union merge on Next up.** `merge=union` stacked the ordered list and held T-0017.
  Only the lead edits Next up.
- **The drafter as bottleneck.** Builders waited for ready cards. Army mode runs only
  cards ready before the night, reporting width used against width set.
- **Dependency chains on shared files.** `SHELVED.md` and `source.ts` kept cards serial;
  the overlap rule keeps that on purpose.
- **Windows test hangs.** Three process tests timed out at 30 s, then passed on re-run.
  Under N cards' load, the lead checks one card at a time, one re-run per timeout.

## Decisions for the owner

1. **The two-session cap in `SCOPE.md`.** Rule 3 under "Rules for changing this file"
   allows two build sessions by day and one card by night; the "Parallel night cards" row
   under "Later" waits for six-card nights with time to spare and none held over
   conflicts. Recommended: after such a night, move the row out and allow three build
   sessions by day and `width` night cards, from 2. Decided, for daytime now (T-0042):
   "By day, the line runs at most three builders; one builder runs a chain of dependent
   cards. Night mode runs one card at a time until a six-card night meets the 'Parallel
   night cards' condition."
2. **Merge or rebase onto the night branch.** `SCOPE.md` says rebase; the line never
   rebases. Recommended and decided: merge, never rebase.
3. **Small questions at night.** `SCOPE.md` holds them; the line decides and logs them.
   Recommended: hold until the first width-2 nights are reviewed. Decided: decide and log
   them at night too, under the day rule; last night's 19 logged decisions held up in the
   morning review.
