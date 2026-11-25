# Phase 0: inventory of Rivetari for the direction layer

2026-11-25. Read-only. Nothing was copied. Source: `arynbht/Rivetari` at `origin/main` `32f4b88`, read from a `git archive` export, so the source checkout was not touched. References: `files/AUDIT-2026-11-24.md` and `files/desktop-shell.md`.

Detail files next to this one:
- `shell-main.md`: main process, preload and shared, area by area, with every IPC channel.
- `shell-views.md`: each renderer view and its main-side handler.
- `skills.md`: all skill manifests, the scan rerun and the pilot ledgers.

## What this prompt got wrong about the source

1. **There are 28 skill manifests, not 27.** There are 12 always-on ("spine") skills and 16 per task.
2. **The owner's trimmed impeccable fork isn't in the registry.** `packages/registry/manifests/impeccable.yml` still points at `pbakaus/impeccable` (blocked). The fork, `arynbht/impeccable@9563f828` on branch `rivetari`, appears only in the pilot repo's local manifest. If that branch is deleted, no branch reaches the pin.
3. **The audit undercounts skill loading.** It says only T-0022 and T-0023 had skills. In fact six tasks had a non-empty `skills:` list (T-0021, 22, 23, 25, 26, 32). Skills were confirmed loaded at build in T-0022, 23, 25 and 32. Separately, `floorplan` ran at close in 19 tasks.
4. **`desktop-shell.md` has a few errors:**
   - `electron-builder.yml` is at `apps/desktop/`, not under `src/`.
   - `docs:read` and the `auth:update` and `map:blocked` pushes are not zod-checked on the reply side.
   - `docs:read` reads any file in the repo, not only Markdown.
   - The loosened CSP also applies in E2E mode.
   - All 46 IPC channel names are correct.
5. **The prompt names `fast-path.ts` as part of PR review, but review never reaches it.** Only the task judge and `review-plan` do. Its one test needs the task runner, so it would come over with no test.
6. **Every other path named in the prompt exists at `32f4b88`.** That includes the `--effort` fallback at `claude-cli.ts:126-162`.

## Totals

| Part | Uncut closure | After cuts | Over ~40 files? |
|---|---|---|---|
| PR review | 100 files, 20,297 lines | 18 files, 3,680 lines, plus entry and barrels (4 files cut down) | no |
| CI pattern | `ci.yml` (446 lines) + `scripts/ci-scope.mjs` (142 lines) | 1 workflow, 1 script | no |
| Shell, main/preload/shared | `main/index.ts`: 150 files, 31,934 lines | about 11 source files, about 1,400 lines (plus the new file module) | no, per area |
| Shell, renderer | 22 renderer files + `shared/ipc.ts`; no package imports | per view below | no |
| Area skills | 28 manifests | your ticks | n/a |

---

## 1. PR review

Entry: `packages/cli/src/commands/review.ts`. Without cuts, the import closure is **100 files, 20,297 lines**. It reaches the task store, router, proof, agent, ship, posture catalog, detectors and the registry. With the cuts below it is **18 files, 3,680 lines**, plus 4 files cut down to an entry and two barrels.

### Files to take

