# T-0069 · feat(kit): a merge-card step that merges, checks, reports and parks in one command

Status: ready
Branch: card/T-0069 · Held by: nobody
Created: 2026-11-26 · Source: breathband-console pilot, night of 2026-11-26 (`nights/2026-11-26.md` "Rachetari feedback"; raw log 04:05, 12:24) · Gate: low (3 files, 5 criteria, nothing on the stop-and-ask list)

## Why

On the breathband-console pilot the lead hand-typed the merge, check and push sequence 38 times. One chained command left two worktrees mid-merge after a conflict (04:05). The morning report was written only at the end, so the crash at 04:53 lost it. The day's ledger times were estimated rather than read from a clock and are off by hours against git (T-0138 "merged 21:50" in the ledger, 15:02 in git). And 136 parked lines in merged cards never reached `BACKLOG.md`. SCOPE.md's night runner is "one small script" that doesn't exist yet; this is its merge step.

## Acceptance criteria

- [ ] A1: `node kit/runner/merge-card.mjs <id> --into <base> --check "<command>"`, run in the base branch's worktree, merges `card/<id>` into `<base>` with `--no-ff`. On a conflict it runs `git merge --abort`, leaves `git status --porcelain` empty, pushes nothing and exits non-zero naming the conflicting files · check: `merge-card.test.ts` › "a conflict leaves the tree clean and pushes nothing"
- [ ] A2: If the check command fails after the merge, `<base>` is reset to the commit it had before the run, nothing is pushed, and the exit is non-zero with the check's last 40 lines of output · check: `merge-card.test.ts` › "a failing check undoes the merge"
- [ ] A3: On success the merge commit moves `CARD.md` to `cards/done/<id>.md` and appends the card's "## Parked" lines (if any) to the end of `BACKLOG.md`'s "## Parked" list, skipping lines already there; then `<base>` is pushed · check: `merge-card.test.ts` › "a merge moves the card and parks its lines" (temp repo with a bare origin)
- [ ] A4: After every successful merge it appends one row to `nights/<date>.md` (`--report <path>` overrides; created with a heading if absent): card id, title from the card's first line, merge time read from the clock as `HH:MM` local, and the merge commit's short hash. Earlier rows are never rewritten, so a crash mid-night leaves every merge so far in the report · check: `merge-card.test.ts` › "each merge appends a report row with the clock's time" (clock injected)
- [ ] A5: Repo checks pass and the script runs for real once · check: `pnpm test`, `pnpm lint`, `pnpm typecheck`; and one run against `node scripts/kit-trial.mjs`'s scratch repo with a card branch made by hand, output pasted

## Files in scope

- `kit/runner/merge-card.mjs` (new)
- `kit/runner/merge-card.test.ts` (new)
- `vitest.config.ts` (changed: one `inOneFork("kit/runner/**")` line, because the test spawns git)
- `CARD.md`

## Out of scope

- Merging the base into the card branch and re-checking before review (the lead still does that step; a later runner card can add it).
- Opening or updating PRs, drafting follow-up cards from review suggestions, or any change to SCOPE.md or docs/army-mode.md (T-0070 documents this script).
- A ref check before fetching (the corrupt-ref crash on the pilot): parked for its own card.

## Constraints

- No new dependencies: Node's `child_process`, `fs` and `path` only, in the style of `scripts/kit-trial.mjs`.
- Never `--force`, never rebase, never push anything but `<base>`; refuse to run if `<base>` is `main` or the repo's default branch.
- Times come from the clock (`new Date()`, injectable for tests); the script never takes a time as an argument.

## Skills

## Stop and ask

Besides the standing list in CLAUDE.md:

- If the test needs anything outside the fork list to run reliably on Windows.

## Next step

Build: write the failing tests for A1–A4 against a temp repo with a bare origin, then the script.

## Decisions

- 2026-11-26: The script lives in `kit/runner/`, not `scripts/`, because the night runner ships with the kit to other repos (the pilot's lead ran in breathband-console) and `kit/**` tests are already collected by vitest — decided for the owner (alternative: `scripts/` plus a vitest include line).
- 2026-11-26: No `package.json` script; it's run as `node <rachetari>/kit/runner/merge-card.mjs` from the target repo — decided for the owner (alternative: a `pnpm merge-card` script, which only works inside this repo).

## Questions for me

## Parked

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```

```
