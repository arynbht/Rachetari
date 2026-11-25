# T-0043 · build(lint): set complexity and file-length limits

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0043 · Held by: nobody
Created: 2026-11-25 · Source: BACKLOG.md Next up 11 ("Clean code: set `complexity` and `max-lines` at error in `eslint.config.js`"), from CHECKLIST.md "Complexity and file-length limits are set" (T-0039) · Gate: needs you (lint config)

## Why

`eslint.config.js` sets no `complexity` or `max-lines` rule, so nothing stops a function
or a file from growing without bound: in one card (T-0034) `Checklist` went from
complexity 19 to 31. This card puts both rules at error, at limits today's code already
passes, so lint catches growth past them from here on. It is a ceiling, not a
refactor: lowering the limits, or splitting the files near them, is later work.

### Measured today (read-only, nothing committed)

On `origin/develop` at `e03bcc0` (T-0034 merged), all 137 files `pnpm lint` lints, with
`pnpm exec eslint . --rule 'complexity: [warn, 1]' --rule 'max-lines: [warn, {max: 1, skipBlankLines: true, skipComments: true}]' -f json`:

| Rule                                                         | Max  | 95th pct | 99th pct | Median | Tests' max |
| ------------------------------------------------------------ | ---- | -------- | -------- | ------ | ---------- |
| `complexity` (per function, 603 functions)                   | 41   | 13       | 26       | 3      | 27         |
| `max-lines` (per file, blank lines and comments not counted) | 1151 | 442      | 961      | 89     | 613        |

Worst five functions by complexity: `runTier2` 41 (`packages/runtime/src/judge/tier2.ts:831`),
`parseCard` 36 (`apps/desktop/src/main/kit/parse.ts:125`), `Checklist` 31
(`apps/desktop/src/renderer/components/Checklist.tsx:255`), `renderReview` 31
(`tier2.ts:1091`), `Now` 28 (`apps/desktop/src/renderer/components/Now.tsx:323`).
Functions over 20: 9 (in 8 files); over 30: 4; over 40: 1.

Worst five files by length: `apps/desktop/src/renderer/components/Tasks.tsx` 1151
(1259 raw), `packages/runtime/src/judge/tier2.ts` 961, `tier2.test.ts` 613,
`apps/desktop/src/main/kit/source.ts` 575, `apps/desktop/scripts/live-shell.mjs` 497.
Files over 500: 4; over 1000: 1.

