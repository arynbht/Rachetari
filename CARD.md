# T-0027 · feat(kit): /done deslops the card's diff first

Status: draft <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0027 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §4e-2 · Gate: needs you

## Why

T-0023 writes the `deslop` skill and T-0025 writes a script that lists the comments a
branch adds, but nothing runs either: slop still reaches the PR unless someone remembers
to look. This card makes `/done` run them on every card before its checks. It lists the
comments the diff adds, has the deslop pass judge each one and clean the diff against the
slop list, and commits that cleanup on its own. `/setup` always installs the deslop skill,
and `/done` skips the step, and says so, when a repo doesn't have it.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `/done` gets a deslop step that runs before the criteria's checks, only when the card is `in progress`. It runs `node "${CLAUDE_SKILL_DIR}/comment-report.mjs" <base>` (the same base as the scope diff) and keeps the `path:line: text` lines. It then applies `skills/quality/deslop/SKILL.md` to the card's diff against that base, inside "Files in scope" only, and has it judge each listed comment against the slop list: removed or kept, one line each. It commits deslop's edits alone as one commit (only the files it edited, no hooks skipped, no push), with message `refactor: deslop <id>`, the one-line removals as the body, and `Card: <id>`. The checks then run on the result. The report and "Evidence" gain a "Deslop" list: the commit hash (or "nothing removed, no commit"), each removal, and each comment kept or removed. The opening line still forbids fixing failures, with deslop's cleanup as the one named exception · check (reading, local): `git diff origin/day/2026-11-25 -- kit/setup/templates/skills/done/SKILL.md`, read the new step; `grep -n 'CLAUDE_SKILL_DIR\|comment-report\|deslop' kit/setup/templates/skills/done/SKILL.md`
- [ ] A2: `/done` never fails over the deslop step. If `skills/quality/deslop/SKILL.md` is missing, it skips deslop and says "deslop skipped: skill not installed" in its report. If the script is missing or exits non-zero, deslop still runs without the comment list, and the report says so with the script's error. On a card that isn't `in progress`, the comment list is reported but deslop edits and commits nothing (as with the rest of `/done` there). If a file in scope has uncommitted changes, deslop is skipped and the report names the files, so the deslop commit holds deslop's edits only. If nothing is removed, there's no commit · check (local): `node scripts/kit-trial.mjs`, then in the scratch repo copy the built `kit/setup/templates/skills/done/` to `.claude/skills/done/` and `skills/quality/deslop/` beside it, add an `in progress` `CARD.md` whose diff adds one restating comment and one useful one, and run `/done` headless: paste `git log --oneline -3` and `git show --stat <deslop hash>`, the report's Deslop list and the comment verdicts. Then delete `skills/quality/deslop/`, reset, run `/done` again, and paste the "deslop skipped" line. Each run's cost goes in Evidence. CI can't run this (UNTESTED on CI)
- [ ] A3: `/setup` copies each command folder from `templates/skills/` whole, so `done/comment-report.mjs` lands beside `/done` in `.claude/skills/done/`. It always copies `quality/deslop` from the library into the repo's `skills/quality/deslop/` and lists it in `skills/INDEX.md`, whatever areas the owner picks. If the library isn't installed, it says that deslop wasn't copied and that `/done` will skip it. Step 7's report names both · check (reading, local): `git diff origin/day/2026-11-25 -- kit/setup/SKILL.md`; `grep -n 'deslop\|comment-report\|whole' kit/setup/SKILL.md`
- [ ] A4: A test holds the paths together. Every `${CLAUDE_SKILL_DIR}/<file>` that `/done` names exists in `kit/setup/templates/skills/done/`. The deslop path `/done` reads (`skills/quality/deslop/SKILL.md`) is the one `/setup` copies to, and it exists in this repo · check: `pnpm exec vitest run kit/setup/done-deslop.test.ts --coverage.enabled=false` passes, and fails when the script's name in `/done` is changed (shown in Evidence, then reverted); it runs in `pnpm test` and CI through T-0023's `kit/**/*.test.ts` include
- [ ] A5: Nothing outside "Files in scope" changes, and `ci` is green on the PR · check: `git diff --stat origin/day/2026-11-25...HEAD`; `gh pr checks`. `kit/**` isn't docs to CI's `code` filter, and `node scripts/ci-scope.mjs origin/day/2026-11-25` says `kit/... is outside every workspace package` (`all=true`), so lint (`eslint .`, which covers the test), format check, boundaries, typecheck and the full `vitest run` run on Ubuntu and Windows; desktop-e2e is skipped and `ci` doesn't need it. Local before pushing: `pnpm test`, `pnpm lint`, `pnpm typecheck`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `kit/setup/templates/skills/done/SKILL.md`
- `kit/setup/SKILL.md` (step 2's Files and Area skills bullets, and step 7's report)
- `kit/setup/done-deslop.test.ts` (new)
- `CARD.md`, `cards/done/T-0027.md`, `DECISIONS.md`, `BACKLOG.md` (Parked lines only: on the line, cards never edit Next up)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Re-installing the kit into this repo's `.claude/skills/done/` or `~/.claude/` (agent config; its own step after merge), and installing the library into `~/.claude/kit-skills/` (S-01)
- Editing the deslop skill (`skills/quality/deslop/SKILL.md`, T-0023's) or `comment-report.mjs` and its test (T-0025's), or the report's parked gaps
- The five starter checklist lines and the `/setup` re-run on this repo (§4e-3), or any CI job that runs the report or deslop

