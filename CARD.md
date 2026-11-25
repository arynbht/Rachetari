# T-0019 · fix(shell): ask to approve only needs-you drafts

Status: draft <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0019 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Approve only needs-you drafts · Gate: needs you

## Why

Today every card with `Status: draft` is an `approve` item in Now's Needs you, counts in the sidebar badge and raises a notification. On the line a `low` draft is set ready by its drafter and only a `needs you` draft waits on the owner, so the shell asks the owner to approve cards that were never theirs to approve. Only a draft whose `Created:` line says `Gate: needs you` should ask.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `parseCard` reads a `gate` from the `Created:` line's `Gate:` field (`"needs you"`, `"low"`, or null when there is none); a `Gate:` anywhere else in the card is ignored · check: `pnpm exec vitest run apps/desktop/src/main/engine/approve-gate.test.ts`, test "reads Gate from the Created line, and only from there"
- [ ] A2: `needsYouItems` lists an `approve` item only for a `draft` card whose gate is `needs you` (trimmed, any case); a draft gated `low`, a draft with no `Gate:` and a non-draft gated `needs you` raise no `approve` item · check: same file, test "asks to approve only a draft whose gate is needs you"
- [ ] A3: `NowHub` notifies (`onNew`) and counts in the badge only the `needs you` draft: a `low` or ungated draft arriving after the first read raises nothing and leaves the badge unchanged · check: same file, test "notifies and counts only a needs-you draft"
- [ ] A4: The kit fixture's T-0004 and `home.e2e.ts`'s pushed T-0013 carry `Gate: needs you`, so Home still reads "4 waiting on you" and T-0013 still raises "T-0013 needs you: approve the card" · check: `pnpm --filter @arynbht/rivetari-desktop e2e` tests "Home shows each repo's live cards, what needs you, its stage and last night" and "the sidebar counts what waits, and a new item raises a notification that opens it" in `apps/desktop/e2e/home.e2e.ts` (runs in CI's desktop-e2e); `git diff origin/day/2026-11-25 -- apps/desktop/e2e/home.e2e.ts` shows only T-0013's `gate` added
- [ ] A5: Nothing else moves: every other existing test passes unchanged, and lint, typecheck and `ci` are green · check: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter @arynbht/rivetari-desktop typecheck`, `git diff --stat origin/day/2026-11-25` (only the files below), `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/kit/parse.ts`
- `apps/desktop/src/main/engine/now.ts`
- `apps/desktop/test/kit-fixture.ts` (a `gate` option on `CardSpec`, written on the `Created:` line; T-0004 gets `needs you`)
- `apps/desktop/e2e/home.e2e.ts` (T-0013's `cardText` gets `gate: "needs you"`; nothing else)
- `apps/desktop/src/main/engine/approve-gate.test.ts` (new)
- `CARD.md`, `cards/done/T-0019.md`, `BACKLOG.md` (Parked lines only)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- The kit's `/card` skill and `cards/TEMPLATE.md` writing a `Gate:` line: a kit card of its own (park it)
- `shared/ipc.ts`, `main/index.ts`, `Now.tsx` and Tasks: the `NeedsYouItem` kinds, the approve wording and showing the gate in a card's record stay as they are
- T-0018's done, drafting and broken branches and its `merge` notification rule

## Constraints

- No new dependencies.
- Still read-only: no git call that writes.
- The gate is read from the `Created:` line only, through the existing `field` helper's `·`-separated layout; no other line of the card can set it.
- `Card` gains `gate: string | null`; `TaskCard` in `shared/ipc.ts` is not changed.
- Every existing test other than `home.e2e.ts` passes without an edit; `now.test.ts` and `source.test.ts` are not touched.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development` — a behaviour change in the parser and the Now adapter; write each criterion's failing test first

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0018 (both edit apps/desktop/src/main/engine/now.ts). Don't start until T-0018 has merged into `day/2026-11-25`; then merge the day branch into `card/T-0019` (no rebase) before the first edit.
- If any existing test other than `home.e2e.ts` fails because of the change.
- If the gate needs `shared/ipc.ts` or the renderer to change.

## Next step

Wait for T-0018 to merge and the owner to mark this ready; then start with A1: write "reads Gate from the Created line, and only from there" in `approve-gate.test.ts` and watch it fail.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Approve keys off the parsed `gate`, not a text match on the card, so `needsYouItems` alone decides; `NowHub` notifies and counts whatever `needsYouItems` lists, so A3 follows from A2 without a change in the hub.
- 2026-11-25: The fixture's T-0004 gets the gate rather than the tests changing their counts, so `now.test.ts`, `source.test.ts` and Home's "4 waiting on you" stay as they are.
- 2026-11-25: The new tests go in a new file, `approve-gate.test.ts`, with its own small fake watcher, so no existing test file is edited except `home.e2e.ts`.

## Questions for me

- [ ] Should a draft with no `Gate:` line (what the kit's `/card` writes today) raise nothing? Recommended: yes. It still shows under Tasks' Draft; the session parks a `[product]` line for `/card` and the template to write the gate.
- [ ] Should only the exact value `needs you` (trimmed, any case) ask for approval, with `low`, a typo or any other value raising nothing? Recommended: yes; a mistyped gate then fails quiet, as an ungated draft does.
- [ ] May the parser's `Card` type gain `gate: string | null` (main-process only; `TaskCard` in `shared/ipc.ts` unchanged, so the record view doesn't show it)? Recommended: yes.
- [ ] Editing the existing `home.e2e.ts` (T-0013 gains `gate: "needs you"`) and the shared `test/kit-fixture.ts` (T-0004 gains the gate): approve? Recommended: yes; without it the existing notification test would no longer see an approve.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
```
