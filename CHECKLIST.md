# Checklist

Stage: Foundation — decided by `dev.conventional-commits`, `dev.precommit-hooks`, `repo.dependency-update-bot`, `repo.license.present` and `sec.secret-scanning.pre-commit`, the five failing foundation lines. Every foundation line from the old Repo checklist passes.
Last `/setup`: 2026-11-25, on card/T-0033.

What must stay true for this repo, in fifteen sections. Every section stays, even one
that doesn't apply: it says `n/a` and why, so leaving it out is a recorded choice.
`/setup` writes the lines, runs each check and records the result. Edit, add or retag
lines as you like, and a re-run keeps your changes. A `[checklist]` line parked in
`BACKLOG.md` proposes a new line here.

Each line has a status, a stage and the check that was run. A line from the old catalog
leads with its id, so a re-run finds it instead of adding it again:

    - [x] `<id>` <what must stay true> · stage: <foundation|building|hardening|live> · check: <what was run>
    - [ ] <what must stay true> · stage: <stage> · check: <what was run> (<what it showed>)
    - [ ] unchecked: <what must stay true> · stage: <stage> · check: <what a person should look at>
    - n/a: <why nothing in this section applies to this repo>

`[x]` is passed and `[ ]` is failed. `new` at the end of a line marks one the last
`/setup` added. To drop a catalog line for good, change it to ``- n/a: `<id>` <why>``
rather than deleting it, so a re-run doesn't add it back.

## accessibility

- [x] `a11y.ci.automated-checks` Automated accessibility checks in CI (axe/Lighthouse) · stage: building · check: `apps/desktop/e2e/axe.e2e.ts` runs in CI's `desktop-e2e` job (main run 45665774884: `desktop-e2e` success)
- [ ] unchecked: `a11y.contrast.enforced` Color contrast enforced in design tokens · stage: building · check: a person compares the light and dark tokens in `apps/desktop/src/renderer/index.css` against WCAG contrast ratios
- [ ] unchecked: `a11y.keyboard.manual-pass` Keyboard-only manual pass recorded · stage: building · check: a recorded keyboard-only pass over Home, Now, Tasks, Checklist, History, Map, Docs and Settings
- [ ] unchecked: `a11y.screen-reader.pass` Screen-reader pass on key flows recorded · stage: building · check: a recorded screen-reader pass (NVDA or Narrator) over the key flows
- [ ] `a11y.target.stated` Accessibility target stated (WCAG 2.2 AA) · stage: building · check: search for "WCAG" in `DESIGN.md`, `CONSTRAINTS.md`, `SCOPE.md` and `README.md` (no match; only `EXTRACTED.md` mentions it)
- [ ] Every shell view passes axe · stage: hardening · check: the shell's axe e2e test (`axe.e2e.ts` covers Home, Now, Tasks, Checklist, History, Map and Settings, not Docs; not run locally by `/setup`)

## cicd