## Constraints

- No new dependencies. No product code.
- `kit/**` is prettier-ignored and kept as written: no reformatting of untouched lines, and each skill's frontmatter stays as it is.
- `/done`'s other steps keep their meaning; the deslop step is added before them, and the report gains one list.
- The live trial writes only inside the gitignored `.scratch/kit-trial/` and pushes nowhere but its own origin.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `docs/native-writing` — the deliverables are prose instructions a session reads and acts on

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0023 (deslop skill, kit/setup/SKILL.md)
- Depends on: T-0025 (comment-report.mjs)
- After each of those merges, merge the day branch into this card branch (no rebase) before editing the shared file or writing the test
- If the step needs the deslop skill's text changed (for example, it can't take the comment list), stop: that file is T-0023's
- If `/setup` can't copy `comment-report.mjs` without breaking its "Different file: write `name.kit.md` beside it" rule

## Next step

Draft, waiting on the owner (needs you: it changes what `/done` does on every card). Once ready, wait for T-0023 and T-0025 to merge, merge the day branch in, then start with A1.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `needs you` by the owner's ruling on §4e: it changes what `/done` does on every card. Three working files, five criteria.
- 2026-11-25: How `/done` finds the report in another repo: decided for the owner: `node "${CLAUDE_SKILL_DIR}/comment-report.mjs" <base>`, the script `/setup` copies beside `/done` into `.claude/skills/done/` (alternative: a fixed `.claude/skills/done/comment-report.mjs` path, which breaks if the skill is installed elsewhere, as `~/.claude/skills/`).
- 2026-11-25: How `/done` finds the deslop skill: decided for the owner: the repo's `skills/quality/deslop/SKILL.md` only, the path `/setup` copies it to and where T-0023 puts it here (alternative: also fall back to `~/.claude/kit-skills/quality/deslop/`, which makes `/done`'s result depend on the machine).
- 2026-11-25: The commit: decided for the owner: one commit holding deslop's edits only, `refactor: deslop <id>`, its one-line removals as the body and `Card: <id>`, made before the checks; no commit when nothing is removed (alternative: fold deslop's edits into the card's own commits, which hides what deslop changed).
- 2026-11-25: Checks failing after the deslop commit: decided for the owner: keep the commit, and the report names its hash so `git revert <hash>` undoes it (alternative: revert automatically, which hides a failing removal from the owner).
- 2026-11-25: Dirty files in scope: decided for the owner: skip deslop and name the files (alternative: commit pending work first, which commits work the session didn't mean to commit).
- 2026-11-25: A card that isn't `in progress`: decided for the owner: list the comments, but deslop edits and commits nothing, as with the rest of `/done` there (alternative: skip the comment list too).
- 2026-11-25: Checks: decided for the owner: a path test (`kit/setup/done-deslop.test.ts`) and one local headless trial of `/done` in the kit-trial scratch repo, with and without the skill (about $0.50 a run, from the kit trial) (alternative: reading checks only, which can't show the step runs or the skip works).

## Questions for me

None.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  draft 19:24:34 →
```
