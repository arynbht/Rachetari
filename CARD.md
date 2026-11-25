# T-0011 · feat: transplant History and the Docs viewer, re-pointed at the files

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0011 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt §6.2 (History row) and phase 4.6; inventory/shell-views.md Area 6
Stacked on: card/T-0010 (PR #27)

## Why

Finished cards and night reports are the repo's record, and its docs are how it explains
itself, but the shell can show neither. Rivetari's History showed closed tasks with
filters and the repo's docs; this card keeps both and points them at `cards/done/` and
`nights/`.

## Acceptance criteria

- [ ] A1: `History.tsx`, `Docs.tsx`, `lib/markdown.ts`, `engine/docs.ts` and the engine's `paths.ts` (with its test) are copied verbatim and cut in the next commit; `docs-tasks.test.ts` comes over unchanged · check: `git show --stat`, `EXTRACTED.md`
- [ ] A2: History lists the closed cards from `cards/done/` (task, outcome, PR, closed) with the source's filter buttons, and a click opens the card in Tasks · check: the e2e test and a screenshot
- [ ] A3: History lists the night reports, and each opens and renders · check: the e2e test
- [ ] A4: The Docs viewer is kept exactly as it is: the same globs, the contained read (no symlink escape) and the sanitized render · check: `docs-tasks.test.ts` and `paths.test.ts` unchanged and passing; the e2e test renders a doc
- [ ] A5: No spend, cost trend, judge findings or cost flags remain · check: `git grep`
- [ ] A6: CI passes on Ubuntu and Windows, desktop e2e included · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/renderer/components/{History,Docs}.tsx`, `apps/desktop/src/renderer/lib/markdown.ts`, `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/main/engine/{docs,paths,history}.ts` and their tests, `apps/desktop/src/main/kit/*.ts`
- `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/shared/ipc.ts`, `apps/desktop/package.json`, `pnpm-lock.yaml`
- `apps/desktop/e2e/*.e2e.ts`, `apps/desktop/test/kit-fixture.ts`, `docs/screenshots/T-0011/*.png`
- `EXTRACTED.md`, `BACKLOG.md`, `DECISIONS.md`, `SHELVED.md`, `CARD.md`, `cards/done/T-0011.md`

## Out of scope

- The known Docs gaps (the loading text, in-page anchors): parked
- PR links (they need the shelved sign-in card, S-16)

## Constraints

- No dependency the source didn't have, at the source's version.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `ui/frontend-design` — the History layout, kept to the source's look

## Stop and ask

Besides the standing list in CLAUDE.md:

- The Docs viewer's behaviour would have to change (tonight: shelve it)

## Next step

Push, open the draft PR, wait for CI, run the done check.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Card written and set ready by the session (D-06)
- 2026-11-25: Docs keeps its `.rivetari/**/*.md` glob: dropping it would change a kept feature, and the owner's rule takes the smallest cut that keeps behaviour
- 2026-11-25: The e2e test caught a bug of this card's own: the night-date regex lost its backslashes when written by a script; fixed before commit
- 2026-11-25: Docs renders task-list checkboxes without labels (axe critical); a fix changes a kept component, so it is shelved (S-18, #28) with a test.fixme in its place

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
