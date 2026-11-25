# T-0004 · feat: transplant PR review (`review --pr`) from Rivetari

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0004 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt phase 2; inventory/PHASE-0.md §1
Stacked on: card/T-0003 (PR #3)

## Why

`rivetari review --pr` is the one part of Rivetari proven on a real repo, and SCOPE.md
keeps it as advice on a PR. Today this repo has none of its code. It also posts APPROVE
reviews, which this repo must never do.

## Acceptance criteria

- [ ] A1: The 18 source files, the CLI entry and the two barrels are copied verbatim in one commit and cut in the next, exactly as `inventory/PHASE-0.md` §1 lists; every file is in `EXTRACTED.md` · check: `git show --stat` of both commits, `EXTRACTED.md`
- [ ] A2: The 18 tests listed in §1 come over unchanged and pass; the dropped ones are listed in `EXTRACTED.md` · check: `git diff <verbatim commit> HEAD -- '*.test.ts'` is empty, `pnpm test`
- [ ] A3: An approve verdict posts as COMMENT; nothing can post APPROVE · check: the new test `review-never-approve.test.ts`
- [ ] A4: `review --pr <n>` posts one review with findings on a real PR in this repo, as COMMENT or REQUEST_CHANGES · check: `node packages/cli/dist/bin.js review --pr <this PR>` and the review's URL
- [ ] A5: Tests, lint, typecheck, format and boundaries pass, locally and in CI on Ubuntu and Windows · check: `pnpm test && pnpm lint && pnpm format && pnpm boundaries`, `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `packages/cli/src/{bin.ts,cli.ts,index.ts,commands/review.ts}`, `packages/cli/package.json`
- `packages/engine/src/{index.ts,ai/*,detectors/exec.ts,github/slug.ts,github/token.ts}` and their tests, `packages/engine/package.json`
- `packages/runtime/src/{index.ts,judge/*,task/card.ts}` (only the files §1 lists) and their tests, `packages/runtime/package.json`
- `packages/runtime/src/judge/review-never-approve.test.ts` (new)
- `pnpm-lock.yaml`
- `EXTRACTED.md`, `BACKLOG.md`, `DECISIONS.md`, `SHELVED.md`, `CARD.md`, `cards/done/T-0004.md`

## Out of scope

- The GitHub App path, `--task`, the task carry and the `rivetari/judge` check (cut, owner decisions D1, D2)
- Any fix to review behaviour other than never-APPROVE (park it)
- A coverage floor (parked for after this card)

## Constraints

- Dependencies only at the versions Rivetari's lockfile had at `32f4b88`.
- Copied tests are never edited; one that would need editing is dropped and listed.

## Skills

None. Area skills arrive in phase 3.

## Stop and ask

Besides the standing list in CLAUDE.md:

- A cut would change behaviour beyond the owner's approved decisions D1–D5 (tonight: shelve it)

## Next step

Copy the verbatim set from `32f4b88` and commit it.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Card written and set ready by the session (D-06)

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