| File (under `packages/`) | Lines | Why | Cut |
|---|---|---|---|
| `cli/src/commands/review.ts` | 152 | The `review` command | **cut**: drop `--task` (`loadTask`, `whoami`, the ledger append); drop `findJudged: findJudgedTree` (task store); drop the `buildContext().profile()` lookup (it reads `.rivetari/profile.yml`, absent here), so the model is `--model` or `JUDGE_DEFAULT_MODEL`; drop `usageDate: today()` so nothing writes `.rivetari/ai-usage.log` |
| `runtime/src/judge/review.ts` | 453 | Rounds, carry from earlier reviews on the same tree, posting | **cut**: (1) an `approve` verdict posts as **COMMENT**, never APPROVE (the mandated fix, `review.ts:414-416`); (2) delete the `carryJudgeCheck` block at `:306-318` (`rivetari/judge` check run, UNUSED per the audit); (3) inline `resolveRepoSlug` (8 lines) and `QUIET_LOG` (6 lines) instead of taking `engine/src/context.ts` |
| `runtime/src/judge/tier2.ts` | 1138 | The review itself: packing, prompt, model call, verifier | **cut**: the type-only imports `Shot` (`proof/shoot.ts`) and `AllowedDecision` (`task/tasks.ts`) become local interfaces of the same shape (about 30 lines). The rest is verbatim |
| `runtime/src/judge/fast-path.ts` | 33 | Named in the prompt; review doesn't use it | verbatim; no surviving test |
| `runtime/src/judge/banned.ts` | 225 | Tells the reviewer about banned patterns. It reads `.rivetari/banned.json` at the base, which is absent here, so the list is empty | verbatim |
| `runtime/src/judge/protected.ts` | 230 | `isTestFile`, `parseNameStatus` | verbatim |
| `runtime/src/judge/tier1-criteria.ts` | 91 | tier2's formatting of tier-1 results. Only used when a caller passes `tier1`, and review never does | verbatim (D3) |
| `runtime/src/judge/outcome.ts` | 54 | the `CheckOutcome` type | **cut**: delete `side()`/`compare()` and their `ControlResult` import, which pulls in the posture evaluator |
| `runtime/src/task/card.ts` | 104 | The `Card` type tier2 and review take. Zod only | verbatim (D4) |
| `engine/src/ai/claude-cli.ts` | 197 | The claude CLI transport with the `--effort` fallback | verbatim |
| `engine/src/ai/call-limit.ts` | 249 | Timeouts and the spawn limit | verbatim |
| `engine/src/ai/client.ts` | 188 | `createAiClient`: CLI first, Anthropic SDK if `ANTHROPIC_API_KEY` is set | verbatim (D5) |
| `engine/src/ai/types.ts` | 69 | `AiClient`, `AiError`, `Effort` | verbatim |
| `engine/src/ai/usage.ts` | 110 | `estimateCost` for the review footer | verbatim |
| `engine/src/ai/redact.ts` | 99 | `isSensitivePath`, `looksLikeSecret` | verbatim |
| `engine/src/detectors/exec.ts` | 204 | `resolveOnWindows` for `claude` on Windows; Node built-ins only | verbatim |
| `engine/src/github/slug.ts` | 26 | `parseRepoSlug` | verbatim |
| `engine/src/github/token.ts` | 58 | `githubToken`: `--token`, then `GITHUB_TOKEN`/`GH_TOKEN`, then `gh auth token` | **cut**: delete the GitHub App branch (D1) and inline `resolveRepoSlug` |

**Entry and barrels**, each copied verbatim and then cut:

| File | Lines | Cut |
|---|---|---|
| `cli/src/bin.ts` | 7 | verbatim |
| `cli/src/cli.ts` | 824 | keep `run()` and the `review` registration; delete the other command imports and registrations |
| `engine/src/index.ts` | 279 | keep only the exports of taken files |
| `runtime/src/index.ts` | 338 | the same |

The package names stay `@arynbht/rivetari`, `-engine` and `-runtime`, so every copied import resolves unchanged.

npm dependencies: `simple-git`, `zod`, `picomatch`, `@octokit/rest`, `commander`, and `@anthropic-ai/sdk` (with D5).

### Imports into leave-behind code, and the cut for each

| From | To (leave-behind) | Cut |
|---|---|---|
| cli `review.ts` | `task/tasks.ts` (`loadTask`, `whoami`), `judge/task-judge.ts` (`findJudgedTree`) | Delete the `--task` path and the `findJudged` wiring. `carriedFor` keeps its optional parameter, so `r28-judged-tree.test.ts` still passes unchanged |
| cli `review.ts` | `engine/context.ts` `buildContext` (profile, waivers, evidence, catalog schema) | Delete the call |
| runtime `review.ts` | `engine/github/checks.ts` `carryJudgeCheck` | Delete the block |
| runtime `review.ts`, `token.ts` | `engine/context.ts` `resolveRepoSlug`, `QUIET_LOG` | Inline (14 lines) |
| `tier2.ts` | `proof/shoot.ts` `Shot`, `task/tasks.ts` `AllowedDecision` (types) | Local interfaces |
| `outcome.ts` | `engine/evaluate.ts` `ControlResult` (type) | Delete `side`/`compare` |
| `token.ts` | `engine/github/app.ts` | Delete the App branch |
| `tier2.ts` → `usage.ts` | `appendUsage` writes `.rivetari/ai-usage.log` | The CLI stops passing `usageDate`, so the call never runs; tier2 is unchanged |

