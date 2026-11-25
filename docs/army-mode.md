# Army mode

2026-11-25, a proposal. Army mode is the night runner from `SCOPE.md` with one new
setting: how many cards it works at once. Nothing here is built. It draws on today's line
in `docs/queue-2026-11-25.md`, which ran three builders, two inspectors, a drafter and a
foreman at the same time.

## The width setting

Width is the most cards in build at once. It is set per night, before the night starts.
Width 1 is today's night mode: one card after another. Each card still runs the per-card
loop in `SCOPE.md`: one build, the runner's checks, one fix attempt, a fresh review, then
merge or hold. The first nights run at width 2. Width goes up by one only after a night
ends with no card held over a file conflict.

## Picking cards

When a slot frees, the runner walks the ready cards in "Next up" order and starts the
first one that passes all four rules:

1. Its status is `ready` and it is held by nobody.
2. None of its files in scope overlap the files in scope of any running card. When the
   runner can't tell, it treats the files as overlapping.
3. It doesn't depend on a card that hasn't merged into `night/<date>`.
4. Width is never above 20, Claude Code's limit on concurrent subagents (noted by the
   foreman, 2026-11-25). Reviewers count toward that limit too.

If no card passes, the slot stays empty until one does. If two running cards turn out to
touch the same file, the later one is held and goes back to `ready`.

## One worktree, one agent per card

Each card gets its own worktree and one fresh agent. The runner creates each worktree by
hand: it checks out the card's branch and merges `night/<date>` into it. It can't leave
this to the agent's own worktree option, because a subagent's own worktree branches from
the default branch, not from `develop` or the night branch (noted by the foreman,
2026-11-25). The agent gets the card and the rules, nothing else, and pushes only its own
branch. The reviewer is a second fresh agent in the same worktree.

## The lead session

One lead session runs the night and builds nothing. It picks cards, creates worktrees and
starts agents. It runs each card's checks itself, so no agent grades its own work. Green
cards merge into `night/<date>` one at a time, with `--no-ff`. Before each merge, the lead
merges the night branch into the card branch and runs the checks again. The lead is the
only writer of "Next up", the night report and `docs/open-questions.md`.

## Questions and holds

A stop-and-ask trigger holds the card, as `SCOPE.md` says. The agent writes its question
under "Questions for me", sets `Status: blocked` and `Held by: nobody`, commits, pushes
and stops. Its slot frees at once. The lead copies the question into
`docs/open-questions.md`, and cards that depend on the held card are skipped. In the
morning, the report ends with one line listing the held cards. The owner answers in one
message, and the lead sets the statuses.

## Usage limits

Width N spends tokens about N times as fast. On the first usage-limit warning, the lead
drops width by one and starts nothing new until the running cards fit. Today's line had
the same rule: drop to two builders rather than stop. When the limit is hit, the
lead starts no card, holds each running card with the reason "usage limit", and writes
the report. The per-card time cap and the night's card cap stay. The report gives tokens
and minutes per card, so the owner can see what width cost.

## What the shell shows

The shell already reads card branches, and agents push as they go, so running cards show
under In progress with their machine. Army mode would add one line on Now: the width,
the slots in use, and why each waiting ready card is waiting (an overlap or a
dependency, named). Held cards appear in Needs you, as now. The shell stays read-only at
night. This is a later shell card, not part of this one.

## From today's line

What worked, and what army mode keeps:

- **Chain mode.** One builder took the dependent shell cards in order, each branching from
  the last. Army mode runs a chain in one slot, never across slots.
- **Shared first.** A small first card added the shared types and channels; the view cards
  then ran in parallel. Army mode needs these cards drafted before the night.
- **The `ci` queue.** A card waiting for `ci` held no inspection slot. A card whose build
  has finished frees its build slot while its checks run.
- **Approvals in chat.** The owner answered waiting cards in one message (T-0020 went from
  blocked to ready in 8 min 25 s). The morning report ends the same way.
- **`docs/open-questions.md`.** Real forks went to one place. Held cards go there.
- **`develop`.** A standing branch replaced day branches. The night branch is cut from
  `develop`; nothing touches `main`.

What stalled, and what army mode does about it:

- **Merge permission refusals.** The foreman's merges were refused by permission checks
  and waited for the owner (noted by the foreman). The lead's permissions allow merging
  into and pushing `night/<date>`, and nothing else, tried once before the night.
- **Union merge on Next up.** `merge=union` stacked the ordered Next up list and held
  T-0017; GitHub ignored it on PR #37. Only the lead edits Next up; agents append to
  Parked only.
- **The drafter as bottleneck.** One drafter fed three builders, and builders waited for
  ready cards. Army mode runs only cards ready before the night, and the report gives the
  width used next to the width set.
- **Dependency chains on shared files.** `SHELVED.md` (T-0021, T-0022) and `source.ts`
  kept cards serial. The overlap rule keeps them serial on purpose.
- **Windows test hangs.** Three process tests timed out at 30 s on Windows and passed on
  re-run; one hung under load. N cards checking at once add load, so the lead runs checks
  one card at a time, and a timeout gets one logged re-run.

## Decisions for the owner

1. **The two-session cap in `SCOPE.md`.** Rule 3 under "Rules for changing this file"
   says no more than two build sessions by day and one card after another by night. The
   "Parallel night cards" row under "Later" waits for six-card nights that finish with
   time to spare and no held cards from conflicts. Recommended: rewrite rule 3 as "No
   more than three build sessions at once by day. Night mode runs at most `width` cards
   at once, starting at 2." Move the row out of "Later" once a one-at-a-time six-card
   night meets its condition. Today's line already ran three builders by day.
2. **Merge or rebase onto the night branch.** `SCOPE.md` says rebase; the line never
   rebases. Recommended: merge, as the line does.
3. **Small questions at night.** `SCOPE.md` decides nothing for the owner at night; the
   line decides small ones and logs them. Recommended: hold at night until the first
   width-2 nights are reviewed.
