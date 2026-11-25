# T-0054 · feat(shell): answer questions from the Questions panel

Status: draft
Branch: card/T-0054 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Questions panel: answers · Gate: needs you (new IPC channels and a write from the shell; owner has not approved)

## Why

The Questions panel only reads; to answer, the owner edits `CARD.md` by hand on the right branch. This card is the first half: the main-process answer path (accept one recommended, accept all recommended for a card, free text), each previewed then committed through T-0053's `card-commit.ts`. The panel buttons are a follow-up card.

## Acceptance criteria

- [ ] A1: A pure function turns a card's text plus an answer (accept recommended, accept all, free text) into new text: the box is ticked and the answer written under the question; accept-all skips questions with no "Recommended:" · check: `pnpm --filter desktop test answer` (single, multi-line, code and link questions; two cards; no recommendation)
- [ ] A2: Preview returns the exact diff and commits nothing; apply goes through `card-commit.ts`, so its refusals (held by, dirty worktree, behind origin, non-fast-forward) come back with their reasons · check: `pnpm --filter desktop test answer` (preview case; one refusal passed through, temp repo)
- [ ] A3: The re-parsed card no longer lists the answered question as open · check: `pnpm --filter desktop test answer` (`parseCard` on the output)
- [ ] A4: New answer channels are additive and own to this card; T-0053's channels are untouched · check: `git diff origin/develop -- apps/desktop/src/shared/ipc.ts` shows additions only
- [ ] A5: Lint and typecheck pass · check: `pnpm lint` and `pnpm typecheck`

## Files in scope

- `apps/desktop/src/main/engine/answer.ts` (new)
- `apps/desktop/src/main/engine/answer.test.ts` (new)
- `apps/desktop/src/shared/ipc.ts` (changed: new answer preview and apply channels, new types only)
- `apps/desktop/src/preload/index.ts` (changed: expose them)
- `apps/desktop/src/main/index.ts` (changed: register the handlers)

## Out of scope

- The panel buttons and diff dialog in `Now.tsx` (follow-up UI card).
- Changing `card-commit.ts` or T-0053's channels.
- Changing `parse.ts` or how questions are read.

## Constraints

- No new dependencies.
- Starts after T-0053 merges; imports `card-commit.ts` and does not copy its write rules.
- Tests use temp repos, never this repo.

## Skills

- `testing/test-driven-development` — new logic with several cases, test first.

## Stop and ask

- If `card-commit.ts` cannot take a text change other than mark-ready's.

## Next step

Owner approves the gate; after T-0053 merges, set ready.

## Decisions

- 2026-11-25: Split by the coordinator: T-0053 is the shared write path; this card is the answer channels and logic; the Now.tsx buttons and e2e are a follow-up UI card, not drafted.
- 2026-11-25: Decided for the owner: the answer is written as a line under the ticked question (alternative: replace the "Recommended:" line).

## Questions for me

- [ ] Approve the gate (new IPC channels and write)? — Recommended: approve, after T-0053. Options: keep the shell read-only.

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

## Parked

- Follow-up UI card: Accept/Accept all/free-text controls and diff dialog in `Now.tsx`, with `e2e/answer.e2e.ts`.