- [x] CI runs lint, typecheck and tests on every PR, on Ubuntu and Windows · stage: foundation · check: `gh pr checks 44` (lint, typecheck and test on ubuntu-latest and windows-latest: pass)
- [x] main's full CI (`build-test`) is green on both OSes · stage: foundation · check: `gh run list --branch main --workflow CI` (run 45665774884: `build-test (ubuntu-latest)` and `build-test (windows-latest)` success)
- [x] `ci.workflow.present` CI workflow present · stage: foundation · check: `.github/workflows/ci.yml` exists
- [x] `ci.runs-on-pr` CI runs on pull requests · stage: foundation · check: `on.pull_request` in `.github/workflows/ci.yml`
- [x] `ci.runs-on-push` CI runs on push · stage: foundation · check: `on.push.branches: [main, develop]` in `.github/workflows/ci.yml`
- [x] `ci.concurrency` CI cancels superseded runs · stage: building · check: top-level `concurrency` with `cancel-in-progress` in `.github/workflows/ci.yml`
- [x] `ci.concurrency-pr-only` CI cancels superseded PR runs, and only those · stage: building · check: `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`, and push runs grouped by `github.sha`
- [x] `ci.dependency-caching` CI caches dependencies · stage: building · check: `actions/setup-node` with `cache: pnpm` in `.github/workflows/ci.yml`
- [x] `ci.docs-skip-build` Docs-only PRs skip build and test · stage: building · check: the `changes` job's `code` filter gates lint, typecheck and test in `.github/workflows/ci.yml`
- [x] `ci.job-timeouts` Every CI job has a timeout · stage: building · check: `timeout-minutes` on all eight jobs in `.github/workflows/ci.yml`
- [ ] `ci.pr-linux-only` Windows and macOS stay off PRs on private repos · stage: building · check: the PR jobs' matrix in `.github/workflows/ci.yml` (lint, typecheck and test run on `windows-latest` on PRs; the repo is private)
- [x] `ci.required-aggregator` One required `ci` check aggregates the PR jobs · stage: building · check: the `ci` job needs changes, lint, typecheck, test and secret-scan; `gh api repos/arynbht/Rachetari/branches/main/protection` requires `ci`
- [x] `ci.actions-pinned-sha` GitHub Actions pinned by commit SHA · stage: hardening · check: every `uses:` in `.github/workflows/ci.yml` names a 40-character SHA
- [x] `ci.secret-scan-on-pr` CI scans each PR's commits for secrets · stage: hardening · check: the `secret-scan` job (gitleaks) runs on PRs; `gh pr checks 44` shows it passing
- [x] `ci.workflow-permissions` Workflow token permissions declared · stage: hardening · check: top-level `permissions: contents: read` and per-job permissions in `.github/workflows/ci.yml`

## cloud

- n/a: nothing is deployed and there is no infrastructure to describe; the shell and the CLI run locally

## data

- n/a: no database, no analytics and no stored personal data; the shell reads local git repos and keeps a list of registered folders

## development

- [x] It builds · stage: foundation · check: `pnpm build`
- [x] `dev.formatter.configured` Formatter configured · stage: foundation · check: `.prettierrc.json` and `"format": "prettier --check ."` in `package.json`
- [x] `dev.linter.configured` Linter configured · stage: foundation · check: `eslint.config.js`
- [x] `dev.typecheck.strict` TypeScript strict mode enabled · stage: foundation · check: `"strict": true` in `tsconfig.base.json`
- [ ] `dev.conventional-commits` Conventional commits enforced · stage: foundation · check: look for commitlint or a commit-msg hook (none; commits follow the style but nothing enforces it)
- [ ] `dev.precommit-hooks` Pre-commit hooks installed · stage: foundation · check: look for `.husky/`, `lefthook.yml` or `.pre-commit-config.yaml` (none)
- [x] `dev.linter.in-ci` Linter runs in CI · stage: building · check: the `lint` job in `.github/workflows/ci.yml`; `gh pr checks 44` shows it passing
- [ ] `dev.code-review-required` Code review required before merge · stage: building · check: `gh api repos/arynbht/Rachetari/branches/main/protection` (`required_approving_review_count: 0`)
- [ ] The kit is installed on each machine · stage: building · check: `diff -r kit/setup ~/.claude/skills/setup` (this machine: no difference; the second machine: unchecked)

## documentation

- [x] `docs.onboarding-guide` README says how to install it · stage: foundation · check: read `README.md`, "Install on a machine"
- [ ] unchecked: Every file copied from Rivetari is in `EXTRACTED.md` with its cut · stage: building · check: compare each verbatim commit's file list with `EXTRACTED.md` (6c4d067: 27 of 27 on T-0003; not re-run by this `/setup`)
- [x] Area skills are plain folders with `skills/INDEX.md` · stage: building · check: `test -f skills/INDEX.md` (`git ls-files` lists it)
- [ ] unchecked: `docs.adr-log` ADR log started and current · stage: building · check: a person reads `DECISIONS.md` (D-01 to D-19) and confirms it is current
- [ ] `docs.c4-diagrams` C4 context and container diagrams present · stage: building · check: search the repo's Markdown for C4 or mermaid diagrams (none)

