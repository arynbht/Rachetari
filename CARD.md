# T-0030 · feat(shell): a live shell that follows develop

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0030 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Shell: live shell (part 1 of 3) · Gate: low

## Why

After every shell card merges, the foreman rebuilds and relaunches the shell by hand, and
the owner looks at an old build in between. This card is part 1 of the live shell: a
script that keeps a worktree on `develop`, checks every 30 s whether `develop` moved,
builds and unit-tests the new commit in a scratch copy, fast-forwards the live worktree
only if both pass, and otherwise keeps the old version and writes the reason to a status
file. The shell runs from that worktree as `electron-vite dev --watch`, so a fast-forward
shows up without a relaunch: renderer changes by HMR, preload changes by a renderer
reload, and main-process changes by electron-vite rebuilding and restarting the app.

**Start** (from the main checkout, with any other copy of the shell closed):
`node apps/desktop/scripts/live-shell.mjs`. **Stop:** Ctrl+C, or close the shell's window
(the script exits with its dev server). **Back to the normal build:** stop it, then in the
main checkout run `pnpm --filter @arynbht/rivetari-desktop preview`, which runs
`electron-vite build` and starts the production bundle under the strict policy. The two
worktrees can stay; `git worktree remove .claude/worktrees/shell-live` and
`git worktree remove .claude/worktrees/shell-live-check` delete them.

Dev mode loosens the app's security policy (`apps/desktop/src/main/index.ts`, all keyed on
`ELECTRON_RENDERER_URL`, which only `electron-vite dev` sets): the CSP adds
`script-src 'unsafe-inline' 'unsafe-eval'` and `connect-src ws: http://localhost:*`; the
renderer loads from Vite's `http://localhost` server instead of the bundled file;
`apps/desktop/.env` is loaded into `process.env`; DevTools open detached; and the
Electron binary runs without the fuses `electron-builder.yml` flips at package time
(`runAsNode`, `onlyLoadAppFromAsar`, no `NODE_OPTIONS` or `--inspect`). So the live
shell is for the owner's machine only. It is never shipped: the script lives outside
`out/**`, and `electron-builder.yml` packs only `out/**` and `package.json`.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: The script's decision logic is a pure, exported function that takes a fake
      runner (each command → exit code and output) and returns its actions and the new
      status. Unit tests cover: `develop` unmoved → no build, no fast-forward; moved, with
      install, build and tests all passing → the live worktree is checked out at the new
      commit and the status has `failure: null`; build fails → the live worktree is not
      touched and `failure.step` is `"build"` with the output's last 20 lines; tests fail →
      the same with `"test"`; a commit that already failed is not built again until
      `develop` moves on; local `develop` ahead of `origin/develop` → the local one is
      used, and the reverse → origin's; the two diverged, or the target not a descendant of
      the running commit → nothing moves and the reason is written; a change to
      `pnpm-lock.yaml`, a `package.json` or `apps/desktop/electron.vite.config.ts` →
      install in the live worktree and restart the dev server · check:
      `pnpm exec vitest run apps/desktop/scripts/live-shell.test.ts --coverage.enabled=false`
      (all pass, names listed under Evidence)
- [ ] A2: A local run against a scratch `develop` behaves as A1 says. Set up: a bare
      clone of this repo at `.scratch/live-trial/origin.git` and a clone of it at
      `.scratch/live-trial/repo` on `develop`. Then
      `node apps/desktop/scripts/live-shell.mjs --repo .scratch/live-trial/repo --once`
      four times: (1) first run creates `.claude/worktrees/shell-live` and
      `shell-live-check` in the scratch repo, installs and prints the running commit; (2)
      after committing a comment change to `apps/desktop/src/renderer/App.tsx` on scratch
      `develop`, it builds, tests and fast-forwards; (3) after committing
      `apps/desktop/src/main/live-trial.test.ts` with `expect(1).toBe(2)`, the live HEAD
      stays at (2)'s commit and `status.json` names `"step": "test"` and the test; (4) with
      no new commit, it builds nothing · check (local): paste each run's output,
      `git -C .scratch/live-trial/repo/.claude/worktrees/shell-live rev-parse HEAD` after
      runs 2 and 3, and `.scratch/live-trial/repo/.claude/live-shell/status.json` after
      run 3. CI can't run this (UNTESTED on CI)
