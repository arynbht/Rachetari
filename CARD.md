# T-0054 · feat(shell): answer questions from the Questions panel

Status: draft
Branch: card/T-0054 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Questions panel: answers · Gate: needs you (new write from the shell to card branches; a public type and IPC use; owner has not approved)

## Why

The Questions panel on Now only reads. To answer, the owner edits `CARD.md` by hand on the right branch. This adds "Accept recommended" per question, "Accept all recommended" per card, and a free-text answer, each shown as a diff first and then made as a plain commit.

## Acceptance criteria

- [ ] A1: A pure function turns a card's text plus an answer (accept recommended, accept all, or free text) into the new text: the question's box is ticked and the answer written under it; questions with no "Recommended:" are skipped by accept-all · check: `pnpm --filter @arynbht/rivetari-desktop test -- answer.test.ts` (single, multi-line, code and link questions; two cards' worth; no-recommendation case)
- [ ] A2: The panel shows the three actions, and each opens a preview of the diff before anything is written; cancelling writes nothing · check: `desktop-e2e` job on this PR, `answer.e2e.ts` (preview shown, cancel leaves the file unchanged)
- [ ] A3: Confirming calls the shared write path and shows its result; a refusal (held by someone, dirty worktree, behind origin) is shown with its reason, not swallowed · check: `answer.e2e.ts` with a stubbed write path returning each refusal
- [ ] A4: The answered question leaves the open list and Copy all's text on the next read · check: `answer.test.ts` re-parses the output with `parseCard` and compares with `docs/open-questions.md` shape
- [ ] A5: Typecheck, lint and the existing tests pass · check: `pnpm typecheck && pnpm lint && pnpm test` in CI

## Files in scope

- `apps/desktop/src/shared/answer.ts` (new)
- `apps/desktop/src/shared/answer.test.ts` (new)
- `apps/desktop/src/renderer/components/Now.tsx` (changed)
- `apps/desktop/e2e/answer.e2e.ts` (new)

## Out of scope

- The write path itself (diff, refuse if held, worktree rules, commit, fast-forward push): it is the shared-first card, not built here.
- Marking a card ready (T-0053).
- Changing `parse.ts` or how questions are read.

## Constraints

- No new dependencies.
- Depends on the shared write path card (commit-to-card-branch helper, new IPC channels, preload bridge) being merged first; this card only calls it.
- Answers are plain commits, never merges or ref moves.

## Skills

- `testing/test-driven-development` — pure answer function is logic, test first.
- `ui/frontend-design` — preview and action layout in the panel.

## Stop and ask

- If the shared write path's channel shape doesn't fit these three actions.

## Next step

Owner approves the gate and the shared-first split; then set ready.

## Decisions

- 2026-11-25: Split in two. Shared-first card (new, needs an id): the owner's write path in a new main-process module, new IPC channels and preload bridge, with tests; built by whichever of this and T-0053 runs first, and both depend on it. This card holds only the answer text and panel.
- 2026-11-25: Decided for the owner: the answer is written as a line under the ticked question (alternative: replace the question's "Recommended:" line).

## Questions for me

- [ ] Approve the gate and the split above? — Recommended: yes, shared-first card first. Options: one big card (over the five-file cap); no panel answers.

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

- `source.ts` says it never writes to the repo; the shared write path needs that header changed or a new module.
