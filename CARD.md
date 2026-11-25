# T-0053 · feat(shell): mark ready as a previewed plain commit

Status: ready
Branch: card/T-0053 · Held by: nobody
Created: 2026-11-25 · Source: docs/queue-2026-11-25.md §Shell action: mark ready · Gate: needs you (new IPC channels and a first write path from the shell; not a standing pre-approval because the shell has never written before)

## Why

The shell only reads. Phase 7's first action is "mark ready": flip a draft card to ready as a plain commit on its branch, shown first. This card builds the shared write path (also used by T-0054's question answers) and the mark-ready preview and apply on top of it, main process only. The button is a follow-up card.

## Acceptance criteria

- [ ] A1: Preview returns the exact diff of `CARD.md` (Status draft to ready) and commits nothing · check: `pnpm --filter desktop test card-commit` (preview case, repo unchanged)
- [ ] A2: Apply refuses, with a reason naming who or what, when "Held by" names anyone, when the card's worktree is dirty, or when the local branch is behind origin · check: `pnpm --filter desktop test card-commit` (three refusal cases)
- [ ] A3: Apply commits in the card's branch worktree when it is checked out clean, otherwise commits without a checkout, and never moves a branch ref under a worktree · check: `pnpm --filter desktop test card-commit` (both paths, temp repos)
- [ ] A4: Push is fast-forward only; a non-fast-forward is refused, not forced · check: `pnpm --filter desktop test card-commit` (bare-remote temp repo)
- [ ] A5: New channels are additive; lint and typecheck pass · check: `pnpm lint` and `pnpm typecheck`

## Files in scope

- `apps/desktop/src/main/engine/card-commit.ts` (new)
- `apps/desktop/src/main/engine/card-commit.test.ts` (new)
- `apps/desktop/src/shared/ipc.ts` (changed: new preview and apply channels, new types only)
- `apps/desktop/src/preload/index.ts` (changed: expose the two channels)
- `apps/desktop/src/main/index.ts` (changed: register the handlers)

## Out of scope

- The "mark ready" button and diff dialog in the renderer (follow-up card).
- Answering questions (T-0054); it reuses `card-commit.ts` but adds only its own channels.
- Opening or marking PRs ready on GitHub.

## Constraints

- No new dependencies. Use the existing git helper in the engine.
- Write path rules (owner, 2026-11-25): show the diff first; refuse if Held by names anyone; clean worktree commits there; dirty worktree refuses and names it; never move a branch ref under a worktree; else commit without a checkout; push fast-forward only; refuse if behind origin.
- Tests use temp repos, never this repo.

## Skills

- `testing/test-driven-development` — new logic with many refusal cases, test first.

## Stop and ask

- If `card-commit.ts` needs a git call the existing helper cannot make.

## Next step

Owner approves the gate and the split; then set Status to ready.

## Decisions

- 2026-11-25: Decided for the owner: this card is the shared write path plus mark-ready channels, no UI (alternative: one card with the button, which would exceed five files).
- 2026-11-25: Decided for the owner: T-0054 imports `card-commit.ts` from here and runs after this card (alternative: T-0054 builds it first).
- 2026-11-25: Owner approved the gate and the split, 2026-11-25, with the write-path conditions: show the diff before every write, refuse when Held by names anyone, never move a branch ref under a worktree, push fast-forward only, and a test for each refusal.

## Questions for me

- [x] Approve the gate (first write path and new IPC channels) and the split into write path then button? — Recommended: approve. Options: build the button in the same card; keep the shell read-only.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC): 2026-11-25

```
```

## Parked

- Follow-up card: the mark-ready button and diff dialog in the renderer.
