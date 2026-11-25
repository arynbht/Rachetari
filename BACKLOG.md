# Backlog

Three lists. I order "Next up". Sessions only ever append to "Parked".

## Next up

Ordered. The top line becomes the next `CARD.md`.

1. Take `constraint-driven-development` and `playwright-cli` at their pins (S-02 #6, S-03 #7) · from `docs/queue-2026-11-25.md` §4d
2. Salvage `registered-repos.e2e.ts` and `axe.e2e.ts` only, listing every edit (S-17, #22) · from `docs/queue-2026-11-25.md` §4c
3. Clean code 1a: take `code-simplification`, write the `deslop` skill and the Slop defaults `/setup` drafts, with a test that the twelve lines never differ (T-0023) · from `docs/queue-2026-11-25.md` §4e. Clean code, part 1: guidance
4. Timeouts on the shell's git calls: `fetchRepo` and each read call get a timeout (limits proposed in the card); a call past it fails with a message in the repo's error box and the Fetch button recovers; tested with a git that hangs. Until this merges, a fetch-test hang in CI gets one re-run of that job, noted on the PR · from `docs/queue-2026-11-25.md` §Timeouts on the shell's git calls
5. Clean code 2: the comment-slop check, report first, then bring it over if it's ~150 lines or fewer · from `docs/queue-2026-11-25.md` §4f
6. Questions panel on Now: one row per question with its recommendation, Copy all, Accept recommended (per question and per card) and a free-text answer, each a previewed plain commit; the template and parser get a fixed question shape (needs you) · from `docs/queue-2026-11-25.md` §Questions panel on Now
7. Clean code 1b: `/done` deslops the card's diff first and commits it on its own, with 4f's comment report; `/setup` always copies `quality/deslop`; `/done` skips deslop when it's missing (needs you; after T-0023 and 4f) · from `docs/queue-2026-11-25.md` §4e-2. Clean code, part 1b: /done deslops first
8. Tasks overhaul 1, design only: a static prototype on the fixture with four screenshots (needs you) · from `docs/queue-2026-11-25.md` §Tasks overhaul 1
9. Checklist by section, the kit: `sections.md` from the old catalog, `CHECKLIST.md` with fifteen sections, `/setup` fills it · from `docs/queue-2026-11-25.md` §4g
10. Shell action: "mark ready" as a plain commit on the card's branch, previewed first (needs you) · from `docs/queue-2026-11-25.md` §Shell action: mark ready
11. Clean code 1c: the five starter checklist lines, each with a check that runs, then `/setup` re-run on this repo (after 4g) · from `docs/queue-2026-11-25.md` §4e-3. Clean code, part 1c: the starter checklist lines
12. Checklist by section, the shell: per-section strip, ordering, Home's worst section (after 4g merges) · from `docs/queue-2026-11-25.md` §4h
13. Army mode, design only: a one-page proposal in `docs/` for running N cards at once as the night runner with a width setting (picking ready cards with no overlapping files in scope and no dependencies, one worktree and one agent per card, the lead session's job, questions and holds, usage limits, what the shell shows); no code; lists changing SCOPE.md's two-session cap as a decision for the owner · from `docs/queue-2026-11-25.md` §Army mode, design only
14. Tasks overhaul 2: layout and columns, after the owner picks a design (needs you) · from `docs/queue-2026-11-25.md` §Tasks overhaul 2
15. Set a coverage floor once the review tests land · from checklist "coverage floor"
16. Tasks overhaul 3: record header and tabs, after overhaul 2 (needs you) · from `docs/queue-2026-11-25.md` §Tasks overhaul 3

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
- 2026-11-25 [product] An empty `Gate:` (no value) parses as null and raises nothing, though a gate line is written; it arguably should ask, like any gate that is not `low` · seen on T-0019 inspection · `apps/desktop/src/main/kit/parse.ts`

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
