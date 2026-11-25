# T-0047 · ci: require Ubuntu on PRs; Windows runs but is advisory

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0047 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §CI: Windows not required on PRs; §The line, Speed-ups (_CI_) · Gate: needs you

## Why

Every PR waits on six Windows jobs (lint, typecheck, three test shards), and the `ci`
aggregator fails the PR when any of them fails, so a Windows-only flake holds a card
that is green on Ubuntu. The owner's speed-up (2026-11-25, 22:00): on PRs only the Ubuntu
jobs are required; Windows still runs on every PR and the inspector reports a red Windows
run in its notes; Windows stays required on `develop`, where `build-test` runs on every
push.

The design: job-level `continue-on-error` on the Windows legs of `lint`, `typecheck` and
`test` for PRs, so a failing Windows leg shows its red X on the PR while the job's
result, as `ci` reads it through `needs`, stays a pass. `ci`'s `needs` and its results
loop don't change. One more line is needed: `lint` and `typecheck` end with a "Cancel the
rest of the run" step on failure, which would cancel the Ubuntu legs too and turn `ci`
red, so that step skips the advisory legs.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: In `.github/workflows/ci.yml`, `lint`, `typecheck` and `test` each carry, at
      job level,
      `continue-on-error: ${{ matrix.os == 'windows-latest' && github.event_name == 'pull_request' && github.base_ref != 'main' }}`.
      The `&cancel` step's condition becomes
      `failure() && !(matrix.os == 'windows-latest' && github.event_name == 'pull_request' && github.base_ref != 'main')`.
      The header comment and the comment above `ci` say that on PRs (except PRs into
      `main`) the Windows legs run but are advisory: a red Windows leg shows on the PR
      and the inspector reports it, `ci` stays green on Ubuntu, and `develop`'s pushes
      still run `build-test` on both OSes. Nothing else in the file changes: `changes`,
      `secret-scan`, `desktop-e2e`, `build-test`, `ci`'s `needs`, its `if` and its loop
      are as they were · check: the A1 script below prints `continue-on-error 3`,
      `cancel gated 1`, `build-test 0` and `ci block unchanged`;
      `git diff -U0 origin/develop...HEAD -- .github/workflows/ci.yml | grep '^@@'` shows
      hunks only in the header, `lint`, `typecheck`, `test`, the cancel step and the
      comment above `ci` (diff pasted under Evidence)
- [ ] A2: A Windows-only failure leaves `ci` green on a PR. On this card's PR, a commit
      adds a temporary last-but-one step to `lint`
      (`name: Proof (temporary, T-0047)`, `if: matrix.os == 'windows-latest'`,
      `run: exit 1`, placed before `*cancel`); on that run `lint (windows-latest)`
      concludes `failure`, `lint (ubuntu-latest)` and every Ubuntu `typecheck`/`test` leg
      conclude `success` (not `cancelled`), and `ci` concludes `success` with its
      "upstream results:" line holding no `failure` or `cancelled`. The next commit is a
      `git revert` of that one (never a force-push) · check: the A2 script below on that
      run's id, output pasted; `gh pr checks <PR>` on that run shows
      `lint (windows-latest)` as `fail` and `ci` as `pass`
- [ ] A3: After the revert, the PR's own run has every leg of `lint`, `typecheck` and
      `test` on both OSes run (none skipped: `.github/**` is in the `full` filter) and
      pass, with `secret-scan`, `desktop-e2e` and `ci` passing. That run is also the
      parse check: an invalid workflow file gives a run with no jobs · check:
      `gh pr checks <PR>` (pasted), every line `pass`
- [ ] A4: `main` and pushes keep their meaning: `main`'s branch protection still requires
      `ci` only, and a PR into `main` keeps Windows required (`base_ref` is `main`, so
      `continue-on-error` is false and the cancel step runs as before); `build-test` has
      no `continue-on-error` and is untouched, so a red Windows `build-test` still turns
      `develop`'s push run red · check:
      `gh api repos/arynbht/Rachetari/branches/main/protection/required_status_checks --jq .contexts`
      prints `["ci"]`; A1's script prints `build-test 0`; the PR-into-`main` path is read
      from the expression, not run (UNTESTED on CI: it needs a PR into `main`); after the
      merge the foreman confirms `develop`'s next push run lists
      `build-test (windows-latest)` (post-merge, not ticked by the builder)
- [ ] A5: The card's files are formatted and only they changed · check:
      `pnpm exec prettier --check .github/workflows/ci.yml CARD.md` exits 0;
      `git diff --stat origin/develop...HEAD` lists only `.github/workflows/ci.yml`,
      `CARD.md` and `cards/done/T-0047.md`

