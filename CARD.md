# T-0017 · fix(kit): settle the kit trial's gaps in /setup, /done and /park

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0017 · Held by: AB_Rouge
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §4a · Gate: low

## Why

The kit trial (`docs/kit-trial-2026-11-25.md`) ran each kit command once and found the
skills silent or ambiguous in five places: `/done` on a card that isn't in progress,
whether `/park` commits, which branch `/setup` works on and whether it commits, when
`/setup` writes `DESIGN.md`, and where `/setup`'s templates live. `/done` also has no rule
for the card's own line in "Next up", so done work lingers there until someone removes it.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `/done`, on a card whose status isn't `in progress`, runs its checks and reports them, says why it stopped, and changes nothing: no file, status, evidence, commit or PR · check (reading, local): `git diff day/2026-11-25 -- kit/setup/templates/skills/done/SKILL.md`, read the new step
- [ ] A2: `/done` leaves "Next up" in `BACKLOG.md` alone: no step removes, reorders or edits it (on the line, only the foreman edits Next up, removing a card's line when it merges the card) · check (reading, local): `git diff day/2026-11-25 -- kit/setup/templates/skills/done/SKILL.md` shows no step touching Next up
- [ ] A3: `/park` commits its line on its own: only `BACKLOG.md`, message `chore(park): <what>`, no push; on the default branch it leaves the line uncommitted and says so · check (reading, local): `git diff day/2026-11-25 -- kit/setup/templates/skills/park/SKILL.md`
- [ ] A4: `/setup` says which branch it works on (the current branch unless it is the default branch, else a new `chore/kit-setup` from it) and that it commits its output there as one commit and never pushes; it writes `DESIGN.md` only when the repo has UI and otherwise skips it and says so in its report; and it names its templates folder as `${CLAUDE_SKILL_DIR}/templates/` · check (local): `grep -n 'CLAUDE_SKILL_DIR\|branch\|commit\|DESIGN.md' kit/setup/SKILL.md`, and read `git diff day/2026-11-25 -- kit/setup/SKILL.md`
- [ ] A5: Nothing else in the three skills changes (frontmatter and untouched steps as they were), and `ci` is green on the PR · check: `git diff --stat day/2026-11-25` lists only files in scope; `gh pr checks` (lint, typecheck and test run in full on both OSes: `kit/**/*.md` isn't docs to CI's path filter, and `node scripts/ci-scope.mjs` says `kit/setup/SKILL.md is outside every workspace package`, so `all=true`; desktop-e2e is skipped, and `ci` doesn't need it)

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `kit/setup/SKILL.md`
- `kit/setup/templates/skills/done/SKILL.md`
- `kit/setup/templates/skills/park/SKILL.md`
- `CARD.md`, `cards/done/T-0017.md`, `BACKLOG.md` (parked lines; this card's Next up line)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Re-installing the kit into `.claude/skills/` and `~/.claude/skills/setup` (agent config; the owner does it after merge)
- Adding `disable-model-invocation: true` to the kit's skills, and the template's example lines in `kit/setup/templates/BACKLOG.md` (both parked separately)
- Finding 1, `/setup` unable to write `.claude/` headless (a permissions matter, not skill text), and changing `CLAUDE.md` or `kit/setup/templates/CLAUDE-section.md`

## Constraints

- No new dependencies.
- Wording changes only, in the steps the findings name; keep each skill's frontmatter.
- `kit/**` is prettier-ignored and kept as the owner wrote it: no reformatting of untouched lines.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `docs/native-writing` — every change is prose instructions that a session reads and acts on

## Stop and ask

Besides the standing list in CLAUDE.md:

- If a fix seems to need `CLAUDE.md`, `kit/setup/templates/CLAUDE-section.md` or anything under `.claude/`
- Queue cards 4e and 4g edit the same `/setup` and `/done` files; if a card that edits the same files merges into the day branch first, merge the day branch into this card branch (no rebase) and re-check the criteria

## Next step

Merge `day/2026-11-25` in (no rebase). Resolve `BACKLOG.md` by taking the day branch's "Next up" exactly as it stands (this card's own line included: the foreman removes it at merge), keeping this card's Parked lines. Drop the step that made `/done` remove the card's line (new A2). Then re-run `/done`.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Owner ruling: files under `kit/` are this repo's product, not agent config; agent config is `.claude/**`, `CLAUDE.md` and anything under `~/.claude` — so this card is `low` and leaves the installed copies out of scope
- 2026-11-25: Drafter's defaults, for the owner to overrule: `/setup` branch rule and single commit (A4), `/park` commits only `BACKLOG.md` without pushing (A3), `/done` matches its Next up line by `Source:` (A2)
- 2026-11-25: Finding 1 (headless `/setup` can't write `.claude/`) left out — no bullet in §4a covers it and it stays parked
- 2026-11-25: `/setup`'s three fixes kept as one criterion (A4), matching §4a's single bullet, so the card stays at five criteria
- 2026-11-25: Pre-build re-check against day/2026-11-25 at 0f12566: no in-scope file moved (only `docs/queue-2026-11-25.md` changed, and its 4a ruling matches this card), so no merge; the stop-and-ask line now merges instead of rebasing; A5's CI note now names what runs (lint, typecheck, test in full; desktop-e2e skipped)
- 2026-11-25: Merged day/2026-11-25 (5e0e80a) into the card branch before editing: it had renumbered "Next up", and this card removes its own line there; §4a unchanged
- 2026-11-25: `/done`'s not-in-progress rule is a paragraph before step 1, so steps 1–6 keep their numbers and text
- 2026-11-25: `/park`'s commit is a new step 3; the old step 3 is step 4 with its text unchanged
- 2026-11-25: `/done` says nothing about renumbering the other Next up lines: a first draft said to keep their numbers, but this repo's CI runs `prettier --check` on BACKLOG.md, which renumbers an ordered list, so that sentence came out and this card's removal was renumbered by prettier
- 2026-11-25: `/setup`'s commit message is `chore(kit): set up the direction kit`; the branch rule opens §2, before anything is written
- 2026-11-25: Owner (18:29): on the line, cards never edit "Next up"; only the foreman does, on the day branch, removing a card's line when it merges that card. Cards still append to "Parked". So `/done` leaves Next up alone (A2 rewritten), and this card's branch keeps the day branch's Next up exactly, its own line included, so the foreman's removal at merge doesn't stack the lists again.
- 2026-11-25: Set ready by the foreman (approvals in chat).

## Questions for me

- [x] HELD by the inspector (2026-11-25, PR #34): the PR conflicts with `day/2026-11-25`. The day branch renumbered Next up (T-0019 at 2) after this card merged it, and `BACKLOG.md merge=union` stacks the two lists, bringing back this card's own §4a line (undoing A2) and failing prettier. The card's own stop-and-ask covers it. Owner: put it back to ready for that fix? — Owner, 18:29: yes. Take the day branch's Next up as it stands. New rule: on the line, cards never edit Next up; the foreman does, removing a card's line when it merges it. So drop the part of 4a that made `/done` remove the card's own line.
- [ ] None.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below (A1–A4; A5's diff half passed, its `ci` half was UNTESTED when this was pushed and is recorded on PR #34)
- [x] Tests, lint and typecheck run; output below
- [x] No edits outside "Files in scope" (`git diff --stat` below)
- [x] Anything not run is marked UNTESTED, never "verified"
- [x] Draft PR opened: #34

### Evidence

Waiting on the owner (wall clock, UTC):
held → ready 18:18:58 → 18:29:27 10 min 29 s

```
# A1, A2 — git diff day/2026-11-25 -- kit/setup/templates/skills/done/SKILL.md
  +If the card's status isn't `in progress`, run the checks in steps 1 to 3 and report them
  +as in step 4, but write nothing: no file, status, evidence, commit or PR. Say that you
  +stopped because the card is `<status>`, not `in progress`, and stop there.
  step 5: +Then delete this card's own line from "Next up" in `BACKLOG.md`: the one line
  that ends with `· from <Source>`, where `<Source>` is the card's `Source:` value exactly.
  If no line or more than one line matches, delete none and say so in your report.
  2 hunks, +8 -1; steps 1-4 and 6 unchanged
# A2 applied to this card — grep -F '· from `docs/queue-2026-11-25.md` §4a' BACKLOG.md
  1 line matched (2. Kit fixes ... (T-0017)); removed in the done commit; prettier --write
  renumbered the 15 lines below it (CI's prettier --check needs that)
# A3 — git diff day/2026-11-25 -- kit/setup/templates/skills/park/SKILL.md
  +3. Commit the line on its own, with only `BACKLOG.md` in the commit:
  +   `git commit -m "chore(park): <what>" -- BACKLOG.md`. Do not push. On the default
  +   branch, don't commit: leave the line uncommitted and say so.
  -3./+4. Change nothing else. ... (text unchanged, renumbered)
# A4 — grep -n 'CLAUDE_SKILL_DIR\|branch\|commit\|DESIGN.md' kit/setup/SKILL.md
  15: Note what already exists: `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`, ...
  20: - Branch first. Work on the current branch, unless it's the default branch: then create
  22:   branch, and step 7 commits it.
  29:   `${CLAUDE_SKILL_DIR}/templates/`. The `templates/...` paths below are inside it. ...
  42: should do: `DESIGN.md` (tokens, components, layout and naming patterns) and
  46: Write `DESIGN.md` only when the repo has UI. Without UI, skip it: don't write a
  74: Commit everything this run wrote as one commit on the branch from step 2, with the
  77: Tell me: the branch and the commit, ...
  78: placed beside existing ones, whether `DESIGN.md` was written or skipped, ...
  read git diff day/2026-11-25 -- kit/setup/SKILL.md: §2 branch bullet, §2 Sources names
  ${CLAUDE_SKILL_DIR}/templates/, §3 DESIGN.md only with UI, §7 one commit, never push
# A5 — git diff --stat day/2026-11-25 (before the done commit, b53181d)
  BACKLOG.md | 1 + · CARD.md | 89 · kit/setup/SKILL.md | 29 · done/SKILL.md | 9 · park/SKILL.md | 5
  frontmatter: grep '^[-+](---|name:|description:)' on the three skills' diff → 0
# A5 — ci on PR #34: UNTESTED at this commit; the run's result is recorded on the PR (no push after green)
# Local, card/T-0017 at b53181d
  pnpm test        Test Files 30 passed (30) · Tests 154 passed (154)
  pnpm lint        exit 0
  pnpm typecheck   exit 0 (tsc --build)
  pnpm exec prettier --check (5 touched files)  All matched files use Prettier code style!
```
