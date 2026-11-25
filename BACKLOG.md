# Backlog

Three lists. I order "Next up". Sessions only ever append to "Parked".

## Next up

Ordered. The top line becomes the next `CARD.md`.

1. Shell: live shell, part 1 (T-0030): the script and dev mode with watching; parts 2 and 3 follow — `develop` read from the newer of local and origin, background fetch every 60 s, `scripts/live-shell.mjs` keeps a tested, fast-forwarded dev-mode worktree, header shows commit, "showing develop", "fetched N s ago" and a behind warning (low) · from `docs/queue-2026-11-25.md` §Shell: live shell
2. Shell: live shell part 2, the display branch: the file source reads `develop` from the newer of local and origin, falling back to the default branch, replacing T-0018's `day/*` reading; "showing develop" in the header of Now, Tasks and Checklist (low; after T-0024) · from `docs/queue-2026-11-25.md` §Shell: the display branch
3. Shell: live shell part 3: background fetch of every registered repo every 60 s; the header shows the running commit, "fetched N s ago", a failed fetch and a behind warning (low; after T-0024 and T-0026) · from `docs/queue-2026-11-25.md` §Shell: live shell
4. Checklist by section, part 2: run `/setup` on this repo, move its checklist into `CHECKLIST.md`, show the per-section counts (needs you; after 4h and the kit reinstall) · from `docs/queue-2026-11-25.md` §4g. Checklist by section: the kit
5. Checklist by section, the shell (T-0034, part 1: the Checklist tab): per-section strip, ordering, Home's worst section (after 4g merges) · from `docs/queue-2026-11-25.md` §4h
6. Checklist by section, the shell, part 2: Home shows each repo's stage and its section with the most gaps (low; after T-0034) · from `docs/queue-2026-11-25.md` §4h. Checklist by section: the shell
7. Tasks overhaul 2: layout and columns, after the owner picks a design (needs you) · from `docs/queue-2026-11-25.md` §Tasks overhaul 2
8. Tasks overhaul 3: record header and tabs, after overhaul 2 (needs you) · from `docs/queue-2026-11-25.md` §Tasks overhaul 3
9. Shell: CI state for `develop` and each card's PR via the gh CLI's existing sign-in, read-only (needs you; S-16 option (b)) · from `docs/queue-2026-11-25.md` §Shell: CI state
10. Timeouts on the shell's git calls (T-0024): `fetchRepo` and each read call get a timeout (limits proposed in the card); a call past it fails with a message in the repo's error box and the Fetch button recovers; tested with a git that hangs. Until this merges, a fetch-test hang in CI gets one re-run of that job, noted on the PR · from `docs/queue-2026-11-25.md` §Timeouts on the shell's git calls
11. Shell action: "mark ready" as a plain commit on the card's branch, previewed first (needs you) · from `docs/queue-2026-11-25.md` §Shell action: mark ready
12. Questions panel answers: accept recommended (per question and per card) and a free-text answer, each a previewed plain commit (needs you; after T-0026) · from `docs/queue-2026-11-25.md` §Questions panel: answers
13. (paused) Clean code 2 (T-0025): the comment-slop check, report first, then bring it over if it's ~150 lines or fewer · from `docs/queue-2026-11-25.md` §4f
14. (paused) Clean code 1b (T-0027): `/done` deslops the card's diff first and commits it on its own, with 4f's comment report; `/setup` always copies `quality/deslop`; `/done` skips deslop when it's missing (needs you; after T-0023 and 4f) · from `docs/queue-2026-11-25.md` §4e-2. Clean code, part 1b: /done deslops first
15. (paused) Kit and scope: `SCOPE.md` and the kit's CLAUDE.md section describe `develop` · from `docs/queue-2026-11-25.md` §Kit and scope: describe develop
16. (paused) Clean code 1c: the five starter checklist lines, each with a check that runs, then `/setup` re-run on this repo (after 4g) · from `docs/queue-2026-11-25.md` §4e-3. Clean code, part 1c: the starter checklist lines
17. (paused) Army mode, design only: a one-page proposal in `docs/` for running N cards at once as the night runner with a width setting (picking ready cards with no overlapping files in scope and no dependencies, one worktree and one agent per card, the lead session's job, questions and holds, usage limits, what the shell shows); no code; lists changing SCOPE.md's two-session cap as a decision for the owner · from `docs/queue-2026-11-25.md` §Army mode, design only
18. (paused) Set a coverage floor once the review tests land · from checklist "coverage floor"

## Parked

Anything noticed while working on something else. One line, no fixing.
Format: `- YYYY-MM-DD [product|tool|checklist] <what> · seen on T-NNNN · <file or command>`

- 2026-11-25 [tool] `ci-scope.mjs` has no test: its only test checked it against tier 1's `workspace.ts`, which stayed behind · seen on T-0001 · `scripts/ci-scope.mjs`
- 2026-11-25 [checklist] Set a coverage floor after T-0004; Rivetari's was 52/77/75/52 on a different codebase · seen on T-0001 · `vitest.config.ts`
- 2026-11-25 [tool] `build-test` (main and nightly, both OSes) has never run here; it first runs when something merges · seen on T-0001 · `.github/workflows/ci.yml`
- 2026-11-25 [product] Package descriptions and repository URLs still describe Rivetari ("auditor and scaffolder", `arynbht/Rivetari.git`) · seen on T-0001 · `package.json`, `packages/*/package.json`
- 2026-11-25 [tool] A PR runs 10 jobs, 6 of them on Windows, which a private repo bills at 2x minutes · seen on T-0001 · `.github/workflows/ci.yml`
- 2026-11-25 [checklist] Nothing requires `ci` before a merge to main (no branch protection or ruleset) · seen on T-0001 · `gh api repos/arynbht/Rachetari/branches/main/protection`
- 2026-11-25 [tool] `/setup` says to read "this skill's own `templates/` folder" without `${CLAUDE_SKILL_DIR}`; it worked here because the session is told the skill's base directory · seen on T-0003 · `kit/setup/SKILL.md`
- 2026-11-25 [tool] The kit's skills lack `disable-model-invocation: true`, so Claude may start `/setup`, `/done` or `/handoff` on its own · seen on T-0002 · `kit/setup/**/SKILL.md`
- 2026-11-25 [tool] The `/setup` template's example lines (Next up placeholder, two example Parked lines, two repo-specific checklist placeholders) have no rule for what happens to them in a real backlog · seen on T-0003 · `kit/setup/templates/BACKLOG.md`
- 2026-11-25 [tool] `desktop-shell.md` is wrong in places: `electron-builder.yml` is in `apps/desktop/`, `docs:read` and two pushes aren't zod-checked, `docs:read` reads any file · seen on phase 0 · `files/desktop-shell.md`
- 2026-11-25 [product] The hallmark skill ships `scripts/install-hook.mjs` (a PostToolUse hook installer) and still scanned clean; the old scan only matched hook declarations · seen on phase 0 · `inventory/skills.md`
- 2026-11-25 [product] The trimmed impeccable fork's pin `9563f828` is reachable only from branch `rivetari` of `arynbht/impeccable`; deleting that branch orphans it · seen on phase 0 · `inventory/skills.md`
- 2026-11-25 [product] Shell gaps carried over, not fixed in the transplant: no single-instance lock, silent Add errors on Home, the Docs loading text, in-page anchor links · seen on phase 0 · `files/desktop-shell.md`
- 2026-11-25 [product] `review --pr` error text still names "Rivetari's App installed on the repo", which was cut · seen on T-0004 · `packages/cli/src/commands/review.ts:60`
- 2026-11-25 [product] The CLI still describes itself as "An auditor and scaffolder for GitHub repositories" · seen on T-0004 · `packages/cli/src/cli.ts:10`
- 2026-11-25 [tool] The review withholds `redact.ts`, `redact.test.ts` and `tier2.test.ts` as "looks like it holds a secret" (fake tokens in tests), so it never reviews its own redaction · seen on T-0004 · review on PR #4
- 2026-11-25 [tool] One review of PR #4 (45 files, 123k tokens) cost an estimated $1.02 at medium effort · seen on T-0004 · `review --pr 4`
- 2026-11-25 [tool] Reviews on your own PR can only be COMMENT (GitHub refuses REQUEST_CHANGES from the author), so a blocking finding shows only in the body · seen on T-0004 · `packages/runtime/src/judge/review.ts`
- 2026-11-25 [product] The addyosmani skills link to sibling skills and `../../references/*.md` that aren't in `skills/`; the links are dead · seen on T-0005 · `skills/workflow/*/SKILL.md`
- 2026-11-25 [product] `webapp-testing`'s `with_server.py` pipes server output without reading it, so a chatty dev server can hang it (if the skill is ever taken) · seen on T-0005 · S-15
- 2026-11-25 [product] `data-inventory-mapping`'s example company "Vanguard Financial Services" reads like a real brand · seen on T-0005 · `skills/legal/data-inventory-mapping/assets/template.md`
- 2026-11-25 [tool] The old skill scan matches hook declarations but not hook-installer code or remote scripts in HTML (hallmark, skill-creator); reading each body caught them · seen on T-0005 · `SHELVED.md` S-12, S-13
- 2026-11-25 [tool] `r28-forged-marker.test.ts` timed out at 30 s once in a full run that took 391 s (machine under load); alone it takes under 1 s and the rerun passed in 27 s · seen on T-0006 · `pnpm test`
- 2026-11-25 [product] The sidebar's empty text still says "Add a local folder to audit it" and the title still says "Rivetari" · seen on T-0006 · `apps/desktop/src/renderer/App.tsx`
- 2026-11-25 [product] The Docs list shows "No Markdown docs found under docs/ or .rivetari/" while still loading, and names fewer folders than it searches (known gap, carried over) · seen on T-0011 · `apps/desktop/src/renderer/components/Docs.tsx`
- 2026-11-25 [product] `docs:read` replies aren't zod-checked in main (carried over from the source) · seen on T-0011 · `apps/desktop/src/main/index.ts`
- 2026-11-25 [tool] `/setup` can't install the four command skills without a person: writes into `.claude/` need approval, which headless mode can't give · seen on T-0015 · `docs/kit-trial-2026-11-25.md`
- 2026-11-25 [tool] `/setup` found its templates only once reads of `~/.claude/skills/setup/` were allowed; headless mode refuses them by default · seen on T-0015 · `kit/setup/SKILL.md`
- 2026-11-25 [tool] `/setup` doesn't say whether to branch or commit; both trial runs branched and committed nothing · seen on T-0015 · `kit/setup/SKILL.md`
- 2026-11-25 [tool] `/setup`'s "DESIGN.md if there is UI" reads two ways: one run wrote a no-UI DESIGN.md, the other skipped it · seen on T-0015 · `kit/setup/SKILL.md`
- 2026-11-25 [tool] `/done` says to set `blocked` on any failure, but CLAUDE.md says to stop on a draft card; on a draft the trial session kept `draft` and wrote no evidence · seen on T-0015 · `kit/setup/templates/skills/done/SKILL.md`
- 2026-11-25 [tool] `/park` doesn't say whether to commit the line; it stays uncommitted until something else commits it · seen on T-0015 · `kit/setup/templates/skills/park/SKILL.md`
- 2026-11-25 [tool] A test that drives real git hung once on Windows CI: `source.test.ts › only sees a card pushed from another machine after a fetch` hit 30 s on PR #30 (run 45663184235, attempt 1) but takes 515–656 ms locally (20 runs) and 961 ms on the CI re-run; vitest reported the timeout, so the wait was in an async git call (`readLiveCards` or `fetchRepo`, which runs `git fetch --all --prune` with no timeout of its own) · seen on T-0016 · `apps/desktop/src/main/kit/source.ts`
- 2026-11-25 [product] `fetchRepo` has no timeout, so a hung `git fetch` would leave the shell's Fetch waiting forever · seen on T-0016 · `apps/desktop/src/main/kit/source.ts:322`
- 2026-11-25 [checklist] The checklist's "`ci` is required before a merge to main" line still reads failing (404), but `ci` has been required since today; `/setup` hasn't been re-run · seen on T-0016 · `gh api repos/arynbht/Rachetari/branches/main/protection`
- 2026-11-25 [tool] `/setup` on the default branch creates `chore/kit-setup`, with no rule for a re-run when that branch already exists · seen on T-0017 · `kit/setup/SKILL.md`
- 2026-11-25 [tool] Deleting a "Next up" line makes prettier renumber every line below it, so two cards closing at once both rewrite those lines in BACKLOG.md · seen on T-0017 · `BACKLOG.md`
- 2026-11-25 [product] A draft with no `Gate:` line raises nothing in Needs you; the kit's `/card` and `cards/TEMPLATE.md` don't write a gate yet · seen on T-0019 · `kit/setup/templates/CARD.md`
- 2026-11-25 [tool] `BACKLOG.md merge=union` suits the append-only Parked list but stacks an ordered, renumbered list like Next up; Next up may need its own file · seen on T-0017 · `.gitattributes`
- 2026-11-25 [product] Needs you runs several questions for one card together on one line; each question should be its own row · seen on the line · `apps/desktop/src/main/engine/now.ts`
- 2026-11-25 [product] The Docs viewer's ☑ draws as a colour emoji on Windows (Segoe UI Emoji picks it up), while ☐ stays a plain text glyph, so ticked and unticked boxes differ in size and colour; a U+FE0E text selector or a font choice would even them · seen on T-0020 · `apps/desktop/src/renderer/lib/markdown.ts`
- 2026-11-25 [tool] `skills/INDEX.md`'s "Used on a real task" column cites Rivetari's card ids (`animate`: "routed on T-0026, abandoned before build"), which collide with this repo's own ids · seen on T-0026 · `skills/INDEX.md`
- 2026-11-25 [product] An empty `Gate:` (no value) parses as null and raises nothing, though a gate line is written; it arguably should ask, like any gate that is not `low` · seen on T-0019 inspection · `apps/desktop/src/main/kit/parse.ts`
- 2026-11-25 [product] `playwright-cli` suggests an unpinned global install, `npm install -g @playwright/cli@latest`, when the CLI is missing; a pinned version installed ahead of time would keep runs reproducible · seen on T-0022 · `skills/testing/playwright-cli/SKILL.md:415`
- 2026-11-25 [product] `playwright-cli` bootstraps a missing Playwright install with the unpinned scaffolder `npm init playwright@latest` · seen on T-0022 · `skills/testing/playwright-cli/references/test-generation.md:159`
- 2026-11-25 [tool] GitHub ignores `BACKLOG.md merge=union`, so a card PR whose Parked lines meet the day branch's shows CONFLICTING though `git merge-tree` and the foreman's local merge are clean (PR #37) · seen on the line · `.gitattributes`
- 2026-11-25 [product] The parser reads only a question's first line, so a question written over several lines (T-0020's numbered options) loses its options in Needs you and the Questions panel · seen on T-0026 · `apps/desktop/src/main/kit/parse.ts`
- 2026-11-25 [product] `- [ ] None.` (T-0017) is read as an open question; only `(none)` and `<…>` are skipped as placeholders · seen on T-0026 · `apps/desktop/src/main/kit/parse.ts`
- 2026-11-25 [product] The salvaged fence test's "climbed" path (`join(repo, "..", basename(other))`) no longer reaches the real other folder under `kitFixture`'s layout, so a fence that refused any missing path would also pass; `join(repo, relative(repo, other))` would restore it · seen on T-0021 inspection · `apps/desktop/e2e/registered-repos.e2e.ts:108`
- 2026-11-25 [product] `vitest.config.ts`'s comment above `include` still says it discovers tests "across all workspace packages", but `kit/**/*.test.ts` isn't a package; the card's scope allowed the `include` line only · seen on T-0023 · `vitest.config.ts:15`
- 2026-11-25 [tool] An installed personal `~/.claude/skills/setup` shadows a repo's own `.claude/skills/setup`, so headless `/setup` in the kit-trial scratch repo ran the old installed copy ($0.98 spent); the trial reran the new one renamed `setup-trial` · seen on T-0029 · `claude -p "/setup"`
- 2026-11-25 [tool] `scripts/kit-trial.mjs` makes its first scratch commit with `--no-verify` (the scratch repo has no hooks, so it does nothing, but the line rules forbid the flag) · seen on T-0029 · `scripts/kit-trial.mjs:70`
- 2026-11-25 [tool] `pnpm --filter @arynbht/rivetari-desktop e2e -- questions.e2e.ts` runs the whole e2e suite, not the one file: pnpm passes the `--` on to `playwright test` as an argument; `pnpm --filter … exec playwright test questions.e2e.ts` (after a build) runs one · seen on T-0026 · `apps/desktop/package.json`
- 2026-11-25 [checklist] `DESIGN.md` still says there is no UI and `apps/desktop` is empty, though the shell has landed; a `/setup` re-run would draft its tokens and components · seen on T-0028 · `DESIGN.md`
- 2026-11-25 [tool] §The line gives two inspection caps: "Waiting for inspection at most 2" under Limits and "the inspection cap is 3" under Inspection · seen on T-0028 · `docs/queue-2026-11-25.md`
- 2026-11-25 [tool] `ci-scope.mjs`'s `isDocs` (and `ci.yml`'s `code` filter) count only root `*.md` as docs, so a docs-only card PR that `/done` moves to `cards/done/<id>.md` is scoped to every package · seen on T-0028 · `scripts/ci-scope.mjs:16`
- 2026-11-25 [tool] `review --pr` hit "request timed out after 600000ms" on PR #43, exited 0 and posted nothing; only the retry posted the review · seen on T-0028 inspection · `packages/cli/src/commands/review.ts`

