# T-0055 · refactor(cli): shrink tier2.ts under the lint limits

Status: in progress
Branch: card/T-0055 · Held by: builder T-0055
Created: 2026-11-25 · Source: BACKLOG Next up 12 and 13 (from T-0043) · Gate: needs you (removes lint overrides in `eslint.config.js`, which is lint config)

## Why

`packages/runtime/src/judge/tier2.ts` is about 961 code lines against a 500 limit, and `runTier2` (complexity 41) and `renderReview` (31) are over the limit of 20. Two overrides in `eslint.config.js` hold it at that size. Next up lines 12 and 13 name the same file and the same two overrides, so one card covers both.

## Acceptance criteria

- [ ] A1: `tier2.ts` is at or under 500 code lines, with the moved code in at most three new sibling files under `packages/runtime/src/judge/`, and `tier2.ts` still exports every name it exports today · check: `pnpm exec eslint packages/runtime/src/judge` passes with no `max-lines` error, and `pnpm -r typecheck` passes with the existing importers unchanged
- [ ] A2: `runTier2` and `renderReview` are at complexity 20 or under · check: the same eslint run passes with no `complexity` error on `tier2.ts` or the new files
- [ ] A3: Both `tier2.ts` override blocks are gone from `eslint.config.js` and nothing else in it changes · check: `git diff develop -- eslint.config.js` shows only those two blocks removed
- [ ] A4: Behaviour is unchanged and no existing test is edited · check: `pnpm -r test` passes, and `git diff --stat develop` lists no `*.test.ts` file
- [ ] A5: No lint suppressions added · check: `git diff develop | grep -c eslint-disable` prints 0

## Files in scope

- `packages/runtime/src/judge/tier2.ts` (changed)
- `packages/runtime/src/judge/tier2-*.ts` (new, at most three; builder picks the split, for example pack, prompt and render)
- `eslint.config.js` (changed)

## Out of scope

- Any other file with a Shrink override (`source.ts`, `parse.ts`, and the rest)
- Changing what `runTier2` or `renderReview` returns or prints, or the prompt text
- Editing or adding tests; moving the exports' import paths in other files

## Constraints

- No new dependencies.
- Pure move and split: same behaviour, same public exports from `tier2.ts` (re-export what moves).
- Where the full lint cannot reach 500 lines, stop and ask rather than raise a limit.

## Skills

- `quality/code-simplification` — simplify without changing behaviour
- `testing/test-driven-development` — the existing tests are the safety net; run them after each slice

## Stop and ask

Besides the standing list in CLAUDE.md:

- If a test must change, or a limit would have to be raised, to make a criterion pass.

## Next step

Split done and pushed: tier2-pack/prompt/render.ts, overrides removed, eslint and typecheck clean. Waiting for the test lock: run `pnpm -r test`, fill Evidence, tick criteria, done check, draft PR.

## Decisions

- 2026-11-25: One card covers Next up 12 and 13 — same file, both overrides must go for the file to lint clean, and shrinking only one leaves the file in the same state.
- 2026-11-25: Gate is `needs you` — removing an override tightens lint config; the standing pre-approval covers only overrides that hold code at its current size.
- 2026-11-25: Decided for the owner: up to three new files, keeping the card at five files (alternative: split into two cards, one per override).
- 2026-11-25: Owner approved removing the two `tier2.ts` overrides, 2026-11-25; also a standing pre-approval from now on: removing or lowering a lint override is allowed when the code already fits the new value (raising one, or adding one above the defaults, still needs the owner).

## Questions for me

- [x] Approve removing the two `tier2.ts` overrides from `eslint.config.js`? — Recommended: yes. Options: no, keep the overrides; split into two cards.

## Parked

- Next up line 13 is covered by this card; the foreman can drop it when this merges.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC): 2026-11-25

```
<commands and results>
```