### Tests

**18 come over unchanged** (2,742 lines). Every import is inside the kept set and none uses `vi.mock`. They are UNTESTED until they run here:
- `judge/`: `tier2`, `tier2-cache-usage`, `tier2-null-repro`, `r13-unmet-acceptance`, `r22-gate-criteria`, `r28-forged-marker`, `r28-judged-tree`, `r3-tier1-criteria`, `banned`
- `engine/ai/`: `cache-usage`, `call-limit`, `claude-cli`, `claude-cli-effort`, `client`, `r27-cli-failure`, `redact`, `usage`
- `github/slug`

**Dropped, because they need left-behind code:**

| Test | Needs |
|---|---|
| `token.test.ts` | `app.ts`. `githubToken` will have no test |
| `protected.test.ts` | `tier1.ts` |
| `tier2-evidence.test.ts` | `proof/prove.ts` |
| `r23-review-cost.test.ts` | `review-plan.ts` |
| `generated-suppressions.test.ts` | `diff-rules.ts` |
| `env-template.test.ts` | `agent/stops.ts` |
| `task/fast-path.test.ts` | the runner |
| `judge-verdict-pilot`, `unverified-acceptance`, `risk-check` | task-judge, tier1, the runner |

No existing test covers the CLI command or the APPROVE event. Phase 2 adds one new test: the review never sends `APPROVE`.

## 2. CI pattern

The `ci.yml` jobs:

| Job | Take? | Note |
|---|---|---|
| `changes` | yes | **cut**: the "Has the judge passed this commit" step and the `judged` output; the catalog and registry filters |
| `lint`, `typecheck`, `test (shard/3)` | yes | **changed as this prompt requires**: PRs run on Ubuntu **and Windows** (the source runs PRs on Ubuntu only) |
| `validate`, `action-bundle` | no | leave-behind |
| `secret-scan` (gitleaks) | yes | |
| `desktop-e2e` | from phase 4 | |
| `build-test` (main and nightly, both OSes) | yes | **cut**: the action-bundle step |
| `ci` aggregator | yes | **cut**: `needs` loses `validate` and `action-bundle` |
| `main-status` ("main is red" issue) | D6 | Recommend dropping it: nothing in SCOPE asks for it |

`scripts/ci-scope.mjs`: its test `judge/ci-scope.test.ts` checks it against tier 1's `workspace.ts`, so the test is dropped and the script comes over **untested**.

## 3. Shell

Full detail is in `shell-main.md` and `shell-views.md`.

### Main process, preload and shared

