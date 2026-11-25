# Inventory: desktop shell, main process + preload + shared (phase 0)

Source: `SCRATCH/src` (exported at commit `32f4b88`). All paths are relative to `apps/desktop/` unless they start with `packages/`. Line counts are `wc -l`; the tracer's `lines` are `wc -l + 1`.

**Method.** I read every file in `src/main`, `src/preload` and `src/shared`, plus the configs and e2e helpers. I ran `tools/trace.cjs` on `src/main/index.ts`, `src/preload/index.ts`, and on these modules one at a time: `now.ts`, `map.ts`, `docs.ts`, `client-id.ts`, `now-health.ts`, `task-pr.ts`, `shared/ipc.ts`. Outputs are in `SCRATCH/main.json`, `SCRATCH/preload.json` and `SCRATCH/shellmain/*.json`.

**Path aliases.** Main, preload and shared use no tsconfig aliases: only relative paths and `@arynbht/rivetari-*`. The only alias is `@` → `src/renderer` (in `electron.vite.config.ts` and `tsconfig.web.json`), which belongs to the renderer. The tracer needed no patch. Its one unresolved import is `src/main/app-id.ts` → `../../electron-builder.yml?raw`, a Vite raw import that resolves to `apps/desktop/electron-builder.yml`.

## 0. Headline numbers

| | Files | Lines (tracer) |
|---|---|---|
| `main/index.ts` closure as-is | 150 | 31,934 |
| …of which `apps/desktop/src` | 28 | 6,708 |
| …`packages/runtime` | 53 | 16,010 |
| …`packages/engine` | 53 | 6,579 |
| …`packages/registry` | 7 | 1,363 |
| …`packages/catalog` | 9 | 1,274 |
| `preload/index.ts` closure | 2 (preload + shared/ipc) | 1,699 |
| `engine/now.ts` alone (watcher) | 82 | 17,993 |
| `engine/map.ts` alone | 102 | 21,551 |
| `engine/docs.ts` alone | 20 | 4,244 |

With the cuts below, the kept main, preload and shared code reaches only `apps/desktop/src` files and npm packages. That is about **11 source files and ~1,400 copied lines**, not counting the new card/backlog reader module and the GitHub card. No kept area comes near 40 files. Three modules have large leave-behind closures: the watcher (81 package files through `watchTasks`), the Map (101 through `floorplan-skill.ts`) and Docs (19 through `buildContext`). Each one is cut with a small inline or a narrow interface.

---

## 1. Verifying `files/desktop-shell.md` against the code

All 46 IPC channel names in the doc's index match `IpcChannel` (`src/shared/ipc.ts:9-64`). The named code paths exist: `main/index.ts`, `preload/index.ts`, `shared/ipc.ts` and `main/engine/task-beat.ts`. Every userData file name (`repos.json`, `settings.json`, `github-token.bin`, `anthropic-key.bin`) and every env var (`RIVETARI_GITHUB_CLIENT_ID`, `RIVETARI_UPDATE_REPO`) matches. The following are wrong or incomplete:

1. **`electron-builder.yml` is not under `src/`.** The doc says paths are relative to `apps/desktop/src/`, but the file is at `apps/desktop/electron-builder.yml`.
2. **"Every request and reply is checked against a zod schema on both sides" is not quite true.**
   - On the main side, `docs:read` returns `readDoc()` unparsed (`index.ts:798`).
   - The `auth:update` push (`index.ts:211-213`) and the `map:blocked` push (`index.ts:854`) are sent without a main-side parse. Only the preload validates them.
   - All other pushes go through `push()` with a schema (`index.ts:284-291`).
3. **CSP.**
   - Every mode also sets `img-src 'self' data:` and `style-src 'self' 'unsafe-inline'` (`index.ts:354-361`).
   - The loosened policy applies under **E2E** (`RIVETARI_E2E=1`) as well as dev (`index.ts:362`).
4. **Omissions in the doc.**
   - A dev-only `.env` loader reads `apps/desktop/.env` (`index.ts:175-195`).
   - On Windows, `app.setAppUserModelId(APP_ID)` takes the id from `electron-builder.yml`'s `appId`, which notifications need (`index.ts:858-860`, `app-id.ts`).
   - The Map guest's `setWindowOpenHandler` denies every new window, and its `will-navigate` is fenced too (`index.ts:457-462`).
   - The E2E seam `globalThis.rivetariE2E` (`index.ts:239-247`) records notifications.
   - On window close, both the Tasks watch and the NowHub stop (`index.ts:415-420`).
5. **Docs containment.** The comment in `docs.ts:1-3` says the renderer "can only read Markdown inside the repo". In fact `docs:read` reads **any** file inside a registered repo; nothing checks for `.md`. The read is still symlink-contained (`engine/src/paths.ts:93-108`). The doc itself only describes the list, so it isn't wrong, but the code comment is.
6. **CI and PR "using only the app's sign-in token" is correct, for a subtle reason.** Both `mainCi` and `prState` call `githubToken(repoPath, signedInToken)` only after checking that the token is non-null. `githubToken` returns an explicit token at once (`packages/engine/src/github/token.ts:21`). Its env, GitHub App and `gh auth token` fallbacks can't be reached from the shell.