```bash
# A1 (run from the worktree root)
f=.github/workflows/ci.yml
expr="matrix.os == 'windows-latest' && github.event_name == 'pull_request' && github.base_ref != 'main'"
echo "continue-on-error $(grep -cF "    continue-on-error: \${{ $expr }}" $f)"
echo "cancel gated $(grep -cF "if: failure() && !($expr)" $f)"
echo "build-test $(awk '/^  build-test:/,/^  # The one check/' $f | grep -c continue-on-error)"
# MSYS_NO_PATHCONV: Git Bash would otherwise rewrite the rev:path argument
diff <(MSYS_NO_PATHCONV=1 git show "origin/develop:$f" | sed -n '/^  ci:/,$p') \
  <(sed -n '/^  ci:/,$p' $f) && echo "ci block unchanged"

# A2 (RUN = the run of the proof commit:
#   gh run list --branch card/T-0047 --event pull_request -L 5 --json databaseId,headSha,displayTitle)
gh run view "$RUN" --json jobs --jq '.jobs[] | "\(.name)\t\(.conclusion)"'
CI_JOB=$(gh run view "$RUN" --json jobs --jq '.jobs[] | select(.name == "ci") | .databaseId')
gh run view "$RUN" --log --job "$CI_JOB" | grep "upstream results"
```

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `.github/workflows/ci.yml`: the three `continue-on-error` lines, the cancel step's
  `if`, the header comment and the comment above `ci`; A2's temporary step and its revert
- `CARD.md`, `cards/done/T-0047.md`

## Out of scope

Named on purpose, so the session doesn't drift into them.

- `build-test`, `desktop-e2e`, `secret-scan`, `changes` and `scripts/ci-scope.mjs`: the
  push pipeline and the path filter stay as they are
- Branch protection and rulesets (`main` requiring `ci`, `develop`'s ruleset): read, never
  changed
- How the inspector reports a red Windows leg: that's the line's rule in the queue doc
  and the foreman's prompt, not this file
- Fixing whatever Windows-only failure turns up: parked, not fixed

## Constraints

- No new dependencies and no new permissions (no `actions: read` for the aggregator).
- No force-push, rebase or `--no-verify`: A2's proof is a commit and its `git revert`,
  both pushed; they stay in the branch's history.
- `actionlint` isn't installed here and isn't added; the PR's run is the parse check.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- None: no listed skill fits a five-line workflow change.

## Stop and ask

Besides the standing list in CLAUDE.md (CI config: the owner approved this change, see
Decisions; anything beyond A1's lines is a new stop):

- A2's run shows `ci` red because `needs.lint.result` reads `failure` (GitHub's docs don't
  say what a job with `continue-on-error` reports to `needs`). The fallback, `ci` reading
  each leg through the jobs API, needs `actions: read` and is the owner's call
- A2's run shows an Ubuntu leg `cancelled` even with the cancel step gated
- GitHub rejects the `continue-on-error` expression (A3's run has no jobs)

## Next step

Ready: A1's edit to `.github/workflows/ci.yml`, push and open the draft PR into
`develop`; then A2's proof commit, its run, the revert; then A3 to A5.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `needs you` (CI config); the owner approved the change itself on
  2026-11-25 (22:00, §The line, Speed-ups); the card's design is what's checked.
- 2026-11-25: The mechanism, decided for the owner: job-level `continue-on-error` on the
  Windows legs, `ci` unchanged (alternative: split `ci` to read only the Ubuntu legs,
  which `needs` can't tell apart without splitting the matrices or calling the jobs API).
  GitHub docs, https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idcontinue-on-error:
  "Prevents a workflow run from failing when a job fails. Set to `true` to allow a
  workflow run to pass when this job fails.", with the example "Preventing a specific
  failing matrix job from failing a workflow run" (`continue-on-error: ${{ matrix.experimental }}`).
  The `needs` context
  (https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#needs-context)
  lists `success`, `failure`, `cancelled`, `skipped` and doesn't say what a
  `continue-on-error` job or a matrix reports, hence A2's run and the stop-and-ask.
- 2026-11-25: The cancel step skips the advisory legs; without that a Windows `lint` or
  `typecheck` failure runs `gh run cancel`, cancels the Ubuntu legs and turns `ci` red.
- 2026-11-25: PRs into `main`, decided for the owner: Windows stays required there
  (`github.base_ref != 'main'`), so `main`'s required `ci` means what it did
  (alternative: advisory on every PR, relying on `develop`'s `build-test` having run on
  the same commits).
- 2026-11-25: The proof, decided for the owner: a failing-step commit and its revert on
  this card's own PR, one extra run of about 3 minutes (alternative: a throwaway PR never
  merged, which leaves a branch and a closed PR to clean up).
- 2026-11-25: The parse check, decided for the owner: GitHub's own run on the PR
  (alternative: `actionlint` through Docker, a new tool here; `gh workflow view` only
  prints the file).

## Questions for me

One question per line, in this shape; options are separated by `;`.

- (none: the owner approved the change; the forks above are logged as decided)

## Parked

Lines noticed while drafting, not this card's work.

- `ci.yml`'s comment above `build-test` says "Main and nightly", but it runs on every push
  to `develop` too.
- `docs/queue-2026-11-25.md` §Branches says "`ci` runs on every push to `develop`"; the
  `ci` job is PR-only, and a push runs `build-test` (the run, not `ci`, is what goes red).

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  none (owner approved the change)
```
