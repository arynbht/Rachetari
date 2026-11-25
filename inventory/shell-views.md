# Inventory: desktop shell views (renderer + main-side handlers)

Source: `SCRATCH/src` at `32f4b88`. All paths are relative to `apps/desktop/` unless they start with `packages/`. Line counts are `wc -l`. The tracer's counts run one line higher per file because it splits on `\n`.

## Method

- **Tracer.** `tools/trace.cjs` doesn't resolve the renderer alias `@/* -> src/renderer/*`, which comes from `tsconfig.web.json` `paths` and `electron.vite.config.ts` `resolve.alias`. I patched a copy, `SCRATCH/tools/trace-alias.cjs` (built by `tools/patch.cjs`), to map `@/` and to record npm imports. The summaries come from `tools/sum.cjs`, and the per-area traces are in `SCRATCH/sv/*.json`. No other aliases exist: main and preload use only relative imports and `@arynbht/rivetari-*`.
- **Traces run:**
  - Renderer: `ipc`, `preload`, `r-all` (main.tsx), `r-shell`, `r-home`, `r-now`, `r-tasks`, `r-posture`, `r-history`, `r-map`, `r-project`, `r-settings`.
  - Main: `m-home`, `m-now`, `m-nowact`, `m-nowhealth`, `m-tasks`, `m-posture`, `m-posturetask`, `m-audit`, `m-history`, `m-docs`, `m-map`, `m-project`, `m-settings`, `m-index`.
  - The only unresolved import is `app-id.ts -> ../../electron-builder.yml?raw`, a Vite raw import that isn't in this scope.

## Headline findings

1. **The renderer imports no package code.** `r-all` (main.tsx) reaches 22 renderer files (7,043 lines) plus `shared/ipc.ts`, and nothing in `packages/*`.
2. **`shared/ipc.ts` imports nothing except `zod`.** The views do import types from it, but it doesn't reference runtime types, so there's no type chain to cut. The coupling is by **shape**: many schemas in ipc.ts mirror runtime objects (`TaskSummary`, `NeedsYouItem`, `TaskDetail`, `HistoryView`, `Posture`, …), and main `.parse`s runtime output against them. Those schemas are deleted or rewritten, not cut.
3. **Renderer views couple to each other**, and this is the real tangle:
   - `Home.tsx` imports `KIND_LABEL` from `Now.tsx` and `isHttps` from `Tasks.tsx`.
   - `Now.tsx` imports `AnswerForm`, `isHttps` and `QUIET_MS` from `Tasks.tsx`.
   - `Tasks.tsx` imports `TaskRecord` and `PrPart` from `TaskRecord.tsx`.
   - The result: Home's closure is 4,252 traced lines (Home + Now + Tasks + TaskRecord), and Now's is 3,922.
   - Cut: move `isHttps` (8 lines) to `lib/`, and give Home its own label map.
4. **All package coupling is on the main side**, and every view handler except Map and Docs pulls in large closures:
   - `now-actions` and `tasks`: about 120 files and 26k lines.
   - `map.ts` also reaches 102 files and 21.5k lines, but only through `loadProfile` plus two runtime symbols, and both are easy to cut.
5. **The paths in `files/desktop-shell.md` check out against the code, with one exception.** The doc says paths are relative to `apps/desktop/src/`, but `electron-builder.yml` (Security § Packaging) lives at `apps/desktop/electron-builder.yml`, not under `src/`. These were all verified:
   - `main/engine/task-beat.ts`, `shared/ipc.ts`, `preload/index.ts`, `main/index.ts`
   - `<userData>/repos.json`, `settings.json`, `anthropic-key.bin`, `github-token.bin`
   - `<rivetariConfigDir>/app.json`
   - `.rivetari/skills.lock`, `skills.state.json`, `state.json`, `history.jsonl`
   - The `rivetari/tasks` branch, the 2 s/10 s intervals, the Recent limit of 50, the 288px sidebar and the 1140×780 window.

---

## Area 1: App shell (renderer)

### Files

| Path | Lines | Why needed |
|---|---|---|
| src/renderer/App.tsx | 535 | Sidebar, Home/Settings routing, the `TabBar` ARIA tablist (lines 41-97: ←/→ wrap, Home/End, roving tabindex), the tabs-stay-mounted logic (`opened` Set, 123-128, 150-153, 239-247, panels 417-526), theme effect (210-218), preload-failure message (251-260) |
| src/renderer/main.tsx | 14 | React root |
| src/renderer/index.html | 13 | Entry; `class="dark"` default |
| src/renderer/index.css | 124 | Tailwind layers, light/dark tokens, `.doc-prose` (used by Docs) |
| src/renderer/env.d.ts | 9 | `window.rivetari: RivetariApi` (type import from `../preload`) |
| src/renderer/lib/utils.ts | 7 | `cn()` |
| src/renderer/lib/errors.ts | 12 | `errorMessage()` strips the Electron IPC prefix |
| src/renderer/lib/theme.ts | 20 | `applyTheme`, `resolveTheme` |
| src/renderer/lib/time.ts | 22 | `when`, `span`, `useNow` (used by Now, Tasks, History, Project, TaskRecord) |
| src/renderer/components/ui/button.tsx | 44 | shadcn Button |
| src/renderer/components/ui/card.tsx | 51 | shadcn Card |
| tailwind.config.ts, postcss.config.js, components.json, tsconfig.web.json, electron.vite.config.ts (renderer block) | 48+6+17+20+36 | Build config; the `@` alias lives in two places |
| *(decision)* src/renderer/components/AuthControls.tsx | 116 | Sidebar GitHub sign-in. Not in this inventory's scope, but the sidebar renders it, and CI on Home/Now needs its token |

**Totals:** 11 source files, 851 lines, plus 5 config files (127 lines). AuthControls (116) is extra if sign-in is kept.

**npm:**
- Runtime: react, react-dom, lucide-react, class-variance-authority, clsx, tailwind-merge.
- Build: vite, @vitejs/plugin-react, electron-vite, tailwindcss, tailwindcss-animate, postcss, autoprefixer.
- zod reaches the renderer bundle only because `RepoMap.tsx` value-imports `MAP_PARTITION` from ipc.ts; every other ipc import in the renderer is `import type`.

### Imports reaching leave-behind or dropped code

