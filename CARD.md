# T-0013 · feat: bring back Home, the sidebar's badges and the OS notifications

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0013 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt §6.2 (Home, Sidebar, Notifications rows) and phase 4.8; inventory/shell-views.md Area 2; inventory/shell-main.md Area D
Stacked on: card/T-0012 (PR #30)

## Why

The owner works across several repos and machines. Home, the sidebar's counts and the OS
notifications are how the shell says something waits without being watched; all three are
placeholders or missing since the frame.

## Acceptance criteria

- [ ] A1: `Home.tsx` and `engine/home.ts` are copied verbatim and cut in the next commit; the badge and notification code comes back from the source's `App.tsx` and `main/index.ts` · check: `git show --stat`, `EXTRACTED.md`
- [ ] A2: Home has one card per repo with the totals header and Refresh; each card shows its live cards (`id · status · held by`), up to three needs-you items then "and N more", the stage, and the last night (date, merged and held counts); it follows the watcher between reads · check: the e2e test and a screenshot
- [ ] A3: Each sidebar repo shows how many items wait on the owner (hidden at 0) · check: the e2e test
- [ ] A4: A needs-you item that appears while the app runs raises an OS notification (never one already waiting at launch); clicking it opens the repo on Now with the item in view; it is withdrawn when the item clears · check: the e2e test through the source's E2E notification seam, and the hub's priming unit test
- [ ] A5: No spend, posture gate, autonomy or CI is shown (CI waits for the shelved sign-in card) · check: `git grep`
- [ ] A6: CI passes on Ubuntu and Windows, desktop e2e included · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/renderer/components/{Home,Now}.tsx`, `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/main/engine/{home,now}.ts` and their tests
- `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/shared/ipc.ts`
- `apps/desktop/e2e/*.e2e.ts`, `apps/desktop/test/kit-fixture.ts`, `docs/screenshots/T-0013/*.png`
- `EXTRACTED.md`, `BACKLOG.md`, `DECISIONS.md`, `SHELVED.md`, `CARD.md`, `cards/done/T-0013.md`

## Out of scope

- CI on Home (the shelved sign-in card, S-16); the single-instance lock and silent Add errors (parked)

## Constraints

- No new dependencies.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `ui/frontend-design` — Home's layout, kept to the source's look

## Stop and ask

Besides the standing list in CLAUDE.md:

- Notifications would fire for items already waiting at launch (tonight: shelve it)

## Next step

Push, open the draft PR, wait for CI, run the done check.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Card written and set ready by the session (D-06)
- 2026-11-25: Home's data is each repo's Now state (NowState gains its live cards), so Home follows the same watcher pushes
- 2026-11-25: Earlier e2e tests of mine (frame, now) updated for the built Home and the sidebar badge

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
