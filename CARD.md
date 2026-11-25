# T-0017 · fix(kit): settle the kit trial's gaps in /setup, /done and /park

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0017 · Held by: nobody
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
- [ ] A2: `/done`, when it sets the card `done`, removes that card's own line from "Next up" in `BACKLOG.md`, matched by the card's `Source:`; if not exactly one line matches it removes none and says so in its report · check (reading, local): the same diff, read the step
- [ ] A3: `/park` commits its line on its own: only `BACKLOG.md`, message `chore(park): <what>`, no push; on the default branch it leaves the line uncommitted and says so · check (reading, local): `git diff day/2026-11-25 -- kit/setup/templates/skills/park/SKILL.md`
- [ ] A4: `/setup` says which branch it works on (the current branch unless it is the default branch, else a new `chore/kit-setup` from it) and that it commits its output there as one commit and never pushes; it writes `DESIGN.md` only when the repo has UI and otherwise skips it and says so in its report; and it names its templates folder as `${CLAUDE_SKILL_DIR}/templates/` · check (local): `grep -n 'CLAUDE_SKILL_DIR\|branch\|commit\|DESIGN.md' kit/setup/SKILL.md`, and read `git diff day/2026-11-25 -- kit/setup/SKILL.md`
- [ ] A5: Nothing else in the three skills changes (frontmatter and untouched steps as they were), and `ci` is green on the PR · check: `git diff --stat day/2026-11-25` lists only files in scope; `gh pr checks` (CI runs every job here: `kit/` is outside every workspace package)

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
- Queue cards 4e and 4g edit the same `/setup` and `/done` files; if either has landed on the day branch first, stop and rebase onto it before editing

## Next step

Read the six findings in `docs/kit-trial-2026-11-25.md`, then edit `/done` (A1, A2) first.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Owner ruling: files under `kit/` are this repo's product, not agent config; agent config is `.claude/**`, `CLAUDE.md` and anything under `~/.claude` — so this card is `low` and leaves the installed copies out of scope
- 2026-11-25: Drafter's defaults, for the owner to overrule: `/setup` branch rule and single commit (A4), `/park` commits only `BACKLOG.md` without pushing (A3), `/done` matches its Next up line by `Source:` (A2)
- 2026-11-25: Finding 1 (headless `/setup` can't write `.claude/`) left out — no bullet in §4a covers it and it stays parked
- 2026-11-25: `/setup`'s three fixes kept as one criterion (A4), matching §4a's single bullet, so the card stays at five criteria

## Questions for me

- [ ] None.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC):
