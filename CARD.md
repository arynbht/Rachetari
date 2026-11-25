# T-0038 · docs: army mode, a design for running N cards at once

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0038 · Held by: AB_Rouge
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Army mode, design only · Gate: low

## Why

`SCOPE.md` plans a night runner that works ready cards one after another, and caps the
day at two build sessions. Today's line ran three builders, two inspectors, a drafter and
a foreman at once, and showed both what parallel cards need and where they stall. Before
anyone builds a wider night runner, the owner needs one page that says how N cards would
run at once, drawn from that day, and which `SCOPE.md` rules would have to change.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.
This card is docs-only: CI's path filter skips lint, typecheck and test for it, so every
check below runs locally, and `ci` is the only check on the PR.

- [x] A1: `docs/army-mode.md` exists and fits one page: 900 words or fewer
      · check: `wc -w < docs/army-mode.md` prints a number ≤ 900
- [x] A2: It has exactly these level-2 headings, in this order: `The width setting`,
      `Picking cards`, `One worktree, one agent per card`, `The lead session`,
      `Questions and holds`, `Usage limits`, `What the shell shows`, `From today's line`,
      `Decisions for the owner`
      · check: `grep -E '^## ' docs/army-mode.md` prints those nine lines in that order and
      nothing else
- [x] A3: "Picking cards" states the four rules: status `ready` and held by nobody; no
      file in scope overlapping any running card's; no dependency on a card that hasn't
      merged; width never above Claude Code's 20 concurrent subagents. "One worktree, one
      agent per card" says each worktree is created by hand from the base branch, because
      a subagent's own worktree branches from the default branch
      · check: `grep -nE 'ready|held by nobody|files in scope|depend|20|default branch' docs/army-mode.md`
      shows each term at least once; read the two sections
- [x] A4: "From today's line" names what worked (chain mode, shared first, the `ci` queue,
      approvals in chat, `docs/open-questions.md`, `develop`) and what stalled (merge
      permission refusals, union merge on Next up, the drafter as bottleneck, dependency
      chains on shared files, Windows test hangs), each with what army mode does about it
      · check: the term loop under Evidence prints `terms checked` and no `missing:`
- [ ] A5: "Decisions for the owner" lists changing `SCOPE.md`'s two-session cap (rule 3
      under "Rules for changing this file", and the "Parallel night cards" row under
      "Later") with a recommendation. The PR changes no code and not `SCOPE.md`; the doc
      and `CARD.md` pass prettier; `ci` is green
      · check: `sed -n '/^## Decisions for the owner/,$p' docs/army-mode.md | grep -n 'SCOPE.md'`
      prints a line; `git diff --stat origin/develop...HEAD` lists only files in scope;
      `pnpm exec prettier --check docs/army-mode.md CARD.md` exits 0; `gh pr checks`
      shows `ci` passing

```bash
# A4: every lived-experience term appears in "From today's line"
sec=$(sed -n "/^## From today's line/,/^## Decisions for the owner/p" docs/army-mode.md)
for t in 'chain mode' 'shared first' '`ci`' 'approvals in chat' 'open-questions.md' 'develop' \
         'permission' 'union' 'drafter' 'shared files' 'Windows'; do
  grep -qiF -- "$t" <<<"$sec" || echo "missing: $t"
done; echo "terms checked"
```

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `docs/army-mode.md` (new)
- `CARD.md`, `cards/done/T-0038.md`
- `BACKLOG.md` (Parked lines only: on the line, cards never edit Next up)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Changing `SCOPE.md`, `CLAUDE.md`, the kit or `docs/queue-2026-11-25.md`: the doc
  proposes; the owner changes the rules
- Any code: the night runner script, a width setting in config, shell views for army mode
- Re-measuring today's line (merge times, idle time): cite what the queue file and the
  Parked lines already record

## Constraints