## Repo checklist

What must stay true for this repo. It grows as the repo grows; a `[checklist]` line in
Parked is a proposal to add one. Each line names how to check it.

Stage: Foundation — decided by "tests exist and pass" (no test files yet) and "`ci` is required on main" (no protection). Every other Foundation line passes.
Last `/setup`: 2026-11-25, on card/T-0003.

### Foundation

- [x] It builds · check: `pnpm build`
- [x] Typecheck is clean · check: `pnpm typecheck`
- [x] Lint is clean · check: `pnpm lint`
- [x] Format is clean · check: `pnpm format`
- [x] Module boundaries hold · check: `pnpm boundaries`
- [ ] Tests exist and pass · check: `pnpm exec vitest run --coverage.enabled=false` (today: "No test files found", exit 1)
- [x] CI runs lint, typecheck and tests on every PR, on Ubuntu and Windows · check: `gh pr checks 1`
- [ ] `ci` is required before a merge to main · check: `gh api repos/arynbht/Rachetari/branches/main/protection` (today: 404, not protected)
- [x] No secrets in the repo · check: `gitleaks git --redact .` and `gitleaks dir --redact .`
- [x] Dependencies are locked · check: `pnpm install --frozen-lockfile`
- [x] LF line endings in every tracked text file · check: `git ls-files --eol | grep -v "i/lf" | grep -v "i/-text"` prints nothing
- [x] README says how to install it · check: read `README.md`, "Install on a machine"
- [ ] unchecked: main's full CI (`build-test`) is green on both OSes · check: `gh run list --branch main --workflow CI` (no run yet)

### Building

- [ ] `review --pr` posts COMMENT or REQUEST_CHANGES and never APPROVE · check: the never-APPROVE test, and one real review on a PR here
- [x] Every file copied from Rivetari is in `EXTRACTED.md` with its cut · check: compare each verbatim commit's file list with `EXTRACTED.md` (6c4d067: 27 of 27)
- [ ] Area skills are plain folders with `skills/INDEX.md` · check: `test -f skills/INDEX.md`
- [ ] The shell's views read only the kit files, through one module · check: the shell's unit tests on a fixture repo
- [ ] The kit is installed on each machine · check: `diff -r kit/setup ~/.claude/skills/setup` (this machine: pass; the second machine: unchecked)

### Hardening

- [ ] A coverage floor is set and met · check: `pnpm test` with thresholds in `vitest.config.ts`
- [ ] Every shell view passes axe · check: the shell's axe e2e test
- [ ] The shell keeps context isolation, sandbox, the CSP and zod on every IPC request and reply · check: the shell's tests

### Live

- n/a: nothing is deployed; the kit and the shell run locally on two machines
