# T-0012 · feat: transplant the Map tab and its fence

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0012 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt §6.2 (Map row) and phase 4.7; inventory/shell-views.md Area 7
Stacked on: card/T-0011 (PR #29)

## Why

A repo that has a map at `floorplan/index.html` can't be looked at from the shell: the Map
tab is a placeholder and the frame refuses every webview. Rivetari's Map showed the map in
a fenced webview, blocking every request outside `floorplan/`; this card brings it over.

## Acceptance criteria

- [ ] A1: `engine/map.ts` and `RepoMap.tsx` are copied verbatim and cut in the next commit; `map-fence.test.ts` comes over unchanged · check: `git show --stat`, `EXTRACTED.md`
- [ ] A2: The Map shows `floorplan/index.html` whenever it exists, in the fenced webview: every request outside `floorplan/` is blocked and listed, every permission refused · check: `map-fence.test.ts`; the e2e test
- [ ] A3: With no map, the tab says no map has been drawn for this repo yet; nothing reads the profile's `floorplan: true` · check: the e2e test, `git grep floorplanOn`
- [ ] A4: The frame's "refuse every webview" stopgap (D-11) is replaced by the source's attach check · check: `main/index.ts` diff
- [ ] A5: CI passes on Ubuntu and Windows, desktop e2e included · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/engine/map.ts`, `map-fence.test.ts`, `apps/desktop/src/renderer/components/RepoMap.tsx`, `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/shared/ipc.ts`
- `apps/desktop/e2e/*.e2e.ts`, `apps/desktop/test/kit-fixture.ts`, `docs/screenshots/T-0012/*.png`
- `EXTRACTED.md`, `BACKLOG.md`, `DECISIONS.md`, `SHELVED.md`, `CARD.md`, `cards/done/T-0012.md`

## Out of scope

- The map generator (floorplan skill): left behind; shelved as S-05

## Constraints

- No new dependencies.

## Skills

None.

## Stop and ask

Besides the standing list in CLAUDE.md:

- The fence would have to loosen (tonight: shelve it)

## Next step

Copy `map.ts`, `RepoMap.tsx` and `map-fence.test.ts` verbatim, then cut.

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
