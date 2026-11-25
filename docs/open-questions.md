# Open questions

## T-0018 · fix(shell): tell done, drafting and broken card branches apart

1. PRs #35 (T-0018) and #34 (T-0017) passed inspection with `ci` green, but this session's permission mode refused `gh pr merge` into the day branch twice. How do cards that pass get merged into `day/2026-11-25`? — Recommended: allow it (add a permission rule for `gh pr merge` in this repo), used only for day-branch merges of cards that passed inspection. Other options: you merge each one when told "merge #N"; something else.

Answer:

## T-0022 · feat(skills): take constraint-driven-development and playwright-cli

1. Reading found lines beyond the three the card allows: `playwright-cli/references/test-generation.md:159` runs the unpinned `npm init playwright@latest`; `constraint-driven-development/SKILL.md:149-160` lists an install per dimension the user picks (`pip`, `pipx`, `brew`, `npm i -D`); `:264` says to wire checks "into your agent's post-edit hook"; `playwright-cli/SKILL.md:4` pre-allows `Bash(npx playwright:*)`. — Recommended: take both unchanged; allow `test-generation.md:159` as a fourth line and park it; record the others in Evidence and in INDEX's reading note. Other options: take constraint-driven-development only and leave playwright-cli shelved.
2. `Closes #6` and `Closes #7` don't fire on a PR into the day branch. — Recommended: the day-branch PR into `main` repeats them. Other options: close both by hand after that merge.

Answer:

## T-0023 · feat(skills): take code-simplification, add a deslop skill and the Slop defaults /setup drafts

1. Split §4e in three: (1) this card; (2) `/done` deslops the card's diff first and commits that on its own, with §4f's comment report; (3) the five checklist lines and the `/setup` re-run on this repo. — Recommended: yes. Other options: one card; a different split.
2. Which area holds `code-simplification`? — Recommended: `quality`, beside `deslop`. Other options: `workflow`, with the other addyosmani skills.
3. Where does the slop list live? — Recommended: one template, `kit/setup/templates/CONSTRAINTS-slop.md`, that `/setup` puts in `CONSTRAINTS.md`; the deslop skill carries the same twelve lines as defaults and uses the repo's `## Slop` section when there is one. Other options: only in the skill; only in `CONSTRAINTS.md`.
4. `/setup` drafts `CONSTRAINTS.md` only when it's missing, so an existing one never gets the section. — Recommended: `/setup` appends `## Slop` to an existing `CONSTRAINTS.md` that has none and never changes one that has it. Other options: leave existing files alone.
5. For card 2, `/done` in another repo can apply deslop only if that repo has it. — Recommended: card 2 has `/setup` always copy `quality/deslop`. Other options: copy it only when the owner picks the quality area.

Answer:
