# Sections

The fifteen sections of `CHECKLIST.md`, with every control from Rivetari's old catalog
(`packages/catalog/controls/` at `32f4b88`, 111 controls) listed under its section.
`/setup` reads this file to fill `CHECKLIST.md`. It keeps the controls that apply to the
repo's stack and type, and writes each one as a line that leads with the control's id.

Only the list came over. Each row holds a control's id, its title as the catalog wrote
it, its phase, and the kinds of detector the catalog ran for it; `any-of(...)` means the
catalog passed the control when any one of those kinds matched. The detectors themselves
stayed behind, with the catalog's `applies` rules, severity, effort, evidence, fixes,
references and rationale. Whether a control applies, and which check proves it, is
`/setup`'s call for each repo.

The catalog had nine phases and the kit has four stages. A line's stage tag starts from
its control's phase, mapped as below. The owner can change a line's tag in
`CHECKLIST.md`, and `/setup` keeps that change on a re-run.

| Phase | Stage | Controls |
| --- | --- | --- |
| scaffold | foundation | 22 |
| discovery | building | 3 |
| requirements | building | 6 |
| design | building | 7 |
| architecture | building | 5 |
| build | building | 30 |
| harden | hardening | 25 |
| launch | hardening | 6 |
| operate | live | 7 |

That makes 22 foundation, 51 building, 31 hardening and 7 live.

## accessibility (6)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `a11y.ci.automated-checks` | Automated accessibility checks in CI (axe/Lighthouse) | build | file-matches |
| `a11y.contrast.enforced` | Color contrast enforced in design tokens | design | manual |
| `a11y.keyboard.manual-pass` | Keyboard-only manual pass recorded | build | manual |
| `a11y.screen-reader.pass` | Screen-reader pass on key flows recorded | build | manual |
| `a11y.statement.published` | Accessibility statement page published | launch | file-exists, reviewed |
| `a11y.target.stated` | Accessibility target stated (WCAG 2.2 AA) | design | file-matches |

## cicd (14)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `ci.actions-pinned-sha` | GitHub Actions pinned by commit SHA | harden | file-yaml-path |
| `ci.changelog-automated` | Versioning and changelog automated | build | file-exists |
| `ci.concurrency-pr-only` | CI cancels superseded PR runs, and only those | build | workflow |
| `ci.concurrency` | CI cancels superseded runs | build | any-of(file-yaml-path) |
| `ci.dependency-caching` | CI caches dependencies | build | any-of(file-yaml-path) |
| `ci.docs-skip-build` | Docs-only PRs skip build and test | build | workflow |
| `ci.job-timeouts` | Every CI job has a timeout | build | workflow |
| `ci.pr-linux-only` | Windows and macOS stay off PRs on private repos | build | workflow |
| `ci.required-aggregator` | One required `ci` check aggregates the PR jobs | build | workflow |
| `ci.runs-on-pr` | CI runs on pull requests | scaffold | file-yaml-path |
| `ci.runs-on-push` | CI runs on push | scaffold | file-yaml-path |
| `ci.secret-scan-on-pr` | CI scans each PR's commits for secrets | harden | workflow |
| `ci.workflow-permissions` | Workflow token permissions declared | harden | file-yaml-path |
| `ci.workflow.present` | CI workflow present | scaffold | file-exists |

## cloud (7)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `cloud.backups-restore-tested` | Backups configured and restore tested | harden | manual |
| `cloud.cost-budget-alert` | Cost budget alert configured | operate | manual |
| `cloud.iac-plan-in-ci` | IaC plan runs in CI | harden | file-matches |
| `cloud.iac-present` | Infrastructure as code present | architecture | file-exists |
| `cloud.least-privilege-iam` | Least-privilege IAM reviewed | harden | manual |
| `cloud.policy-as-code` | Policy-as-code scan for IaC | harden | file-matches |
| `cloud.rpo-rto-documented` | RPO and RTO written down | architecture | file-matches |

## data (6)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `data.analytics-taxonomy` | Analytics event taxonomy documented | build | file-exists |
| `data.backup-restore-drill` | Data backup restore drill performed | operate | manual |
| `data.encryption-verified` | Encryption at rest and in transit verified | harden | manual |
| `data.migrations-versioned` | Schema migrations versioned and reversible | build | file-exists |
| `data.pii-classified` | PII columns classified | architecture | manual |
| `data.retention-jobs` | Retention and deletion jobs implemented | harden | manual |

## development (8)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `dev.code-review-required` | Code review required before merge | build | github-api |
| `dev.conventional-commits` | Conventional commits enforced | scaffold | file-matches |
| `dev.env-example` | .env.example present | scaffold | file-exists |
| `dev.formatter.configured` | Formatter configured | scaffold | any-of(file-exists, file-matches) |
| `dev.linter.configured` | Linter configured | scaffold | any-of(file-exists, file-matches) |
| `dev.linter.in-ci` | Linter runs in CI | build | any-of(file-yaml-path) |
| `dev.precommit-hooks` | Pre-commit hooks installed | scaffold | file-exists |
| `dev.typecheck.strict` | TypeScript strict mode enabled | scaffold | file-json-path |

## documentation (6)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `docs.adr-log` | ADR log started and current | architecture | file-exists, reviewed |
| `docs.c4-diagrams` | C4 context and container diagrams present | architecture | file-matches, reviewed |
| `docs.changelog-present` | Changelog present | build | file-exists |
| `docs.diataxis-layout` | docs/ follows the Diátaxis layout | scaffold | file-exists |
| `docs.onboarding-guide` | Onboarding / getting-started guide present | scaffold | file-exists |
| `docs.runbooks-dir` | Runbooks directory exists | harden | file-exists, reviewed |