## hygiene

- [x] `repo.lockfile.present` Dependencies are locked · stage: foundation · check: `pnpm install --frozen-lockfile` ("Lockfile is up to date")
- [x] LF line endings in every tracked text file · stage: foundation · check: `git ls-files --eol | grep -v "i/lf" | grep -v "i/-text"` prints nothing (it prints only `nights/.gitkeep`, which is empty: `i/none`)
- [x] `repo.branch-protection` Default branch is protected · stage: foundation · check: `gh api repos/arynbht/Rachetari/branches/main/protection` (protected; force-push and deletion off)
- [x] `repo.editorconfig.present` .editorconfig present · stage: foundation · check: `.editorconfig` exists
- [x] `repo.readme.present` README present · stage: foundation · check: `README.md` exists
- [x] `repo.toolchain-pinned` Toolchain version pinned · stage: foundation · check: `.nvmrc`, `.node-version` and `"packageManager": "pnpm@10.32.1"` in `package.json`
- [ ] `repo.dependency-update-bot` Dependency update bot configured · stage: foundation · check: look for `.github/dependabot.yml` or `renovate.json` (none)
- [ ] `repo.license.present` LICENSE present · stage: foundation · check: look for `LICENSE` at the root (none, though `package.json` says `"license": "MIT"`)

## legal

- [ ] unchecked: `legal.license-summary` Third-party license summary · stage: hardening · check: a person confirms `inventory/skills.md` and `skills/INDEX.md` record the license of every vendored skill under `skills/`

## observability

- n/a: nothing is deployed; the kit and the shell run locally on two machines

## performance

- n/a: nothing is served over a network; the shell is a local Electron app over local git, and the catalog's controls (budgets, bundle size, Lighthouse, load tests, N+1 queries) target web pages and servers

## product

- [ ] unchecked: `product.discovery.brief` Discovery brief with success metrics and kill criteria · stage: building · check: a person reads `SCOPE.md`'s "Goal" and goals table for success measures and kill criteria
- [ ] `product.risk.register` Risk register started · stage: building · check: look for a risk register file (none)
- [ ] unchecked: `product.requirements.nfrs` Non-functional requirements captured as numbers · stage: building · check: a person reads `SCOPE.md` for numeric limits (time, cost, size)
- [x] `product.scope.out-of-scope` Out-of-scope list recorded · stage: building · check: `SCOPE.md` has "## Non-goals"
- [x] `product.stories.acceptance` User stories with acceptance criteria · stage: building · check: `cards/TEMPLATE.md` and every card in `cards/done/` have "## Acceptance criteria"
- [ ] unchecked: `product.survey.build-vs-buy` Build-vs-buy survey recorded · stage: building · check: a person confirms `SCOPE.md`, `SHELVED.md` or `DECISIONS.md` records why this is built rather than bought

## quality

