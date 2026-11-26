# T-0063 · refactor(shell): card-commit runs git through git-run.ts

Status: ready
Branch: card/T-0063 · Held by: nobody
Created: 2026-11-25 · Source: BACKLOG Next up (decided for the owner in cards/done/T-0053.md) · Gate: low

## Why

`card-commit.ts` carries its own copy of a git runner, next to the one in `git-run.ts`. Two runners drift: only git-run's kills the whole process tree on a timeout. The shell should have one.

## Acceptance criteria

- [ ] A1: `card-commit.ts` has no `execFile` or `node:child_process` import and no runner of its own; every git call goes through `git-run.ts` · check: `rg -n "child_process|execFile" apps/desktop/src/main/engine/card-commit.ts` finds nothing
- [ ] A2: `git-run.ts` gains an options argument, additively: stdin `input`, extra `env`, `okCodes`, and a limit that keeps card-commit's 60 s; existing callers and their results are unchanged · check: `pnpm --filter desktop test` passes, source tests unchanged
- [ ] A3: `card-commit.test.ts` passes with no edit · check: `git diff develop --stat -- '*.test.ts'` is empty, and `pnpm --filter desktop test` is green
- [ ] A4: card-commit's exports are unchanged (T-0054 imports them) · check: `git diff develop -- apps/desktop/src/main/engine/card-commit.ts` shows no change to any `export` line
- [ ] A5: lint and typecheck are clean · check: `pnpm lint` and `pnpm typecheck`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/engine/card-commit.ts` (changed)
- `apps/desktop/src/main/kit/git-run.ts` (changed)

## Out of scope

- Changing what card-commit does, its refusal reasons, or its exports.
- Moving other callers or the read-only helpers in git-run.ts.
- Any test edit.

## Constraints

- No new dependencies.
- Behaviour must not change. Differences found: card-commit has a 60 s limit and git-run's read limit is 10 s, so card-commit uses the 60 s ("fetch") limit; output cap is 16 MiB in both; git-run sets `GIT_OPTIONAL_LOCKS=0` in addition, harmless; git-run has no stdin (stdio is `ignore`), no per-call env, and no accepted non-zero exit codes, so those three are added as optional fields; error text moves from `git X failed: <stderr>` to `Command failed: git <args>` plus stderr, and the tests only match on stderr content.
- Order: if T-0054 (in build) also edits card-commit.ts, start this card after T-0054 merges.

## Skills

none

## Stop and ask

Besides the standing list in CLAUDE.md:

- If the new options would change what an existing git-run caller gets.

## Next step

Read both runners, add the options to `git` in git-run.ts, then replace card-commit's `git` with it.

## Decisions

- 2026-11-25: gate low: two files, five criteria, no test, contract or config change. Adding optional git-run options is internal, not a public type.
- 2026-11-25: decided for the owner: error text changes shape (`Command failed: git ...` plus stderr) rather than adding a second error format (alternative: keep the old `git X failed:` wrapper in card-commit).

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

## Parked
