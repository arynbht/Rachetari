# T-0020 · fix(shell): label the Docs viewer's task-list checkboxes

Status: blocked <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0020 · Held by: AB_Rouge
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

Wait for the owner's answer under "Questions for me". Both tests are already in `history.e2e.ts` and red (committed). If the answer is (1): in `markdown.ts` add `ADD_URI_SAFE_ATTR: ["type"]` to the `DOMPurify.sanitize` config and, in the `afterSanitizeAttributes` hook, set `aria-label` to `done`/`not done` on `INPUT` nodes whose `type` is `checkbox`; run the history e2e green, then the full checks and `/done`.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Turning the fixme test back on is a change to an existing test, but the owner's spec (§4b: "turn the fixme test back on") asks for exactly that, so it doesn't make the card `needs you`; with two code files and three criteria the card is `low`.
- 2026-11-25: The kept-component rule that shelved S-18 is settled by the owner choosing option (a) in §4b.
- 2026-11-25: The names are `done` and `not done`, as S-18's option (a) gives them — short, and they say the state the box shows.
- 2026-11-25: Blocked rather than widening the sanitizer: keeping `type` needs a `sanitize` config change outside the hook and makes a visual change A1 rules out, so it's the owner's call (see Questions).

## Questions for me

- [ ] A1's premise doesn't hold: the Docs viewer's task-list boxes are not checkboxes today. `renderMarkdown` passes `ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i`, and DOMPurify checks every attribute not in its URI-safe list against that regexp, so `type="checkbox"` (no scheme) is stripped. The boxes render as `<input checked disabled>`: disabled empty text fields (aria tree: `textbox [disabled]`), the ticked state invisible. So "it stays a disabled checkbox with its ticked state, with no visual change" can't be met, and labelling in the hook alone (which only sees inputs after `type` is gone) can't make `getByRole("checkbox")` find anything. Which way?
  1. Keep `type` through the sanitizer with `ADD_URI_SAFE_ATTR: ["type"]` in the `sanitize` config (one line in `markdown.ts`, outside the hook), and label `type=checkbox` inputs in the hook as planned. The boxes become real disabled checkboxes showing their state: a visual change, and a small widening of the sanitizer (`type` values no longer URI-checked; DOMPurify's default regexp would have kept `checkbox` anyway). I spiked this locally and reverted it: all 5 history e2e tests pass, axe returns `[]`.
  2. Leave the sanitizer alone and label every `INPUT` in the hook. Axe (A2) would pass, but A1 fails (no checkbox role) and a screen reader hears "done, edit text, disabled".
  3. Something else (e.g. option (b) of S-18, text ☑/☐), which is out of this card's scope.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened, its body saying `Closes #28`: #

### Evidence

```
RED (before touching markdown.ts), 2026-11-25:
$ pnpm --filter @arynbht/rivetari-desktop e2e e2e/history.e2e.ts
  2 failed
    e2e\history.e2e.ts:64:1 › History passes axe with the Docs viewer showing a backlog
      (one violation: id "label", impact critical, 5 nodes, all `<input [checked=""] disabled="">`; nothing else)
    e2e\history.e2e.ts:70:1 › the Docs viewer names each task-list checkbox done or not done
      (expect(doneCount).toBeGreaterThan(0): received 0 — error-context aria tree shows the boxes as `textbox [disabled]`)
  3 passed (11.7s)
Spike (reverted, not committed): ADD_URI_SAFE_ATTR ["type"] + aria-label in the hook → 5 passed (11.7s)
```

```
Waiting on the owner (wall clock, UTC):
  none (low card)
```
