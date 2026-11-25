# T-0021 · test(shell): salvage the registered-repos and axe e2e tests

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0021 · Held by: AB_Rouge
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §4c, `SHELVED.md` S-17, issue #22 · Gate: low

## Why

T-0006 dropped Rivetari's `e2e/registered-repos.e2e.ts` and `e2e/axe.e2e.ts` because they call channels and views this shell no longer has (D-10). So nothing checks the fence (main refuses a repo path it didn't register) from the renderer's side, and nothing walks every screen through axe in one pass. The owner chose S-17's option (a) for these two only: copy each from Rivetari `32f4b88` verbatim, then edit it, listing every edit. The other six dropped tests stay shelved, so the PR says `Refs #22`, not `Closes`.

The edits, all inside the two copied files (nothing else in the shell, its fixtures or its tests changes):

| File                      | Source line(s)                                         | Why it can't run here                                   | Edit                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `registered-repos.e2e.ts` | `copyFixtureRepo` import and call                      | `e2e/fixtures/sample-repo` doesn't exist here           | Import `kitFixture` from `../test/kit-fixture`; the repo is `kitFixture().repo`, removed with `fx.remove()` in `afterEach`                                                                                               |
| `registered-repos.e2e.ts` | `config` temp dir, `env: { RIVETARI_CONFIG_DIR }`      | nothing here reads `RIVETARI_CONFIG_DIR`                | Drop both                                                                                                                                                                                                                |
| `registered-repos.e2e.ts` | `Bridge.posture`, `Bridge.audit`                       | no `posture:*` or `audit:*` channel or preload method   | Replace with `checklist.get(repoPath): Promise<{ repoPath: string }>` and `repos.fetch(repoPath): Promise<void>`                                                                                                         |
| `registered-repos.e2e.ts` | `posture.get(repo)` → `repoPath` is `repo`             | as above                                                | `checklist.get(repo)` → `repoPath` is `repo` (the registered read)                                                                                                                                                       |
| `registered-repos.e2e.ts` | `audit.run(other)` refused                             | as above                                                | `repos.fetch(other)` refused with "isn't one of the registered repos" (the one channel that writes into a repo)                                                                                                          |
| `registered-repos.e2e.ts` | `existsSync(other/.rivetari/state.json)` is false      | the audit's state file doesn't exist here               | `readdirSync(other)` equals `["secret.md"]` (nothing was written there)                                                                                                                                                  |
| `registered-repos.e2e.ts` | `docs.list`, `docs.read` (registered, other, climbed)  | —                                                       | Unchanged                                                                                                                                                                                                                |
| `axe.e2e.ts`              | `copyFixtureRepo` import and call                      | as above                                                | `kitFixture()` (name kept `sample-repo`), `fx.remove()` in `afterEach`                                                                                                                                                   |
| `axe.e2e.ts`              | "Empty state (no repo selected)" axe run with no wait  | with no repo picked the shell shows Home                | Wait for the `Home` heading and the `sample-repo` article, then run axe labelled `home`                                                                                                                                  |
| `axe.e2e.ts`              | Repo button click, Now heading wait, `now` axe run     | —                                                       | Unchanged                                                                                                                                                                                                                |
| `axe.e2e.ts`              | Posture tab, "Run audit", "N controls · recorded" wait | no Posture tab                                          | Replaced by the Tasks tab (wait for `#panel-tasks` heading `Tasks` and its `Board` region) and the Checklist tab (wait for `#panel-checklist`'s `Stage` region showing `Building`), axe labelled `tasks` and `checklist` |
| `axe.e2e.ts`              | Project tab and heading                                | no Project tab                                          | Replaced by the History tab (wait for `#panel-history` heading `Backlog`, the Docs viewer showing the backlog), axe labelled `history`                                                                                   |
| `axe.e2e.ts`              | Map: "No map for this repository yet."                 | the fixture has a map; the empty text also differs here | Wait for `#panel-map webview` with `src` ending `floorplan/index.html`                                                                                                                                                   |
| `axe.e2e.ts`              | Settings button, heading, axe run                      | —                                                       | Unchanged                                                                                                                                                                                                                |

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: Both files are first copied from Rivetari `32f4b88` verbatim in one commit, and every edit is in a later commit · check: for each file, `git -C <Rivetari> show 32f4b88:apps/desktop/e2e/<file> | diff - <(git show <copy commit>:apps/desktop/e2e/<file>)` prints nothing; `git diff <copy commit> HEAD -- apps/desktop/e2e` shows only the edits in the table above (looked at)
- [ ] A2: The fence test passes: the registered repo answers `docs.list` and `checklist.get`; another folder is refused for `docs.read` and `repos.fetch` with "isn't one of the registered repos" and nothing is written there; a path that climbs out of the registered repo is refused · check: `pnpm --filter @arynbht/rivetari-desktop e2e e2e/registered-repos.e2e.ts`, test "registered repos › main refuses a repo path that isn't registered"; runs in CI's `desktop-e2e`
- [ ] A3: One walk through Home, Now, Tasks, Checklist, History, Map and Settings finds no serious or critical axe violation · check: `pnpm --filter @arynbht/rivetari-desktop e2e e2e/axe.e2e.ts`, test "accessibility (axe) › each screen is free of serious/critical axe violations"; runs in CI's `desktop-e2e` (History passes only with T-0020's fix; see Stop and ask)
- [ ] A4: The salvage is recorded: `EXTRACTED.md` gets a `T-0021` section whose table has both files with every edit above, and `SHELVED.md`'s S-17 entry says these two are salvaged on T-0021 and the other six stay shelved · check: read both sections; the PR body says `Refs #22`
- [ ] A5: Nothing else moves: every other test passes unchanged; lint, typecheck and `ci` are green · check: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter @arynbht/rivetari-desktop typecheck`, `pnpm --filter @arynbht/rivetari-desktop e2e`, `git diff --stat origin/day/2026-11-25` (only the files below), `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/e2e/registered-repos.e2e.ts` (new: copied, then edited)
- `apps/desktop/e2e/axe.e2e.ts` (new: copied, then edited)
- `EXTRACTED.md` (a new `T-0021` section only)
- `SHELVED.md` (the S-17 entry only)
- `CARD.md`, `cards/done/T-0021.md`, `BACKLOG.md` (Parked lines only)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- The other six dropped tests in S-17 (`shell-defaults.e2e.ts`, `history-scroll.e2e.ts`, honest-basics test 4, `settings.test.ts`, the CI tests in `now-health.test.ts`, `docs.test.ts`)
- `e2e/helpers.ts` (its unused `copyFixtureRepo` and old settings keys), `test/kit-fixture.ts` (T-0019's file), and fixing any axe finding in a view: a finding other than History's checkbox labels is a stop
- Closing issue #22 or editing T-0006's "Tests dropped" line in `EXTRACTED.md`

## Constraints

- No new dependencies (`axe-core` and `runAxe` are already here).
- Copy verbatim first, edit in the next commit, as `EXTRACTED.md` requires.
- Make only the edits in the table; keep the source's names, comments and assertions otherwise.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- None: the work is a copy plus the listed edits, and no listed skill matches it.

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0020 (`renderer/lib/markdown.ts`, behaviour only): History passes axe only with its task-list label fix. If T-0020 isn't merged into `day/2026-11-25` when this PR is ready, or axe on History reports anything besides that `label` violation, stop; don't drop History from the walk.
- If any test needs a change to shell code, `e2e/helpers.ts`, `test/kit-fixture.ts` or another existing test to pass.
- If axe reports a serious or critical violation on any other screen.

## Next step

Copy both files verbatim from Rivetari `32f4b88` (`git -C <Rivetari> show 32f4b88:apps/desktop/e2e/<file>`) and commit them alone; then make the table's edits for `registered-repos.e2e.ts` and run it.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate is `low`: the two tests are new files here (copying then editing them isn't changing an existing test), no shell code, fixture, helper or existing test changes, no dependency, four files and five criteria.
- 2026-11-25: Both tests use `kitFixture()`, not a new `e2e/fixtures/sample-repo`: it is the fixture every other e2e test here uses, and it fills each view so axe sees real content.
- 2026-11-25: The write the fence refuses is `repos.fetch`, the only renderer channel that writes into a repo; "nothing written" becomes `other` holding only `secret.md`, since the audit's state file doesn't exist here.
- 2026-11-25: The walk replaces Posture and Project with today's Tasks, Checklist and History tabs, so every screen is covered in one pass, as the source did for its tabs.
- 2026-11-25: `Refs #22`, not `Closes`: six of the eight dropped tests stay shelved.
- 2026-11-25: Owner (18:29): the axe walk includes History; build after T-0020 merges.

## Questions for me

- [x] Should the axe walk include History now, waiting on T-0020's fix, or leave History out until then? Recommended: include it and build after T-0020 merges (T-0020 is in progress and adds its own History axe check); the builder goes ahead on this unless you say otherwise. — Owner, 18:29: as recommended: include History, build after T-0020 merges.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened, its body saying `Refs #22`: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  question         18:21:18 → 18:29:27   8 min 9 s
```