- [ ] A3: Without `--once`, the script starts `electron-vite dev --watch` in the live
      worktree, and a fast-forward reaches the running shell without a relaunch · check
      (local, about 10 min): run
      `node apps/desktop/scripts/live-shell.mjs --repo .scratch/live-trial/repo` in the
      background; commit to scratch `develop` one line in `apps/desktop/src/main/index.ts`
      that logs `live-trial main marker` on start, and one text change in `App.tsx`; paste
      the script's log showing the check, the fast-forward, electron-vite's main rebuild
      and app restart lines, the marker printed by the restarted main process, and Vite's
      `hmr update` (or page reload) line for `App.tsx`, with the script's process id
      unchanged throughout. Stop it with Ctrl+C and paste that no `electron` process from
      the trial is left (`tasklist | grep -i electron`). CI can't run this (UNTESTED on CI)
- [ ] A4: `--help` prints the start command, how to stop, the way back to the normal
      build (as in "Why"), and that it is dev mode for this machine only; the script is not
      in what's packaged · check: `node apps/desktop/scripts/live-shell.mjs --help`;
      `grep -nA3 '^files:' apps/desktop/electron-builder.yml` shows only `out/**` and
      `package.json`
- [ ] A5: Nothing outside "Files in scope" changes, and `ci` is green on the PR · check:
      `git diff --stat origin/develop...HEAD`; `gh pr checks`. Local before pushing:
      `pnpm lint`, `pnpm --filter @arynbht/rivetari-desktop typecheck`,
      `pnpm exec vitest run apps/desktop --coverage.enabled=false`,
      `pnpm exec prettier --check apps/desktop/scripts CARD.md`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/scripts/live-shell.mjs` (new)
- `apps/desktop/scripts/live-shell.test.ts` (new)
- `CARD.md`, `cards/done/T-0030.md`, `BACKLOG.md` (Parked lines only: on the line, cards never edit Next up)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- The shell itself: the file source reading the newer of local and origin `develop`, the
  60 s background fetch, and the header (running commit, "showing develop", "fetched N s
  ago", behind warning). Those are parts 2 and 3; this card only writes the status file
  they will read
- Any change to `apps/desktop/src/**`, including not opening DevTools in the live shell
  (dev mode opens them on every main restart; part 3 can skip them when
  `RIVETARI_LIVE_STATUS` is set)
- Making the script update itself, a root `package.json` script, or running lint and
  typecheck in the check (the spec says build and unit tests)

## Constraints

- No new dependencies: Node's standard library only (`node:child_process`, `node:fs`,
  `node:timers`, `node:path`, `node:url`).
- ESLint gives `.mjs` files only `console`, `process` and `URL` as globals: import
  `setTimeout` and the rest from `node:timers`.
- The live worktree is detached at a commit (`git worktree add --detach`, then
  `git checkout --detach <sha>`), because `develop` itself is checked out in the main
  checkout and git refuses a branch checked out twice. It only moves forward: the target
  must descend from the running commit (`git merge-base --is-ancestor`), and its working
  tree must be clean.
- "Newer" means descendant: of local `develop` and `origin/develop`, the one that
  contains the other. Each check first runs `git fetch --quiet origin develop` with a
  60 s limit; a failed fetch is logged and the check goes on with what it has.
- The check in `shell-live-check`: `git checkout --detach --force <sha>`,
  `pnpm install --frozen-lockfile --prefer-offline`,
  `pnpm --filter @arynbht/rivetari-desktop build`, then
  `pnpm exec vitest run apps/desktop --coverage.enabled=false`. The next check starts
  30 s after the last one ends, never overlapping.
- The status file is `<repo>/.claude/live-shell/status.json` (gitignored by `.claude/*`),
  written whole through a temp file and a rename:
  `{ running, develop, checkedAt, fetchError, failure: null | { sha, step, reason, at } }`,
  `step` one of `install`, `build`, `test`, `diverged`, `not-forward`, `dirty`. Its path
  goes to the dev server as `RIVETARI_LIVE_STATUS`.
- Importing the script starts nothing: the loop runs only when it is the entry point.
- Windows: spawn `pnpm` with `shell: true` (Node refuses `.cmd` files without it), and
  stop the dev server's whole process tree (`taskkill /pid <pid> /T /F`).
- The test file sits outside `tsconfig.node.json`'s `src/**`, so the desktop typecheck
  doesn't see it; vitest's `apps/**/*.test.ts` does.
- Trials write only inside the gitignored `.scratch/live-trial/` and push nowhere.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development`: A1's decision logic is written test first against a fake runner

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: none. The two new files overlap no open card (T-0024: `source.ts`,
  `App.tsx`; T-0026: `parse.ts`, `now.ts`, `ipc.ts`, `Now.tsx`; T-0028:
  `docs/prototypes/T-0028/**`)
