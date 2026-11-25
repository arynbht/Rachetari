# T-0028 · docs(shell): a static prototype of the Tasks overhaul

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0028 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Tasks overhaul 1: design only · Gate: needs you

## Why

The Tasks view shows seven equal columns, then the selected card's record stacked below the board, so the board and the record never fit on one screen. It also doesn't say how full each stage is against the line's limits, or which cards wait on the owner. Before Tasks overhaul 2 changes the real view, the owner wants to see the proposed design on the fixture: a static prototype and screenshots to pick from, with one alternative layout. The real Tasks view doesn't change.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `docs/prototypes/T-0028/index.html` opens from disk with no build, no server and no network. It shows the kit fixture's cards (`apps/desktop/test/kit-fixture.ts`, copied by hand into the prototype's data) on a board with Draft, Ready, In progress, Blocked and PR open columns, and Next up and Done as collapsed rails with counts. Column headers show load against the line's limits: "Draft + Ready 1/5" across the two columns, "In progress 1/2", "PR open 0/3"; Blocked shows a count only. Done shows the latest five and a "History" link (inert in the prototype) · check: `node docs/prototypes/T-0028/shoot.mjs` from the repo root writes `docs/screenshots/T-0028/1-board.png`, and look at it. The script exits non-zero if the page requests anything that isn't a `file://` URL, logs a console error, or has a serious or critical axe violation (axe-core from `apps/desktop/node_modules`, as in `e2e/helpers.ts`)
- [ ] A2: Selecting a card, by click or by arrow keys and Enter, collapses the board to a narrow grouped list on the left and opens the record on the right. The record has a fixed header (id, title, status, held by, next step, PR), then any open questions pinned first, then Card, Evidence and Commits tabs. Escape returns to the full board with focus on the card that was open · check: the script drives the keys to T-0003 and writes `2-selected.png`, opens T-0005 (blocked, open question "Round half up or half even?") and writes `3-blocked-question.png`, and exits non-zero unless Escape brings the full board back and the tabs switch with the arrow keys
- [ ] A3: A "Needs me" filter keeps only the cards waiting on the owner: T-0004 (a draft gated `needs you`), T-0005 (an open question) and T-0006 (can't be read) · check: the script turns it on, exits non-zero unless exactly those three are shown, and writes `5-needs-me.png`
- [ ] A4: `index.html?done=20` shows the board with 20 done cards in all: the Done rail reads 20, five are listed, and the board is no taller than in `1-board.png` · check: the script writes `4-done-20.png` and exits non-zero unless the rail lists exactly five
- [ ] A5: One alternative layout, `index.html?layout=list`: the grouped list always on the left with load headers, and the record (or "Pick a card") on the right, so selecting a card never reflows the page. The real Tasks view, the engine and the IPC don't change, and the PR is docs only · check: the script writes `6-alt-board.png` and `7-alt-selected.png`; `git diff --stat origin/day/2026-11-25...HEAD` lists only the files in scope; `node scripts/ci-scope.mjs origin/day/2026-11-25` prints `nothing to check: the diff is docs only`, so `ci` runs only `changes` and `secret-scan` and must be green (`gh pr checks`). The screenshots are made locally by the builder and committed; CI doesn't make them. Local: `pnpm exec eslint docs/prototypes/T-0028` and `pnpm exec prettier --check docs/prototypes/T-0028 CARD.md BACKLOG.md` pass
- [ ] A6: The prototype uses the shell's own stylesheet and theme tokens (the built renderer CSS, not hand-written CSS) at the shell's window size, 1140×780, so the screenshots look like the real app · check: `shoot.mjs` loads the shell's CSS (path named in Evidence) and sets the 1140×780 viewport; compare a screenshot with the real Tasks view's
- [ ] A7: The seven screenshots include: the full board with 20 done cards; a card selected; a blocked card with two open questions; the "needs me" filter on; and both layouts showing the same card, for a direct comparison · check: the seven PNGs under `docs/screenshots/T-0028/`, each named for what it shows
- [ ] A8: Once the screenshots are pushed, a link to the folder sits at the top of `docs/open-questions.md` on `develop` with one question: which layout, and what to change (the foreman writes it; the builder reports the folder link) · check: the file on `develop`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `docs/prototypes/T-0028/index.html` (new: the page, its CSS and its behaviour)
- `docs/prototypes/T-0028/fixture.js` (new: the fixture's cards as data, a classic script)
- `docs/prototypes/T-0028/shoot.mjs` (new: the Playwright script) and, if it needs one, `docs/prototypes/T-0028/main.mjs` (new: the minimal Electron main it launches)
- `docs/screenshots/T-0028/*.png` (new, seven files)
- `CARD.md`, `BACKLOG.md` (Parked lines only: on the line, cards never edit Next up)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Any change under `apps/` (`Tasks.tsx`, `engine/tasks.ts`, `shared/ipc.ts`, the e2e tests): that is Tasks overhaul 2, after the owner picks a design
- Reading the limits, the gate or "needs me" from the repo, a light theme, or a "mark ready" button (the Shell action card)
- The History view, and any change to the line's limits or to `docs/queue-2026-11-25.md`

## Constraints

- No new dependencies and no browser download. The script loads `@playwright/test`, `electron` and `axe-core` from `apps/desktop/node_modules` (`createRequire` on `apps/desktop/package.json`) and drives Electron through Playwright's `_electron`, as the e2e tests do.
- No IPC, no file source, no Tailwind build. Copy the shell's dark-theme tokens from `apps/desktop/src/renderer/index.css` into hand-written CSS, and use the shell's system font.
- Classic `<script>` tags only: Chromium blocks module scripts from `file://`. Browser globals go in a `/* global … */` comment in the file, with no ESLint config change.
- Screenshots at 1140×780 (the shell's default window), dark theme, full page.
- The prototype's limits are constants with a comment naming `docs/queue-2026-11-25.md` §The line.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `ui/frontend-design` — the card is a UI design: layout, type, hierarchy, then a critique pass before the screenshots

## Stop and ask

Besides the standing list in CLAUDE.md:

- If the prototype or the script needs any file outside "Files in scope": a `package.json` script, an ESLint, Prettier, Tailwind or tsconfig change, or anything under `apps/`
- If Playwright can't launch the desktop's Electron from the script without a new dependency or a browser download

## Next step

Draft, waiting on the owner (needs you: the spec's gate). Once ready, start with A1: `fixture.js` from `apps/desktop/test/kit-fixture.ts`, then the board in `index.html`.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `needs you`, as the spec says. Four new files plus seven screenshots, five criteria.
- 2026-11-25: Where the prototype lives: decided for the owner: a static HTML page with classic scripts under `docs/prototypes/T-0028/`, opened from disk. Nothing builds it, `electron-builder.yml` ships only `out/**`, and the PR stays docs only (alternative: a separate Vite page under `apps/desktop/prototype/` built by its own script, which would reuse the real components but needs a `package.json` script, its own Tailwind and tsconfig, and puts `apps/desktop` in CI's scope).
- 2026-11-25: The look: decided for the owner: hand-written CSS on the shell's dark tokens copied from `index.css` (alternative: compile Tailwind from the desktop config into a committed CSS file).
- 2026-11-25: The data: decided for the owner: the kit fixture's cards and Next up lines copied by hand into `fixture.js`, with commits and times as constants; `?done=20` makes 20 done cards in all, T-0001, T-0002 and 18 made up (alternative: the fixture's two plus 20, 22 in all).
- 2026-11-25: The screenshots: decided for the owner: Playwright's `_electron` on the desktop's own Electron, at the shell's 1140×780 window, with the script asserting each state and failing on network requests, console errors or axe violations (alternative: Playwright's Chromium, which needs a browser download whose revision may not be on every machine).
- 2026-11-25: The loads: decided for the owner: Draft and Ready share one "Draft + Ready n/5" header; In progress n/2; PR open carries the inspection cap, n/3; Blocked shows a count only (alternative: no limit on PR open, since a PR waiting on `ci` holds no inspection slot).
- 2026-11-25: The inspection cap: decided for the owner: 3, as §The line's Inspection rule and the foreman's brief say (alternative: 2, from §The line's Limits rule; the mismatch is parked).
- 2026-11-25: "Needs me": decided for the owner: drafts gated `needs you`, cards with an open question, and cards that can't be read (alternative: open questions only).
- 2026-11-25: Keys: decided for the owner: on the board, Left and Right move between columns, Up and Down within one, Enter opens; in the collapsed list, Up and Down open each card in turn; Escape returns to the board with focus on the card that was open (alternative: Up and Down only move focus in the list, and Enter opens).
- 2026-11-25: Rails: decided for the owner: the Next up rail shows its count and expands in place on click; the Done rail always lists the latest five, one line each, with its count and the History link (alternative: each rail opens its own view, Backlog or History).
- 2026-11-25: The alternative layout: decided for the owner: an always-two-pane grouped list with the record, `?layout=list`. At 1140 px, five columns and two rails leave each card about 180 px, titles wrap to three lines, and the page reflows on every selection; the list keeps titles on one line and never reflows (alternative: lanes, one row per status).
- 2026-11-25: Owner (19:40:30): approved with three additions (A6–A8). The base branch is now `develop`, not `day/2026-11-25`. Set ready by the foreman.

## Questions for me

- [x] Approve the card as drafted? — Owner, 19:40:30: yes, with three additions: the shell's own stylesheet and theme tokens at 1140×780; the seven screenshots include the full board with 20 done cards, a card selected, a blocked card with two open questions, the "needs me" filter on, and both layouts showing the same card; once pushed, a link to the folder at the top of docs/open-questions.md with one question: which layout, and what to change. (A6–A8 added; the drafter's "CSS written by hand" decision is replaced by A6.)
      None.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  approval         19:36:09 → 19:40:30   4 min 21 s
  draft 19:31:25 →
```
