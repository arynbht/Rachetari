# T-0058 · fix(kit): the rest of the kit says parked lines live in the card

Status: in progress
Branch: card/T-0058 · Held by: builder session
Created: 2026-11-25 · Source: BACKLOG Next up (follow-up to T-0052) · Gate: low

## Why

T-0052 moved parked lines into each card's `CARD.md`, with the merger appending them to `BACKLOG.md`. Four kit files still say sessions park straight into `BACKLOG.md`, so the kit contradicts itself. Two T-0052 lines are also wrapped past the width the rest of their file keeps.

## Acceptance criteria

Docs-only kit change: checks are greps, a read and prettier, which run on this PR.

- [ ] A1: `kit/setup/SKILL.md` no longer tells sessions to park into `BACKLOG.md`; the `merge=union` line and the `[checklist]` proposal text say the lines arrive in `BACKLOG.md` via the merger, from the card's "Parked" · check: `rg -n "BACKLOG.md|Parked" kit/setup/SKILL.md` and read lines 26 and 102
- [ ] A2: `/done` step 4 lists `CARD.md` and `cards/done/` as always allowed and drops `BACKLOG.md` from that list · check: `rg -n "always allowed" kit/setup/templates/skills/done/SKILL.md`
- [ ] A3: `CHECKLIST.md` intro says a `[checklist]` line parked in a card proposes a new line · check: `rg -n "checklist" kit/setup/templates/CHECKLIST.md` and read lines 9-10
- [ ] A4: Rule 3 in `CLAUDE-section.md` and step 5 in `handoff/SKILL.md` keep the same wording but wrap at the width of the rest of each file · check: `awk '{ if (length($0) > 90) print FILENAME": "FNR }' kit/setup/templates/CLAUDE-section.md kit/setup/templates/skills/handoff/SKILL.md` prints nothing for those lines
- [ ] A5: Prettier passes on the five files · check: `pnpm exec prettier --ignore-path= --check <the five files>` (`kit/**` is in `.prettierignore`)

## Files in scope

- `kit/setup/SKILL.md` (changed)
- `kit/setup/templates/skills/done/SKILL.md` (changed)
- `kit/setup/templates/CHECKLIST.md` (changed)
- `kit/setup/templates/CLAUDE-section.md` (changed)
- `kit/setup/templates/skills/handoff/SKILL.md` (changed)

## Out of scope

- This repo's own `.claude/` copies, `CLAUDE.md` and `BACKLOG.md`.
- Changing what T-0052 decided (no merge script, park line format unchanged).
- Rewording other lines in these files.

## Constraints

- No new dependencies.
- Follow the wording T-0052 settled in `cards/done/T-0052.md`.

## Skills

none

## Stop and ask

- If a kit test asserts the text of these lines.

## Next step

Start at A1: edit `kit/setup/SKILL.md` lines 26 and 102.

## Decisions

- 2026-11-25: Gate low — kit files are product, not agent config; five files, five criteria.
- 2026-11-25: Decided for the owner: wrap width taken as 90 columns at most, the width of the surrounding lines (alternative: 100).

## Questions for me

none

## Parked

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC): none

```
<commands and results>
```
