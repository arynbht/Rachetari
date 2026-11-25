# T-0049 · chore(agents): drafter, builder and inspector subagent definitions

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0049 · Held by: nobody
Created: 2026-11-25 · Source: owner, 2026-11-25 (models per role) · Gate: needs you (agent config)

## Why

The line's stations (drafter, builders, inspectors) are spawned as general agents that
inherit the foreman's model (Opus) and get their standing rules only from each prompt
and the chat. The owner wants a model per role, with the foreman staying as the main
session on Opus: three role files under `.claude/agents/`, each pinning its model and
tools and restating that role's rules from `docs/queue-2026-11-25.md` "The line", so a
fresh agent gets them without reading the chat. Per-card specifics stay in the
foreman's prompt.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `.claude/agents/drafter.md`, `builder.md` and `inspector.md` exist; each opens with YAML frontmatter holding exactly the keys `name`, `description`, `tools`, `model` (camelCase, one line each), with `name` equal to the file's base name · check: `node -e "for (const r of ['drafter','builder','inspector']) { const t=require('fs').readFileSync('.claude/agents/'+r+'.md','utf8'); const m=t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/); const kv=Object.fromEntries(m[1].split(/\r?\n/).map(l=>[l.slice(0,l.indexOf(':')),l.slice(l.indexOf(':')+1).trim()])); console.log(r, JSON.stringify(kv)) }"` prints, per file, those four keys and no others, and `name` matches
- [ ] A2: models as asked: drafter `sonnet`, builder `sonnet`, inspector `opus` · check: A1's output, and `grep -n "^model:" .claude/agents/*.md`
- [ ] A3: tools as decided, none with `Agent`: drafter `Read, Grep, Glob, Bash, Edit, Write`; builder `Read, Grep, Glob, Bash, Edit, Write`; inspector `Read, Grep, Glob, Bash` · check: `grep -n "^tools:" .claude/agents/*.md` shows exactly those lists, and `grep -nE "^(tools|disallowedTools|permissionMode):.*" .claude/agents/*.md | grep -c Agent` prints 0
- [ ] A4: each body restates its role's rules and report shape; every phrase below appears (case-insensitive) · check, per file: `for p in <phrases>; do grep -qiF -- "$p" .claude/agents/<role>.md || echo "MISSING $p"; done` prints nothing, with output under Evidence
  - all three: `merging stays with the foreman`, `never --no-verify`, `never force-push`, `rebase`, `no new dependencies`, `no secrets`, `eslint-disable`, `BACKLOG.md`, `decided for the owner`, `absolute paths`, `~/.claude`
  - drafter: `Gate: needs you`, `five files and five criteria`, `runnable`, `docs-only`, `shared first`, `Questions for me`, `Recommended:`, `Waiting on the owner`, `prettier`, `chore(card): draft`, `Files in scope`
  - builder: `Held by: nobody`, `UNTESTED`, `## Parked`, `shell chain`, `previous card branch`, `draft PR`, `push after every meaningful step`, `no local desktop e2e`, `git status`, `departures`, `Evidence`
  - inspector: `VERDICT`, `BLOCKING`, `ADVICE`, `REVIEW`, `SCOPE`, `review --pr`, `not seen the build`, `never edit`, `red Windows run`, `no local desktop e2e`, `fix card`
