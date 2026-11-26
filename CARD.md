# T-0067 · feat(kit): an installer, a version stamp and an update mode

Status: draft
Branch: card/T-0067 · Held by: nobody
Created: 2026-11-26 · Source: prompt (owner, 2026-11-26)
Gate: needs you (the installer writes into `~/.claude`, which is agent config; plus a new script entry in package.json)

## Why

Installing Rachetari is a manual copy per machine. The README tells you to `cp -r kit/setup ~/.claude/skills/`, and that copy went stale (it lacked T-0052 and T-0058). Nothing records which kit version a machine has. This card is part 1 of 3: the per-machine installer and its version stamp.

## Acceptance criteria

- [ ] A1: `pnpm kit:install` copies `kit/setup/` to `~/.claude/skills/setup/`, replacing a stale copy (files removed from the kit are removed there), and copies `skills/` to `~/.claude/kit-skills/` when `skills/` exists. · check: `pnpm exec vitest run kit/install.test.ts` (runs against a temp HOME)
- [ ] A2: It writes `~/.claude/skills/setup/.kit-version` holding the kit's git short sha and the install date; running it twice gives the same tree. · check: same test file
- [ ] A3: `pnpm kit:install --check` changes nothing and exits non-zero when the installed copy differs from `kit/setup/`. · check: same test file
- [ ] A4: README's "Install on a machine" names `pnpm kit:install` and `--check`, and drops the manual `cp` steps. · check: look at the README diff
- [ ] A5: Lint, typecheck, format and the test suite pass on the PR. · check: `pnpm lint && pnpm test && pnpm format` and CI green

## Files in scope

- `kit/install.mjs` (new)
- `kit/install.test.ts` (new)
- `package.json` (changed: one `kit:install` script, no dependency)
- `README.md` (changed: "Install on a machine")
- `kit/setup/SKILL.md` (changed: one line telling `/setup` to report the `.kit-version` stamp it ran from)

## Out of scope

- The update mode (diff a repo's installed files against the kit, propose a branch).
- Writing a stamp into a target repo (`.rachetari/kit-version`) and the `/setup` gap fixes.
- The Rivetari wording in the templates.

## Constraints

- No new dependencies: Node built-ins only.
- The installer never touches anything in `~/.claude` outside `skills/setup/` and `kit-skills/`.
- Tests use a temp HOME, never the real `~/.claude`.

## Skills

None.

## Stop and ask

- If a plugin turns out to be the better route, stop; that replaces this card.

## Next step

Owner answers the question below; then set `ready`.

## Decisions

- 2026-11-26: Decided for the owner: stamp lives in `~/.claude/skills/setup/.kit-version`, git short sha plus date (alternative: a semver in `kit/VERSION`).
- 2026-11-26: Decided for the owner: the installer is `kit/install.mjs`, not `scripts/` (alternative: `scripts/`), so it ships with the kit.
- 2026-11-26: Split proposed. T-0067 (this): installer, machine stamp. Part 2: Rivetari wording in CLAUDE-section.md, park/SKILL.md, sections.md (low). Part 3: `/setup` repo stamp plus update mode (diff to a reviewable branch). Part 4: `/setup` gap fixes (branch name vs draft PR, private free-plan 403, `@AGENTS.md` contradiction, headless `.claude/` write).

## Questions for me

- [ ] Install route: script or Claude Code plugin? — Recommended: `pnpm kit:install` script now. It is verifiable here and a plugin adds a packaging format we have not checked. Options: package the kit as a plugin (versioning and updates built in, but unverified here); both, script first.

## Parked

- 2026-11-26 [product] `kit/setup/comment-report.test.ts` line 43 fixture still says Rivetari; fine as a fixture, left alone · seen on T-0067 · kit/setup/comment-report.test.ts

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC): 2026-11-26

```
```