- No new dependencies. No code.
- Sources: "The line" and "Army mode, design only" in `docs/queue-2026-11-25.md`,
  `SCOPE.md` (night mode, rule 3, the "Later" table, phase 7 of the build order), and the
  Parked lines in `BACKLOG.md` that record the stalls. Facts about Claude Code are cited
  where they came from (the docs page if the builder reads it, otherwise "noted by the
  foreman, 2026-11-25").
- Known (the foreman's notes): a subagent created with worktree isolation branches from
  the repo's default branch, not from `develop`, unless the worktree is created by hand;
  Claude Code runs at most 20 subagents at once.
- Plain prose, the way `SCOPE.md` is written: short sentences, no marketing.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `docs/native-writing` — the deliverable is a page of prose the owner reads and decides from

## Stop and ask

Besides the standing list in CLAUDE.md:

- If the proposal can't cover all nine headings in 900 words without dropping a required
  topic, stop and say which topic doesn't fit.

## Next step

Done; draft PR open against `develop`. The foreman checks `ci` (A5's last check) and
merges. The owner decides on `SCOPE.md`'s two-session cap from the doc's "Decisions for
the owner"; this card changes no rule.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `low`, set `ready` by the drafter — docs only, three files, five
  criteria, nothing on the stop-and-ask list.
- 2026-11-25: decided for the owner: the doc is `docs/army-mode.md` (alternative:
  `docs/night-runner-width.md`).
- 2026-11-25: decided for the owner: "one page" means 900 words or fewer by `wc -w`
  (alternative: 600 words, or a line count).
- 2026-11-25: decided for the owner: the card fixes the nine headings so A2 is a grep
  (alternative: free headings, checked by reading).
- 2026-11-25: decided for the owner: a separate "From today's line" section holds the
  lessons, rather than citing them inside each section (alternative: inline citations,
  checked by reading).
- 2026-11-25: The `SCOPE.md` cap change is listed in the doc's "Decisions for the owner"
  and doesn't block this card — `SCOPE.md` is the owner's file and this card only proposes.
- 2026-11-25: decided for the owner: the first nights run at width 2, up by one after a
  night with no card held over a file conflict (alternative: the owner sets any width per
  night).
- 2026-11-25: decided for the owner: the doc also lists two smaller owner decisions it
  found, merge or rebase onto the night branch and small questions at night (alternative:
  only the cap, as the card names).
- 2026-11-25: decided for the owner: the two stalls no file records (merge permission
  refusals, the drafter as bottleneck) are taken from the card's list and cited "noted by
  the foreman" where a claim needed it (alternative: leave them out).
- 2026-11-25: decided for the owner: the lead runs the checks one card at a time, because
  of the Windows hangs under load (alternative: checks in parallel, one re-run each).

## Questions for me

One question per line, in this shape; options are separated by `;`.

- [x] 2026-11-25: Held at inspection on PR #51. Blocking: "Shared first" under "From
      today's line" says a small card added the shared types and view cards then ran in
      parallel; that didn't happen (the rule was adopted in 4b20af6 and replaced by chain
      mode in 3496249 a minute later). Also: add the owner's answers to "Decisions for the
      owner", cite the drop to two builders, and say what the 20-agent cap counts.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below (A1–A4 ticked; A5's local half passed, its `ci` half UNTESTED until the PR's `ci` runs)
- [x] Tests, lint and typecheck run; output below (docs-only: CI skips them; run them locally or mark each UNTESTED)
- [x] No edits outside "Files in scope" (`git diff --stat` below)
- [x] Anything not run is marked UNTESTED, never "verified"
- [x] Draft PR opened: #51

### Evidence

Run on AB_Rouge (Windows 11), 2026-11-25, on `card/T-0038` after `origin/develop`
(594c04a) was merged in.

A1:

```
$ wc -w < docs/army-mode.md
897
```

A2:

```
$ grep -E '^## ' docs/army-mode.md
## The width setting
## Picking cards
## One worktree, one agent per card
## The lead session
## Questions and holds
## Usage limits
## What the shell shows
## From today's line
## Decisions for the owner
```

A3 (and both sections read):

```
$ grep -nE 'ready|held by nobody|files in scope|depend|20|default branch' docs/army-mode.md
17:1. Its status is `ready` and it is held by nobody.
18:2. None of its files in scope overlap a running card's. If unsure, assume overlap.
19:3. It doesn't depend on a card that hasn't merged into `night/<date>`.
20:4. Width is never above 20, Claude Code's limit on concurrent subagents (noted by the
28:The runner creates each worktree by hand from the base branch, `night/<date>`: it checks
29:out the card's branch and merges the night branch in. A subagent's own worktree branches
30:from the default branch, not from `develop` or the night branch (noted by the foreman,
(plus further matches of ready, depend and 20)
```

A4:

```
$ sec=$(sed -n "/^## From today's line/,/^## Decisions for the owner/p" docs/army-mode.md)
$ for t in ...; do grep -qiF -- "$t" <<<"$sec" || echo "missing: $t"; done; echo "terms checked"
terms checked
```

A5 (local half; `gh pr checks` UNTESTED until the PR's `ci` runs):

```
$ sed -n '/^## Decisions for the owner/,$p' docs/army-mode.md | grep -n 'SCOPE.md'
3:1. **The two-session cap in `SCOPE.md`.** Rule 3 under "Rules for changing this file"
9:2. **Merge or rebase onto the night branch.** `SCOPE.md` says rebase; the line never
11:3. **Small questions at night.** `SCOPE.md` holds them; the line decides and logs them.

$ git diff --stat origin/develop...HEAD   (before the card moved to cards/done/)
 CARD.md           | 146 +++
 docs/army-mode.md | 102 +++
 2 files changed, 248 insertions(+)

$ pnpm exec prettier --check docs/army-mode.md CARD.md
All matched files use Prettier code style!
```

Tests, lint and typecheck (run locally; CI skips them on a docs-only PR):

```
$ pnpm lint        → eslint . exit 0
$ pnpm typecheck   → tsc --build exit 0
$ pnpm test        → Test Files 38 passed (38) · Tests 207 passed (207) · exit 0
```

```
Waiting on the owner (wall clock, UTC):
  none (low card)
```
