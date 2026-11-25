# T-0001 · chore: workspace skeleton and the CI pattern

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0001 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt, phase 1 step 1; inventory/PHASE-0.md §2, §7

## Why

The repo has nothing to build or check yet. Every later card needs a pnpm workspace,
the TypeScript, lint, format and test setup, one empty package per part, and Rivetari's
fast CI pattern (a `changes` job, lint, typecheck and tests, one `ci` aggregator) running
on Ubuntu and Windows for PRs.

## Acceptance criteria

- [ ] A1: Root config, `ci.yml` and `scripts/ci-scope.mjs` are copied verbatim in one commit and cut in the next; every file is logged in `EXTRACTED.md` · check: `git log --stat`, `EXTRACTED.md`
- [ ] A2: Empty packages `@arynbht/rivetari` (packages/cli), `-engine`, `-runtime` and `-desktop` (apps/desktop) install and typecheck · check: `pnpm install --frozen-lockfile && pnpm typecheck`
- [ ] A3: Lint, format, boundaries and tests pass locally on Windows · check: `pnpm lint && pnpm format && pnpm boundaries && pnpm test`
- [ ] A4: On the draft PR, `changes`, lint, typecheck, test and secret-scan run, PR jobs run on both `ubuntu-latest` and `windows-latest`, and `ci` passes · check: `gh pr checks`
- [ ] A5: Nothing from the leave-behind list is copied (no judge-check step, validate, action-bundle, catalog, registry, eslint-rules, changesets, lefthook) · check: `git grep -n -i "rivetari/judge\|catalog:validate\|action:build\|eslint-rules\|changeset\|lefthook"` is empty outside `EXTRACTED.md`, `inventory/` and this card

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- Root: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `.prettierrc.json`, `.prettierignore`, `.nvmrc`, `.node-version`, `.editorconfig`, `.gitignore`, `.gitattributes`, `.dependency-cruiser.mjs`
- `.github/workflows/ci.yml`, `scripts/ci-scope.mjs`
- `packages/{cli,engine,runtime}/{package.json,tsconfig.json,src/index.ts}`, `apps/desktop/package.json`
- `EXTRACTED.md`, `inventory/**` (the phase 0 report), `CARD.md`, `cards/done/T-0001.md`

## Out of scope

- Any source beyond the empty package entry points (that's T-0004 onwards)
- The kit files and `SCOPE.md` (T-0002)
- Branch protection or any repo setting (needs the owner)
- The desktop typecheck and e2e steps (they return with T-0006, the shell frame)

## Constraints

- No dependency that the source didn't have, and no version change: the source's `pnpm-lock.yaml` is pruned, not regenerated.
- Names stay: `@arynbht/rivetari*`.

## Skills

None. The kit isn't installed until T-0003.

## Stop and ask

Besides the standing list in CLAUDE.md:

- CI can't go green on Windows without changing a job beyond the cuts named in `inventory/PHASE-0.md` §2

## Next step

Copy the verbatim set, commit it, then make the cuts.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: The owner accepted the phase 0 recommendations, including dropping the "main is red" job (D6) — recorded in inventory/PHASE-0.md §8
- 2026-11-25: CI runs on draft PRs (owner) — every PR here is a draft, and the source skipped drafts, so CI would never run
- 2026-11-25: Coverage thresholds cut and `--passWithNoTests` added — the skeleton has no code or tests; a floor is parked for after T-0004

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
