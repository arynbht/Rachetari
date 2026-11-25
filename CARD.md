# T-0039 · feat(kit): five clean-code lines in the starter checklist

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0039 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §4e-3 (and §4e's checklist bullet) · Gate: low

## Why

`/setup`'s starter checklist (step 4 of `kit/setup/SKILL.md`) checks that lint and
typecheck are clean, but nothing in it asks whether the repo catches unused code, sets
complexity and file-length limits, types strictly, looks for dead code, or runs the
comment report from T-0025. So a repo can pass its foundation lines while slop piles up.
This card adds those five lines, each with a check that runs, then re-runs `/setup` on
this repo so they show up in `CHECKLIST.md`. The lines that fail here are handed to the
foreman for Next up and are not fixed in this card.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: Step 4 of `kit/setup/SKILL.md` lists the five clean-code starter lines, each
      with its section and a check that runs: lint fails on unused code (quality: the
      linter's resolved config has its unused-vars rule at error); complexity and
      file-length limits are set (quality: `complexity` and `max-lines` at error, or the
      stack's equivalent); typecheck is strict (development: for TypeScript this is the
      catalog's `dev.typecheck.strict`, kept as that line and never written twice); a
      dead-code check runs (quality: knip for JS and TS, in a script and in CI, run by
      `/setup`); `/done` runs the comment report (quality: the repo's
      `.claude/skills/done/SKILL.md` calls `comment-report.mjs` and the script is there).
      Each is tagged `foundation`, like the other starter lines. Nothing outside step 4
      changes
      · check: the step-4 script below prints six `ok` lines and no `missing`;
      `git diff -U0 origin/develop...HEAD -- kit/setup/SKILL.md | grep '^@@'` shows hunks
      only inside step 4 (between `## 4.` and `## 5.`)
- [ ] A2: `/setup` ran once, headless, in this card's worktree, from this branch's
      `kit/setup/` (not the installed copy, see Constraints), after A1's commit. Its own
      commit (`chore(kit): set up the direction kit`) touches only `CHECKLIST.md`. Its
      cost, turns and duration are recorded, and its report (stage, counts, what it would
      have written elsewhere, the lines it would add to Next up) is in the PR body
      · check (local): the run's JSON: paste `total_cost_usd`, `num_turns`, `duration_ms`,
      `permission_denials` and `result` under Evidence; `git show --stat <its commit>`
      lists `CHECKLIST.md` only. CI can't run this (UNTESTED on CI)
- [ ] A3: Each of the five lines is in this repo's `CHECKLIST.md`, in its section, with a
      status, `· stage: foundation` (or the tag already there) and a `· check:` naming
      what ran. `dev.typecheck.strict` appears exactly once. T-0033's line script still
      passes
      · check: the five-lines script below prints five lines, each `<section>: <line>`
      with the right section, and no `missing`; `grep -c 'dev.typecheck.strict' CHECKLIST.md`
      prints `1`; T-0033's A3 script (in `cards/done/T-0033.md`) prints `lines checked`
      and nothing else
- [ ] A4: The new lines that fail here (`[ ]`, failed or unchecked) are listed in the PR
      body under "For Next up", one line each, for the foreman to add. `BACKLOG.md`'s
      Next up is not touched: the card's `BACKLOG.md` diff only appends Parked lines
      · check: `grep -nE '^- \[ \] ' CHECKLIST.md` filtered by the five-lines patterns,
      compared with `gh pr view --json body --jq .body | sed -n '/For Next up/,/^#/p'`
      (same lines); `git diff origin/develop...HEAD -- BACKLOG.md | grep '^[-+][^-+]'`
      prints only `+- 2026-…` Parked lines; `git diff --stat origin/develop...HEAD` lists
      only files in scope
- [ ] A5: The card's files pass prettier, and `ci` is green on the PR (the `kit/` change
      isn't docs-only, so lint, typecheck and test run)
      · check: `pnpm format` exits 0; `gh pr checks` shows `ci` passing

````bash
# A1: the five lines in step 4 (six patterns: file length may be "file-length" or "max-lines")
for p in 'unused' 'complexity' 'file-length|max-lines' 'dev\.typecheck\.strict' 'knip' 'comment-report'; do
  sed -n '/^## 4\./,/^## 5\./p' kit/setup/SKILL.md | grep -qiE -- "$p" && echo "ok $p" || echo "missing $p"
done

# A3: each new line, with its section
awk '/^```/{f=!f; next} f{next} /^## /{s=$2; next}
 /^- / && tolower($0) ~ /unused/ {print s ": " $0}
 /^- / && tolower($0) ~ /complexity/ {print s ": " $0}
 /^- / && $0 ~ /dev\.typecheck\.strict/ {print s ": " $0}
 /^- / && tolower($0) ~ /knip|dead[- ]code/ {print s ": " $0}
 /^- / && $0 ~ /comment report|comment-report/ {print s ": " $0}' CHECKLIST.md
# expected: quality (unused), quality (complexity and file length), development
# (dev.typecheck.strict), quality (knip), quality (comment report); print "missing <name>"
# by hand for any that doesn't appear
````

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `kit/setup/SKILL.md`: step 4's starter-lines bullet only (after T-0027 merges, see Stop and ask)
- `CHECKLIST.md`: written by the `/setup` run; then `prettier --write`
- `BACKLOG.md`: Parked appends only (CLAUDE.md rule 3). Cards never edit Next up
- `CARD.md`, `cards/done/T-0039.md`

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Making the failing lines pass: adding knip (a dependency), setting `complexity` or
  `max-lines` in `eslint.config.js` (lint config), installing the kit's `/done` into
  `.claude/skills/done/` (agent config). They go to the foreman as "For Next up"
- `kit/setup/templates/**`, steps 2, 3 and 5–7 of `kit/setup/SKILL.md` (T-0027 edits 2
  and 7), and `/done` itself
- Correcting other `CHECKLIST.md` lines the re-run reads wrongly (parked from T-0033's
  inspection); a fault seen in `/setup` during the run is parked, not fixed

## Constraints

- No new dependencies (knip is named in the check, not installed). No product code.
- Base `develop`: merge `origin/develop` in (no rebase) after T-0027 merges, before
  editing `kit/setup/SKILL.md`. Commit A1 first, then run `/setup`.
- One `/setup` run, from the worktree root in Git Bash, reading this branch's
  `kit/setup/SKILL.md` (not `~/.claude/skills/setup/`, which is an older copy and stays
  untouched), output kept in the builder's scratchpad. `Edit(...)` rules cover Write too;
  reads inside the worktree need no rule:

  ```bash
  NOTES="Nobody is here to answer; these are my answers. This run is card T-0039. Your /setup skill is ./kit/setup/SKILL.md in this worktree: read it and follow it as /setup, with \${CLAUDE_SKILL_DIR} meaning ./kit/setup. Do not use the Skill tool or anything under ~/.claude/skills (an older copy). Work on the current branch. Steps 2 and 3: write nothing (no CLAUDE.md change, no name.kit.md, no CONSTRAINTS.kit.md, no area skills); list in your report what you would have written. Step 4: update CHECKLIST.md as a re-run, keeping every existing line and edit, and add the starter lines it lacks. Step 6: don't edit BACKLOG.md; list in your report the lines you would add to Next up. Run checks read-only: no installs that change the lockfile, no pnpm dlx or npx, no gh writes, no pushes; a tool that isn't installed is recorded as missing. Step 7: commit CHECKLIST.md as the skill says, print the per-section counts, then stop."
  claude -p "$NOTES" --output-format json --max-budget-usd 10 --permission-mode default \
    --allowedTools "Edit(./CHECKLIST.md)" \
      "Bash(git status:*)" "Bash(git diff:*)" "Bash(git log:*)" "Bash(git show:*)" "Bash(git ls-files:*)" \
      "Bash(git branch:*)" "Bash(git add:*)" "Bash(git commit:*)" "Bash(pnpm:*)" "Bash(node:*)" \
      "Bash(gh api:*)" "Bash(gh pr checks:*)" "Bash(gh run list:*)" "Bash(gitleaks:*)" \
    --disallowedTools "Skill" "Bash(git push:*)" "Bash(pnpm add:*)" "Bash(pnpm dlx:*)" "Bash(npx:*)" \
      "Edit(./BACKLOG.md)" "Edit(./CLAUDE.md)" "Edit(./.claude/**)" "Edit(./kit/**)" \
    > "$SCRATCH/t0039-setup.json"
  ```

- If the run writes anything other than `CHECKLIST.md`, revert it in a follow-up commit
  (no amend, no rebase) and record it under Decisions.
- After the run: `pnpm exec prettier --write CHECKLIST.md`, committed on its own if it changes anything.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `docs/native-writing` — step 4's new lines are prose that `/setup` and the owner read

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0027 (`kit/setup/SKILL.md`, PR #50): start once it has merged into `develop`
- Any of the five lines can't be given a check that runs (a line `/setup` could only mark
  `unchecked`)
- The run fails, stops at the $10 cap, or needs to write any file but `CHECKLIST.md`: stop
  before a second run (a re-run keeps the first run's lines, so it isn't a clean retry)

## Next step

Wait for T-0027 to merge, merge `origin/develop` in, then write the five lines into step 4
of `kit/setup/SKILL.md` (A1).

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `low`, so `ready`: five files and five criteria, nothing on the stop-and-ask list (knip is named, not installed; no lint config or agent config changes), and nothing written outside the repo (next line).
- 2026-11-25: How `/setup` runs, decided for the owner: headless `claude -p`, as on T-0033, but reading this branch's `kit/setup/SKILL.md` directly instead of reinstalling `~/.claude/skills/setup/`. T-0033's approval of the reinstall was for that card and doesn't carry over. Alternative: reinstall again, which writes agent config and makes the card `needs you`.
- 2026-11-25: Where the starter lines live, decided for the owner: step 4's starter bullet in `kit/setup/SKILL.md`, beside the seven existing ones (the `CHECKLIST.md` template has no lines). Alternative: put them in `templates/CHECKLIST.md`, which would split the starter list in two.
- 2026-11-25: Sections, decided for the owner: unused code, complexity and file length, dead code and the comment report under quality; strict typecheck under development, as the catalog's `dev.typecheck.strict`, so a re-run never writes it twice. Alternative: all five under quality, with an id-less strict line that duplicates the catalog's.
- 2026-11-25: Stage tags, decided for the owner: all five `foundation`, as step 4 tags every starter line. Alternative: knip and the comment report at `building`.
- 2026-11-25: "The comment-slop check runs", decided for the owner: the line is "`/done` runs the comment report", checked by the repo's `.claude/skills/done/SKILL.md` calling `comment-report.mjs` with the script beside it. The report always exits 0, so running it can't fail a line, and the owner ruled out a CI gate (§4f). Alternative: run `node comment-report.mjs <base>` as the check.
- 2026-11-25: How failing lines reach Next up, on the line's rule (cards never edit Next up): listed in the PR body under "For Next up" for the foreman, not as `[checklist]` Parked lines, since that tag proposes a new checklist line and these are already in `CHECKLIST.md`. Only the five new lines go there; other lines whose result changed are listed in the PR body as changed. Alternative: also park each as `[checklist]`.
- 2026-11-25: Expected results here: unused code and strict typecheck pass (`typescript-eslint` recommended sets `no-unused-vars` to error; `"strict": true`); complexity and file length, knip, and the comment report fail (no limits in `eslint.config.js`, knip not installed, this repo's `/done` doesn't call the report until T-0027's `/done` is installed here). The builder records what the run actually finds.

## Questions for me

- [ ] (none)

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