| Import (App.tsx line) | What it is | Proposed cut | Changes a kept feature? |
|---|---|---|---|
| L8 `Posture` | Dropped view, becomes Checklist | Swap in the new `Checklist` component; rename tab id `posture` to `checklist` in `TABS` (L21-28) and in the panel (L455-473) | No. The tablist logic is generic over `TABS` |
| L9 `Project`, panel L475-493 | Dropped tab | Delete the import, the `TABS` entry and the panel | No |
| L11 `Settings` | Cut to theme only | Keep; see Area 8 | No |
| L38 `UpdateInfo`, L122 `updateBanner`, L165-173 launch update check, L360-385 banner | Dropped update banner | Delete. `settings.load()` then `applyTheme` stays | No |
| L34-35 `NowBadges`/`NowFocus`, L99-108 `NeedsYouBadge`, L129-148 + L189-208 badges and notification focus, L181-187 `now.select` | NowHub needs-you count and OS notifications | **Decision.** Keep only if the new file model has a "needs you" notion (for example a status in CARD.md). Otherwise delete, about 55 lines | If deleted: the sidebar badges and notification click-through disappear. Neither is in the keep or drop list, so this needs a decision |
| `onOpenTask` callbacks into Tasks (L430-433, 467-470, 487-490, 507-510) | Cross-view "Open T-xxxx in Tasks" | Keep. Re-key on card ids | No |

**Survival:** about 85% of App.tsx, or about 75% if badges and notifications go.

### Tests

| Test | Verdict | Why |
|---|---|---|
| e2e/shell-defaults.e2e.ts | **Needs a rewrite** | The shell assertions carry over: the tab order, Now selected on open, ArrowRight moving to Tasks, the board/list toggle with aria-pressed, and the panel reset on repo switch. But it uses `boardRepo()` (board-fixture.ts writes HMAC-signed runtime ledgers), `TABS` includes Posture and Project, and it asserts the `intake` column and 7 rows. Needs a file fixture and the new tab list |
| e2e/axe.e2e.ts | **Needs edits** | The empty state, Now heading, Map empty state and Settings steps carry over. The Posture step (Run audit) and Project step assert dropped features; replace them with a Checklist step |
| e2e/honest-basics.e2e.ts | **Split** | Test 4 ("Settings has no Default GitHub org…") comes over **unchanged**. Tests 1-3 assert Posture, state.json and Run audit: dropped |
| e2e/signin.e2e.ts | Unchanged if sign-in is kept (not in this scope) | — |
| e2e/registered-repos.e2e.ts | **Needs an edit** | The registered-repo guard is kept, but the test exercises it through `posture.get` and `audit.run` (dropped channels, L175-181, L215-249) as well as `docs.*`. Swap those for a kept repo-scoped channel; drop the `state.json` existence assert |
| Unit tests | None exist for renderer code | — |

---

## Area 2: Home

### Files

| Path | Lines | Why needed |
|---|---|---|
| src/renderer/components/Home.tsx | 329 | The view: header counts, one RepoCard per repo, a Refresh button, live merging of `now:update` |
| src/main/engine/home.ts | 120 | `readHome` and `homeRepo` |
| src/main/engine/now-health.ts (`spendFrom` only) | about 20 of 271 | Spend this week |
| src/main/engine/posture.ts (`readPhase` only) | about 17 of 259 | Posture gate |
| main/index.ts L533-544 | 12 | `home:get` handler |
| shared/ipc.ts L815-863 | 49 | HomeNeed, HomeRepo, HomeView |
| preload/index.ts L305-311 | 7 | `home.get` |

**Totals:** 2 core files, 449 lines. Plus about 37 lines of now-health and posture, and 68 lines of index, ipc and preload.

**npm:** lucide-react (renderer). The main side uses nothing directly; everything it uses comes through packages.

### Imports reaching leave-behind or dropped code

| Import | Proposed cut | Changes a kept feature? |
|---|---|---|
| Home.tsx L4 `KIND_LABEL` from `Now.tsx` (beat kinds intake/route/stop/judge/merge/record) | Local label map for whatever "needs you" kinds the file model has. This breaks the Home → Now → Tasks → TaskRecord closure (2,556 lines) | No |
| Home.tsx L5 `isHttps` from `Tasks.tsx` | Move to `lib/url.ts` | No |
| Home.tsx L40-71 `gateLine`/`PhaseFact`, L174-176 the "Posture gate" fact | Delete (posture gate dropped) | No |
| Home.tsx L165-173 the "Spend this week" fact, `usd` | Delete (spend dropped) | No |
| Home.tsx L177-190 the "Autonomy" fact | Delete (autonomy dropped) | No |
| Home.tsx L145-164 the "main's CI" fact + L216-231 `now.ci` per repo | **Decision**: keep only if sign-in and CI are kept (see Now) | — |
| home.ts L8 `loadProfile` (engine/profile.ts, which pulls in catalog) | Delete. It fed only autonomy and the declared phase | No |
| home.ts L9 `historyRows` (runtime/judge/findings.ts) | Delete (spend) | No |
| home.ts L9 `type TaskView` (runtime/task/watch.ts) | Narrow `HomeDeps.views` away. Home needs only `state(repoPath)` from the hub, re-pointed at the new module's per-repo summary | No |
| home.ts L18 `spendFrom` (now-health), L19 `readPhase` (posture, which pulls in catalog, engine evaluate/evidence/history/phase/waivers/audit-record) | Delete | No |
| `m-home` closure | engine 46 files/5,597, runtime 28/9,355, catalog 9/1,274, registry 7/1,363. After the cuts: zero | — |

**Survival:**
- Home.tsx: about 60%. The shell, the RepoCard frame, Fact, the Running and Needs-you facts, and the live-update merge (rewritten for the new state shape) stay.
- home.ts: about 30%. `readHome`/`homeRepo` stay with `HomeDeps = {listRepos, state}`.

### Tests

| Test | Verdict | Why |
|---|---|---|
| e2e/home.e2e.ts test 1 | **Dropped** | It asserts runtime-fed content: "1 running · 5 waiting", "T-0006 · build", "Card to confirm: T-0001", "$1.25 closed…", "supervised (configured)", "declared scaffold · inferred build". The fixture `homeRepos()` is built from now-fixture (HMAC ledgers) and posture-fixture (state.json) |
| e2e/home.e2e.ts test 2 ("says how to start when no repo is registered") | **Unchanged** | Pure shell: the empty text and axe |
| src/main/engine/home.test.ts (6 tests, 225 lines) | **Dropped** | Imports runtime types (`TaskHistoryRow`, `TaskView`) and asserts spend, phase and autonomy. Its "reads only registered repos" and "no repos" cases are worth re-writing against the narrowed deps |