- [ ] A5: the files are committed and formatted, and `.gitignore` gains one line · check: `git ls-files .claude/agents` lists the three files; `git diff origin/develop -- .gitignore` shows only `+!.claude/agents/`; `pnpm exec prettier --check .claude/agents CARD.md` passes; `gh pr checks <PR>` shows `ci` passing
- [ ] A6: the files load (the foreman's post-merge check; UNTESTED on the PR) · check: after the merge into `develop` is pulled into the main checkout, `/agents` lists `drafter`, `builder` and `inspector` as project agents; a test spawn with `subagent_type: drafter` and no `model` parameter shows Sonnet in `/tasks` (and `inspector` shows Opus); after the next line run, the owner's usage view shows Sonnet usage

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `.claude/agents/drafter.md` (new)
- `.claude/agents/builder.md` (new)
- `.claude/agents/inspector.md` (new)
- `.gitignore` (one added line, `!.claude/agents/`, after `!.claude/skills/`)
- `CARD.md`, moved to `cards/done/T-0049.md` when done

## Out of scope

Named on purpose, so the session doesn't drift into them.

- `permissions.deny` in `.claude/settings.json` to block `gh pr merge`, pushes to `main` or `develop`, `--no-verify` or force-push: it applies to every session including the foreman, so it is a separate owner decision (parked below).
- A foreman role file, `CLAUDE.md`, the kit's skills (`/card`, `/done`, `/handoff`) or anything under `~/.claude`.
- Per-card specifics in the bodies: card ids, chain order, branch names, worktree paths, word limits for one card.

## Constraints

- No new dependencies.
- Frontmatter holds only `name`, `description`, `tools`, `model`; `description` is one line. No `permissionMode`, `isolation`, `skills`, `maxTurns`, `effort`, `color` or `omitClaudeMd` (see Decisions).
- `Bash` can't be narrowed to single commands in `tools`, and a Bash specifier in `disallowedTools` removes all of Bash; so each body says in words what Bash is for, and "merging stays with the foreman".
- This card is the owner-approved agent-config change; editing these four files is not a stop-and-ask for this card.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- None: nothing in `skills/INDEX.md` covers subagent definitions.

## Stop and ask

Besides the standing list in CLAUDE.md:

- A role turns out to need a tool beyond the lists in A3.
- The files would load only with a change to `.claude/settings.json` or anything outside "Files in scope".

## Next step

Ready for a builder: write the three role files and the `.gitignore` line, run A1–A5's checks, open a draft PR against `develop`; A6 is the foreman's after the merge.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: The owner approved this card in chat ("as one card, gate needs you; the owner approves it"), so it is drafted `ready` with `Gate: needs you` on the Created line.
- 2026-11-25: Three files, not four — decided for the owner: the owner said "four" but named three roles, and the foreman stays as the main session on Opus, so it has no file (alternative: a fourth `foreman.md`, which no session would spawn).
- 2026-11-25: Drafter tools `Read, Grep, Glob, Bash, Edit, Write`, its body limiting writes to `CARD.md` — decided for the owner: no `WebFetch`, since the foreman gathers documented facts into the prompt or the queue's "Known" notes (alternative: add `WebFetch` for the drafter).
- 2026-11-25: Builder tools `Read, Grep, Glob, Bash, Edit, Write`, used for shell chain and kit cards alike (one file; the mode comes from the prompt).
- 2026-11-25: Inspector tools `Read, Grep, Glob, Bash`, no `Edit` or `Write`; Bash is for checks, `gh` reads and `review --pr` (its body says never edit, commit or push).
- 2026-11-25: No role gets `Agent` (no sub-spawning). `tools` is an allowlist, so leaving `Agent` out is enough; no `disallowedTools` — decided for the owner (alternative: also list `Agent` under `disallowedTools`, redundant).
- 2026-11-25: No `permissionMode` — decided for the owner: the sessions inherit the foreman's mode; `plan` would stop the inspector running checks (alternative: `plan` for the inspector).
- 2026-11-25: No `isolation: worktree` — decided for the owner: the foreman creates each card's worktree and branch and names it in the prompt (alternative: let the harness make a worktree per spawn, on a branch the line doesn't name).
- 2026-11-25: No `skills`, `maxTurns`, `effort`, `color` or `omitClaudeMd` — decided for the owner: the card names its own skills, and CLAUDE.md must load for every role (alternative: preload `card` for the drafter and `done` for the builder).
- 2026-11-25: `.gitignore` gains `!.claude/agents/`, since `.claude/*` is ignored except `settings.json` and `skills/`; without it the files can't be committed.
- 2026-11-25: Every role file restates: merging stays with the foreman; hard rules (never `--no-verify`; never force-push, rebase or delete a pushed branch; never merge or push to `main` or `develop`; never mark a PR ready; no new dependencies; no secrets; no `eslint-disable`); cards never edit Next up or `BACKLOG.md` (parked lines go under "## Parked" in the card); small questions decide and log ("decided for the owner" with the alternative), real forks and stop-and-ask items under "Questions for me" in the template's shape; work only in the worktree the prompt names, with absolute paths or `git -C`, never the main checkout, other worktrees or branches, or `~/.claude`; base branch `develop`; commit body `Card: <id>` with the session's attribution trailer; report in the length the prompt sets.
- 2026-11-25: The drafter's file adds: the gate (`low` = nothing on the stop-and-ask list, agent config is `.claude/**`, `CLAUDE.md` and `~/.claude` while `kit/` isn't, at most five files and five criteria; `low` goes `ready`, otherwise `draft` unless the prompt says the owner approved it); runnable checks (every check runs on the card's PR; a docs-only PR runs no lint, typecheck or test); standing pre-approvals go straight to ready; shared first; the id and branch exist with a stub `CARD.md` to replace from `cards/TEMPLATE.md`, keeping the title's id; following `.claude/skills/card/SKILL.md`; the Evidence line "Waiting on the owner (wall clock, UTC):"; `pnpm exec prettier --write CARD.md`; commit `chore(card): draft <id>`; report: title, gate, criteria with checks, Files in scope, decisions, questions.
- 2026-11-25: The builder's file adds: set `Held by:` on start and `Held by: nobody` on leaving a blocked card; edit only Files in scope; push after every meaningful step; Evidence with commands and output, anything not run marked UNTESTED; tests, lint and typecheck; no local desktop e2e (CI's headless `desktop-e2e` gates); stop-and-ask writes the question, commits, pushes and leaves; shell chain mode (branch from the previous card branch by merge, PR targets the previous card branch until it merges, then `develop`; a held card is skipped for the next one that doesn't depend on it); draft PR against `develop`; the done check moves `CARD.md` to `cards/done/`; report: PR, criteria, files, `git status`, parked, decisions, departures from the card.
- 2026-11-25: The inspector's file adds: it has not seen the build and judges only from the card, the diff and CI; it starts only on a green `ci`; never edit, commit or push; run the card's checks and `review --pr` (via `node packages/cli/dist/bin.js` after install and build; retry once if it times out and posts nothing); out-of-scope edits are blocking; a red Windows run is reported in its notes, not blocking on a PR; no local desktop e2e; in chain mode a blocking finding goes to a fix card at the chain's end unless it breaks the build or security; report: VERDICT, BLOCKING, ADVICE, REVIEW, SCOPE.

## Questions for me

One question per line, in this shape; options are separated by `;`.

- None.

## Parked

- 2026-11-25 [tool] `tools` can't narrow Bash per command, so every role can still run `gh pr merge` or push to `develop`; only `permissions.deny` in `.claude/settings.json` can block those, and it applies to the foreman too: an owner decision (answer individually) · seen on T-0049 · `.claude/settings.json`

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC):
none (owner approved it in chat)

```
Drafted 2026-11-25. A1–A6: UNTESTED (nothing built yet).
```
