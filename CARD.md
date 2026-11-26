# T-0060 · refactor(shell): shrink source.ts under the lint limits

Status: in progress
Branch: card/T-0060 · Held by: builder-T-0060
Created: 2026-11-25 · Source: BACKLOG Next up (from T-0043) · Gate: low

## Why

`apps/desktop/src/main/kit/source.ts` is 713 lines (575 counted by `max-lines`) and holds a lint override at 625. Moving the git-running plumbing into its own file lets the override come out and source.ts fit the default 500.

## Acceptance criteria

- [ ] A1: The git plumbing (limits, `GitTimeout`, `killTree`, `git`, `show`, `defaultBranch`, `commitOf`, `isAncestor`, `displayBranch` and what they need) moves to a new sibling `git-run.ts`; source.ts re-exports every name it exported before, so no importer changes · check: `git diff --stat` shows only the files in scope; `pnpm typecheck` passes
- [ ] A2: The `max-lines: maxLines(625)` override for source.ts is removed from `eslint.config.js`, and source.ts and git-run.ts both pass the default limit · check: `pnpm lint`
- [ ] A3: Behaviour is unchanged and no test file is edited · check: `pnpm --filter desktop test` passes with `git diff --stat` showing no `*.test.ts`
- [ ] A4: The split adds no circular import · check: `pnpm boundaries` (dependency-cruiser no-circular)

## Files in scope

- `apps/desktop/src/main/kit/source.ts` (changed)
- `apps/desktop/src/main/kit/git-run.ts` (new)
- `eslint.config.js` (changed: remove the one override block)

## Out of scope

- Using the new file from T-0053's `card-commit.ts` (PR #72, not merged); do not depend on it.
- Changing importers (`gh.ts`, `watch.ts`, engine files) to import from `git-run.ts`; they keep importing from `source.ts`.
- Any behaviour, timeout or signature change, or splitting source.ts's read functions further.

## Constraints

- No new dependencies.
- `git-run.ts` must not import from `source.ts`; the dependency runs one way, source.ts to git-run.ts.
- Public exports of source.ts stay the same (`killTree`, `defaultBranch`, `displayBranch`, `fetchRepo`, `LiveCard`, and the rest).

## Skills

none

## Stop and ask

Besides the standing list in CLAUDE.md:

- If a test fails only because it mocks or spies on something that moved, stop: the test may not change.

## Next step

Read source.ts lines 1-250, move the git plumbing to git-run.ts, re-export from source.ts, remove the override, run the four checks.

## Decisions

- 2026-11-25: Gate low by the owner's standing pre-approval (2026-11-25): removing a lint override when the code already fits the new value (the default 500 here) — one eslint.config.js block removed, three files, four criteria.
- 2026-11-25: Decided for the owner: re-export from source.ts so importers stay untouched (alternative: repoint importers, which grows the file list).

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
```
