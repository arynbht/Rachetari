# Open questions

## T-0064 · feat(shell): answer questions from the Questions panel (UI)

T-0026's `apps/desktop/e2e/questions.e2e.ts` (line 74) asserts the panel has exactly one button: "no button that writes: Copy all is the only one". That was the read-only panel's design. T-0064 adds the answer buttons you asked for (Accept recommended per question, Accept all per card, a free-text answer), so that assertion fails by design. T-0064's own files don't include that test. PR #79 is built and waiting.

1. (answer individually) How should the old assertion change? — Recommended: T-0064 adds `questions.e2e.ts` to its files and replaces "exactly one button" with assertions at least as strict for the new design: Copy all is still there; the only other buttons are the answer controls, named per question and per card; and pressing any of them shows the diff first and changes nothing until confirmed (the branch tip is unchanged after opening and cancelling the preview). Other options: keep the panel's own buttons at one and put the answer controls in a separate region next to it (the old test stays as it is); hold T-0064.

Answer:
