# Open questions

## T-0026 · feat(shell): a read-only Questions panel on Now, with Copy all

1. Split the Questions panel in two: this card is read-only (the fixed question shape, the panel, Copy all); the next card answers from the panel (accept recommended, accept all for a card, a free-text answer, each a commit shown before it is made). — Recommended: yes. Other options: one card; three cards.
2. `NowState` gains a required `questions` field (an IPC contract change), and the existing `home.test.ts` gains `questions: []`. — Recommended: yes. Other options: an optional field (no test edit); a separate IPC channel.
3. Does the kit's card template get the fixed question shape too, not only this repo's `cards/TEMPLATE.md`? — Recommended: yes, both identical. Other options: this repo's template only.
4. How will the next card write an answer? (The shell's first write.) — Recommended: one write path shared with "mark ready" that changes only `CARD.md` on that card's branch: it shows the diff first, commits without a checkout, refuses if the branch is checked out elsewhere or behind origin, and pushes fast-forward only. Other options: commit but don't push; commit in a temporary worktree; build the path in the "mark ready" card first.

Answer:
