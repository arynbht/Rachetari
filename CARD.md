# T-0022 · feat(skills): take constraint-driven-development and playwright-cli

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0022 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §4d, `SHELVED.md` S-02 and S-03, issues #6 and #7 · Gate: low

## Why

T-0005 shelved the two most-used pilot skills, `constraint-driven-development` (always-on, 18 tasks) and `playwright-cli` (always-on, 28 of 32), only because Rivetari's scan needed an allowed line for each; both flagged lines warn against skipping checks rather than telling the agent to. The owner chose S-02 (a) and S-03 (b): take both unchanged at their pins, list them in `skills/INDEX.md`, and park `playwright-cli`'s unpinned install. The PR says `Closes #6` and `Closes #7`.

The two skills, from Rivetari's `packages/registry/manifests/*.yml` at `32f4b88` (area = the manifest's first sector, T-0005's rule):

| Skill                         | Folder                                           | Upstream at pin                                                                                                  | Manifest `hash`                                                           | Files                                                               |
| ----------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| constraint-driven-development | `skills/workflow/constraint-driven-development/` | addyosmani/agent-skills `skills/constraint-driven-development` @ `301b02b12bff98e4688e6984af6556802322bbde`, MIT | `sha256:5c2dcebe5a2359afc54d3efbdb481c7afd7521c6cb20e4af596cbd6da5d94227` | `SKILL.md`, `references/floor-guard.md`, `scripts/quality-gate.mjs` |
| playwright-cli                | `skills/testing/playwright-cli/`                 | microsoft/playwright-cli `skills/playwright-cli` @ `ce9b41b619c588c7dc0e89217d3469a70374acdd`, Apache-2.0        | `sha256:f4be5508fdcec8f3a4cf6698c861088e2bb2af57a8c8a6d3ee0f2604e9105110` | `SKILL.md`, ten `references/*.md`                                   |

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: Each folder is byte-identical to its upstream at the pin · check: fetch each pin with `gh api repos/<owner>/<repo>/tarball/<pin>`, copy the skill folder in; then `git archive HEAD skills/workflow/constraint-driven-development skills/testing/playwright-cli | tar -x -C <tmp>` and run Rivetari's `hashSkillDir` (`git -C <Rivetari> show 32f4b88:packages/registry/src/hash.ts`, as a scratchpad `node hash.mjs <dir>`) over each extracted folder: 2/2 equal the manifest `hash` in the table above; `grep -rlI $'\r'` over both folders prints nothing
- [ ] A2: Every file in both folders was read before copying; no line installs hooks, disables checks, fetches remote code at the agent's direction or tells the agent to ignore instructions, other than the two allowed lines (`constraint-driven-development/SKILL.md:294`, the `--no-verify` red flag; `playwright-cli/references/test-generation.md:405`, "Never skip hooks …") the install at `playwright-cli/SKILL.md:415`, and the scaffolder at `playwright-cli/references/test-generation.md:159` (`npm init playwright@latest`, allowed by the owner as a fourth line); the other lines reading found (`constraint-driven-development/SKILL.md:149-160` installs per user-picked dimension, `:264` post-edit hook advice, `playwright-cli/SKILL.md:4` pre-allowing `Bash(npx playwright:*)`) are explained in Evidence and in INDEX's reading note · check: reading notes plus `git grep -n -i -E "hook|settings\.json|no-verify|curl|wget|npx|npm (i|install)|pip |ignore (all|previous|the) " -- skills/workflow/constraint-driven-development skills/testing/playwright-cli`, each hit explained in Evidence
- [ ] A3: `skills/INDEX.md` lists both under "Taken" (area, when to use it, upstream, commit, license, used on a real task: `yes (always-on, 18 tasks)` and `yes (always-on, 28 of 32)`) and no longer under "Shelved"; the reading notes gain a line per skill (see Constraints), and the note for playwright-cli says its frontmatter pre-allows `npx playwright`, so it must stay a plain folder a card reads and never be installed under `.claude/skills/` · check: `grep -n "constraint-driven-development\|playwright-cli" skills/INDEX.md` shows two linked rows above `## Shelved` and none below it; `pnpm exec prettier --check skills/INDEX.md`
- [ ] A4: `SHELVED.md` S-02 and S-03 are marked taken, each with a `**Taken:** T-0022 (PR #<n>), option (a)` / `option (b)` line, the rest of each entry kept; the PR body has `Closes #6` and `Closes #7` · check: `grep -n -A9 "^## S-0[23] " SHELVED.md`; `gh pr view <n> --json body --jq .body | grep -n "Closes #[67]"`
- [ ] A5: `BACKLOG.md` "Parked" has two lines: the unpinned `npm install -g @playwright/cli@latest` (`playwright-cli/SKILL.md:415`) and the unpinned `npm init playwright@latest` (`playwright-cli/references/test-generation.md:159`) · check: `grep -n "@playwright/cli@latest\|npm init playwright@latest" BACKLOG.md` shows both, each `[product]`, `seen on T-0022`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `skills/workflow/constraint-driven-development/**` (new, copied unchanged)
- `skills/testing/playwright-cli/**` (new, copied unchanged)
- `skills/INDEX.md`
- `SHELVED.md` (the S-02 and S-03 entries only)
- `CARD.md`, `cards/done/T-0022.md`, `BACKLOG.md` (Parked lines only)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Editing either skill body: not the unpinned install line, not the dead `../../references` links, not `constraint-driven-development`'s step that adds a line to `AGENTS.md`/`CLAUDE.md`
- Any other shelved skill (S-04 to S-15), `webapp-testing` included, and the library install into `~/.claude/kit-skills/` (S-01)
- Installing `@playwright/cli` anywhere, or running `quality-gate.mjs` or `/setup`'s `CONSTRAINTS.md` against this repo

