# T-0038 · docs: army mode, a design for running N cards at once

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0038 · Held by: nobody
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

- [ ] A1: `docs/army-mode.md` exists and fits one page: 900 words or fewer
      · check: `wc -w < docs/army-mode.md` prints a number ≤ 900
- [ ] A2: It has exactly these level-2 headings, in this order: `The width setting`,
      `Picking cards`, `One worktree, one agent per card`, `The lead session`,
      `Questions and holds`, `Usage limits`, `What the shell shows`, `From today's line`,
      `Decisions for the owner`
      · check: `grep -E '^## ' docs/army-mode.md` prints those nine lines in that order and
      nothing else
- [ ] A3: "Picking cards" states the four rules: status `ready` and held by nobody; no
      file in scope overlapping any running card's; no dependency on a card that hasn't
      merged; width never above Claude Code's 20 concurrent subagents. "One worktree, one
      agent per card" says each worktree is created by hand from the base branch, because
      a subagent's own worktree branches from the default branch
      · check: `grep -nE 'ready|held by nobody|files in scope|depend|20|default branch' docs/army-mode.md`
      shows each term at least once; read the two sections
- [ ] A4: "From today's line" names what worked (chain mode, shared first, the `ci` queue,
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

Builder: read "The line" and "Army mode, design only" in `docs/queue-2026-11-25.md` and
`SCOPE.md`'s night mode, write `docs/army-mode.md` under A2's nine headings, then run the
checks in A1 to A5 and paste them under Evidence.

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

## Questions for me

One question per line, in this shape; options are separated by `;`.

(none)

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below (docs-only: CI skips them; run them locally or mark each UNTESTED)
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  none (low card)
```
