# T-0006 · feat: transplant the shell frame (window, sidebar, fence, tab bar, theme)

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0006 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt phase 4.1; inventory/shell-main.md Areas A, B, F; inventory/shell-views.md Area 1
Stacked on: card/T-0005 (PR #20)

## Why

The shell is the one place to see every repo's cards, but `apps/desktop` is an empty
package. This card brings the frame the views will sit in: the window, the sidebar with
the registered-repos fence, the tab bar and the theme, with every dropped feature cut
out. The tabs are empty until their own cards.

## Acceptance criteria

- [ ] A1: The frame files are copied verbatim in one commit and cut in the next, each logged in `EXTRACTED.md` · check: `git show --stat`, `EXTRACTED.md`
- [ ] A2: The tabs are Now · Tasks · Checklist · History · Map; each is an obvious placeholder naming the card that builds it; Settings holds only the theme; no update banner, Project tab, Anthropic key or AI preference remains · check: `git grep` for the dropped channels and text; the new e2e test
- [ ] A3: The registered-repos fence is unchanged and its unit test passes; `app-id.test.ts` passes · check: `pnpm test`
- [ ] A4: A new e2e test opens the built app on a fixture repo and checks the tab order, ←/→ and Home/End keys, and the theme setting · check: `pnpm --filter @arynbht/rivetari-desktop e2e` locally on Windows
- [ ] A5: The desktop typecheck and e2e return to CI (cut in T-0001 "until T-0006"), and CI passes on Ubuntu and Windows · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/**` (only the files listed in `EXTRACTED.md` for T-0006, plus new e2e specs and fixtures)
- `.github/workflows/ci.yml` (the desktop steps cut in T-0001, and nothing else)
- `pnpm-lock.yaml`, `eslint.config.js` (only if the renderer needs it), `.prettierignore`
- `docs/screenshots/T-0006/*.png` (evidence for the PR)
- `EXTRACTED.md`, `BACKLOG.md`, `DECISIONS.md`, `SHELVED.md`, `CARD.md`, `cards/done/T-0006.md`

## Out of scope

- Any view's content (T-0007 onwards); badges and notifications (T-0013)
- GitHub sign-in (shelved by the owner's rule)
- The known gaps parked from phase 0 (single-instance lock, silent Add errors)

## Constraints

- No dependency the source didn't have, at the source's version.
- Internal names stay (`window.rivetari`, `@arynbht/rivetari-desktop`).

## Skills

None.

## Stop and ask

Besides the standing list in CLAUDE.md:

- A cut changes a kept feature's behaviour (tonight: shelve it)

## Next step

Push, open the draft PR, wait for CI (desktop-e2e included), run the done check.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Card written and set ready by the session (D-06)
- 2026-11-25: Screenshots are committed under `docs/screenshots/<card>/` so the PR can show them (the API can't attach images)
- 2026-11-25: Copied tests that would need edits are dropped and listed; the salvage is shelved (D-10, S-17); sign-in is shelved (S-16)
- 2026-11-25: Until the Map card, every webview attach is refused (D-11)

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
