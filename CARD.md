# T-0061 · refactor(shell): shrink parseCard under the lint limits

Status: in progress
Branch: card/T-0061 · Held by: session-T-0061
Created: 2026-11-25 · Source: BACKLOG Next up (from T-0043) · Gate: low

## Why

`parseCard` in `parse.ts` sits at complexity 36 and is held there by a lint override at 38. The override should come out so the default limit holds for the whole file.

## Acceptance criteria

- [ ] A1: `parseCard` and the file pass the default complexity limit, with the `parse.ts` override removed from `eslint.config.js` · check: `pnpm lint` passes
- [ ] A2: Behaviour is unchanged; no existing test is edited · check: `pnpm test` passes and `git diff --stat` shows no `*.test.ts` file
- [ ] A3: Exports of `parse.ts` are unchanged · check: `pnpm typecheck` passes and the diff shows no change to any `export` signature
- [ ] A4: No import cycle is added · check: `pnpm boundaries` passes

## Files in scope

- `apps/desktop/src/main/kit/parse.ts` (changed)
- `eslint.config.js` (changed: remove the `parse.ts` complexity override only)

## Out of scope

- Folding `questionsOf` nested lists or `(none)` followed by comment lines (parked behaviour changes).
- Reading wrapped criteria beyond their first line (parked behaviour change).
- Any other override in `eslint.config.js`, or other functions in `parse.ts` beyond what parseCard needs.

## Constraints

- No new dependencies.
- Pure refactor: same inputs give the same outputs. Extract helpers inside `parse.ts`; add no new file.

## Skills

none

## Stop and ask

Besides the standing list in CLAUDE.md:

- If the default limit cannot be met without a behaviour change.

## Next step

Read `parseCard` (parse.ts line 157), extract helpers, remove the override, run lint, typecheck, test and boundaries.

## Decisions

- 2026-11-25: Gate low, status ready — standing pre-approval (2026-11-25): removing a lint override when the code already fits the new value; here the code is made to fit and the override only comes out.

## Questions for me

none

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

## Parked

none

### Evidence

Waiting on the owner (wall clock, UTC): none

```
```
