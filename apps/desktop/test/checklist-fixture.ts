// A CHECKLIST.md in T-0029's format, for the Checklist reader's tests and the
// Checklist tab's e2e: all fifteen sections, one full (security), one neglected
// (testing), a catalog id on either side of `unchecked:`, a section's own n/a
// (legal), a dropped control (data) and an empty section (ux). Committed on
// the kit fixture's origin, so the clone sees it after a fetch.
import { execFileSync } from "node:child_process";

import { kitFixture, type KitFixture } from "./kit-fixture";

export const CHECKLIST = `# Checklist

Stage: Foundation — decided by \`test.coverage-threshold\` and the two failing testing lines
Last \`/setup\`: 2026-11-25, on main.

What must stay true for this repo, in fifteen sections. Every section stays, even one
that doesn't apply: it says \`n/a\` and why, so leaving it out is a recorded choice.

Each line has a status, a stage and the check that was run. A line from the old catalog
leads with its id, so a re-run finds it instead of adding it again:

    - [x] \`<id>\` <what must stay true> · stage: <foundation|building|hardening|live> · check: <what was run>
    - [ ] <what must stay true> · stage: <stage> · check: <what was run> (<what it showed>)
    - [ ] unchecked: <what must stay true> · stage: <stage> · check: <what a person should look at>
    - n/a: <why nothing in this section applies to this repo>

\`[x]\` is passed and \`[ ]\` is failed. \`new\` at the end of a line marks one the last
\`/setup\` added. To drop a catalog line for good, change it to \`\`- n/a: \`<id>\` <why>\`\`
rather than deleting it, so a re-run doesn't add it back.

## accessibility

- [x] \`a11y.ci.automated-checks\` Automated accessibility checks in CI · stage: building · check: \`pnpm e2e\`

## cicd

- [ ] unchecked: \`ci.branch-protection\` The default branch is protected · stage: foundation · check: a person reads the branch settings

## cloud

- [x] \`cloud.iac\` Infrastructure is described as code · check: \`terraform validate\` · stage: hardening

## data

- [x] \`data.migrations\` Schema changes go through migrations · stage: building · check: \`ls migrations\`
- n/a: \`data.backups-tested\` no database

## development

- [x] It builds · stage: foundation · check: \`pnpm build\`

## documentation

- [x] \`docs.onboarding-guide\` README says how to run it · stage: foundation · check: read \`README.md\`

## hygiene

- [x] \`repo.lockfile.present\` Dependencies are locked · stage: foundation · check: \`pnpm install --frozen-lockfile\`

## legal

- n/a: nothing is distributed and nobody's data is held

## observability

- [x] \`obs.logging.structured\` Logs are structured · stage: live · check: read \`src/log.ts\`

## performance

- [x] \`perf.budget\` A performance budget is set · stage: hardening · check: \`pnpm size\`

## product

- [x] \`product.scope.out-of-scope\` Out-of-scope list recorded · stage: building · check: \`SCOPE.md\` has "## Non-goals"

## quality

- [x] \`quality.lint.clean\` Lint is clean · stage: foundation · check: \`pnpm lint\`

## security

- [x] \`sec.secret-scanning.ci\` Secret scanning runs in CI · stage: hardening · check: the \`secret-scan\` job
- [x] \`sec.workflow-permissions\` Workflow token permissions declared · stage: hardening · check: \`permissions:\` in \`ci.yml\`
- [x] \`sec.no-secrets\` No secrets in the repo · stage: foundation · check: \`gitleaks dir .\` new

## testing

- [x] \`test.runner.configured\` Test runner configured · stage: building · check: \`vitest.config.ts\`
- [ ] \`test.e2e.present\` End-to-end tests present · stage: building · check: \`ls e2e\` (no such folder)
- [ ] Tests run in CI · stage: foundation · check: the \`test\` job in \`ci.yml\` (no such job)
- [ ] \`test.coverage-threshold\` unchecked: A coverage floor is set and met · stage: hardening · check: a person reads the coverage report

## ux
`;

/** The kit fixture with {@link CHECKLIST} on its origin's main, fetched into the clone. */
export function checklistFixture(): KitFixture {
  const fx = kitFixture();
  fx.commitOnOrigin("CHECKLIST.md", CHECKLIST);
  execFileSync("git", ["fetch", "-q"], { cwd: fx.repo });
  return fx;
}
