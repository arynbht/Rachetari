# T-0066 · refactor(shell): shrink needsYouItems under the lint limits

Status: in progress
Branch: card/T-0066 · Held by: builder-T-0066
Created: 2026-11-26 · Source: BACKLOG Next up (from T-0043) · Gate: low

Starts after T-0065 merges: both cards edit `eslint.config.js`.

## Why

`needsYouItems` in `now.ts` is over the default complexity limit of 20; a lint override (`complexity` 27) holds it at its size. Needs you drives what the owner is asked, so the function must be split without changing a single item, its order or its wording.

## Acceptance criteria

- [x] A1: `needsYouItems` and its helpers each pass the default complexity limit (20) · check: the override block for `apps/desktop/src/main/engine/now.ts` is gone from `eslint.config.js`, and `pnpm lint` passes
- [ ] A2: Behaviour is identical: same items, same order, same wording · check: `pnpm test` passes with no test file changed (`git diff --stat` shows none)
- [x] A3: Exports of `now.ts` are unchanged (same names and signatures) · check: `pnpm typecheck` passes and `git diff` shows no export line changed
- [x] A4: Module boundaries still hold · check: `pnpm boundaries` passes

## Files in scope

- `apps/desktop/src/main/engine/now.ts` (changed)
- `eslint.config.js` (changed: remove the now.ts override block)

## Out of scope

- Several open questions for one card running together on one line in `why` (parked).
- `checklistSections` order duplicated in `Checklist.tsx` (parked).
- Any other override in `eslint.config.js`, including Checklist.tsx's (T-0065).

## Constraints

- No new dependencies.
- Pure move-and-split: no change to item text, order, sort, or exports. Any new helper stays unexported.
- No `eslint-disable`.

## Skills

- `quality/code-simplification` — simplify without changing behaviour, scoped to what changed.

## Stop and ask

Besides the standing list in CLAUDE.md:

- A test would need to change to pass.

## Next step

Run `pnpm test` once the test lock is free (A2), then finish the done check. Split done: `needsYouItems` (per-card items and the held-night items into small helpers).

## Decisions

- 2026-11-26: Gate low by the owner's standing pre-approval (removing a lint override when the code already fits the new value). The override comes out because the code is brought under the default limit in this same card.
- 2026-11-26: Decided for the owner: card waits for T-0065 to merge, so the two `eslint.config.js` edits don't conflict (alternative: run both and resolve the conflict).

## Questions for me

none

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC): none

```
A1: pnpm lint passes, override block removed. A3: pnpm typecheck + desktop typecheck pass, no export changed. A4: pnpm boundaries: no dependency violations.
A2: UNTESTED (waiting for the test lock; T-0064 holds it). No test file changed.
```
