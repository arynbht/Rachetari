# T-0002 · docs: add the kit, SCOPE.md and the README

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0002 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt, phase 1 steps 2 and 3; Appendices A–I

## Why

The kit is the whole method: the card, the backlog, the session rules and the five
commands. Until its files are in the repo, exactly as the owner wrote them, nothing can
be installed or run, and the repo has no spec of its own.

## Acceptance criteria

- [ ] A1: The nine appendix files are at the paths the prompt names, byte-identical to the appendix text · check: each file read back against its appendix (the prompt isn't a file in the repo, so this check is by reading), plus `git diff --check` for stray whitespace
- [ ] A2: `README.md` says what this is and gives the per-machine install as two copies (`kit/setup/` → `~/.claude/skills/setup/`, `skills/` → `~/.claude/kit-skills/`) · check: read `README.md`
- [ ] A3: The old root drafts are gone: `SCOPE.md` is Appendix A and there is no root `CLAUDE-section.md` · check: `git ls-files SCOPE.md CLAUDE-section.md` and A1
- [ ] A4: CI passes, with the appendix files kept as written (prettier must not rewrite them) · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `SCOPE.md`, `README.md`
- `kit/setup/SKILL.md`, `kit/setup/templates/{CARD.md,BACKLOG.md,CLAUDE-section.md}`
- `kit/setup/templates/skills/{card,park,done,handoff}/SKILL.md`
- `.prettierignore` (to keep the appendix files as written)
- `CARD.md`, `cards/done/T-0002.md`

## Out of scope

- Installing the kit or running `/setup` (T-0003)
- `BACKLOG.md`, `CLAUDE.md` and `.claude/skills/` in this repo (written by `/setup` in T-0003)
- Any edit to the appendix wording, even an obvious improvement (park it)

## Constraints

- No new dependencies.
- Appendix text is copied exactly, not reformatted.

## Skills

None. The kit isn't installed until T-0003.

## Stop and ask

Besides the standing list in CLAUDE.md:

- An appendix contradicts another appendix or SCOPE.md in a way that blocks T-0003

## Next step

Write the nine appendix files, then the README.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: The old root `CLAUDE-section.md` is deleted and `SCOPE.md` replaced (owner: "Replace and delete")

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
