# T-0007 · feat: add the shell's file source and fetch action

Status: in progress <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0007 · Held by: AB_Rouge
Created: 2026-11-25 · Source: build prompt §6.1 and phase 4.2
Stacked on: card/T-0006 (PR #23)

## Why

Rivetari's views read the task runtime, which this repo doesn't have. The views need one
module that reads the kit's files from a repo, read-only, and is the only code that does,
so every view (T-0008 on) reads the same answers. And a second machine's branches only
appear after a fetch, which nothing runs yet.

## Acceptance criteria

- [ ] A1: One module, `apps/desktop/src/main/kit/source.ts`, reads: live cards (`CARD.md` in the working tree and on every local and remote-tracking `card/*` branch via `git show`), the backlog ("Next up", "Parked", "Repo checklist" with `Stage:`) and `cards/done/*.md` on the default branch, `nights/*.md`, `skills/INDEX.md`, whether `floorplan/index.html` exists, and events (commits on `card/*` branches and commits touching `cards/` or `nights/`) · check: its unit tests on a fixture repo
- [ ] A2: A card that doesn't parse comes back as unreadable with its branch name, never skipped · check: a unit test
- [ ] A3: The module only reads: its git calls are `show`, `ls-tree`, `for-each-ref`, `log`, `rev-parse`, `symbolic-ref`; the one write is `fetch`, in its own exported function · check: a unit test that the repo's refs and files are unchanged after every read; `git grep` of the git verbs
- [ ] A4: A `repos:fetch` channel runs that fetch, through the registered-repos fence, when a repo is opened · check: a unit test of the fetch on a fixture with an origin; the frame e2e still passes
- [ ] A5: CI passes on Ubuntu and Windows · check: `gh pr checks`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `apps/desktop/src/main/kit/*.ts` (new), `apps/desktop/test/kit-fixture.ts` (new)
- `apps/desktop/src/main/index.ts`, `apps/desktop/src/preload/index.ts`, `apps/desktop/src/shared/ipc.ts`, `apps/desktop/src/renderer/App.tsx` (the fetch channel only)
- `EXTRACTED.md`, `BACKLOG.md`, `DECISIONS.md`, `SHELVED.md`, `CARD.md`, `cards/done/T-0007.md`

## Out of scope

- The watcher and any view (T-0008 on)
- Writing to a repo in any way except the fetch (read-only phase)
- A Refresh button (it comes with the views that show fetched data)

## Constraints

- No new dependencies: git runs through Node's `child_process`, no shell.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `testing/test-driven-development` — the parsers are pure functions; tests first

## Stop and ask

Besides the standing list in CLAUDE.md:

- A file format in the kit is ambiguous enough that the parser would have to guess (tonight: decide, log it in DECISIONS.md)

## Next step

Push, open the draft PR, wait for CI, run the done check.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Card written and set ready by the session (D-06)
- 2026-11-25: Format choices the kit leaves open are logged as D-12; a failed fetch shows in the repo's error box (D-13)

## Questions for me

- [ ] (none)

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
<commands and results>
```
