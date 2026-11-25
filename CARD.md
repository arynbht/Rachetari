# T-0020 · fix(shell): label the Docs viewer's task-list checkboxes

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0020 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §4b, `SHELVED.md` S-18, issue #28 · Gate: low

## Why

The Docs viewer renders every GFM task-list line (`- [x]` in `BACKLOG.md`, `CARD.md`, the
cards) as `<input type=checkbox disabled>` with no label, so axe reports a critical `label`
violation on History whenever a backlog or card is shown, and a screen reader announces
an unnamed checkbox. The owner chose option (a) of S-18: name each box in the existing
DOMPurify hook, and turn the shelved axe test back on. Closes #28.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: Every task-list checkbox the Docs viewer renders has an accessible name: `done` when ticked, `not done` when not. It stays a disabled checkbox with its ticked state, with no visual change · check: `pnpm --filter @arynbht/rivetari-desktop e2e e2e/history.e2e.ts`, new test "the Docs viewer names each task-list checkbox done or not done" (with the backlog showing in the Docs region, `getByRole("checkbox", { name: "done", exact: true })` and `{ name: "not done", exact: true }` each find at least one box, every box is disabled, the `done` ones are checked, the `not done` ones aren't, and their counts add up to all the checkboxes in the region); runs in CI's desktop-e2e
- [ ] A2: The shelved test runs again and passes: `test.fixme` becomes `test`, its body is unchanged, and the S-18 comment above it goes · check: same command, test "History passes axe with the Docs viewer showing a backlog" (its `runAxe(page)` returns `[]`), and `grep -rn "fixme" apps/desktop/e2e` prints nothing
- [ ] A3: Nothing else moves: links in docs still get `rel="noopener noreferrer"` and `target="_blank"`, every other existing test passes unchanged, and lint, typecheck and `ci` are green · check: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter @arynbht/rivetari-desktop typecheck`, `pnpm --filter @arynbht/rivetari-desktop e2e`, `git diff --stat origin/day/2026-11-25` (only the files below), `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/renderer/lib/markdown.ts`
- `apps/desktop/e2e/history.e2e.ts`
- `CARD.md`, `cards/done/T-0020.md`, `BACKLOG.md` (Parked lines only)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Option (b), rendering task items as ☑/☐ text, or restyling the checkboxes or the Docs viewer (`Docs.tsx`, `History.tsx`)
- Other axe findings on other pages, and salvaging `axe.e2e.ts` (that is §4c, S-17)
- `apps/desktop/test/kit-fixture.ts` (T-0019's file) and the `SHELVED.md` S-18 entry (the PR closing #28 is the record)

## Constraints

- No new dependencies (no jsdom or happy-dom, so the check is end-to-end, not a unit test of `markdown.ts`).
- The label goes in the existing `afterSanitizeAttributes` hook and touches only `input` nodes of type `checkbox`; the link handling in that hook stays as it is.
- The fixme test's body is not changed; only `test.fixme` → `test` and its shelved comment.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development` — a behaviour change with its failing checks already named: run the unshelved axe test and the new name test red before touching `markdown.ts`

## Stop and ask

Besides the standing list in CLAUDE.md:

- If, once the test runs, axe reports anything besides the `label` violation on task-list checkboxes.
- If the fixture's backlog has to change for a check to work (`test/kit-fixture.ts`, T-0019's file).
- If the label can't be set in the hook and needs a marked renderer override or a component change.

## Next step

Start with A2: change `test.fixme` to `test` in `history.e2e.ts`, run it, and see axe's `label` violation.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Turning the fixme test back on is a change to an existing test, but the owner's spec (§4b: "turn the fixme test back on") asks for exactly that, so it doesn't make the card `needs you`; with two code files and three criteria the card is `low`.
- 2026-11-25: The kept-component rule that shelved S-18 is settled by the owner choosing option (a) in §4b.
- 2026-11-25: The names are `done` and `not done`, as S-18's option (a) gives them — short, and they say the state the box shows.

## Questions for me

- [ ] (none)

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened, its body saying `Closes #28`: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  none (low card)
```