- [x] `quality.typecheck.clean` Typecheck is clean · stage: foundation · check: `pnpm typecheck` and `pnpm --filter @arynbht/rivetari-desktop typecheck`
- [x] `quality.lint.clean` Lint is clean · stage: foundation · check: `pnpm lint`
- [x] Format is clean · stage: foundation · check: `pnpm format`
- [x] `quality.boundaries.clean` Module boundaries hold · stage: foundation · check: `pnpm boundaries` (no violations, 145 modules)
- [x] `quality.tests.pass` Tests exist and pass · stage: foundation · check: `pnpm test` (34 files, 170 tests passed)
- [x] `quality.required-checks.named` `ci` is required before a merge to main · stage: foundation · check: `gh api repos/arynbht/Rachetari/branches/main/protection` (`required_status_checks.contexts: ["ci"]`)
- [x] `review --pr` posts COMMENT or REQUEST_CHANGES and never APPROVE · stage: building · check: the never-APPROVE test (`review-never-approve.test.ts` passes), and one real review on a PR here (PR #4: `COMMENTED`)
- [x] The shell's views read only the kit files, through one module · stage: building · check: the shell's unit tests on a fixture repo (`pnpm test`: `apps/desktop/src/main/kit/source.test.ts` and the engine tests on `test/kit-fixture.ts` pass)
- [ ] `quality.coverage.floor` A coverage floor is set and met · stage: hardening · check: `pnpm test` with thresholds in `vitest.config.ts` (no thresholds set; today 47.12% lines, 80.93% branches, 74.49% functions)

## security

- [x] No secrets in the repo · stage: foundation · check: `gitleaks git --redact .` and `gitleaks dir --redact .` (269 commits, no leaks)
- [ ] `sec.secret-scanning.pre-commit` Secret scanning runs before commit · stage: foundation · check: look for a pre-commit hook running gitleaks (none)
- [x] `sec.secret-scanning.ci` Secret scanning runs in CI · stage: hardening · check: the `secret-scan` job (gitleaks-action) in `.github/workflows/ci.yml`
- [ ] `sec.dependabot-security-updates` Dependabot security updates enabled · stage: hardening · check: `gh api repos/arynbht/Rachetari/automated-security-fixes` (`enabled: false`)
- [ ] `sec.vulnerability-alerts` Dependency vulnerability alerts enabled · stage: hardening · check: `gh api repos/arynbht/Rachetari/vulnerability-alerts` (404, disabled)
- [ ] `sec.dependency-scan.ci` Dependency vulnerability scan in CI · stage: hardening · check: look for `pnpm audit` or dependency-review in `.github/workflows/ci.yml` (none)
- [ ] `sec.sast.ci` SAST runs in CI · stage: hardening · check: look for CodeQL or Semgrep in `.github/workflows/` (none)
- [ ] `sec.push-protection` Secret scanning push protection enabled · stage: hardening · check: `gh api repos/arynbht/Rachetari --jq .security_and_analysis` (null: not enabled on this private repo)
- [ ] unchecked: `sec.threat-model` Threat model documented and current · stage: hardening · check: a person looks for a threat model covering the shell's IPC, the repos it opens and the review's tokens
- [ ] The shell keeps context isolation, sandbox, the CSP and zod on every IPC request and reply · stage: hardening · check: the shell's tests (they pass, but `docs:read` replies aren't zod-checked, parked on T-0011)

## testing

- [x] `test.runner.configured` Test runner configured · stage: building · check: `vitest.config.ts`
- [x] `test.runner.in-ci` Tests run in CI · stage: building · check: the `test` job in `.github/workflows/ci.yml`; `gh pr checks 44` shows six shards passing
- [x] `test.coverage-config` Test coverage configured · stage: building · check: the `coverage` block in `vitest.config.ts` (v8, json-summary)
- [x] `test.e2e.present` End-to-end tests present · stage: building · check: `apps/desktop/e2e/*.e2e.ts` (11 files)

## ux

- [x] `ux.design-system.adopted` Design tokens or component library adopted · stage: building · check: `apps/desktop/components.json` (shadcn/ui), `tailwind.config.ts` and the CSS variables in `src/renderer/index.css`
- [ ] `ux.copy.guidelines` Copy and tone guidelines recorded · stage: building · check: look for copy guidelines in `DESIGN.md` or `docs/` (none; `DESIGN.md` still says there is no UI)
- [ ] `ux.responsive.breakpoints` Responsive breakpoints defined · stage: building · check: search `tailwind.config.ts` and `index.css` for `screens` or `@media` (none)
- [ ] unchecked: `ux.flows.wireframes` Wireframes for key flows linked · stage: building · check: a person looks for wireframes of the key flows (only per-card screenshots in `docs/screenshots/`)
- [ ] unchecked: `ux.states.designed` Empty, loading, error, and offline states designed · stage: building · check: a person reviews each view's empty, loading and error states