## Constraints

- No new dependencies. Skill bodies unchanged; `.prettierignore` already keeps `skills/**` (except `INDEX.md`) as upstream wrote it.
- `EXTRACTED.md` is not edited: its T-0005 section points at `skills/INDEX.md` for the list, upstream, commit and license, so the new rows are the record.
- INDEX reading notes to add: `constraint-driven-development` interviews the user (not in autonomous mode, it says) and asks to add a line to `AGENTS.md`/`CLAUDE.md`, which here is a stop-and-ask; it ships `scripts/quality-gate.mjs` (Node standard library only). `playwright-cli` suggests an unpinned global install (parked), and its state-save and cookie commands can write session tokens into files that must stay out of evidence and commits.
- CI runs the full set on this PR: `skills/**` isn't docs to `ci.yml`'s `code` filter, and `scripts/ci-scope.mjs` scopes a path outside every package to everything, so lint (`eslint .`, which reaches `quality-gate.mjs`), format, typecheck, tests and secret-scan all run. Also run them locally: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`, `gitleaks dir skills` if installed (else UNTESTED), and `gh pr checks <n>`.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- None: the work is a verified copy plus three record edits, and no listed skill matches it.

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0021 (`SHELVED.md`): it edits the S-17 entry, this card edits S-02 and S-03. If T-0021 isn't merged into `day/2026-11-25` when this card starts, branch from the latest day branch once it is, or keep the edits to those two entries so the merge is clean; a conflict in `SHELVED.md` is a stop.
- A hash doesn't match the manifest, a file has CRLF line endings (`.gitattributes` would rewrite it; changing that is config), or a file is binary.
- Reading turns up a line beyond the three named in A2 that installs hooks, disables checks, fetches remote code or says to ignore instructions.
- `eslint .` or any CI job fails on a copied file: the fix would be lint config (`eslint.config.js`) or a skill edit, both out of scope.

## Next step

Ready again with the owner's answers (A2, A3, A5 amended). Re-fetch with `gh api repos/microsoft/playwright-cli/tarball/ce9b41b619c588c7dc0e89217d3469a70374acdd` and `gh api repos/addyosmani/agent-skills/tarball/301b02b12bff98e4688e6984af6556802322bbde`, copy the two skill folders in unchanged, and carry on with A1.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate low and set ready by the drafter: nothing on the stop-and-ask list applies (`skills/` is the product library, not agent config), four files, five criteria
- 2026-11-25: A skill folder counts as one file for the five-file limit, since it is copied whole and checked by one hash
- 2026-11-25: `SHELVED.md` is kept (A4 marks S-02 and S-03 taken there) with `Depends on: T-0021`; `EXTRACTED.md` is avoided, since `skills/INDEX.md` already carries the provenance
- 2026-11-25: Drafter's feasibility check: both pins fetched by tarball hash to the manifest values (2/2), no CRLF; `quality-gate.mjs` at the pin passes `eslint --stdin` under this repo's config
- 2026-11-25: Foreman ruling: "Depends on: T-0021 (`SHELVED.md`)" is a shared file, not a dependency; T-0021 isn't in progress, so build now and edit only the S-02 and S-03 entries in `SHELVED.md`. If the merge later conflicts, the later card goes back to ready
- 2026-11-25: Stopped before copying (card's stop-and-ask: a line beyond A2's three fetches remote code); see "Questions for me"
- 2026-11-25: Owner (19:06): take both; fourth allowed line `test-generation.md:159`, parked; INDEX notes playwright-cli must never be installed under `.claude/skills/` (its frontmatter pre-allows `npx playwright`); `Closes #6`/`#7` go in the day-branch PR into main. A2, A3 and A5 amended. Set ready by the foreman.

