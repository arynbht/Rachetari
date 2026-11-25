# Army mode

Army mode is the night runner in `SCOPE.md`, working several cards at once. This is a
proposal drawn from today's line in `docs/queue-2026-11-25.md`; nothing is built.

## The width setting

Width is the most cards in build at once, set before each night. Width 1 is today's night
mode. Each card still runs the per-card loop in `SCOPE.md`. The first nights run at
width 2. Width goes up by one only after a night with no card held over a file conflict.

## Picking cards

When a slot frees, the runner starts the first card in "Next up" order that passes four
rules:

1. Its status is `ready` and it is held by nobody.
2. None of its files in scope overlap a running card's. If unsure, they do.
3. It doesn't depend on a card that hasn't merged into `night/<date>`.
4. Width is never above 20, Claude Code's limit on concurrent subagents (noted by the
   foreman, 2026-11-25). Reviewers count toward that limit.

If no card passes, the slot stays empty. If two running cards turn out to touch the same
file, the later one goes back to `ready`.

## One worktree, one agent per card

The runner creates each worktree by hand from the base branch, `night/<date>`: it checks
out the card's branch and merges the night branch in. A subagent's own worktree branches
from the default branch, not from `develop` or the night branch (noted by the foreman,
2026-11-25), so the agent can't make it. The agent gets only the card and the rules, and
pushes only its own branch. The reviewer is a second fresh agent in the same worktree.

## The lead session

One lead session runs the night and builds nothing: it picks cards, creates worktrees,
starts agents and runs each card's checks itself. Before merging a green card, it merges
`night/<date>` into the card branch and runs the checks again, then merges the card with
`--no-ff`, one at a time. Only the lead writes "Next up", the night report and
`docs/open-questions.md`.

## Questions and holds

A stop-and-ask trigger holds the card. The agent writes its question under "Questions
for me", sets `Status: blocked` and `Held by: nobody`, pushes and stops. The lead copies
the question into `docs/open-questions.md` and skips its dependents. The morning report
ends with one line listing held cards; the owner answers in one message.

## Usage limits

Width N spends tokens N times as fast. On a usage-limit warning, the lead drops width by
one, as the line dropped to two builders rather than stopping. At the limit, it starts
nothing, holds running cards with the reason "usage limit", and writes the report.

## What the shell shows

Agents push as they go, so running cards already show under In progress. Army mode would
add one line on Now: the width, the slots in use, and why each waiting ready card waits.
Held cards appear in Needs you, as now.

## From today's line

What worked, and what army mode keeps:

- **Chain mode.** One builder took dependent shell cards in order; a chain gets one slot.
- **Shared first.** A small card added the shared types; view cards then ran in parallel.
  The drafter writes these first.
- **The `ci` queue.** A card waiting for `ci` held no inspection slot. A built card frees
  its build slot while its checks run.
- **Approvals in chat.** The owner answered waiting cards in one message (T-0020: blocked
  to ready in 8 min 25 s). The morning report ends the same way.
- **`docs/open-questions.md`.** Real forks went to one place. Held cards go there.
- **`develop`.** A standing branch replaced day branches. The night branch is cut from
  `develop`; nothing touches `main`.

What stalled, and what army mode does about it:

- **Merge permission refusals.** The foreman's merges were refused and waited for the
  owner (noted by the foreman). The lead may merge into and push `night/<date>` only,
  tried before the night.
- **Union merge on Next up.** `merge=union` stacked the ordered list and held T-0017.
  Only the lead edits Next up.
- **The drafter as bottleneck.** Builders waited for ready cards. Army mode runs only
  cards ready before the night and reports width used against width set.
- **Dependency chains on shared files.** `SHELVED.md` and `source.ts` kept cards serial.
  The overlap rule keeps them serial on purpose.
- **Windows test hangs.** Three process tests timed out at 30 s, then passed on re-run.
  N cards add load, so the lead runs checks one card at a time and logs one re-run per
  timeout.

## Decisions for the owner

1. **The two-session cap in `SCOPE.md`.** Rule 3 under "Rules for changing this file"
   allows two build sessions by day and one card at a time by night. The "Parallel night
   cards" row under "Later" waits for six-card nights with time to spare and no held
   cards from conflicts. Recommended: once a one-at-a-time six-card night meets that,
   move the row out and rewrite rule 3 as "No more than three build sessions at once by
   day. Night mode runs at most `width` cards at once, starting at 2."
2. **Merge or rebase onto the night branch.** `SCOPE.md` says rebase; the line never
   rebases. Recommended: merge.
3. **Small questions at night.** `SCOPE.md` holds them; the line decides and logs them.
   Recommended: hold until the first width-2 nights are reviewed.