---

## 2. Areas

### Area A: Frame (entry, window, CSP, navigation, packaging, preload bridge, IPC contract, theme)

| Path | Lines | Why needed | Keep |
|---|---|---|---|
| `src/main/index.ts` | 879 | App entry; window (1140×780, `#0b0f17`, contextIsolation, sandbox, webviewTag for Map); CSP (353-372, applied 839-846); renderer-URL navigation lock (473-479); external-link allow-list (341-345, 383-395); `registered()` fence helper; every IPC handler | ~480 lines after cuts (+~110 lines into the GitHub card) |
| `src/preload/index.ts` | 473 | `window.rivetari` over `contextBridge`, zod on every request and response | ~160 (+~43 for the card) |
| `src/shared/ipc.ts` | 1224 | Channel allow-list + zod contract | ~110 copied (header 1-8, trimmed `IpcChannel`, Repos 78-91, Docs 439-453, Map 526-550, Now requests 717-720, NowBadges/NowFocus 806-813, theme-only Settings) + a **new** watcher item/state schema (+~64 for the card: Auth 153-174, NowCi 790-804, TaskPrState 1034-1060) |
| `electron-builder.yml` | 80 | appId/productName, fuses (runAsNode off, cookie encryption, no NODE_OPTIONS, no `--inspect`, asar-only), targets | ~70; drop `asarUnpack` for catalog (26-35) and the engine/catalog comments |
| `electron.vite.config.ts` | 36 | Main and preload builds (preload → CJS `index.cjs`, deps bundled), renderer `@` alias | as is |
| `package.json` | 51 | Deps and scripts | drop the 3 workspace deps; the `e2e` script drops `tsc --build ../../packages/runtime/tsconfig.json` |
| `tsconfig.json` / `tsconfig.node.json` / `tsconfig.web.json` | 8 / 18 / 20 | Project refs; node covers main, preload and shared | both extend `../../tsconfig.base.json` (root, 33 lines), which must come along or be inlined |
| `.npmrc` | 9 | `node-linker=hoisted` for electron-builder under pnpm | keep the setting, rewrite the comment |
| `playwright.config.ts` | 17 | e2e runner | as is |
| `src/renderer/env.d.ts` (renderer) | — | Types `window.rivetari` as `RivetariApi` from the preload | Coupling note: the preload's exported type is the renderer's API type |

**Theme plumbing.** The main side holds only the `Settings.theme` enum (`ipc.ts:1065-1066`) and the store (Area F). Light, dark and system are applied in the renderer (`renderer/lib/theme.ts`, `App.tsx:214` matchMedia). Main hard-codes a dark `backgroundColor` (`index.ts:402`) and has no `nativeTheme`.

**npm.**
- Runtime: `electron` (app, BrowserWindow, dialog, ipcMain, Notification, session, shell, contextBridge, ipcRenderer, safeStorage) and `zod` (^4.6.7, bundled into the preload).
- Build and dev: `electron` ^33, `electron-vite` ^2.3, `vite` ^5.4, `electron-builder` ^26, `@playwright/test` 1.63, `axe-core` (used by e2e helpers).

**Imports into leave-behind code, all in `index.ts`, and the cuts.**

