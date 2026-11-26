# Open questions

## T-0053 · feat(shell): the shell's write path and mark ready

The card's "Stop and ask" said to stop if `source.ts`'s existing git helper couldn't make the write calls. It couldn't (the helper isn't exported), and the builder decided for you instead of stopping: `card-commit.ts` has its own small git runner (`execFile` with an argument list, never a shell string). Separately, T-0060 (ready, waiting its turn) moves `source.ts`'s git plumbing into a new `git-run.ts` and re-exports it.

1. Keep `card-commit.ts`'s own git runner? — Recommended: keep it for this card, and add a small follow-up after T-0060 merges that makes `card-commit.ts` use `git-run.ts`, so the shell has one way to run git. Other options: block T-0053 until T-0060 merges and use `git-run.ts` from the start; keep two runners for good.

Answer:
