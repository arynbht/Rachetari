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

## Out of scope

- Any IPC, preload or main-process change; the channels come from T-0054 as merged.
- The mark-ready button (T-0062); reuse its diff dialog if it has merged, otherwise build it here in `AnswerControls.tsx` for T-0062 to reuse.
- Changing `questions.e2e.ts` or how questions are parsed.

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

Wait for T-0054 to merge, then pull develop and start with A1.

## Decisions

- 2026-11-25: The owner approved the answers write path (T-0054); the UI on it is ready, nothing new needs them.
- 2026-11-25: Decided for the owner: one shared diff dialog component, built by whichever of this card and T-0062 runs first (alternative: two dialogs).
- 2026-11-25: Decided for the owner: free-text box is per question, opened by an "Answer" button (alternative: always visible).

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
<commands and results>
```

## Parked

- T-0062 and this card both edit `Now.tsx` and want one diff dialog; run one then the other, not together.
