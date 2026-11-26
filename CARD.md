# T-0065 · refactor(shell): shrink Checklist under the lint limits

Status: in progress (review)
Branch: card/T-0065 · Held by: nobody
Created: 2026-11-26 · Source: BACKLOG Next up, from T-0043 · Gate: low (standing pre-approval: removing a lint override when the code already fits the default)

## Why

`Checklist.tsx` holds a lint override (`complexity` 33) because the `Checklist` component sits at 31. The override should go, so the file meets the default limit. Behaviour and rendering must not change.

## Acceptance criteria

- [ ] A1: The `Checklist.tsx` block (the comment line and the `complexity: ["error", 33]` override) is gone from `eslint.config.js`, and the file passes lint at the defaults · check: `pnpm lint`
- [ ] A2: Types still hold and the exports of `Checklist.tsx` are the same as before (`Checklist` only) · check: `pnpm typecheck`, and `rg -n "^export" apps/desktop/src/renderer/components/Checklist.tsx`
- [ ] A3: Module boundaries still hold · check: `pnpm boundaries`
- [ ] A4: Rendering is unchanged: the existing checklist e2e passes untouched · check: CI `desktop-e2e` job on this PR
- [ ] A5: No test or e2e file changed · check: `git diff --stat develop...HEAD` lists no `*.test.*` or `e2e/` path

## Files in scope

- `apps/desktop/src/renderer/components/Checklist.tsx` (changed)
- `apps/desktop/src/renderer/components/ChecklistParts.tsx` (new; the pieces moved out, e.g. the totals, line row and group card, plus the helpers they use; the builder may pick the split that gets under the default)
- `eslint.config.js` (changed; remove the override only)

## Out of scope

- The section order (most gaps, more fails, A to Z) is written twice, in `byGaps` here and in `now.ts`'s `checklistSections`; leave it as is (parked).
- Any change to markup, class names, text or props of what renders.
- Touching tests, e2e files or other lint overrides.

## Constraints

- No new dependencies.
- Behaviour, rendering and exports stay the same; a pure move and split.
- Complexity is measured per function, so the fix is smaller functions, not a looser rule.

## Skills

none

## Stop and ask

Besides the standing list in CLAUDE.md:

- A test or e2e file would need to change to keep passing.

## Next step

Wait for CI desktop-e2e and the test lock, run vitest, then done check. (Was: pull, read `Checklist.tsx`, find what pushes `Checklist` to 31 (the nested ternaries and `&&` chains in its render), move them into small components in `ChecklistParts.tsx`, then delete the override and run the checks.

## Decisions

- 2026-11-26: Gate low: removing a lint override when the code fits the default is a standing pre-approval; no test or contract changes.
- 2026-11-26: Decided for the owner: new file named `ChecklistParts.tsx` beside the component (alternative: another name or folder).

## Questions for me

none

## Parked

- The section order is written twice, in `Checklist.tsx`'s `byGaps` and `now.ts`'s `checklistSections`.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC): none

```
pnpm lint: clean (override removed). pnpm typecheck + apps/desktop typecheck: clean. pnpm boundaries: no violations. Export of Checklist.tsx: Checklist only. Diff touches no test/e2e file. A4 desktop-e2e: UNTESTED locally (CI). Local vitest: UNTESTED (test lock held by T-0062).
```