- If the live shell can't work without editing `apps/desktop/src/**`,
  `electron.vite.config.ts` or a `package.json`
- If `electron-vite dev --watch` doesn't restart the app on a main-process change in the
  installed 2.3.0 (the docs read are for 5.0.0)

## Next step

Ready. Start with A1: write `live-shell.test.ts` against a fake runner, then the decision
function, then the loop and the dev server.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `low`: two new files, five criteria, no dependency, no IPC or other contract change, no existing test touched. Status `ready`.
- 2026-11-25: The split, decided for the owner: part 1 (this card) is the script and the dev-mode shell, so the owner gets a self-updating shell soonest and it touches no file another card holds. Part 2: the file source reads `develop` from the newer of local and origin, falling back to the default branch when there's no `develop`, replacing T-0018's newest-`day/*` reading (after T-0024, `source.ts`). Part 3: the 60 s background fetch of every registered repo and the header on Now, Tasks and Checklist with the running commit (from `RIVETARI_LIVE_STATUS`, else the build's), "showing develop", "fetched N s ago", a failed fetch, and the behind warning (after T-0024 `App.tsx` and T-0026 `now.ts`, `ipc.ts`; it changes the IPC contract, which the owner's `low` covers). Alternative: one card for all of it, which is over ten files.
- 2026-11-25: Overlaps, decided for the owner: this card takes nothing from "Shell: the display branch" or "Shell: background fetch". Part 2 would take all of the display branch and part 3 all of background fetch (at 60 s, as this spec says, not 2 min), so neither needs its own card. Alternative: keep those two cards for the default-branch fallback, the `day/*` replacement and a failed fetch in the header.
- 2026-11-25: Location, decided for the owner: `apps/desktop/scripts/live-shell.mjs`, not the root `scripts/`. Vitest only finds `packages/**` and `apps/**` tests, so a root script's tests would need a `vitest.config.ts` change (stop-and-ask). Alternative: root `scripts/live-shell.mjs` plus that config change.
- 2026-11-25: The script fetches `origin develop` itself on each 30 s check, decided for the owner, so the other machine's merges arrive before part 3's background fetch exists. Alternative: read only local refs and wait for part 3.
- 2026-11-25: A failed commit isn't retried every 30 s, decided for the owner: it's built again only after `develop` moves to another commit. Alternative: retry each check, which reruns a minutes-long build that will fail again.
- 2026-11-25: Closing the shell's window ends the script, decided for the owner (electron-vite dev exits with the app). Alternative: the script relaunches the shell, which makes it hard to stop.
- 2026-11-25: electron-vite option: `electron-vite dev --watch` (`-w`), "the preferred way" over `build.watch: {}` (https://electron-vite.org/guide/hmr-and-hot-reloading). Main changes rebuild and restart the app; preload changes rebuild and reload the renderer; the renderer keeps HMR. The installed 2.3.0's CLI has the same flag (`-w, --watch … rebuilds when main process or preload script modules have changed on disk`).

## Questions for me

None.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  none (low card)

Drafting: electron-vite docs (https://electron-vite.org/guide/hmr-and-hot-reloading,
shown for v5.0.0): "Use CLI option `-w` or `--watch`, e.g. `electron-vite dev --watch`.
This is the preferred way"; main: "Rebuilds and restarts the Electron app"; preload:
"Rebuilds and triggers renderer reload". Installed: electron-vite 2.3.0
(pnpm-lock.yaml); its dist/cli.mjs line 39 defines `-w, --watch`.
```