`Tasks.tsx` is the file most likely to hit the line limit first: "Tasks overhaul 3"
(Next up 4) adds a record header and tabs to it.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `eslint.config.js` sets `complexity` at error with the owner's limit (recommended 45) and `max-lines` at error with the owner's limit (recommended 1250) with `skipBlankLines` and `skipComments` true, for every linted file, tests included; nothing else in the config changes · check: `pnpm exec eslint --print-config packages/cli/src/cli.ts`, `pnpm exec eslint --print-config apps/desktop/src/renderer/components/Tasks.tsx` and `pnpm exec eslint --print-config packages/runtime/src/judge/tier2.test.ts` each show `"complexity": [2, 45]` and `"max-lines": [2, { "max": 1250, "skipBlankLines": true, "skipComments": true }]` (with the owner's numbers); `git diff origin/develop -- eslint.config.js` shows only one added block holding the two rules
- [ ] A2: today's code passes the limits · check: `pnpm lint` exits 0 with no `complexity` or `max-lines` message
- [ ] A3: code over a limit fails lint · check: a temporary local file `packages/cli/src/over-limit.tmp.ts`, never committed, holding one function with complexity limit + 1 and more than the line limit of non-blank, non-comment lines: `pnpm exec eslint packages/cli/src/over-limit.tmp.ts` exits 1 and names both `complexity` and `max-lines`; then the file is deleted and `git status --porcelain` doesn't list it. The file's shape and the output go under Evidence
- [ ] A4: the checklist line passes · check: `grep -n "Complexity and file-length limits are set" CHECKLIST.md` shows `- [x]` and a check result naming the resolved values from A1; `git diff origin/develop -- CHECKLIST.md` changes that one line only
- [ ] A5: `ci` is green, with lint run in full on both OSes · check: `gh pr checks <PR>` shows `ci` passing and `lint (ubuntu-latest)` and `lint (windows-latest)` passing (a change to `eslint.config.*` matches CI's `full` filter, so lint runs on `.`, not only changed paths)

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `eslint.config.js` (one added block with the `complexity` and `max-lines` rules only)
- `CHECKLIST.md` (the "Complexity and file-length limits are set" line's status and check result only)
- `CARD.md`
- `BACKLOG.md` (Parked lines only)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Refactoring or splitting any function or file near the limits (`runTier2`, `parseCard`, `Checklist`, `Tasks.tsx`, `tier2.ts`), and any `eslint-disable` comment in source.
- Other size rules (`max-lines-per-function`, `max-depth`, `max-params`, `max-statements`) and the other two clean-code lines (knip, `/done`'s comment report).
- `CONSTRAINTS.md` (its Style section lists the ESLint rule sets) and CHECKLIST.md's Stage line (line 3 names this line among the failing foundation lines): both go stale when this merges; park one line each, don't edit them.

## Constraints

- No new dependencies. Both rules are ESLint core rules.
- The limits are the owner's numbers from "Questions for me"; don't change them to make lint pass. If `develop` has grown past them by the time this is built, stop and ask.
- Merge `origin/develop` into the branch before A2 (never rebase), and re-run the measurement command above; put its max values under Evidence.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `workflow/constraint-driven-development` — writing a quality bar down as numbers and catching a diff that lowers it; read for the ratchet idea only, not its interview, installs or hooks

## Stop and ask

Besides the standing list in CLAUDE.md:

- `develop`'s worst function or longest file is over the owner's limit after merging it in.
- Passing lint would need any file other than `eslint.config.js` changed.

## Next step

Waiting on the owner: answer the question under "Questions for me" and mark the card ready. Then merge `origin/develop`, re-measure, and add the block to `eslint.config.js` (A1).

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Both rules at error — decided for the owner: error, as the checklist and BACKLOG lines say (alternative: warn; `pnpm lint` is `eslint .` with no `--max-warnings`, so a warning never fails lint or CI).
- 2026-11-25: `max-lines` skips blank lines and comments — decided for the owner: skip both, so doc comments don't count against a file (alternative: count every line; `Tasks.tsx` is 1259 raw, 1151 counted).
- 2026-11-25: Tests get the same limits — decided for the owner: one block for all files, since the worst test function (27) and test file (613) are under the recommended limits (alternative: a looser block for `**/*.test.ts`).
- 2026-11-25: `complexity` uses ESLint's default `classic` variant — decided for the owner: classic (alternative: `variant: "modified"`, where a whole `switch` counts as 1).
- 2026-11-25: CHECKLIST.md keeps the line's trailing `new` marker, as the ticked "Lint fails on unused code" line does — decided for the owner: keep it (alternative: drop it on ticking).
- 2026-11-25: Owner (21:40:45): 20/500 at error for every file; tests 800 lines and no complexity limit; one override per file/function over the limits today, at its current value +2 complexity / +50 lines, each with a comment naming the card that will shrink it. Set ready by the foreman.
- 2026-11-25: Decided for the owner by the foreman: each override's comment names its Next up line ("Shrink <file or function> under the lint limits"), since those cards have no id yet; the PR body lists them and the foreman adds them to Next up (alternative: draft every shrink card first to get ids).
- 2026-11-25: Decided for the owner by the foreman: measure after T-0035 (PR #57, the Tasks record) merges into develop — it grows Tasks.tsx to 1484 lines — so the overrides fit the code they'll guard (alternative: measure now and let T-0035's lint fail).

## Questions for me

One question per line, in this shape; options are separated by `;`.

- [x] What limits should lint enforce (today's worst: complexity 41 in `runTier2`, 1151 lines in `Tasks.tsx`)? — Recommended: `complexity` 45 and `max-lines` 1250 for every file: passes today with about 10% room, catches only growth past today's worst, and leaves `Tasks.tsx` about 100 lines before "Tasks overhaul 3" would have to split it. Options: 20 and 500 for every file, with the 10 files over that today (`tier2.ts`, `tier2.test.ts`, `parse.ts`, `Checklist.tsx`, `Now.tsx`, `Tasks.tsx`, `now.ts`, `source.ts`, `live-shell.mjs`, `live-shell.test.ts`) named in a second block at 45 and 1250, so new files meet the tighter bar now; 20 and 500 for every file, which fails 9 functions and 4 files today and needs a refactor card first.

Owner, 21:40:45: neither as written. Use the second option, with each existing exception held near its own size: every file complexity 20 and max-lines 500, at error; test files max-lines 800 and no complexity limit; each file or function over those limits today gets its own override at its current value plus a little room (complexity +2, lines +50), listed in eslint.config.js with a comment naming the card that will shrink it. So an exception can't grow, and none is hidden in a blanket.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC):
question 21:31:29 → 21:40:45 9 min 16 s since 2026-11-25 21:29

```
Drafting measurement (read-only; develop's T-0034 files checked out temporarily, then restored):
$ pnpm exec eslint . --rule 'complexity: [warn, 1]' --rule 'max-lines: [warn, {max: 1, skipBlankLines: true, skipComments: true}]' -f json
137 files; complexity: 603 functions, max 41, p95 13, p99 26; max-lines: max 1151, p95 442, p99 961
$ pnpm lint
exit 0 (no limits set yet)
A1–A5: UNTESTED (nothing built yet)
```