| Import / call (index.ts lines) | Feature | Cut |
|---|---|---|
| `./engine/audit` runAudit (84; 603-608) | audit | delete handler + import |
| `./engine/history` (85; 640-655) | History tab | delete |
| `./engine/home` (86; 533-544) | Home | delete (Home isn't in the keep list) |
| `./engine/now-actions` (97-102; 562-589) | beats: confirm, approve, judge, open PR | delete |
| `./engine/now-health` nowHealth (103; 591-595) | health strip (autonomy, spend, skills) | delete; `mainCi` (597-601) → GitHub card |
| `./engine/posture`, `posture-task` (104-105; 610-620) | posture, gates, waivers | delete |
| `./engine/project`, `project-checks`, `project-task` (106-108; 297-306 ProjectChecks; 314 `onMerged`; 528 `forget`; 557 `recheck`; 622-638; 864 `setInterval`) | Project tab | delete all |
| `./engine/task-detail`, `task-pr`, `tasks` (109-119; 317 `shareHub`; 418 `unwatchTasks`; 657-716) | Tasks tab | delete; `prState` → card |
| `./auth/anthropic-key-store` (72-76; 128-135; 811-820) | Anthropic key | delete (§5) |
| `./update/check` (123; 125-126 UPDATE_REPO; 822-831) | update check | delete |
| `app:ping` (498-505) | unused by the UI | delete (or keep as a smoke round-trip; no deps) |

**Behaviour flags for kept features.**
- Removing `projectChecks.recheck` from `now:select` (557) and `forget` from `repos:remove` (528) only affects the dropped Project tab.
- Removing `unwatchTasks()` from window close (418) has no effect: the hub is stopped on the next line.
- None of these change a kept feature.

### Area B: Registered-repos fence

| Path | Lines | Why |
|---|---|---|
| `src/main/store/registered.ts` | 31 | `registeredRepo(asked, repos, platform)`: resolves and compares case-insensitively on win32, and throws "`<path>` isn't one of the registered repos". Electron-free. |
| `src/main/store/repos.ts` | 63 | `<userData>/repos.json` list, add (idempotent, sorted by name), remove; serialized writes |
| `src/main/index.ts` 493-495, 507-531 | ~30 | `registered()` helper; `repos:list`, `repos:add` (native folder picker), `repos:remove`; `watchRepos` re-points the hub |

- npm: `electron` (`app.getPath`, `dialog`), `zod` (RepoList).
- **Leave-behind imports: none.** The only import is the `RepoEntry` type from `shared/ipc`.
- Totals: 2 files, 94 lines (+~30 in index.ts).
- The new git-fetch action must also go through `registered()`.

### Area C: Watcher (NowHub)

| Path | Lines | Why |
|---|---|---|
| `src/main/engine/now.ts` | 662 | Lines 1-285 are task-specific projections (`applyTaskEvent`, `needsYouItems`, `cardOf`, `assemblyOf`, `routeReasons`, `runningTasks`, `recentKind`, `recentEvents`, `nowState`): **drop**. Lines 287-662 are `itemKey` + `NowHub`. **Keep the shape** (~240 lines after trimming). |
| `src/main/index.ts` 308-338 | ~30 | Creates the hub; pushes `now:update` and `now:badgesUpdate`; `watchRepos`/`watchSidebarRepos`; `now:get`, `now:select`, `now:badges` handlers (546-560) |

**The polling shape today.**
- `NowHub` watches every sidebar repo plus the Tasks tab's repo. The interval comes from `intervals ?? { shown: 2000, others: 10_000 }` (`now.ts:371`).
- The shown repo, and the Tasks tab's repo, use `shown`; the rest use `others` (`intervalFor`, 528-532).
- `select()` retunes, restarting any watcher whose interval changed (513-526).
- `setRepos()` starts and stops watchers through `sync()` (473-510).
- `badges()` pushes only when the counts change (449-462).
- `heard()` primes on the first read, then fires `onNew` and `onGone` (598-620).

**What it calls in runtime.** `watchTasks` (`packages/runtime/src/task/watch.ts`, 657 lines) polls on `intervalMs`.
- It first reads `.rivetari/tasks/<id>/` in place (`readLocal`), then the `rivetari/tasks` branch: `git rev-parse` of `origin/rivetari/tasks` or `refs/heads/rivetari/tasks`, `ls-tree`, `readBlob`, `pushedBefore`.
- Each task's record is copied to a temp dir and loaded with `loadTask`: ledger with seal check, `nextStep`, `openStops`, `judgeVerdicts`.
- Progress files are polled separately (`readProgress`); `usageTotals` comes from `ship/close.ts`.
- `now.ts` also calls `parseAssembly` (router), `sha256` and `JUDGE_VERDICT`.
- Tracer closure: 81 files, 17,330 lines across runtime, engine, registry and catalog. All of it is leave-behind (task store, ledger signing, router, judge, proof).

**Cut.** Replace `watch?: typeof watchTasks` (`now.ts:313`, 372) with a **narrow interface** defined in the new module:

```ts
type RepoWatch = (repo: string, onEvent: (e: RepoEvent) => void, o: { intervalMs: number }) =>
  { ready: Promise<unknown>; stop(): Promise<void> };
```

The new module re-reads CARD.md, BACKLOG.md, cards/, done/, nights/ and skills/INDEX.md on each tick and emits a snapshot or changes.

In NowHub, delete:
- the Tasks-tab plumbing (`TabListener`, `tab`, `watchTab`, `unwatchTab`, `tabViews`, and the tab branches in `sync`, `told`, `intervalFor` and `setRepos`), about 50 lines;
- merges (`onMerged`, `merged`, `mergesPrimed`, `merges()`), about 30 lines;
- the ledger-seq catch-up (`caughtUp`, `primedSeq`, `since`, `isNew`, the `onRead`/`localFirst` options), about 45 lines.

Replace `TaskView[]`, `NeedsYouItem` and `itemKey` with the new item type.

**Behaviour flags (by design, but call them out).**
- (1) `NowState`, `NeedsYouItem`, `RecentEvent` and `NowRunning` (`ipc.ts:589-760`) can't be kept. The contract, preload and renderer Now view all change shape.
- (2) The "already waiting at launch isn't notified" rule lives in `heard()`'s priming plus `isNew()`. Keep the priming (first read learns, later reads tell) or launch will spam notifications. The branch catch-up subtlety goes away because the branch is no longer read.
- (3) Today's watcher is strictly read-only and never fetches. The target's new explicit **git fetch** action is a new IPC channel (e.g. `repo:fetch`) and needs a new handler through `registered()`. npm options: `simple-git` ^4.0.2 (what runtime uses) or `node:child_process` `execFile('git', ['fetch', ...])`.

- npm: none beyond node (`node:path`); the reader module adds `node:fs`.
- Totals: 1 file kept (~240 of 662 lines) + ~30 lines of index.ts + a new reader module (not sized here).

### Area D: Notifications

| Path | Lines | Why |
|---|---|---|
| `src/main/index.ts` 215-281 | ~67 | `NEEDS_YOU_ASK` (title per item kind), `focusItem` (restore, show, focus, push `now:focus`), E2E notice seam, `shownNotices` map, `notifyNeedsYou`, `withdrawNotice` (`onGone` closes the notice) |
| `src/main/app-id.ts` | 14 | Reads `appId` from `electron-builder.yml?raw`; used for `setAppUserModelId` on win32 (858-860) |
| `src/main/raw.d.ts` | 5 | Type for `*?raw` imports |
| `ipc.ts` 812-813 `NowFocus`; preload 403-412 `now.onFocus` | ~15 | Push to the renderer |

- npm: `electron` (`Notification`).
- **Leave-behind imports:** `itemKey` and the `NeedsYouItem["kind"]` union, both task-specific. Cut: re-key `NEEDS_YOU_ASK` and `itemKey` on the new item kinds.
- **Behaviour flag:** notification titles change ("T-0006 needs you: answer a stop" → whatever the new kinds are).
- Totals: 2 files, 19 lines + ~67 lines in index.ts.

### Area E: Map and Docs (kept features served by main)

| Path | Lines | Why |
|---|---|---|
| `src/main/engine/map.ts` | 227 | `getMap`; `mapRequestAllowed`/`realPath` (real-path fence); `guardMapSession` (cancel and report, refuse all permissions); `attachMapWebview` (locks the guest down); `MapFence` (latest open wins, last 50 blocked) |
| `src/main/index.ts` 208-209, 448-462, 688-692, 848-856 | ~30 | Fence instance, webview hooks, `map:get`, `map:blocked` push |
| `src/main/engine/docs.ts` | 42 | `listDocs` (globs `*.md`, `docs/**/*.md`, `.rivetari/**/*.md`, `.github/**/*.md`, minus `.rivetari/tasks/`), `readDoc` (contained read) |
| `index.ts` 789-799 | 11 | `docs:list`, `docs:read` |

**Leave-behind imports and cuts.**

| Import | Cut | Behaviour |
|---|---|---|
| `map.ts:16` `FLOORPLAN_DIR`, `isFloorplanMap` from runtime (`floorplan-skill.ts` 548 lines → 101-file closure: skill registry, agent build, judge…) | **Inline** `const FLOORPLAN_DIR = "floorplan"` and `isFloorplanMap` (checks for any of architecture.json, plan.json, graph.json, .cache): ~8 lines | none |
| `map.ts:15` `loadProfile` from engine (reads `.rivetari/profile.yml` for `floorplanOn`) | **Delete** `floorplanOn` from `MapView` and the empty-state sub-line. Or inline a ~10-line regex read of `.rivetari/profile.yml`, which keeps a `.rivetari/` read and is not recommended. | **CHANGES KEPT FEATURE:** RepoMap's empty state loses "The profile has / doesn't have floorplan on" (`renderer/components/RepoMap.tsx:73-75`). Its copy also cites `rivetari init` and `.rivetari/profile.yml`. |
| `docs.ts:6` `buildContext` from engine (pulls Octokit, simple-git, AI client, `resolveAnthropicKey`…; 19 files) | **Inline** `glob` = `tinyglobby` with the same options (`dot`, `onlyFiles`, `followSymbolicLinks:false`, ignore node_modules/dist/.git): ~12 lines. Inline `containedReadPath` + `isInsideRepo` from `engine/src/paths.ts:19-25, 93-108`: ~25 lines. | none, provided the symlink containment is copied exactly (it's a security property) |
| `docs.ts` `DOC_GLOBS` / `TASKS_DIR` | Re-point to the target layout (`*.md`, `cards/**/*.md`, `done/**`, `nights/**`, `skills/**`, `docs/**`); drop the `.rivetari` glob and its tasks filter | **Changes the listed set** (by design) |

- npm: `node:fs`, `node:path`, `node:url`; `tinyglobby` ^0.2.17 (new direct dep, previously transitive through engine).
- Optional hardening while in transit: make `docs:read` refuse non-`.md` paths, so the reader matches its comment.
- Totals: 2 files, 269 lines → ~305 after inlining.

### Area F: Settings (theme only)

| Path | Lines | Why |
|---|---|---|
| `src/main/store/settings.ts` | 70 | `<userData>/settings.json`, merge over defaults, serialized writes. Unknown keys are stripped by `Settings.partial().safeParse` (the same mechanism already used for `defaultOrg`). |
| `index.ts` 128-135, 801-809 | ~18 | `settingsView()` + `settings:load`, `settings:save` |
| `ipc.ts` 1062-1090 | 29 | Theme, Settings, SettingsView, SettingsSaveRequest, AnthropicKeyRequest |

**Cuts.**
- Drop `aiPreferApiKey` and `autoCheckUpdates` from `DEFAULTS`/`merge` (`settings.ts:18-19, 30-31`) and from the `Settings` schema (`ipc.ts:1071-1074`).
- `SettingsView` becomes `Settings`: drop `anthropicKeySet` (`ipc.ts:1078-1082`) and `settingsView()` (`index.ts:128-135`).

**Behaviour.** Old files with those keys still load, because the keys are stripped and gone after the next save. Theme is unchanged.

- npm: `electron` (`app`), `zod`.
- Totals: 1 file, 70 → ~50 lines.

### Area G: GitHub sign-in, CI, PR (LATER optional card, sized separately)

| Path | Lines | Why |
|---|---|---|
| `src/main/auth/device-flow.ts` | 136 | Pure device flow (`requestDeviceCode`, `pollForToken` with slow_down and abort, `fetchUserLogin`); injectable fetch |
| `src/main/auth/token-store.ts` | 46 | `<userData>/github-token.bin` via `safeStorage`; plaintext only under E2E |
| `src/main/auth/client-id.ts` | 74 | `RIVETARI_GITHUB_CLIENT_ID` env, else `<rivetariConfigDir>/app.json` |
| `src/main/engine/now-health.ts` 134-271 | ~138 of 271 | `CiClient`, `ciSummary`, `mainCi` (default branch + first 100 check runs, 10 s timeout) |
| `src/main/engine/task-pr.ts` | 156 | `prState`: PR state + head check runs |
| `index.ts` 147-173 (E2E canned fetch), 175-195 (dev .env loader), 197 scope, 206 abort, 211-213 push, 597-601 `now:ci`, 675-682 `tasks:pr`, 718-787 `auth:*` | ~130 | Handlers |
| `ipc.ts` 153-174, 790-804, 1034-1060; preload 105-139, 368-375, 283-290 | ~64 + ~50 | Contract and bridge |
| `.env.example` | 7 | Dev client id |

**Leave-behind imports and cuts.**

| Import | Cut | Behaviour |
|---|---|---|
| `client-id.ts:9` `rivetariConfigDir` (engine `github/app.ts`, 240 lines) | Inline 5 lines (`RIVETARI_CONFIG_DIR` ?? `$XDG_CONFIG_HOME`/`~/.config` + `/rivetari`) | none. **But** its source of truth is `rivetari app register` (a CLI command; messages at `client-id.ts:46, 71`). The card must decide where the client id comes from without the CLI. |
| `now-health.ts`/`task-pr.ts` `githubToken` | Replace with identity (`{ token: signedInToken }`) | none: the explicit token is always set at the call (see §1.6) |
| `resolveRepoSlug` (engine `context.ts` → whole `buildContext` closure + simple-git) | Inline ~15 lines (`git remote` origin via `simple-git` or `execFile`) + `parseRepoSlug` (27 lines, `engine/src/github/slug.ts`) | none |
| `Octokit`, `QUIET_LOG` (re-exported by engine) | Direct `@octokit/rest` ^22.0.1 dep + inline QUIET_LOG (6 lines). Or replace with `fetch` for the 4 REST calls. | none |
| `prState`'s PR number comes from the **task ledger** (`shownTask(repoPath,id).pr`, `index.ts:680`) | Needs a **new source** (e.g. the PR for the current branch, or one named in CARD.md) | **The PR reader can't come over as-is.** The `tasks:pr` channel is dropped. |
| `now:ci` in the Now health strip and Home | The card needs a new home in the UI | — |

- Update check (`src/main/update/check.ts`, 164 lines; `update:check`): **drop**. It's on the leave-behind list. It has no leave-behind imports, so it would be easy to bring back later.
- npm: `@octokit/rest` (or none with fetch), `simple-git` (or `child_process`), `electron` (`safeStorage`, `shell`).
- Card totals: 5 files, ~560 lines + ~130 in index.ts + ~114 in ipc and preload + ~50 inlined.

---

## 3. Every IPC channel: handler file and fate

All handlers are registered in `src/main/index.ts` (`registerIpcHandlers`, 497-832). The "delegates to" column is the module doing the work.

| Channel | index.ts lines | Delegates to | Fate |
|---|---|---|---|
| `app:ping` | 498-505 | inline | drop (unused by the UI) |
| `repos:list` / `repos:add` / `repos:remove` | 507-531 | `store/repos.ts` | **keep** |
| `home:get` | 533-544 | `engine/home.ts` | DROP (Home: posture, autonomy, spend) |
| `now:get` / `now:select` / `now:badges` | 546-560 | `engine/now.ts` NowHub | **keep, re-pointed** |
| `now:confirm` / `now:approve` | 562-572 | `engine/now-actions.ts` → `task-beat.ts` | DROP (beats) |
| `now:judge` | 574-578 | `now-actions.ts` | DROP (judge) |
| `now:openPr` | 580-589 | `now-actions.ts` | DROP |
| `now:health` | 591-595 | `engine/now-health.ts` | DROP (autonomy, spend, skills) |
| `now:ci` | 597-601 | `now-health.ts` `mainCi` + `auth/token-store.ts` | LATER card |
| push `now:update` / `now:badgesUpdate` | 310-311 | NowHub | **keep** |
| push `now:focus` | 232 | notifications | **keep** |
| `audit:run` | 603-608 | `engine/audit.ts` | DROP |
| `posture:get` / `posture:draft` | 610-620 | `engine/posture.ts`, `posture-task.ts` | DROP |
| `project:get` / `project:refresh` / `project:draft`, push `project:update` | 622-638, 301 | `project-checks.ts`, `project.ts`, `project-task.ts` | DROP |
| `history:get` / `history:openPr` | 640-655 | `engine/history.ts` | DROP |
| `tasks:watch` / `tasks:unwatch` / `tasks:answer` / `tasks:openPr` / `tasks:ledger` / `tasks:detail`, push `tasks:update` | 657-716 | `engine/tasks.ts`, `task-detail.ts`, `task-beat.ts` | DROP |
| `tasks:pr` | 675-682 | `engine/task-pr.ts` | DROP (the PR reader goes to the card, with a new PR source) |
| `map:get`, push `map:blocked` | 688-692, 848-856 | `engine/map.ts` | **keep** |
| `docs:list` / `docs:read` | 789-799 | `engine/docs.ts` | **keep** |
| `auth:status` / `auth:signIn` / `auth:signOut`, push `auth:update` | 718-787, 211-213 | `auth/device-flow.ts`, `auth/token-store.ts`, `auth/client-id.ts` | LATER card |
| `settings:load` / `settings:save` | 801-809 | `store/settings.ts` | **keep (theme only)** |
| `settings:setAnthropicKey` | 811-820 | `auth/anthropic-key-store.ts` | DROP |
| `update:check` | 822-831 | `update/check.ts` | DROP |
| *(new)* git fetch | — | new | ADD |

**Counts.**
- Kept: 13 channels (repos ×3, now get/select/badges + 3 pushes, map get + push, docs ×2, settings ×2).
- Card: 6 (`auth:*` ×4, `now:ci`, `tasks:pr` reworked).
- Dropped: 27 (including `app:ping`).

---

## 4. Main-side files that are left behind (not copied)

| File | Lines | Feature |
|---|---|---|
| `engine/audit.ts` | 162 | audit, posture |
| `engine/history.ts` | 119 | History tab |
| `engine/home.ts` | 120 | Home |
| `engine/now-actions.ts` | 158 | beats |
| `engine/now-health.ts` | 271 | health strip; the CI half (134-271) goes to the card |
| `engine/posture.ts` | 259 | posture, gates, waivers, evidence |
| `engine/posture-task.ts` | 226 | card drafting |
| `engine/project.ts` | 594 | Project tab, autonomy, skills |
| `engine/project-checks.ts` | 114 | Project |
| `engine/project-task.ts` | 134 | card drafting |
| `engine/task-beat.ts` | 102 | beats, leases, `rivetari/tasks` push |
| `engine/task-detail.ts` | 400 | Tasks |
| `engine/task-pr.ts` | 156 | → card (reworked) |
| `engine/tasks.ts` | 192 | Tasks |
| `update/check.ts` | 164 | update check |
| `auth/anthropic-key-store.ts` | 41 | Anthropic key |

---

## 5. Anthropic key and AI preference paths (remove in transit)

| File | Lines | What |
|---|---|---|
| `src/main/auth/anthropic-key-store.ts` | 1-41 | whole file (`anthropic-key.bin`, safeStorage) |
| `src/main/index.ts` | 17 | `AnthropicKeyRequest` import |
| | 72-76 | key-store import |
| | 128-135 | `settingsView()` merges `anthropicKeySet` |
| | 802, 808 | `settingsView()` calls: replace with `loadSettings()` / `saveSettings()` result |
| | 811-820 | `settings:setAnthropicKey` handler |
| `src/main/store/settings.ts` | 1-3 | comment |
| | 18 | `aiPreferApiKey` default |
| | 30 | merge |
| `src/shared/ipc.ts` | 22 | channel |
| | 1062-1064 | comment |
| | 1071-1072 | `aiPreferApiKey` |
| | 1078-1082 | `SettingsView.anthropicKeySet` |
| | 1088-1090 | `AnthropicKeyRequest` |
| `src/preload/index.ts` | 8 | import |
| | 438 | comment |
| | 451-458 | `settings.setAnthropicKey` |
| `src/main/store/settings.test.ts` | 30, 37 | fixture and expectation |
| `e2e/helpers.ts` | 76 | seeded `aiPreferApiKey` (harmless: stripped) |
| *(renderer, for the renderer inventory)* `components/Settings.tsx` | 114, 127, 192-193, 199-222 | |
| *(transitive, gone with the docs inline)* `packages/engine/src/context.ts` | 16, 130-132 | `resolveAnthropicKey` |

**Update check, also removed** (it shares the Settings plumbing):

| File | Lines |
|---|---|
| `settings.ts` | 19, 31 (`autoCheckUpdates`) |
| `ipc.ts` | 23 (channel), 1073-1074, 1210-1224 |
| `preload/index.ts` | 62, 461-467 |
| `index.ts` | 69, 123, 125-126, 822-831 |
| `e2e/helpers.ts` | 77 |
| renderer `App.tsx` | 121, 165-167 |
| renderer `Settings.tsx` | 141, 241-242 |

---

## 6. `rivetari autonomy` mentions

- **main:** `src/main/engine/project.ts:410` (comment) and `:434` (user-visible problem string). Both are in a dropped file, so they disappear with it.
- **preload, shared:** none.
- For other inventories:
  - renderer: `components/Now.tsx:656`, `components/Project.tsx:109`
  - e2e: `now.e2e.ts:167`, `project.e2e.ts:110`, `project-fixture.ts:223`
- Related CLI-coupled copy that will be wrong in the target: `client-id.ts:3, 46, 71` ("run `rivetari app register`"; the command exists in `packages/cli/src/commands/app.ts`, which the target doesn't carry); `RepoMap.tsx` ("at `rivetari init`").

---

## 7. Tests

### Unit (`vitest`, root `vitest.config.ts` includes `apps/**/*.test.ts`)

| Test | Lines | Area | Verdict |
|---|---|---|---|
| `src/main/app-id.test.ts` | 29 | D | **unchanged**; hard-codes `io.github.arynbht.rivetari` (1-line edit if the appId changes) |
| `src/main/store/registered.test.ts` | 54 | B | **unchanged** |
| `src/main/store/settings.test.ts` | 56 | F | **edit, no left-behind code**: drop `aiPreferApiKey` and `autoCheckUpdates` from lines 30-31 and 36-38 |
| `src/main/engine/map.test.ts` | 234 | E | **unchanged** if `floorplanOn` is kept. If dropped, edit "the repo's map" (62-86: stop writing `.rivetari/profile.yml`, drop the 2 `floorplanOn` asserts). |
| `src/main/engine/map-fence.test.ts` | 94 | E | **unchanged** |
| `src/main/engine/docs.test.ts` | 22 | E | **DROP / rewrite**: runs against `process.cwd()` (the Rivetari monorepo) and expects `docs/adr/0008-merge-policy.md` |
| `src/main/engine/docs-tasks.test.ts` | 43 | E | **DROP / rewrite**: asserts the `.rivetari/**` glob and the `.rivetari/tasks/` exclusion, both left behind |
| `src/main/engine/now.test.ts` | 476 | C | **DROP**: tests task needs-you, running and recent over runtime `TaskView`/`LedgerEntry`. The hub cases (365-476: prime then tell once; badges, intervals, stop removed repos) should be ported to the new event type (~110 lines). |
| `src/main/engine/now-hub-merged.test.ts` | 168 | C | **DROP**: `onMerged` (Project) |
| `src/main/engine/now-hub-tab.test.ts` | 338 | C | **DROP**: Tasks tab, `taskSummary`, ledger-seq news. Port the idea behind "tells gone / withdraws on sidebar removal" (297-322). |
| `src/main/auth/device-flow.test.ts` | 134 | G | card: **unchanged** |
| `src/main/auth/client-id.test.ts` | 83 | G | card: unchanged if the message text is kept; it uses `RIVETARI_CONFIG_DIR` |
| `src/main/engine/now-health.test.ts` | 266 | G | health half (80-159) DROP. CI half (161-266) → card, editing the `githubToken` dep test (203-236) if it's replaced by identity. |
| `src/main/engine/task-pr.test.ts` | 134 | G | card: edit (deps shape; PR source) |
| `src/main/update/check*.test.ts` (3) | 91 + 131 + 58 | — | DROP (update check) |
| all other `src/main/engine/*.test.ts` (audit, audit-recorded, history, home, now-actions, posture×3, project×4, task-actions, task-beat, task-detail, tasks, tasks-summary) | — | — | DROP (dropped features) |

No preload or shared unit tests exist.

### E2E (`e2e/*.e2e.ts`, Playwright `_electron` on `out/main/index.js`)

| Spec | Lines | Covers | Verdict |
|---|---|---|---|
| `e2e/helpers.ts` | 150 | launcher, userData seeding, `RIVETARI_E2E`, axe | **unchanged** works (extra settings keys are stripped); trim lines 75-77 |
| `e2e/map.e2e.ts` | 107 | Map webview, fence, blocked list, empty state | **unchanged**, provided RepoMap keeps "No map for this repository yet." and the literal "floorplan: true" (254-257) |
| `e2e/signin.e2e.ts` | 40 | device flow (canned), not-configured error | card: **unchanged** |
| `e2e/registered-repos.e2e.ts` | 114 | fence | **DROP as-is**: uses `posture.get` and `audit.run` (65-72, 88-99). Salvage the `docs.list`/`docs.read` half (~60 lines) as the fence test; it's the only fence e2e. |
| `e2e/axe.e2e.ts` | 66 | a11y | **DROP as-is**: Run audit, Posture, Project. Salvage empty-state and Map checks. |
| `e2e/honest-basics.e2e.ts` | 205 | posture ×3 + Settings | DROP. Salvage the last test (195-204: Settings loads an old file, shows Theme). |
| `e2e/now.e2e.ts` | 291 | Now, beats, **notification + badge + focus** (239-276) | DROP: signed-ledger task fixtures (`LEDGER_KEY`). Notifications, badges and focus need a **new** e2e on the CARD.md fixtures; keep the `rivetariE2E` seam. |
| `e2e/shell-defaults.e2e.ts` | 134 | tab order (Now, Tasks, Posture, Project, History, Map), ArrowRight | DROP: board fixture. Tab-bar keyboard behaviour needs a new e2e. |
| `home`, `history`, `history-scroll`, `posture`, `project`, `task-answer`, `task-board`, `tasks`, `tasks-progress` + fixtures | — | dropped features | DROP |

The docs viewer has no surviving e2e: today it's only reached through History (dropped) and `registered-repos` (salvage).

---

## 8. Totals per area

| Area | Files copied | Lines source → kept | npm | Leave-behind cuts |
|---|---|---|---|---|
| A Frame (main entry, preload, shared) | 3 src + ~9 config | 2,576 → ~750 (index ~480, preload ~160, ipc ~110) | electron, zod; dev: electron-vite, vite, electron-builder, playwright, axe-core | 13 module imports deleted with their handlers |
| B Fence | 2 | 94 → 94 | electron, zod | none |
| C Watcher | 1 (+ new reader) | 662 → ~240 | node only (+ simple-git or child_process for fetch) | `watchTasks` → narrow `RepoWatch` interface; task projections deleted |
| D Notifications | 2 (+ index.ts lines) | 19 (+67) → same | electron | `itemKey`/`NeedsYouItem` re-keyed |
| E Map + Docs | 2 | 269 → ~305 | tinyglobby | 2 inlines (~8 and ~37 lines); `floorplanOn` delete (**kept-feature change**) |
| F Settings | 1 | 70 → ~50 | electron, zod | none (fields removed) |
| **Kept total** | **~11 src** | **~1,400 lines** | | |
| G GitHub card (later) | 5 | ~560 + ~245 in index, ipc, preload | @octokit/rest (or fetch), simple-git (or child_process) | 4 inlines; PR number needs a new source |

## 9. Biggest risks

1. **Contract change across all three processes.** Re-pointing the watcher replaces `NowState`/`NeedsYouItem`/`RecentEvent`/`NowRunning`, the notification titles and `itemKey`. Main, preload, shared and the renderer Now view all change together.
2. **Notification semantics.** "Not notified for what's already waiting" depends on priming in `heard()` plus ledger-seq `isNew()`. The new reader must keep a first-read prime, or each launch notifies everything.
3. **Map behaviour change.** `floorplanOn` reads `.rivetari/profile.yml` through the engine; dropping it changes the Map empty state. RepoMap's copy also names `rivetari init`.
4. **Docs containment must be inlined exactly** (`containedReadPath` + glob `followSymbolicLinks:false`). Note that `docs:read` already reads any in-repo file, not only `.md`.
5. **E2E coverage collapses.** Only `map.e2e.ts` (and `signin.e2e.ts` with the card) come over unchanged. The fence, notifications, tab bar, Settings and a11y need salvaged or new specs on new fixtures.
6. **Packaging and build coupling:**
   - `tsconfig.node.json`/`tsconfig.web.json` extend the monorepo's `tsconfig.base.json`;
   - `package.json`'s `e2e` script builds `packages/runtime`;
   - `electron-builder.yml` unpacks the catalog;
   - `app-id.test.ts` pins the appId.
7. **The GitHub card is CLI-coupled.** Its client id comes from `rivetari app register`'s `app.json`, and its PR number comes from the task ledger. Both need new sources.
