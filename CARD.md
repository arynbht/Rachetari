# T-0071 · docs(kit): park only outside scope, and reviewers judge what a fix broke nearby

Status: draft
Branch: card/T-0071 · Held by: nobody
Created: 2026-11-26 · Source: breathband-console pilot (raw log 17:45, 03:24; `improvements-and-reports.md` T-0124) · Gate: needs you (agent config: `CLAUDE.md`, `.claude/agents/inspector.md`)

## Why

On the pilot, T-0134's builder parked a wrong deploy command in a file that was in its own scope instead of fixing it, which cost a fix round. The kit's rule 3 says "park everything else", and builders read that as "anything not asked for". Two of three fix rounds fixed one data-loss path and opened a neighbouring one (T-0124's Settings race). Only a reviewer who looked beyond the finding caught it. And T-0111's "MUST FIX BEFORE DEPLOY" merged because the reviewer filed it as advice.

## Acceptance criteria

- [ ] A1: Rule 3 in the kit's CLAUDE section and in this repo's `CLAUDE.md` says to park only what lies outside "Files in scope", and to fix a defect inside "Files in scope" when it is in the lines the card touches or blocks a criterion · check: `git diff` of both files shows the same new wording
- [ ] A2: `.claude/agents/inspector.md` "Judging" says a finding that must be fixed before deploy, merge or demo is BLOCKING, and that inspecting a fix round includes reading the code next to the fix for anything the fix broke · check: read the diff
- [ ] A3: Kit tests still pass · check: `pnpm vitest run kit/` and `pnpm format`

## Files in scope

- `kit/setup/templates/CLAUDE-section.md` (changed)
- `CLAUDE.md` (changed)
- `.claude/agents/inspector.md` (changed)
- `CARD.md`

## Out of scope

- Rule 8's and line 1's Rivetari wording and `skills/park/SKILL.md` (Next up 3 owns them; builders on the pilot kept looking for a `/rivetari` skill because of them, raw log 02:41).
- `builder.md` and `drafter.md`.
- Night-mode rules in SCOPE.md (T-0070).

## Constraints

- Keep each rule's existing number; the shell and skills cite rules by number.

## Skills

## Stop and ask

Besides the standing list in CLAUDE.md:

- Any wording change beyond rule 3 and the inspector's "Judging" section.

## Next step

Owner: mark ready (agent config). Then build A1–A2 and run A3.

## Decisions

## Questions for me

## Parked

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```

```