## Questions for me

- [x] The PR targets `day/2026-11-25`, and GitHub only acts on `Closes #6`/`Closes #7` in a PR merged into the default branch, so these won't close the issues on their own. Recommended: the foreman's day-branch PR into `main` repeats `Closes #6` and `Closes #7` (otherwise close both by hand after that merge).
- [x] Reading turned up lines beyond the three A2 names, which this card says is a stop. (1) `playwright-cli/references/test-generation.md:159`: "If there is no Playwright install, bootstrap one and let the user pick the defaults:" then `npm init playwright@latest`, an unpinned scaffolder the agent runs, the same kind as `SKILL.md:415`. (2) `constraint-driven-development/SKILL.md:149-160`: Step 4's table gives an install per dimension (`pip install mypy`, `pip install pytest-cov`, `pipx install semgrep`, `brew install gitleaks`, `brew install osv-scanner`, seven `npm i -D …`), run after the user picks that dimension in the interview. (3) `constraint-driven-development/SKILL.md:264`: escalation level 2 wires `npm run check` "into your agent's post-edit hook and your CI" and says most projects should stop there. (4) Minor: `playwright-cli/SKILL.md:4` pre-allows `Bash(npx playwright:*)`, and `npx` without `--no-install` downloads the package when it's missing. Recommended: (a) take both unchanged anyway; amend A2 to name (1) as a fourth allowed line and explain (2) to (4) in Evidence as user-chosen or descriptive (here any install, hook or agent-config change is already a stop-and-ask under CLAUDE.md); amend A5 to two Parked lines (add `npm init playwright@latest` at `test-generation.md:159`); add (2) and (3) to the INDEX reading note for `constraint-driven-development`. Or (b) take `constraint-driven-development` only and leave S-03 shelved with (1) added to its entry

  Owner, 19:06: (1) as recommended: take both unchanged, allow `test-generation.md:159` as a fourth line and park it, record the rest in Evidence and INDEX; add to INDEX's note for playwright-cli that its frontmatter pre-allows `npx playwright`, so it must stay a plain folder a card reads and never be installed under `.claude/skills/`. (2) as recommended: the day-branch PR into main repeats `Closes #6` and `Closes #7`.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  blocked → ready  18:27:57 → 19:06:23   38 min 26 s
```

Half-done, AB_Rouge, 2026-11-25 (nothing copied into the repo yet; no criterion ticked):

```
$ node hash.mjs <scratch>/…/skills/constraint-driven-development <scratch>/…/skills/playwright-cli   # hashSkillDir from Rivetari 32f4b88:packages/registry/src/hash.ts
sha256:5c2dcebe5a2359afc54d3efbdb481c7afd7521c6cb20e4af596cbd6da5d94227  constraint-driven-development   (manifest: equal)
sha256:f4be5508fdcec8f3a4cf6698c861088e2bb2af57a8c8a6d3ee0f2604e9105110  playwright-cli                  (manifest: equal)
$ grep -rlI (a carriage return) <both upstream folders>   → no output (exit 1)
$ file <every file>   → all text (UTF-8 or ASCII); no binaries
Files read: constraint-driven-development 3 (SKILL.md 319 lines, references/floor-guard.md 182, scripts/quality-gate.mjs 45); playwright-cli 11 (SKILL.md 493, ten references/*.md)
A2 grep over the upstream folders: 10 hits in constraint-driven-development, 19 in playwright-cli; the ones beyond A2's three are in "Questions for me"
```