## hygiene (10)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `repo.branch-protection` | Default branch is protected | scaffold | github-api |
| `repo.codeowners.present` | CODEOWNERS present | scaffold | file-matches |
| `repo.contributing.present` | CONTRIBUTING guide present | scaffold | file-exists |
| `repo.dependency-update-bot` | Dependency update bot configured | scaffold | file-exists |
| `repo.editorconfig.present` | .editorconfig present | scaffold | file-exists |
| `repo.license.present` | LICENSE present | scaffold | file-matches |
| `repo.lockfile.present` | Dependency lockfile committed | scaffold | any-of(file-exists, file-matches) |
| `repo.readme.present` | README present | scaffold | file-exists |
| `repo.security-policy.present` | SECURITY policy with a disclosure contact | scaffold | file-matches |
| `repo.toolchain-pinned` | Toolchain version pinned | scaffold | any-of(file-exists, file-matches) |

## legal (7)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `legal.cookie.consent` | Cookie consent for EU users with tracking | launch | file-matches |
| `legal.data.inventory` | Data inventory and map maintained | requirements | manual |
| `legal.data.retention` | Retention schedule and deletion job defined | requirements | manual |
| `legal.dsar.process` | DSAR (data subject request) process documented | requirements | manual |
| `legal.license-summary` | Third-party license summary | harden | file-exists, reviewed |
| `legal.privacy.policy` | Privacy policy published | launch | file-matches, reviewed |
| `legal.terms.published` | Terms of service published | launch | file-matches |

## observability (6)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `ops.dashboards-golden-signals` | Dashboards for the golden signals | operate | manual |
| `ops.oncall-rotation` | On-call rotation or schedule documented | operate | manual |
| `ops.postmortem-template` | Blameless postmortem template and log | operate | file-exists |
| `ops.runbook-per-alert` | Runbook per alert | operate | file-exists, reviewed |
| `ops.slos-defined` | SLOs defined with error budgets | harden | file-exists |
| `ops.telemetry-exported` | Logs, metrics, and traces exported to a backend | harden | manual |

## performance (6)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `perf.budgets-defined` | Performance budgets defined | build | file-exists |
| `perf.bundle-size-budget` | Bundle size budget enforced | build | file-exists |
| `perf.caching-strategy` | Caching strategy documented | harden | file-matches |
| `perf.lighthouse-ci` | Lighthouse CI in the pipeline | harden | file-matches |
| `perf.load-test-before-launch` | Load test at expected peak before launch | launch | manual |
| `perf.n-plus-one-detection` | N+1 query detection in tests | build | manual |

## product (7)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `product.discovery.brief` | Discovery brief with success metrics and kill criteria | discovery | file-exists, reviewed |
| `product.launch.checklist` | Launch checklist and go/no-go recorded | launch | file-exists |
| `product.requirements.nfrs` | Non-functional requirements captured as numbers | requirements | file-matches, reviewed |
| `product.risk.register` | Risk register started | discovery | file-exists |
| `product.scope.out-of-scope` | Out-of-scope list recorded | requirements | file-matches, reviewed |
| `product.stories.acceptance` | User stories with acceptance criteria | requirements | file-exists, reviewed |
| `product.survey.build-vs-buy` | Build-vs-buy survey recorded | discovery | manual |

## quality (6)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `quality.boundaries.clean` | Module boundaries hold | build | command |
| `quality.coverage.floor` | Coverage at or above the floor | harden | coverage |
| `quality.lint.clean` | Lint passes | build | command |
| `quality.required-checks.named` | Merges require passing status checks | build | github-api |
| `quality.tests.pass` | Tests pass | build | command |
| `quality.typecheck.clean` | Typecheck passes | build | command |

## security (10)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `sec.dependabot-security-updates` | Dependabot security updates enabled | harden | github-api |
| `sec.dependency-scan.ci` | Dependency vulnerability scan in CI | harden | any-of(file-yaml-path) |
| `sec.push-protection` | Secret scanning push protection enabled | harden | github-api |
| `sec.sast.ci` | SAST runs in CI | harden | any-of(file-yaml-path) |
| `sec.sbom.ci` | SBOM generated in CI | harden | any-of(file-yaml-path) |
| `sec.scorecard.score` | OpenSSF Scorecard "Maintained" check above threshold | harden | scorecard |
| `sec.secret-scanning.ci` | Secret scanning runs in CI | harden | any-of(file-yaml-path) |
| `sec.secret-scanning.pre-commit` | Secret scanning runs before commit | scaffold | file-matches |
| `sec.threat-model` | Threat model documented and current | harden | manual |
| `sec.vulnerability-alerts` | Dependency vulnerability alerts enabled | harden | github-api |

## testing (6)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `test.coverage-config` | Test coverage configured | build | file-matches |
| `test.data.factories` | Test data factories and a seed script exist | build | file-exists, reviewed |
| `test.e2e.present` | End-to-end tests present | build | file-exists |
| `test.integration.db` | Integration tests run against a real database in CI | build | file-matches |
| `test.runner.configured` | Test runner configured | build | any-of(file-matches, file-exists) |
| `test.runner.in-ci` | Tests run in CI | build | file-yaml-path |

## ux (6)

| Id | Title | Phase | Detect |
| --- | --- | --- | --- |
| `ux.copy.guidelines` | Copy and tone guidelines recorded | design | file-exists, reviewed |
| `ux.design-system.adopted` | Design tokens or component library adopted | design | file-matches |
| `ux.feedback.channel` | User feedback channel exists | operate | manual |
| `ux.flows.wireframes` | Wireframes for key flows linked | design | manual |
| `ux.responsive.breakpoints` | Responsive breakpoints defined | design | file-matches |
| `ux.states.designed` | Empty, loading, error, and offline states designed | design | manual |