---

## Area 3: Now

### Files

| Path | Lines | Why needed |
|---|---|---|
| src/renderer/components/Now.tsx | 906 | The view |
| src/main/engine/now.ts | 662 | `NowHub` (multi-repo poller: sidebar repos, shown repo at 2 s and others at 10 s, Tasks-tab listener, badges, onNew/onGone notifications, onMerged) plus the TaskView→NowState mappers |
| src/main/engine/now-health.ts | 271 | The health strip (autonomy, spend, skills) and `mainCi` |
| src/main/engine/now-actions.ts | 158 | Confirm, approve, judge findings, openNowPr |
| src/main/engine/task-beat.ts | 102 | The beat path (whoami → pullTasks → lease commit → run → commit/push) |
| main/index.ts L215-281 (NEEDS_YOU_ASK, focusItem, E2E notices, notify/withdraw), L308-338 (nowHub, shareHub, watchRepos), L546-601 (now:get/select/badges/confirm/approve/judge/openPr/health/ci) | about 150 | Wiring |
| shared/ipc.ts L589-814 | 226 | NowRunning, NowCard, NowAssembly, NeedsYouItem, RecentEvent, NowState, action, judge and health schemas, NowCi, NowBadges, NowFocus |
| preload/index.ts L313-413 | 101 | `now.*` |

**Totals:** 5 core files, 2,099 lines, plus about 477 lines of wiring, schema and bridge.

**npm:**
- Renderer: lucide-react.
- Main: `@octokit/rest` and `simple-git`, only if CI is kept: today they come in through engine re-exports, and after the cut they'd be direct deps.

### Line accounting for Now.tsx (beat-specific vs kept)