| Area | Source lines → kept | Leave-behind cuts |
|---|---|---|
| Frame (`main/index.ts`, preload, `shared/ipc.ts`, config) | 2,576 → about 750 | Delete 13 module imports of dropped features, with their IPC handlers (27 channels dropped, 13 kept, 6 kept for the GitHub card, 1 new fetch channel) |
| Fence (`registered.ts`, `repos.ts`) | 94 → 94 | none |
| Watcher (`engine/now.ts`, NowHub) | 662 → about 240, plus the new file module | `watchTasks` (81 package files) becomes a narrow interface over the file module |
| Notifications | 19 + 67 lines of `index.ts` | Re-keyed off the new needs-you kinds |
| Map + Docs (`map.ts`, `docs.ts`) | 269 → about 305 | Inline the floorplan check (about 8 lines) and Docs' contained read and glob (about 37 lines; **the symlink guard must come over exactly**); delete `floorplanOn` (`.rivetari/profile.yml`) |
| Settings | 70 → about 50 | Theme only. The Anthropic key, AI preference and update fields go. Old `settings.json` files still load |
| GitHub card (later) | about 560 + about 245 wiring | Client id came from `rivetari app register`, and the PR number from the ledger. Both need new sources (the PR number from the card's "Draft PR opened: #" line) |

### Renderer views

| View | Core files, lines | Survives the re-pointing |
|---|---|---|
| App shell (sidebar, tab bar, theme, tabs kept mounted) | 11, 851 | about 85% |
| Home | 2, 449 | Home.tsx about 60% |
| Now | 5, 2,099 | Now.tsx 35–40%; about 525 of its 906 lines are beat, route, judge, ledger or spend code |
| Tasks | 5, 2,395 | Tasks.tsx about 40%; the task record about 4% |
| Posture → Checklist | 5, 1,877 | about 12% (the collapsible groups, totals strip and load guard) |
| History + Docs | 5, 1,042 | History about 20–25%; Docs, `markdown.ts` and `docs.ts` 85–100% |
| Map | 2, 343 | about 95% |
| Project (dropped) | 4, 1,508 | 0% |

Views import from each other: Home takes `KIND_LABEL` from Now, and Now takes `AnswerForm`, `isHttps` and `QUIET_MS` from Tasks. The cut moves `isHttps` into `lib/` and gives Home its own labels. That is a move, so it needs your OK (S3).

Stale command text: `rivetari autonomy` appears at `Now.tsx:656`, `Project.tsx:109` and `project.ts:410/434`, and all of it goes with the cuts. The `/rivetari` and `rivetari task new` empty states are at `Now.tsx:808-812` and `Tasks.tsx:793-796`. Other stale references sit in `RepoMap.tsx:69`, `Posture.tsx:1092`, `History.tsx:394` and `home.ts:89`.

### Shell tests

| Status | Tests |
|---|---|
| Come over unchanged | `map-fence.test`, `map.test` (5 of 6), `registered.test`, `app-id.test`, `map.e2e` (if the empty-state wording is kept), `signin.e2e` (with the GitHub card) |
| Would need edits | `shell-defaults`, `axe`, `registered-repos` and `history-scroll` e2e; `docs.test` (reads the Rivetari checkout); `settings.test`; the CI tests in `now-health` |
| Dropped | now, tasks, task-board, task-answer, tasks-progress, posture, project and history e2e. They assert content from signed ledgers, `state.json` and `history.jsonl`. Their 7 fixtures write runtime records. All unit tests for Now, Tasks, Posture, Project, History, Home and updates go too |

**This conflicts with phase 4.** Phase 4 says "done when the e2e tests for the kept views pass against the fixture". Almost none of the old view tests can pass against a file source, so the kept views need **new** e2e specs on a new fixture. Rule 5 forbids rewriting a copied test, so the "would need edits" tests are either dropped or edited with your OK (S1).

### Shell decisions

- **S1, tests.** Write new e2e specs per view card, labelled as new rather than copied. The "would need edits" tests: drop them, or edit them in place with the edits shown? *Recommend: edit, each edit listed in `EXTRACTED.md`.* Their fence, a11y and tab-bar checks are worth more than a fresh rewrite.
- **S2, what counts as new.** NowHub decides what is new by ledger sequence number. The file model needs a different key for notifications and badges. *Recommend: key each item by kind + card id + its text. Keep the first-read priming, so a launch doesn't notify everything already waiting.*
- **S3, the cross-view move.** *Recommend: move `isHttps` to `lib/`.*

## 4. Area skills: tick the ones to take in phase 3

Licenses were checked against each upstream LICENSE at the pin. "Scan" is the registry's rules rerun at the pin. "Loaded" comes from the pilot ledgers (task ids only).

| ☐ | Skill | Scope | Area | Upstream @ pin | License | Size | Scan | Fork | Loaded on a real task |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | a11y-core | task | a11y | Community-Access/accessibility-agents @a538edc9 | MIT | 9 files, 116 KB | clean | — | yes: T-0022, 23, 25 |
| [ ] | accessibility-lead | task | a11y | same @a538edc9 | MIT | 6, 21 KB | clean | — | yes: T-0022, 23, 25 |
| [ ] | animate | task | motion | emilkowalski/skills @715c1807 | MIT | 2, 20 KB | clean | — | no (T-0026 abandoned before build) |
| [ ] | code-review-and-quality | spine | workflow | addyosmani/agent-skills @301b02b1 | MIT | 1, 21 KB | clean | mirror | yes (spine): T-0008, 10, 11, 28 |
| [ ] | constraint-driven-development | spine | workflow | addyosmani/agent-skills @301b02b1 | MIT | 3, 35 KB | allowed line: `disable-checks`, SKILL.md:294 (a mention of `--no-verify`) | mirror | yes (spine): 18 tasks |
| [ ] | data-inventory-mapping | task | legal | mukul975/Privacy-Data-Protection-Skills @9b2ef9ea | Apache-2.0 | 5, 46 KB | clean, never locked | — | no |
| [ ] | differential-review | spine | security | trailofbits/skills @e4dd0bb5 | **CC-BY-SA-4.0** | 7, 37 KB | clean | mirror | yes (spine): T-0010, 28 |
| [ ] | dsar-processing | task | legal | mukul975/… @9b2ef9ea | Apache-2.0 | 5, 34 KB | clean, never locked | — | no |
| [ ] | floorplan | task | docs | haydenschmitty/floorplan @94f81b46 | MIT | 54, 3.0 MB | 4 allowed lines (2 `exfiltrate` regexes, 2 "skip tests" mentions) | — | ran at close in 19 tasks; never named in a `skills:` list. This is the **generator**, which is leave-behind |
| [ ] | fp-check | spine | security | trailofbits/skills @e4dd0bb5 | **CC-BY-SA-4.0** | 9, 43 KB | clean | mirror | yes (spine): T-0010, 28 |
| [ ] | frontend-design | task | ui | anthropics/skills @2c5958ec | Apache-2.0 (per-skill LICENSE) | 2, 20 KB | clean | mirror | yes: T-0022, 23, 25 |
| [ ] | hallmark | task | ui | Nutlope/hallmark @407fa689 | MIT | 187, 7.1 MB | clean by the rules, but **ships `scripts/install-hook.mjs`** (PostToolUse hook) and sends data to api.together.xyz when its API key is set | — | no |
| [ ] | impeccable | task | ui | pbakaus/impeccable @3842da6e | Apache-2.0 | 63, 2.3 MB | **BLOCKED**: 5 findings in `reference/hooks.md` (writes `.claude/settings.local.json`; `hooks off`) | **fork `arynbht/impeccable@9563f828` removes hooks.md; scans clean. Its engine binary still has the hook installer and telemetry** | no |
| [ ] | improve-animations | task | motion | emilkowalski/skills @715c1807 | MIT | 3, 19 KB | allowed line: quotes "ignore previous instructions" so it can be flagged | — | no |
| [ ] | incremental-implementation | spine | workflow | addyosmani/agent-skills @301b02b1 | MIT | 1, 10 KB | clean | mirror | installed, never named |
| [ ] | insecure-defaults | task | security | trailofbits/skills @9ea55c59 | **CC-BY-SA-4.0** | 4, 19 KB | clean | mirror | no |
| [ ] | native-writing | task | docs | kane50613/native-writing @02e75d01 (whole repo) | MIT | 34, 144 KB | clean | — | yes: T-0023, 32 |
| [ ] | planning-and-task-breakdown | spine | workflow | addyosmani/agent-skills @301b02b1 | MIT | 1, 11 KB | clean | mirror | installed, never named |
| [ ] | playwright-cli | spine | testing, ui | microsoft/playwright-cli @ce9b41b6 | Apache-2.0 | 11, 69 KB | allowed line: "Never skip hooks…" (a mention). Suggests an unpinned `npm i -g @latest` | mirror | yes (spine): 28 of 32 |
| [ ] | retention-schedule | task | legal | mukul975/… @9b2ef9ea | Apache-2.0 | 5, 33 KB | clean, never locked | — | no |
| [ ] | review-animations | task | motion | emilkowalski/skills @715c1807 | MIT | 2, 18 KB | clean | — | no |
| [ ] | shipping-and-launch | spine | workflow | addyosmani/agent-skills @301b02b1 | MIT | 1, 12 KB | clean | mirror | yes (spine): T-0010, 28, 31, 32 |
| [ ] | skill-creator | spine | workflow | anthropics/skills @2c5958ec | Apache-2.0 | 18, 225 KB | clean (calls `claude -p`) | mirror | installed, never named |
| [ ] | spec-driven-development | spine | workflow | addyosmani/agent-skills @301b02b1 | MIT | 1, 13 KB | clean | mirror | yes (spine): T-0002, 06, 17, 23, 32 |
| [ ] | taste-skill | task | ui | Leonxlnx/taste-skill @f6b76575 | MIT | **1,631, 36.6 MB** | **BLOCKED**: a Stop hook in its frontmatter | — | no ("matched but isn't available") |
| [ ] | terraform-skill | task | infra | antonbabenko/terraform-skill @9c1e92d9 | Apache-2.0 (GitHub says NOASSERTION) | 9, 196 KB | 2 allowed lines (`curl … \| sh` example; a pre-commit `hooks:` example) | — | no |
| [ ] | test-driven-development | spine | testing | addyosmani/agent-skills @301b02b1 | MIT | 1, 17 KB | clean | mirror | yes (spine): 18 tasks |
| [ ] | webapp-testing | spine | testing, ui | anthropics/skills @2c5958ec | Apache-2.0 | 6, 22 KB | clean | mirror | yes (spine): 28 of 32 |

Two pilot-only skills have no registry manifest: the impeccable fork (above), and `ui-ux-pro-max` (nextlevelbuilder @a4fc248f, MIT, 81 files, 3.7 MB, clean, never loaded).

"Mirror" means the owner has a fork with the same content. The manifest points at upstream, and the fork isn't trimmed.

**Licenses:** differential-review, fp-check and insecure-defaults are **CC-BY-SA-4.0**. That is share-alike, so under the "not permissive → listed and skipped" rule they're skipped unless you say otherwise. Rivetari took them with a signed license review on 2026-11-09.

**Recommended tick (my suggestion, yours to change):**
- **Workflow:** code-review-and-quality, constraint-driven-development, incremental-implementation, planning-and-task-breakdown, spec-driven-development, shipping-and-launch.
- **Testing:** test-driven-development, webapp-testing, playwright-cli.
- **UI and accessibility:** a11y-core, accessibility-lead, frontend-design, impeccable from **your fork**.
- **Docs:** native-writing.

Leave out:
- floorplan: it's the generator, which is leave-behind.
- skill-creator: not an area skill.
- hallmark: hook installer.
- taste-skill: blocked.
- terraform-skill and the legal and motion skills: unless a repo needs them.

## 5. AI prompt templates (19): for your decision only, nothing copied

All are in `packages/catalog/prompts/`, run by `rivetari ai <task>`.

| Template | Produces |
|---|---|
| accessibility-statement | `docs/accessibility.md`: WCAG 2.2 AA target, limitations, how to report barriers |
| adr | `docs/adr/0001-….md`: an architecture decision in MADR format |
| brief | `docs/brief.md`: a one-page discovery brief |
| build-vs-buy | `docs/build-vs-buy.md`: build, buy and open-source options weighed for one capability |
| c4 | `docs/architecture/c4.md`: Mermaid System Context and Container diagrams inferred from code |
| changelog | `CHANGELOG.md` from conventional commits since the last tag |
| copy-guidelines | `docs/copy-guidelines.md`: voice, tone and UI-copy rules |
| data-inventory | `docs/data-inventory.md`: personal data, its purpose, legal basis, storage and sharing |
| dsar-process | `docs/dsar-process.md`: a runbook for data subject access requests |
| explain-gaps | `docs/rivetari-gaps.md`: plain explanation of the failing posture controls |
| license-summary | `docs/legal/license-summary.md`: third-party license exposure |
| nfrs | `docs/requirements/nfrs.md`: measurable latency, throughput, SLO, RPO/RTO and scale targets |
| out-of-scope | `docs/requirements/out-of-scope.md`: non-goals with reasons |
| privacy-policy | `docs/privacy-policy.md`: plain-language privacy policy |
| retention-schedule | `docs/retention-schedule.md`: retention per data category and its deletion trigger |
| runbook | `docs/runbooks/runbook.md`: per-service and per-alert operational runbooks |
| stories | `docs/requirements/stories.md`: user stories from the brief and repo |
| test-scaffold | `docs/testing/scaffold-suggestions.md`: tests to add for uncovered code |
| threat-model | `docs/security/threat-model.md`: a STRIDE threat model |

## 6. Posture lanes: for your decision only, nothing copied

111 controls in `packages/catalog/controls/`. That matches the audit.

| Lane | Controls |
|---|---|
| accessibility | 6 |
| cicd | 14 |
| cloud | 7 |
| data | 6 |
| development | 8 |
| documentation | 6 |
| hygiene | 10 |
| legal | 7 |
| observability | 6 |
| performance | 6 |
| product | 7 |
| quality | 6 |
| security | 10 |
| testing | 6 |
| ux | 6 |

## 7. Proposed cards, phases 1–5

One card per PR, on `card/<id>` branches. From T-0003 on, each card uses the kit.

| Phase | Card | What | Size |
|---|---|---|---|
| 1 | T-0001 | Workspace skeleton: pnpm, `tsconfig.base`, eslint, prettier, vitest, `.nvmrc`; empty `packages/cli`, `packages/engine`, `packages/runtime`, `apps/desktop`; `ci.yml` cut as in §2, plus `ci-scope.mjs`; green on Ubuntu and Windows | small |
| 1 | T-0002 | The kit: Appendices A–I written exactly, plus `README.md` | small |
| 1 | T-0003 | Install the kit on this machine (`kit/setup/` → `~/.claude/skills/setup/`, `skills/` → `~/.claude/kit-skills/`) and run `/setup` on this repo | small |
| 2 | T-0004 | PR review: a verbatim commit, a cut commit, 18 tests, a new never-APPROVE test, `EXTRACTED.md`; one real review posted on a PR here | medium |
| 3 | T-0005 | Area skills: your ticks, each body read first, `skills/INDEX.md` | medium |
| 4 | T-0006 | Shell frame: window, sidebar, fence, tab bar (Now · Tasks · Checklist · History · Map), theme, Settings with theme only; tabs empty | medium |
| 4 | T-0007 | The file source (§6.1) and the fetch action, with unit tests on a fixture repo | medium |
| 4 | T-0008 | Now | medium |
| 4 | T-0009 | Tasks | medium |
| 4 | T-0010 | Checklist | small |
| 4 | T-0011 | History and Docs | small |
| 4 | T-0012 | Map | small |
| 4 | T-0013 | Home, badges, notifications | medium |
| 4 | T-0014 | GitHub sign-in, CI and PR state: **ask first**. About 5 files and about 800 lines, and it needs a client id | medium |
| 5 | T-0015 | Hand-over: run `/setup`, `/card`, `/park`, `/done` and `/handoff` once on a scratch repo and record what happened | small |

## 8. Decisions waiting on you

| # | Decision | Recommendation |
|---|---|---|
| D1 | Drop the GitHub App path for posting. On your own PRs every review then posts as COMMENT | drop |
| D2 | Drop `review --task` and the task carry | drop |
| D3 | `tier1-criteria.ts` verbatim | keep |
| D4 | `card.ts` verbatim for the `Card` type | keep |
| D5 | The Anthropic SDK fallback in `client.ts` | keep verbatim |
| D6 | The "main is red" issue job | drop |
| S1 | Shell tests that would need edits | edit, and list each edit |
| S2 | What counts as new for notifications and badges | kind + card id + text, primed on first read |
| S3 | Move `isHttps` into `lib/` | yes |
| K1 | Skill ticks | see §4 |
| K2 | The CC-BY-SA skills | skip |
