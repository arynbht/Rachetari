# T-0009 · feat: transplant the Tasks view, re-pointed at the cards

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0009 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt §6.2 (Tasks rows) and phase 4.4; inventory/shell-views.md Area 4
Stacked on: card/T-0008 (PR #25)

## Why

Tasks is where every card stands, on every machine's branches, and where one card is
read in full. Rivetari's Tasks read the task runtime; this card points its board, list
and record at the cards, the backlog's "Next up" and `cards/done/`.

## Acceptance criteria

- [ ] A1: `Tasks.tsx` is copied verbatim and cut in the next commit, logged in `EXTRACTED.md`; `TaskRecord.tsx` is not copied (about 4% would survive) and the record is written new · check: `git show --stat`, `EXTRACTED.md`
- [ ] A2: The Board/List toggle and its memory are kept; the board's columns are Next up · Draft · Ready · In progress · Blocked · PR open · Done; the list's columns are Task, Status, Held by, Branch, Updated; an unreadable card is shown with its branch · check: unit tests of the column mapping; the e2e test
- [ ] A3: Picking a card opens its record: summary (id, title, status, branch, held by, next step), card (why, criteria each marked ticked, unticked or UNTESTED, files in scope, out of scope, constraints), skills, decisions, questions, evidence (collapsible) and the commits on its branch · check: the e2e test and a screenshot
- [ ] A4: "Open in Tasks" from Now opens that card's record · check: the e2e test
- [ ] A5: Every request is checked against the registered repos; the view only reads · check: the handlers go through `registered()`; `git grep` for writes in the new source functions
- [ ] A6: CI passes on Ubuntu and Windows, desktop e2e included · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/renderer/components/Tasks.tsx`, `apps/desktop/src/renderer/App.tsx`, `apps/desktop/src/renderer/lib/*.ts`
- `apps/desktop/src/main/engine/tasks.ts` (new), `apps/desktop/src/main/engine/now.ts`, `apps/desktop/src/main/kit/*.ts`, their tests
- `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/shared/ipc.ts`
- `apps/desktop/e2e/*.e2e.ts`, `apps/desktop/test/kit-fixture.ts`, `docs/screenshots/T-0009/*.png`
- `EXTRACTED.md`, `BACKLOG.md`, `DECISIONS.md`, `SHELVED.md`, `CARD.md`, `cards/done/T-0009.md`

## Out of scope

- The answer form and any write (phase 7); the pull request section (needs the shelved sign-in, S-16)
- Checklist, History and Map (their own cards)

## Constraints

- No new dependencies.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development` — the column mapping and the record's data are tested before they're wired
- `ui/frontend-design` — the record's layout, kept to the source's look

## Stop and ask

Besides the standing list in CLAUDE.md:

- A kept behaviour of the board or list would have to change (tonight: shelve it)

## Next step

Push, open the draft PR, wait for CI, run the done check.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Card written and set ready by the session (D-06)
- 2026-11-25: TaskRecord.tsx is not copied; its Field and Part are, into Tasks.tsx (EXTRACTED.md)
- 2026-11-25: Unreadable and unknown-status cards go under Blocked; Tasks reads the hub's snapshot (D-16, D-17)

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