| Lines | Block | Fate |
|---|---|---|
| 27-34 | `KIND_LABEL` (beat kinds) | Rewrite |
| 40-82 | `Outcome`, `useAction` (action busy/outcome) | **Drop** (beat path) |
| 84-120 | `PrLink` via `now:openPr` (URL from the ledger) | **Drop** |
| 122-138 | `NextLine` (runtime `nextStep`), `Field` | Drop NextLine; keep Field |
| 140-206 | `IntakeBody` + **Confirm** | **Drop** |
| 208-294 | `RouteBody` + **Approve** (route section) | **Drop** |
| 296-328 | `StopBody` + **Allow/Deny** | **Drop** |
| 330-459 | `Findings`, `JudgeBody` (judge section) | **Drop** |
| 461-536 | `ItemCard` | Keep the frame: article, focus target `now-item-<id>`, header (~25 lines). Drop the kind switch |
| 538-564 | `RunningRow` (beat · last tool · turn · elapsed · $cost, quiet after 5 min) | Rewrite for card/* branches (~10 lines survive) |
| 566-574 | `RECENT_LABEL` (ledger event kinds) | Rewrite for nights/cards-done events |
| 576-621 | HealthStrip fetch logic | Keep the shape |
| 635-658 | Autonomy cell, **incl. `rivetari autonomy` at L656** | **Drop** |
| 659-675 | Spend cell | **Drop** |
| 676-703 | Skills cell (lock/installed/router gaps) | Re-point at `skills/INDEX.md` (a count) |
| 704-734 | CI cell | Keep if CI is kept |
| 740-906 | `Now()` shell: subscribe, focus-scroll, sections | Keep. Rewrite the intro (786-791) and empty state (807-812) |

About 525 of 906 lines are beat-, route-, judge-, ledger- or spend-specific. **About 35-40% survive.**

### Imports reaching leave-behind or dropped code

| Import | Proposed cut | Changes a kept feature? |
|---|---|---|
| Now.tsx L4 `AnswerForm` from Tasks | Delete (Allow/Deny dropped) | No |
| Now.tsx L4 `isHttps`, `QUIET_MS` from Tasks | `isHttps` to lib. `QUIET_MS` goes if RunningRow loses its activity clock | No |
| now.ts L11-22: `Assembly`, `Card`, `JUDGE_VERDICT`, `LedgerEntry`, `parseAssembly`, `sha256` (runtime/task/tasks.ts, router/task-route.ts, task/ledger.ts, router/route.ts, task/card.ts) | Delete with `cardOf`/`cardDigest`/`assemblyOf`/`routeReasons`/`needsYouItems`/`runningTasks`/`recentKind`/`recentEvents` (L66-265, ~200 lines) | No |
| now.ts L18-21 `TaskEvent`, `TaskView`, `TaskWatcher`, `watchTasks` (runtime/task/watch.ts) | **Narrow the interface.** NowHub (L291-662) is generic polling: setRepos, select, retune, watchTab, badges, stop. Replace `watch: typeof watchTasks` with the new module's `watch(repo, onEvent, {intervalMs}) → {ready, stop()}` over a generic item type. Drop `onMerged`/`merges()` (fed only Project) and the ledger-seq novelty logic (`caughtUp`/`primedSeq`/`isNew`, ~80 lines), or replace it with a simpler mark | If notifications are kept, the "is this item new" rule changes: today it uses ledger seq and is clock-independent |
| now-health.ts L7-13 `githubToken`, `loadProfile`, `Octokit`, `QUIET_LOG`, `resolveRepoSlug` (engine) | **For CI:** `githubToken(repo, signedIn)` returns the explicit token first (engine/github/token.ts L21), so inlining it as "use the signed-in token" is identical. Keep a `githubToken` seam in `CiDeps` so the CI tests survive. Inline `resolveRepoSlug` (simple-git `getRemotes` + `parseRepoSlug`, engine/github/slug.ts, 26 lines, ~35 total) and `QUIET_LOG` (6 lines). Import `Octokit` from `@octokit/rest` directly. Drop `loadProfile` (autonomy) | No behaviour change to CI if inlined as described |
| now-health.ts L14-22 `historyRows`, `parseAssembly`, `readLock`, `readState`, `skillsStatus`, `TaskHistoryRow`, `TaskView` (runtime, registry) | Delete `nowHealth`/`spendFrom`/`HealthDeps` (L1-132). The skills cell gets a count from the new module (skills/INDEX.md) | The Skills cell's meaning changes (lock/sync state becomes an index count). It's a re-pointed feature, so this is expected |
| now-actions.ts (all): `approveRoute`, `confirmTask`, `loadTask`, `nextStep`, `loadJudgeRecord`, `JudgeRecord` | Delete the file | No |
| task-beat.ts (all): `commitTask`, `holderName`, `pullTasks`, `whoami` (runtime/task/store.ts: leases, rivetari/tasks branch) | Delete the file | No |
| main/index.ts L562-589 now:confirm/approve/judge/openPr; preload now.confirm/approve/judge/openPr; ipc NowActionRequest/Result/NowJudge/NowFinding | Delete | No |
| Closures | `m-now` (now.ts alone): runtime 27/9,266, engine 42/5,177, catalog 9, registry 2. `m-nowact`: runtime 50/14,993. `m-nowhealth`: engine 42, runtime 28, registry 7. All zero after the cuts | — |

**Survival:**
- now.ts: about 40% (NowHub), and only if the new module exposes a watcher; otherwise replace it with a much smaller poller.
- now-health.ts: about 50% if CI is kept, 0% if not.
- now-actions.ts and task-beat.ts: 0%.

### Tests

| Test | Verdict | Why |
|---|---|---|
| e2e/now.e2e.ts (4 tests) | **All dropped** | 1: asserts five needs-you kinds, route fields, judge round, running "build · last tool Edit · turn 18", ledger feed, "supervised (configured)", "effective level: run rivetari autonomy", "0 locked · 0 installed · 1 gap". 2: Confirm/Approve/Deny land in ledger.jsonl and on `rivetari/tasks`. 3: notification from an appended HMAC ledger entry. 4: asserts the `/rivetari <ask>` empty text and "no profile to read a level from". All are fed by now-fixture.ts (HMAC-chained ledgers, assembly, judge seal) |
| src/main/engine/now.test.ts (476), now-hub-merged.test.ts (168), now-hub-tab.test.ts (338) | **Dropped** | Built on runtime `TaskView`/`TaskEvent` fixtures and assert needs-you/recent/merged semantics. If NowHub is kept generic, the hub-scheduling cases (intervals, select, tab watch, badges) are worth re-writing |
| now-health.test.ts (266; 6 tests) | **Split** | The 3 CI tests (`ciSummary`, signed-in only, no origin) come over **with an import edit**, provided `CiDeps` keeps `resolveRepoSlug` and `githubToken` seams. They assert `githubToken` was called with `("/repo","app-token")`. The 3 health tests (autonomy, spend, skills from the lock) are dropped |
| now-actions.test.ts (305), task-beat.test.ts (113) | **Dropped** | Beat path |

---

## Area 4: Tasks

### Files

| Path | Lines | Why needed |
|---|---|---|
| src/renderer/components/Tasks.tsx | 823 | Board/list toggle, needs-you list, board, table, task detail, AnswerForm |
| src/renderer/components/TaskRecord.tsx | 824 | Card, criteria, route, plan, proof, judge, PR parts |
| src/main/engine/tasks.ts | 192 | Tab watch on the shared hub, `taskSummary`, answer, PR URL |
| src/main/engine/task-detail.ts | 400 | Card/route/plan/proof/judge reads |
| src/main/engine/task-pr.ts | 156 | Live PR state from GitHub |
| main/index.ts L657-686, L694-716 | about 55 | tasks:* handlers |
| shared/ipc.ts L455-525, L552-588, L864-1061 | 71+37+198 = 306 | Task schemas |
| preload/index.ts L236-303 | 68 | `tasks.*` |

**Totals:** 5 core files, 2,395 lines, plus about 429 lines of wiring.

**npm:** lucide-react; `localStorage` for the board/list choice (key `rivetari.tasks.view`). The main side uses only node builtins after the cuts.

### Line accounting for Tasks.tsx

| Lines | Block | Fate |
|---|---|---|
| 27-33, 262-265 | NEEDS_LABEL, WAITING_LABEL (beat kinds) | Drop or rewrite |
| 35-40 | `leaseText` (leases) | **Drop** |
| 42-49 | `isHttps` | Move to lib |
| 51-59 | inputClass, `answerable`, `cost`, `beat` | Drop |
| 61-92 | `QUIET_MS`, `RunningLine` (beat progress) | **Drop** |
| 94-152 | `NeedsYou` list | Keep the frame (~45) if needs-you survives |
| 154-239 | `TaskTable` (columns Task/Beat/Lease/Rounds/Cost) | Keep the frame (~55); replace the columns |
| 241-260 | `COLUMNS` (intake…close), `columnOf` | Rewrite to the new columns (Next up / Parked / in progress on card/* / done) |
| 267-325 | `BoardCard` (risk, $cost · build N · judge N, PR waiting, Needs you, Running) | Keep the frame (~30) |
| 327-383 | `Board` (grid-cols-7) | Keep (~50) |
| **385-428** | **View type, `VIEW_KEY`, `savedView`, `ViewToggle`** | **Keep 100%** |
| 430-521 | Outcome, OutcomeLine, **AnswerForm (Allow/Deny)** | **Drop** |
| 523-713 | `TaskDetail` (summary, running/next, problems, answer, TaskRecord, PrPart, **Ledger**) | Replace with "the record" = CARD.md rendered with `renderMarkdown` (~20 lines of frame survive) |
| 715-823 | `Tasks()` shell (focus, watch/unwatch, toggle persistence) | Keep (~85). Rewrite intro 772-776 and **empty state 793-796** |

**Survival:**
- Tasks.tsx: about 40%. The board/list toggle and record shell survive.
- TaskRecord.tsx: about 4%. Only `Part`, `Field` and `Unreadable` (~35 lines) survive; the route, plan, proof, judge, criteria statuses and PR all go.

### Imports reaching leave-behind or dropped code

| Import | Proposed cut | Changes a kept feature? |
|---|---|---|
| Tasks.tsx L4 `PrPart`, `TaskRecord` | Delete TaskRecord.tsx except Part/Field; the record becomes CARD.md markdown | No (the record is re-pointed) |
| tasks.ts L13-18 `answerStops` (runtime/agent/build.ts), `nextStep`, `WATCH_INTERVAL_MS`, `TaskView` | Delete `answerTask`, `prUrlOf`, `openTaskPr`, `taskLedger`. Keep `shareHub`/`watchRepoTasks`/`unwatchTasks`/`shownTask` (~45 lines) over the generic hub. Inline `WATCH_INTERVAL_MS` as a constant | No |
| tasks.ts L27-28 `needsYouItems` (now.ts), `recordBeat`/`beatDeps` (task-beat.ts) | Delete with the answer path | No |
| task-detail.ts (all): `allowedDecisions`, `APPROVED`, `loadJudgeRounds`, `parseAssembly`, `ProofRecord`, `taskPlan`, `TASKS_DIR`, `sha256`, … | Delete the file | No |
| task-pr.ts: `githubToken`, `Octokit`, `QUIET_LOG`, `resolveRepoSlug` | **Decision.** The PR number came from the ledger. Drop by default. Keep only if CARD.md records a PR URL, then cut as for CI | — |
| Closure `m-tasks` | runtime 50/14,993, engine 46/5,732, registry 7, catalog 9. Zero after the cuts | — |

### Tests

| Test | Verdict | Why |
|---|---|---|
| e2e/tasks.e2e.ts | **Dropped** | Asserts lease holder "ann@example.com on build-box", "build 1 · judge 0", "$0.20", ledger following `fixture.running.append(...)`. tasks-fixture.ts writes HMAC ledgers |
| e2e/task-board.e2e.ts | **Dropped** | Seven beat columns, "Needs you: Route to approve", criterion statuses met/unverified/hand-checked, Route/Plan/Proof/Judge/PR parts. board-fixture.ts (454 lines) writes runtime records incl. PNG proof |
| e2e/task-answer.e2e.ts | **Dropped** | Allow/Deny lands in the ledger and on the tasks branch |
| e2e/tasks-progress.e2e.ts | **Dropped** | Beat progress files, "Running: judge · 27 min" |
| tasks.test.ts (49), tasks-summary.test.ts (69), task-detail.test.ts (585), task-pr.test.ts (134), task-actions.test.ts (239) | **Dropped** | Runtime TaskView, judge rounds, proof, leases, answers. task-pr only if PR is dropped |
| *(salvage)* | — | The toggle default and persistence assertions in shell-defaults.e2e (Board pressed, list one click away) are the only Tasks UI checks worth carrying over |

---

## Area 5: Posture, which becomes Checklist

### Files

| Path | Lines | Why needed |
|---|---|---|
| src/renderer/components/Posture.tsx | 1,197 | Scorecard, phase lens, trend chart, controls with waive/evidence forms, waivers/evidence tables, sticky selection bar |
| src/renderer/lib/status.ts | 33 | `STATUS_META` (ControlStatus dots) |
| src/main/engine/posture.ts | 259 | `readPosture`, `readPhase`, trend, lens, waivers/evidence views |
| src/main/engine/posture-task.ts | 226 | Card drafting (reserve id, lease, push) |
| src/main/engine/audit.ts | 162 | Run audit (evaluate controls, write state.json) |
| main/index.ts L603-620 | 18 | audit:run, posture:get, posture:draft |
| shared/ipc.ts L93-152, L188-312 | 60+125 = 185 | Scorecard, Posture, PostureDraft |
| preload/index.ts L93-103, L141-158 | 11+18 | `audit.run`, `posture.*` |

**Totals:** 5 core files, 1,877 lines, plus about 232 lines of wiring.

**npm:** lucide-react (ChevronDown/Right, Play, RefreshCw).

### What survives into Checklist (BACKLOG.md "Repo checklist")

| Lines | Block | Fate |
|---|---|---|
| 36-52 | Gate dots, EXPIRY | Drop |
| 57-69 | `MAX_GAPS`, failing, tomorrow, in90Days | Drop |
| 72-99 | `Totals` | Adapt to done/open counts (~15) |
| 101-383 | Trend chart (SVG, hover readout, table toggle) | **Drop** (trend) |
| 385-510 | Phase `Lens` + gate dots + "Select these for a task" | **Drop** (phase gates) |
| 514-620 | `DraftForm` (waive/evidence) | **Drop** (waivers, evidence, card drafting) |
| 622-704 | `ControlRow` | Keep the row layout (~25); drop the checkbox, Waive… and Evidence… |
| 706-742 | `LaneCard` (collapsible, open when it has gaps) | **Keep** as checklist sections (~37) |
| 744-891 | Waivers and evidence tables | **Drop** |
| 895-1032 | View shell: load with a seq guard so a stale read can't land, Reload, **Run audit** | Keep the load guard and Reload (~60). Drop Run audit (L962-973, L1023-1030) |
| 1033-1076 | Drafted/draft-error/audit-error banners | Drop |
| 1089-1095 | No-audit text incl. `rivetari audit` | Rewrite (no checklist section found) |
| 1162-1194 | Sticky selection bar | **Drop** |

**Survival:** about 12% (~140 lines). lib/status.ts is replaced (~5 lines of the meta pattern survive).

### Imports reaching leave-behind or dropped code

| Import | Proposed cut |
|---|---|
| posture.ts → catalog `Control`, `PHASES`, `Gate`, `loadBundledGates`, `Waiver`; engine `ControlResult`, `EvidenceEntry`, `isEvidenceValid`, `loadEvidence`, `parseDuration`, `HistoryEntry`, `loadHistory`, `inferPhase`, `isWaiverActive`, `loadWaivers`, `waiversExpiringWithin`, `loadProfile`, `readRecordedAudit` | Delete the file. Checklist reads BACKLOG.md through the new module |
| posture-task.ts → runtime `parseCard`, `commitTask`, `holderName`, `reserveTaskId`, `newTask`, `whoami`; engine `readRecordedAudit` | Delete (card drafting) |
| audit.ts → catalog `LANES`, `loadBundledCatalog`; engine `buildContext`, `evaluateControls`, `writeAuditState` | Delete (Run audit) |
| home.ts `readPhase` | Deleted in Area 2 |

Closures: `m-posture` engine 38/4,543 + catalog 8/1,240; `m-posturetask` + runtime 11/2,698; `m-audit` engine 35/4,289. All go to zero.

**Behaviour changes to kept features:** none. The Posture tab is replaced, not kept.

### Tests

| Test | Verdict | Why |
|---|---|---|
| e2e/posture.e2e.ts | **Dropped** | Asserts "8 controls · recorded", trend legend, phase lens, waiver expiry, gaps drafting "Drafted T-0001", plus tab order with Posture at index 2 |
| e2e/honest-basics.e2e.ts tests 1-3 | **Dropped** | state.json and Run audit |
| posture.test.ts (235), posture-phase.test.ts (65), posture-task.test.ts (338), audit.test.ts (38), audit-recorded.test.ts (167) | **Dropped** | Catalog, engine and runtime |
| *(note)* | — | No existing test asserts collapsible-section behaviour on its own, so nothing for Checklist carries over |

---

## Area 6: History with the Docs viewer folded in

### Files

| Path | Lines | Why needed |
|---|---|---|
| src/renderer/components/History.tsx | 728 | Spend cards, cost trend, judge findings, cost flags, closed-tasks table, Docs section |
| src/renderer/components/Docs.tsx | 112 | Doc list + rendered markdown + mermaid (dark, `securityLevel: "strict"`) |
| src/renderer/lib/markdown.ts | 41 | marked (mermaid fence → `<pre class="mermaid">`) + DOMPurify (http(s)/mailto/# only; `rel=noopener`, `target=_blank` hook) |
| src/renderer/index.css `.doc-prose` | about 50 of 124 | Prose styles |
| src/main/engine/history.ts | 119 | `readHistory`, `openHistoryPr` |
| src/main/engine/docs.ts | 42 | `listDocs` (globs `*.md`, `docs/**`, `.rivetari/**`, `.github/**`; skips `.rivetari/tasks/`), `readDoc` |
| main/index.ts L640-655, L789-799; plus L340-395 (external-link allow-list and will-navigate, which Docs links rely on) and CSP L353-372 | about 30, plus shared security | Handlers |
| shared/ipc.ts L1092-1209, L439-454 | 118+16 | HistoryView, Docs |
| preload/index.ts L198-234 | 36 | `history.*`, `docs.*` |

**Totals:** 5 core files, 1,042 lines, plus about 200 lines of wiring.

**npm:** marked ^15, dompurify ^3, mermaid ^11, lucide-react (renderer); tinyglobby (main, after inlining `buildContext`).

### Survival

- **History.tsx: about 20-25%.**

  | Lines | Block | Fate |
  |---|---|---|
  | 37-55 | MetricCard | Drop |
  | 57-291 | SpendTrend | Drop |
  | 293-385 | Findings | Drop (judge) |
  | 387-417 | CostFlags | Drop |
  | 419-500 | Shell, Refresh, errors | Keep (~55) |
  | 552-714 | Closed-tasks table | Keep the frame (~70), re-pointed at `cards/done/*.md`. The PR, Spend, Rounds and Time columns, and the ledger-verified PR open, all drop |
  | 718-725 | Docs section | Keep |

  `nights/*.md` can reuse `<Docs>`-style list + render.
- **Docs.tsx: about 95%.** Fix the L76 empty text, which shows while loading and names fewer folders than are searched.
- **markdown.ts: 100%.**
- **history.ts: 0%.** It's entirely runtime.
- **docs.ts: about 85%.**

### Imports reaching leave-behind or dropped code

| Import | Proposed cut | Changes a kept feature? |
|---|---|---|
| history.ts → runtime `closedTasks`, `costFlags`, `findingsMetrics`, `historyRows`, `loadTask`, `taskMetrics` | Delete the file. History reads cards/done and nights through the new module | No (re-pointed) |
| docs.ts L5 `buildContext` (engine/context.ts, which pulls in catalog, simple-git, octokit…; `m-docs` = engine 14/1,967, catalog 4/1,009) | **Inline.** `glob` = tinyglobby with `{cwd, dot:true, onlyFiles:true, followSymbolicLinks:false, ignore:[node_modules, dist, .git]}` (~10 lines). `readFile` = `containedReadPath` from engine/paths.ts (no package imports; ~45 of 108 lines) + ENOENT→null. This contained reader belongs in the new file module, since every file view needs it | **Yes, if done carelessly.** The symlink-escape guard (#95: a repo-symlinked `~/.aws/credentials` reads as absent) and `followSymbolicLinks:false` must be kept exactly, or Docs becomes a file-disclosure path |
| docs.ts glob `.rivetari/**/*.md` | **Decision.** `.rivetari/` is leave-behind state. Dropping the glob changes the Docs list | Yes: docs-tasks.test asserts `.rivetari/autonomy/ledger.md` is listed |
| History.tsx L455-462 `history.openPr` | Delete | No |
| History.tsx `onOpenTask` | Keep, keyed by card id | No |

### Tests

| Test | Verdict | Why |
|---|---|---|
| e2e/history.e2e.ts | **Dropped** | Asserts "2 closed · 1 merged · $3.20 spent", judge share 25%, spend trend, "missing-csp" findings, cost flags, PR from the ledger. history-fixture.ts writes HMAC ledgers + history.jsonl. Also asserts the Project tab at index 3 |
| e2e/history-scroll.e2e.ts | **Needs an edit (worth keeping)** | The invariant (only `main` scrolls; the sr-only captions fix in App.tsx L356-359) and the Docs navigation/render of `docs/guide.md` are generic. But it uses `historyRepo()` (runtime fixture) and waits on `region "Closed tasks"`. Swap in a plain repo with `cards/done/*.md` and wait on the new region |
| src/main/engine/docs-tasks.test.ts | **Unchanged** if the glob list is kept. **Needs an edit** if `.rivetari/**` is dropped | — |
| src/main/engine/docs.test.ts | **Needs an edit** | Reads `process.cwd()` (the Rivetari checkout) and asserts `docs/adr/0008-merge-policy.md` exists with "Merge policy". It fails in any other repo; point it at a temp fixture |
| src/main/engine/history.test.ts (222) | **Dropped** | Uses runtime `newTask`/`closeTask`/`loadTask` |

---

## Area 7: Map (RepoMap + map:get + webview fence)

### Files

| Path | Lines | Why needed |
|---|---|---|
| src/renderer/components/RepoMap.tsx | 116 | webview on `MAP_PARTITION`, blocked-requests list, empty state |
| src/main/engine/map.ts | 227 | `getMap`, `mapRequestAllowed` (real-path fence), `realPath`, `guardMapSession` (cancel + refuse permissions), `attachMapWebview` (locks prefs), `MapFence` (latest-open wins, last 50 blocked) |
| main/index.ts L208-209 (mapFence), L410 (`webviewTag: true`), L448-462 (will-attach-webview, did-attach-webview: deny window.open, fence will-navigate), L688-692 (map:get), L848-856 (guardMapSession on `session.fromPartition`) | about 30 | Wiring |
| shared/ipc.ts L526-551 | 26 | MAP_PARTITION, MapGetRequest, MapView, MapBlocked |
| preload/index.ts L415-435 | 21 | `map.get`, `map.onBlocked` |

**Totals:** 2 core files, 343 lines, plus about 77 lines of wiring.

**npm:**
- Renderer: lucide-react (ShieldBan).
- Main: electron (session, webview hooks in index.ts only); node fs, path and url builtins.

### Imports reaching leave-behind or dropped code

| Import | Proposed cut | Changes a kept feature? |
|---|---|---|
| map.ts L15 `loadProfile` (engine/profile.ts, which pulls in catalog; it's the reason `m-map` traces to 102 files / 21.5k lines) | Delete, and drop `MapView.floorplanOn` (ipc L541) | **Yes, small:** the empty state's "The profile has floorplan on / doesn't have floorplan on" line (RepoMap L72-76) goes, and the L66-71 text about `floorplan: true` at `rivetari init` has to be reworded |
| map.ts L16 `FLOORPLAN_DIR`, `isFloorplanMap` (runtime/map/floorplan-skill.ts, 547 lines with a big closure) | **Inline**: `"floorplan"` and the 4-line `isFloorplanMap` (exists any of architecture.json, plan.json, graph.json, .cache) | Keep the check. Removing it would let a project's own `floorplan/` folder be taken for a map |

**Survival:** RepoMap.tsx about 90% (the empty-state copy is rewritten). map.ts about 95%. The fence code is untouched.

### Tests

| Test | Verdict | Why |
|---|---|---|
| src/main/engine/map-fence.test.ts (5 tests) | **Unchanged** | Imports only `map.ts` and `MAP_PARTITION` |
| src/main/engine/map.test.ts (6 tests) | **5 unchanged, 1 edit** | The test at L63 ("…says whether the profile has it on") writes `.rivetari/profile.yml` and asserts `floorplanOn`. Drop the floorplanOn half; the `MapFence` fixture at L152 also carries `floorplanOn: false` and loses that field |
| e2e/map.e2e.ts | **Unchanged if** the empty state still contains "No map for this repository yet." and the literal `floorplan: true` (L287). Otherwise a one-assertion edit | The fixture writes `architecture.json`, so the inlined `isFloorplanMap` passes. The webview src, blocked list (WAITLIST + `../secret.txt`) and axe checks are file-only |
| e2e/axe.e2e.ts Map step | Unchanged | — |

---

## Area 8: Project (dropped) and Settings (cut to theme only)

### Project: size and what removing it touches

| Path | Lines |
|---|---|
| src/renderer/components/Project.tsx | 666 |
| src/main/engine/project.ts | 594 |
| src/main/engine/project-checks.ts | 114 |
| src/main/engine/project-task.ts | 134 |
| shared/ipc.ts L313-438 | 126 |
| preload/index.ts L160-196 | 37 |

**Totals:** 4 files, 1,508 lines, plus 163 lines of ipc and preload.

Closure `m-project`: engine 48/5,907, runtime 29/9,820, registry 7, catalog 9.

Removing it touches:
- App.tsx L9, the Project `TABS` entry (L25), and the panel at L475-493.
- main/index.ts:
  - L106-108: imports.
  - L293-306: `projectChecks`.
  - L314: NowHub `onMerged`. With it gone, `merges()`, `mergesPrimed` and the `merged` set in now.ts are dead.
  - L319-320: `PROJECT_DUE_EVERY_MS`.
  - L528: `projectChecks.forget` in repos:remove.
  - L556-557: recheck in now:select.
  - L622-638: handlers.
  - L864: the `setInterval`.
- ipc: the `ProjectGet`/`ProjectRefresh`/`ProjectDraft`/`ProjectUpdate` channels and L313-438.
- It shares `PostureDraftResult` with Posture, which is deleted too.

No kept feature depends on Project. Its only outbound hook into others is NowHub `onMerged`.

Tests dropped:
- `project.test.ts` (509), `project-checks.test.ts` (132), `project-review-fixes.test.ts` (97), `project-task.test.ts` (229).
- `e2e/project.e2e.ts` and `e2e/project-fixture.ts` (240).
- The Project step in axe.e2e, and the `TABS` and index assertions in shell-defaults, posture and history e2e.

### Settings

| Path | Lines | Fate |
|---|---|---|
| src/renderer/components/Settings.tsx | 301 | Keep `Field` (14-34), load/patch/theme (67-108), header and General card (160-185): **about 30%**. Drop AI card 186-235 (pref + Anthropic key), Updates card 236-300, `handleSaveKey`/`ClearKey`/`CheckUpdate` 110-150 |
| src/main/store/settings.ts | 70 | **About 85%**. Drop `aiPreferApiKey` and `autoCheckUpdates` from DEFAULTS and merge. Old files still load: `Settings.partial().safeParse` strips unknown keys, the same mechanism the `defaultOrg` removal used |
| src/main/auth/anthropic-key-store.ts | 41 | **Drop** |
| src/main/update/check.ts | 164 | **Drop** (update banner + check) |
| main/index.ts L72-76, L123, L126-135 `settingsView` (`anthropicKeySet`), L811-831 | about 40 | Drop the key and update handlers; `settingsView` becomes `loadSettings` |
| shared/ipc.ts L1062-1091, L1210-1224 | 30+15 | Keep `Theme`/`Settings{theme}`/`SettingsSaveRequest`; drop `SettingsView.anthropicKeySet`, `AnthropicKeyRequest`, `UpdateInfo` |
| preload/index.ts L437-467 | 31 | Keep load/save; drop setAnthropicKey and update |

**Totals:** 4 files, 576 lines; about 175 survive.

**npm:** electron (`app.getPath`, `safeStorage` only for the dropped key).

Tests:

| Test | Verdict | Why |
|---|---|---|
| store/settings.test.ts (2 tests) | **Needs an edit** | Asserts `aiPreferApiKey`/`autoCheckUpdates` round-trip. The defaultOrg-drop logic stays valid |
| update/check.test.ts (91), check-desktop-tags.test.ts (131), check-signed-out.test.ts (58) | **Dropped** | — |
| honest-basics test 4 | Unchanged | — |
| axe.e2e Settings step | Unchanged | — |

e2e `helpers.ts` L73-79 seeds `aiPreferApiKey` and `autoCheckUpdates`. That's harmless (the keys are stripped), but worth tidying.

---

## shared/ipc.ts and preload/index.ts by area

| ipc.ts lines | Section | Fate |
|---|---|---|
| 1-77 | Header, `IpcChannel` (66), Ping | Rewrite the channel table to the kept and new channels |
| 78-92 | Repos | Keep |
| 93-152 | Audit and scorecard | Drop |
| 153-187 | Auth | Keep if sign-in is kept |
| 188-312 | Posture | Drop |
| 313-438 | Project | Drop |
| 439-454 | Docs | Keep |
| 455-525, 552-588 | Tasks list, answer, openPr, ledger | Drop and replace |
| 526-551 | Map | Keep (minus `floorplanOn`) |
| 589-814 | Now | Keep NowCi (if CI) and possibly NowBadges/NowFocus; the rest is replaced |
| 815-863 | Home | Replace |
| 864-1061 | Task detail and PR | Drop |
| 1062-1091 | Settings | Keep theme |
| 1092-1209 | History | Replace |
| 1210-1224 | Update | Drop |

About 10-12% of ipc.ts (about 130 lines) comes over as is.

Preload sections:

| Lines | Section | Size | Fate |
|---|---|---|---|
| 1-64 | Header | 64 | — |
| 73-91 | repos | 19 | Keep |
| 93-103 | audit | 11 | Drop |
| 105-139 | auth | 35 | Keep if sign-in is kept |
| 141-158 | posture | 18 | Drop |
| 160-196 | project | 37 | Drop |
| 198-215 | history | 18 | Replace |
| 217-234 | docs | 18 | Keep |
| 236-303 | tasks | 68 | Replace |
| 305-311 | home | 7 | Replace |
| 313-413 | now | 101 | Replace |
| 415-435 | map | 21 | Keep |
| 437-459 | settings | 23 | Keep theme |
| 461-467 | update | 7 | Drop |

---

## Totals per area

| Area | Files (core) | Lines (core) | Plus ipc/preload/index wiring | Survives the re-pointing |
|---|---|---|---|---|
| App shell (renderer) | 11 (+5 config) | 851 (+127) | — | about 85% (75% without badges/notifications) |
| Home | 2 | 449 | about 68 | Home.tsx about 60%, home.ts about 30% |
| Now | 5 | 2,099 | about 477 | Now.tsx about 35-40%; now.ts about 40% (hub); now-health about 50% (CI) or 0; actions and beat 0% |
| Tasks | 5 | 2,395 | about 429 | Tasks.tsx about 40%; TaskRecord about 4%; main about 10% |
| Posture → Checklist | 5 | 1,877 | about 232 | about 12% of Posture.tsx; main 0% |
| History + Docs | 5 | 1,042 | about 200 | History.tsx about 20-25%; Docs, markdown and docs.ts 85-100%; history.ts 0% |
| Map | 2 | 343 | about 77 | about 90-95% |
| Project (drop) | 4 | 1,508 | about 200 | 0% |
| Settings (theme only) | 4 | 576 | about 100 | about 30% (about 175 lines) |

## Every mention of `rivetari autonomy` (a command that doesn't exist)

- src/renderer/components/Now.tsx:656: `effective level: run <code>rivetari autonomy</code>`
- src/renderer/components/Project.tsx:109: `run <code>rivetari autonomy</code> to see it…`
- src/main/engine/project.ts:410 (comment) and :434 (problem string shown in the Project view: "… `rivetari autonomy` re-renders it.")
- e2e/now.e2e.ts:167, e2e/project.e2e.ts:110 (assertions), e2e/project-fixture.ts:223 (comment)

All of them go away with the cuts above: the Now autonomy cell is dropped and Project is dropped.

## Every `/rivetari` and `rivetari task new` empty-state text

- src/renderer/components/Now.tsx:808-812: "No tasks in this repository yet. Start one with `/rivetari <ask>` in Claude Code, or `rivetari task new`." (`/rivetari &lt;ask&gt;` at L810, `rivetari task new` at L811)
- src/renderer/components/Tasks.tsx:793-796: "No tasks in this repository yet. Start one with `/rivetari` in Claude Code or `rivetari task new`." (L794-795)
- e2e/now.e2e.ts:283 asserts the Now text.

Other stale CLI references in renderer-visible copy, which will need rewording:
- Now.tsx:790 `rivetari task`
- Tasks.tsx:773 `rivetari task status`, :775 `rivetari task`
- Posture.tsx:1092 `rivetari audit`
- RepoMap.tsx:69 `rivetari init`
- History.tsx:394 "rivetari metrics"
- main/engine/home.ts:89 "no audit recorded yet: run rivetari audit" (rendered on Home)

## Cuts that change the behaviour of a kept feature

1. **Docs `buildContext` inline.** This is a security-relevant cut: the contained read (symlink-escape guard) and `followSymbolicLinks:false` must be copied exactly. Dropping the `.rivetari/**/*.md` glob changes the Docs list.
2. **Map `loadProfile` removal.** The empty-state copy loses the "profile has floorplan on/off" line. Keep the inlined `isFloorplanMap` check.
3. **NowHub re-pointing.** The "new item" rule for notifications currently uses ledger seq. A file model needs a different novelty mark, or notifications and badges get dropped (a decision; it's in neither list).
4. **Home and Now live updates** come from `now:update`. Whatever replaces NowHub must keep pushing per-repo state, or Home and Now stop updating between Refresh clicks.
5. **CI cell.** Inlining `githubToken` with the signed-in token is behaviour-identical, but CI and Home's CI fact only exist if GitHub sign-in (AuthControls, device flow, token store) is kept. That's outside this scope, so it needs a decision.
6. **Settings.** Old settings.json files still load: zod strips the removed keys. Nothing else changes.

## Tests that survive

| Status | Tests |
|---|---|
| Come over unchanged | home.e2e test 2; honest-basics test 4; map-fence.test (5); map.test (5 of 6); map.e2e (if the empty-state wording is kept); docs-tasks.test (if the glob is kept); signin.e2e (if sign-in is kept) |
| Come over with edits | shell-defaults.e2e (new fixture, new tabs); axe.e2e (drop Posture/Project, add Checklist); registered-repos.e2e (swap posture/audit for a kept channel); history-scroll.e2e (new fixture and region); docs.test (point at a fixture, not the Rivetari checkout); now-health CI tests (3); settings.test; map.test (1 test) |
| Dropped: they assert runtime-fed content or dropped behaviour | now.e2e (4), tasks.e2e, task-board.e2e, task-answer.e2e, tasks-progress.e2e, posture.e2e, project.e2e, history.e2e, home.e2e test 1, honest-basics 1-3; unit tests now, now-hub-merged, now-hub-tab, now-actions, task-beat, tasks, tasks-summary, task-detail, task-pr, task-actions, home, history, posture, posture-phase, posture-task, audit, audit-recorded, project, project-checks, project-review-fixes, project-task, update/check×3 |
| Fixture files left behind | now-fixture.ts (356), tasks-fixture.ts (155), board-fixture.ts (454), history-fixture.ts (210), posture-fixture.ts (175), project-fixture.ts (240), home-fixture.ts (37). They write HMAC-signed ledgers, state.json and history.jsonl the way the runtime does |
