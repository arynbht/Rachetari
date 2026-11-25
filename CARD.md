# T-0010 · feat: turn Posture into the Checklist view

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0010 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt §6.2 (Checklist row) and phase 4.5; inventory/shell-views.md Area 5
Stacked on: card/T-0009 (PR #26)

## Why

The repo checklist in `BACKLOG.md` says what must stay true and which stage the repo is
at, but the shell can't show it. Rivetari's Posture tab showed a 111-control catalog
through the same kind of grouped, collapsible list; this card keeps that list and points
it at the checklist.

## Acceptance criteria

- [ ] A1: `Posture.tsx` and `lib/status.ts` are copied verbatim and cut in the next commit; `Posture.tsx` becomes `Checklist.tsx` (the tab was renamed by the build prompt) · check: `git show --stat`, `EXTRACTED.md`
- [ ] A2: Checklist shows the stage and what decides it, a totals strip, the lines grouped by stage in collapsible groups (a group with a failing or unchecked line starts open), each line with its status and its check command, and when `/setup` last ran · check: the e2e test on the fixture and a screenshot
- [ ] A3: Reload reads `BACKLOG.md` again, and only the latest read lands · check: the e2e test
- [ ] A4: No run audit, phase gates, trend, waivers, evidence, card drafting or selection bar remain · check: `git grep`
- [ ] A5: With no `BACKLOG.md` or no "Repo checklist", the view says to run `/setup` · check: a unit test of the reader and the e2e test
- [ ] A6: CI passes on Ubuntu and Windows, desktop e2e included · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/renderer/components/Checklist.tsx` (from `Posture.tsx`), `apps/desktop/src/renderer/lib/status.ts`, `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/main/engine/checklist.ts` (new) and its test, `apps/desktop/src/main/kit/*.ts`
- `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/shared/ipc.ts`
- `apps/desktop/e2e/*.e2e.ts`, `apps/desktop/test/kit-fixture.ts`, `docs/screenshots/T-0010/*.png`
- `EXTRACTED.md`, `BACKLOG.md`, `DECISIONS.md`, `SHELVED.md`, `CARD.md`, `cards/done/T-0010.md`

## Out of scope

- Adding selected gaps to "Next up" (phase 7)
- Running any check from the shell (the checklist records `/setup`'s results)

## Constraints

- No new dependencies.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `ui/frontend-design` — the list's layout, kept to the source's look

## Stop and ask

Besides the standing list in CLAUDE.md:

- A kept behaviour of the list (collapsing, totals, reload guard) would have to change (tonight: shelve it)

## Next step

Copy `Posture.tsx` and `lib/status.ts` verbatim, then cut.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Card written and set ready by the session (D-06)

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
