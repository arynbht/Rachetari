# T-0025 · feat(kit): a report of the comments a card's diff adds

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0025 · Held by: AB_Rouge
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §4f · Gate: low

## Why

Sessions add comments that restate the code or narrate the change, and nothing lists them
for review. Rivetari's `diff.no-new-comments` finds every comment line a diff adds (a
reworded comment doesn't count), but there it fails the build on any comment, which the
owner rejected as too blunt. This card brings that rule over as a report only: a script
that prints each comment a branch adds, so card 4e-2's `/done` can list them for the
deslop pass to judge. No CI gate.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: Copied verbatim, then cut. The first commit that touches `kit/setup/templates/skills/done/comment-report.mjs` adds exactly these ranges of Rivetari at `32f4b88`, joined in this order with nothing added: `packages/runtime/src/judge/diff-rules.ts` lines 22–25 (`Hunk`) and 39–97 (`CODE` to `newComments`), then `packages/runtime/src/judge/tier1.ts` lines 931–963 (`parseHunks`). The next commit cuts it to plain JavaScript that Node runs, at most 150 lines including the driver. · check (local; Rivetari isn't on CI): `git log --format='%h %s' --reverse -- kit/setup/templates/skills/done/comment-report.mjs` shows the copy commit, then the cut commit. `diff <(git show <copy>:kit/setup/templates/skills/done/comment-report.mjs) <(R=C:/Users/arynb/Documents/Projects/Rivetari; git -C $R show 32f4b88:packages/runtime/src/judge/diff-rules.ts | sed -n '22,25p;39,97p'; git -C $R show 32f4b88:packages/runtime/src/judge/tier1.ts | sed -n '931,963p')` prints nothing. `wc -l` on the file is ≤ 150.
- [ ] A2: The script exports `isCommentLine`, `parseHunks` and `newComments`. `newComments` returns `{ path, line, text }` for each comment line the diff adds to code, where `line` is the line number on the new side (each hunk keeps its `+start` from the `@@` header). A comment block that replaces a removed block at the same indent isn't reported, up to the removed block's length. Non-code paths (`.md`, `.json`, `.yml`) are skipped. · check: `pnpm exec vitest run kit/setup/comment-report.test.ts --coverage.enabled=false` passes, with new tests for: comment lines told from code (`//`, `/**`, ` *`, `#` in `.py` but not `#!` or `#` in `.ts`); a reworded doc comment not reported while a doc comment added beside it is, at lines 171–173 (T-0006's diff from the old test); a removed comment swapped for one at another indent, or in another hunk, still reported; `README.md` and a `.json` file skipped
- [ ] A3: Running `node kit/setup/templates/skills/done/comment-report.mjs <base>` runs `git diff -U0 <base>...HEAD`. It prints each added comment as `path:line: text` (text trimmed, not truncated), one per line, and prints nothing when there are none. It exits 0 either way, because it's a report, not a gate. With no base it prints usage to stderr and exits 2. If git fails (for example an unknown base), it passes git's error through and exits non-zero. It runs only when invoked directly, not on import. · check: the same test file builds a temporary git repo (with `user.name`, `user.email` and `core.autocrlf=false` set locally), commits a base, adds a commit with a new `//` comment in a `.ts` file and a `#` line in a `.md`, then spawns the script with `process.execPath`. It asserts stdout is exactly `src/a.ts:<n>: // <text>`, the exit code is 0, a run with no base exits 2, and a run with base `nope` exits non-zero. Also local: `node kit/setup/templates/skills/done/comment-report.mjs origin/day/2026-11-25`, with its output pasted in Evidence
- [ ] A4: The record. `EXTRACTED.md` gets a `T-0025` section. Its table row for the script names both sources and lists the cut: types stripped; `isCodePath`, `MARKDOWN`, `SKIPPED_TEST` and `asHunks` dropped; `Hunk` gains `start`; `newComments` returns line numbers; the driver is new. The section lists the four old comment tests in `diff-rules.test.ts` as dropped ("tells comment lines from code", "fails new code comments when the repo turns the rule on…", "doesn't count a reworded doc comment as new…", "still fails a deleted comment swapped for an unrelated one"), because they call `diffRules` and `parseAddedLines`. It lists `kit/setup/comment-report.test.ts` as new, not copied. `BACKLOG.md` gets one Parked line, `[product]`, for the rule's known gaps: trailing comments after code, JSX `{/* */}` comments, docstrings, and `.vue` and `.css` files. · check: `grep -n 'T-0025\|comment-report' EXTRACTED.md BACKLOG.md`; `pnpm exec prettier --check EXTRACTED.md BACKLOG.md`
- [ ] A5: Nothing outside "Files in scope" changes, no CI job or workflow runs the script, and `ci` is green on the PR · check: `git diff --stat origin/day/2026-11-25...HEAD`, and `git diff --name-only origin/day/2026-11-25...HEAD -- .github vitest.config.ts` prints nothing; `gh pr checks`. `kit/**` isn't docs to CI's `code` filter, and `scripts/ci-scope.mjs` puts it outside every workspace package (`all=true`). So lint (`eslint .`, which covers the `.mjs` and the test), format, boundaries, typecheck and the full `vitest run` all run on Ubuntu and Windows. `vitest run` collects `kit/**/*.test.ts` once T-0023 has merged. Run locally before pushing: `pnpm test`, `pnpm lint`, `pnpm typecheck`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `kit/setup/templates/skills/done/comment-report.mjs` (new)
- `kit/setup/comment-report.test.ts` (new)
- `EXTRACTED.md` (a new `T-0025` section only)
- `BACKLOG.md` (Parked lines only: on the line, cards never edit Next up)
- `CARD.md`, `cards/done/T-0025.md`, `DECISIONS.md`

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Changing `/done` to run the report and having the deslop pass judge each comment, or changing `/setup` to copy the script into a repo. That's card 4e-2. Don't touch `kit/setup/templates/skills/done/SKILL.md` or `kit/setup/SKILL.md`.
- Adding the starter checklist line "4f's comment report runs" (card 4e-3), or adding any CI job, workflow step or gate that runs the script
- Fixing the parked gaps (trailing, JSX, docstrings, `.vue`, `.css`), widening `CODE`, or editing `vitest.config.ts` (T-0023 adds the `kit/**` include)

## Constraints

- No new dependencies: only `node:` built-ins. The script is plain `.mjs` so it runs on any Node the repo supports, with no type stripping.
- The cut keeps the rule's logic as copied (indent matching, one removed line covers one added line). Line numbers and the driver are the only additions.
- `kit/**` is prettier-ignored. Write the script and the test as you would format them. Format checks don't cover them, but lint does.
- The copy commit isn't valid JavaScript (it's TypeScript text in a `.mjs`). Lint is expected to fail on that commit only, so don't run hooks around it or skip them.
- The test must pass on Windows: spawn with `process.execPath`, pass paths as arguments, and clean up the temp directory.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development` — the report's tests are new, written against the cut functions and the driver

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0023 (`vitest.config.ts`: its `kit/**/*.test.ts` include is what collects this card's test; `EXTRACTED.md`)
- Depends on: T-0021 (`EXTRACTED.md`)
- After each of those merges, merge the day branch into this card branch (no rebase) before you edit `EXTRACTED.md` or rely on vitest collecting the test. You can write the script and test before then.
- If the cut script can't stay within 150 lines with the driver, stop (the owner's limit).
- If the test can't be collected without editing `vitest.config.ts`, stop.

## Next step

Start with A1's copy commit.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `low`: nothing on the stop-and-ask list applies. There's no dependency. There's no change to an existing test (the four old tests stay in Rivetari and are listed as dropped). There's no lint, CI or agent config: `kit/**` is product, and this card doesn't touch `vitest.config.ts` because T-0023 adds the include. The card has 4 working files and 5 criteria.
- 2026-11-25: Where the script lives: decided for the owner: `kit/setup/templates/skills/done/comment-report.mjs`, beside the `/done` template that 4e-2 changes to run it. That way `/setup` can ship it with `/done` into any repo, and the skill can call it from its own folder (alternative: `scripts/comment-report.mjs`, which runs in this repo only and would need a `vitest.config.ts` include line).
- 2026-11-25: Where its test lives: decided for the owner: `kit/setup/comment-report.test.ts`, beside T-0023's `slop-lines.test.ts`, which T-0023's `kit/**/*.test.ts` include collects. It stays out of `templates/skills/done/` so `/setup` never copies a test into a repo (alternative: `scripts/` plus a vitest include line, which is a test-config change).
- 2026-11-25: Language: decided for the owner: plain `.mjs` (alternative: `.ts` run by Node's type stripping, which needs Node 22.18 or later and prints a warning; the kit runs in other repos).
- 2026-11-25: Output: decided for the owner: `path:line: text`, with the full trimmed text, and exit 0 whether comments are found or not (alternative: Rivetari's `path: text` cut to 80 characters). The deslop pass needs the whole comment and its place to judge it. Line numbers need `Hunk.start` from the `@@` header, a small addition logged in `EXTRACTED.md`.
- 2026-11-25: Base argument: decided for the owner: required, usage and exit 2 without it (alternative: default to `origin/HEAD`). `/done` knows the card's base, and a wrong default reports the wrong diff without any warning.
- 2026-11-25: Depends on T-0023 and T-0021: both satisfied. They have merged into `develop` (the day line, `day/2026-11-25` in this card), which was merged into this branch (no rebase) before `EXTRACTED.md` was edited. `vitest.config.ts` on `develop` collects `kit/**/*.test.ts`. Checks that name `origin/day/2026-11-25` run against `origin/develop`.

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
  none (low card)
```
