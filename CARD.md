# T-0003 · chore: install the kit on this machine and run /setup on this repo

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0003 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt, phase 1 step 4

## Why

The kit is in the repo but not installed anywhere, so nothing uses it yet. From the next
card on, this build is meant to run on its own kit: cards from `/card`, parked lines in
`BACKLOG.md`, the session rules in `CLAUDE.md`.

## Acceptance criteria

- [ ] A1: The kit is installed as the README says: `kit/setup/` is at `~/.claude/skills/setup/`, identical to the repo copy · check: `diff -r kit/setup ~/.claude/skills/setup`
- [ ] A2: `/setup` ran on this repo and wrote, without overwriting anything: `BACKLOG.md`, `cards/TEMPLATE.md`, `nights/`, the `CLAUDE.md` section, `.claude/skills/{card,park,done,handoff}/SKILL.md`, the `BACKLOG.md merge=union` line in `.gitattributes`, and draft `DESIGN.md` and `CONSTRAINTS.md` · check: `git diff --stat` and `diff` of each copied file against `kit/setup/templates/`
- [ ] A3: "Repo checklist" in `BACKLOG.md` has a `Stage:` line and one line per check, grouped by stage, each with a check that was run and its result · check: read `BACKLOG.md`
- [ ] A4: A fresh Claude Code session on this machine lists `setup` among its skills, and in this repo lists `card`, `park`, `done` and `handoff` · check: `claude -p` asking for the skill names
- [ ] A5: CI passes · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `BACKLOG.md`, `CLAUDE.md`, `DESIGN.md`, `CONSTRAINTS.md`
- `cards/TEMPLATE.md`, `nights/.gitkeep`
- `.claude/skills/{card,park,done,handoff}/SKILL.md`
- `.gitattributes` (the union-merge line only)
- `.prettierignore` (to keep copied kit files as written)
- `CARD.md`, `cards/done/T-0003.md`
- Outside the repo: `~/.claude/skills/setup/`

## Out of scope

- Area skills: `skills/` doesn't exist until phase 3, so `/setup` installs none
- Fixing anything `/setup` finds failing (it seeds "Next up"; it never edits code)
- Changing the kit's wording (park it)

## Constraints

- No new dependencies.
- `/setup` overwrites nothing: an existing different file gets a `name.kit.md` beside it.

## Skills

None. No area skills are installed yet.

## Stop and ask

Besides the standing list in CLAUDE.md:

- `/setup` would overwrite an existing file

## Next step

Copy `kit/setup/` to `~/.claude/skills/setup/`, then follow its SKILL.md on this repo.

## Decisions

Appended by the session, one line each, newest last.

## Questions for me

- [ ] (none)

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
<commands and results>
```
