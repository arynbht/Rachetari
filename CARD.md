# T-0024 · fix(shell): time out the shell's git calls

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0024 · Held by: nobody
Created: 2026-11-25 · Gate: low · Source: `docs/queue-2026-11-25.md` §Timeouts on the shell's git calls

## Why

Every git call the shell makes goes through `git()` in `apps/desktop/src/main/kit/source.ts`, and none has a time limit. A hung `git fetch` (opening a repo runs `fetchRepo`) waits forever, and a hung read stalls the Now watcher's whole tick. Most reads also swallow every error (`.catch(() => null)`), so a read that did fail would look like a missing file. One such hang already blocked CI (BACKLOG Parked, 2026-11-25, seen on T-0016).

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: Every git call in `source.ts` has a limit, set in one place: 10 s for a read and 60 s for `fetchRepo`. Each limit can be overridden by `RIVETARI_GIT_READ_LIMIT_MS` / `RIVETARI_GIT_FETCH_LIMIT_MS`, read at call time. A call that passes its limit kills git and rejects with `git <subcommand> timed out after <N> s`. The promise settles at the limit even when git's child processes keep its pipes open. `source.ts`'s catch-alls pass a timeout on instead of treating it as "not there" · check: read `git diff origin/day/2026-11-25 -- apps/desktop/src/main/kit/source.ts`, plus A2 and A3
- [ ] A2: A git read that hangs fails at the read limit, and the watcher reports it as an error event, so it reaches the Now view's error box. It must not show up as a missing or drafting card · check: `pnpm exec vitest run apps/desktop/src/main/kit/source-timeout.test.ts`, test `a git read that hangs fails at the read limit, and the watcher reports it`
- [ ] A3: A fetch that hangs fails at the fetch limit, and once the remote answers (or is removed) the next `fetchRepo` succeeds · check: same file, test `a fetch that hangs fails at the fetch limit, and the next fetch works`
- [ ] A4: In the shell, opening a repo whose fetch hangs shows `Couldn't fetch this repo: git fetch timed out after …` in that repo's error box. Opening the repo again once the remote answers clears the message. A late fetch failure from a repo you've left never shows on the repo now open · check: `pnpm --filter @arynbht/rivetari-desktop e2e -- fetch-timeout.e2e.ts`, tests `a fetch that hangs shows its message in that repo's error box, and opening the repo again recovers` and `a late fetch failure doesn't show on the repo opened since`; `desktop-e2e` green on the PR
- [ ] A5: No existing test changes and all pass; lint and typecheck pass · check: `git diff --stat origin/day/2026-11-25 -- '*.test.ts' 'apps/desktop/e2e'` lists only the two new files; `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter @arynbht/rivetari-desktop typecheck`; `gh pr checks` (`ci` green)

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/kit/source.ts`
- `apps/desktop/src/main/kit/source-timeout.test.ts` (new)
- `apps/desktop/src/renderer/App.tsx` (only `handleSelect`'s fetch: drop a late result for a repo no longer selected)
- `apps/desktop/e2e/fetch-timeout.e2e.ts` (new)
- `CARD.md`, `BACKLOG.md` (Parked lines only)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- A Fetch button. The shell has none: opening a repo runs the fetch (`App.tsx` `handleSelect`), so "the Fetch button recovers" here means opening the repo again
- Killing git's whole process tree on timeout (e.g. `git-remote-http` left running on Windows until the remote closes). Park it if seen
- Changing the existing fetch test, `vitest.config.ts`'s 30 s timeout, `test/kit-fixture.ts` (T-0019 edits it) or the IPC contract `shared/ipc.ts`
- Spinners or "fetching…" state in the UI, and limits in Settings

## Constraints

- No new dependencies. No change to `shared/ipc.ts`, the preload, or any existing test.
- The hangs come from real git, not a mocked runner. The tests start a local TCP server that accepts connections and never answers, and use `http://127.0.0.1:<port>/…` as the hanging remote. For a fetch, add it as an extra remote on a `kitFixture()` repo (`fetchRepo` runs `--all`). For a read, make a `--filter=blob:none --no-checkout` partial clone of the fixture's origin (set `uploadpack.allowFilter` on the origin first), then point its `origin` URL at the server. `git show` on a card branch then lazy-fetches the blob and hangs. Close the server and destroy its sockets in `afterAll`/`afterEach`.
- The tests lower the limits through the env vars (about 2 s), restore them afterwards, and assert that the call settles well within 10 s.
- `kit-fixture.ts` is used as it is, only through its exports.
- If the existing fetch test hangs in CI before this merges, re-run that job once and note it on the PR (queue spec).

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development`: the hang tests come first and must fail (hang to vitest's timeout) before the limit exists
- `workflow/incremental-implementation`: three slices (limit in `git()`, swallowed timeouts, the renderer's stale result), each tested

## Stop and ask

Besides the standing list in CLAUDE.md:

- If the partial-clone read hang can't be made reliable on Windows CI, stop. Falling back to a fake runner is a fork in what A2 proves.
- If the renderer change needs more than `handleSelect` (e.g. new state shared with Now or Tasks).

## Next step

Write `source-timeout.test.ts`'s fetch-hang test against a never-answering local server and watch it time out in vitest. Then add the limit to `git()`.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Limits: decided for the owner: 10 s per read, 60 s for a fetch (alternative: one 30 s limit for both, or a 20 s fetch so a CI hang fails inside vitest's 30 s). The fetch test makes many git reads plus a local fetch and takes 515–656 ms locally and 961 ms in CI (T-0016), so one read takes well under 100 ms. 10 s gives a read over 10× the whole test's slowest run. A real fetch goes over the network to a remote of any size, so 60 s leaves room for a slow link and still bounds a hang.
- 2026-11-25: How the tests hang git: decided for the owner: real git against a local server that never answers, for both a fetch and a partial-clone read (alternative: an injectable runner that spawns a hanging `node` process). It tests the real kill-and-settle path, and partial-clone reads can really hang this way.
- 2026-11-25: How tests set short limits: decided for the owner: `RIVETARI_GIT_READ_LIMIT_MS` / `RIVETARI_GIT_FETCH_LIMIT_MS`, read at call time (alternative: an exported mutable limits object, which the e2e couldn't reach). `launchApp({ env })` already passes env to the main process.
- 2026-11-25: "The Fetch button recovers": decided for the owner: no button is added. Opening the repo again re-runs the fetch and clears the message (alternative: add a Fetch button, a new UI feature beyond the spec's fix).
- 2026-11-25: The renderer drops a late fetch result for a repo that's no longer selected. Decided for the owner, because the spec asks for the message in _the repo's_ box, and a 60 s timeout makes a stale message on the next repo likely (alternative: leave `App.tsx` alone and accept the stale message).

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
```
