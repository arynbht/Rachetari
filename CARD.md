# T-0064 · feat(shell): answer questions from the Questions panel (UI)

Status: in progress
Branch: card/T-0064 · Held by: session-T-0064
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Questions panel: answers · Gate: low (UI on T-0054's owner-approved write path; no new IPC, no existing test changed)

## Why

The Questions panel only reads. T-0054 adds the main-process answer path (preview, then apply as a plain commit). This card is the other half: the buttons and the diff dialog that call it, so the owner can answer without editing `CARD.md` by hand.

## Acceptance criteria

- [ ] A1: Each question with a recommendation has "Accept recommended"; each card group has "Accept all recommended"; each question has a free-text answer box · check: `pnpm --filter desktop test:e2e answer` (desktop-e2e job in CI; no local e2e)
- [ ] A2: Every action opens a dialog showing the diff from T-0054's preview first; nothing is committed until the owner confirms, and cancelling commits nothing · check: same e2e (cancel leaves the fixture's `git log` unchanged)
- [ ] A3: Confirming applies and commits; the question then leaves the panel · check: same e2e (fixture commit exists, panel no longer lists it)
- [ ] A4: A refusal from the write path (held by someone, dirty worktree, behind origin) is shown with its reason, and the diff is not applied · check: same e2e (card held by another machine)
- [ ] A5: Lint, typecheck and axe pass; `Now.tsx` stays under its complexity override · check: `pnpm lint`, `pnpm typecheck`, axe call in the e2e

## Files in scope

- `apps/desktop/src/renderer/components/AnswerControls.tsx` (new: buttons, free-text box, diff dialog)
- `apps/desktop/src/renderer/components/Now.tsx` (changed: wiring only)
- `apps/desktop/e2e/answer.e2e.ts` (new)
- `apps/desktop/e2e/questions.e2e.ts` (changed: the one-button assertion replaced by the owner's stricter set; approved 2026-11-26)

## Out of scope

- Any IPC, preload or main-process change; the channels come from T-0054 as merged.
- The mark-ready button (T-0062); reuse its diff dialog if it has merged, otherwise build it here in `AnswerControls.tsx` for T-0062 to reuse.
- How questions are parsed; any `questions.e2e.ts` change beyond the owner's approved replacement of the one-button assertion.

## Constraints

- No new dependencies.
- Starts after T-0054 merges. Read channel names and shapes from its merged `apps/desktop/src/shared/ipc.ts`; do not guess them.
- New UI goes in `AnswerControls.tsx`; `Now.tsx` only imports and renders it. Do not raise its lint override.

## Skills

- `ui/frontend-design` — new buttons and a dialog in an existing look.

## Stop and ask

- If T-0054's channels cannot express free text or accept-all for one card.
- If the wiring cannot fit in `Now.tsx` without raising its complexity limit.

## Next step

pnpm test: 292 passed. desktop-e2e hung twice (cancelled at 15 min) in the "Install Electron runtime libraries + xvfb" step, before any e2e ran; the first run found two real failures in my tests and UI, both fixed. Re-run desktop-e2e when that step works, then tick the criteria and finish.

## Decisions

- 2026-11-25: The owner approved the answers write path (T-0054); the UI on it is ready, nothing new needs them.
- 2026-11-25: Decided for the owner: one shared diff dialog component, built by whichever of this card and T-0062 runs first (alternative: two dialogs).
- 2026-11-25: Decided for the owner: free-text box is per question, opened by an "Answer" button (alternative: always visible).
- 2026-11-26: Owner approved editing `questions.e2e.ts` (an existing test): the one-button assertion is replaced by a stricter set, with held-by and one-commit checks added.

## Questions for me

- [x] questions.e2e.ts asserts the panel has exactly one button (Copy all); the new buttons break it. May I change that assertion (file is out of scope)? — Recommended: yes, count only buttons named Copy all. Options: drop the assertion; leave failing.

  - Answer (owner, 2026-11-26), approved as an edit to an existing test: add `questions.e2e.ts` to this card's files and replace the one-button assertion with a stricter set: Copy all is still there; the only other buttons are the named answer controls; opening and cancelling a preview leaves the branch tip unchanged. Plus two more: on a card whose "Held by" names anyone, the answer controls are disabled and say who holds it; confirming an answer changes only that card's CARD.md, in one commit, and nothing else on the branch.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC): none

```
<commands and results>
```

## Parked

- NowQuestion carries no full question text, so AnswerControls rebuilds it from ask/recommended/options; cards not in the template shape (e.g. `Other options:`) get 'not open' refused. Adding `text` to NowQuestion would fix it (schema change).
- Decided for the owner: question text rebuilt in the renderer (alternative: schema field).

- T-0062 and this card both edit `Now.tsx` and want one diff dialog; run one then the other, not together.
