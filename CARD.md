# T-0008 · feat: transplant the Now view and its watcher, re-pointed at the files

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0008 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt §6.2 (Now rows) and phase 4.3; inventory/shell-views.md Area 3; inventory/shell-main.md Area C
Stacked on: card/T-0007 (PR #24)

## Why

Now is the shell's default view: what's running, what waits on the owner and what just
happened. Rivetari's Now read the task runtime. This card brings its watcher and view
across and points them at the file source, so a repo's cards show up live.

## Acceptance criteria

- [ ] A1: `engine/now.ts` and `Now.tsx` are copied verbatim and cut in the next commit, each logged in `EXTRACTED.md` · check: `git show --stat`, `EXTRACTED.md`
- [ ] A2: The watcher keeps its shape: every sidebar repo polled, the one on show every 2 s and the rest every 10 s, read-only, never fetching on its own; it primes on the first read so items already waiting aren't news · check: unit tests of the hub with a fake clock and source
- [ ] A3: Needs you lists, oldest first, cards to approve (`draft`), questions to answer (an open "Questions for me" line or `blocked`), cards held in the latest night report, and PRs waiting to merge (`done` with a PR number), each saying exactly what to do and where; unreadable cards are listed too · check: unit tests on the fixture repo; the e2e test
- [ ] A4: Running lists `in progress` cards with id, title, held by, the "Next step" line and the time since the branch's last commit; Recent lists up to 50 events, newest first, and a click opens the card in Tasks; the health card shows the stage with pass, fail and unchecked counts, the skills (count, and names on live cards) and the last night · check: the e2e test on the fixture, and a screenshot
- [ ] A5: No beat, route, judge, ledger, spend or autonomy text remains, and no `rivetari autonomy`, `/rivetari` or `rivetari task` · check: `git grep`
- [ ] A6: CI passes on Ubuntu and Windows, desktop e2e included · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/engine/now.ts`, `apps/desktop/src/main/kit/*.ts`, their tests
- `apps/desktop/src/renderer/components/Now.tsx`, `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/shared/ipc.ts`
- `apps/desktop/e2e/now.e2e.ts` (new), `apps/desktop/test/kit-fixture.ts`
- `docs/screenshots/T-0008/*.png`
- `EXTRACTED.md`, `BACKLOG.md`, `DECISIONS.md`, `SHELVED.md`, `CARD.md`, `cards/done/T-0008.md`

## Out of scope

- Badges and OS notifications (T-0013); CI on main (shelved with sign-in, S-16)
- The Tasks view the "Open in Tasks" links lead to (T-0009)
- Any write action (phase 7)

## Constraints

- No new dependencies.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development` — the projection and the hub are tested before they're wired
- `ui/frontend-design` — the view's text and layout, kept to the source's look

## Stop and ask

Besides the standing list in CLAUDE.md:

- A kept behaviour of the hub (intervals, priming, read-only) would have to change (tonight: shelve it)

## Next step

Copy `now.ts` and `Now.tsx` verbatim, then cut.

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
