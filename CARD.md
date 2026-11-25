# T-0037 · docs(kit): describe the standing develop branch in SCOPE.md and the kit

Status: ready <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0037 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §Kit and scope: describe develop (and §The line, "Branches") · Gate: low

## Why

The owner replaced day branches with a standing `develop` branch (§The line, "Branches"),
but `SCOPE.md` and the kit still describe a repo with only a default branch: `/card` cuts
cards from the default branch, `/handoff` says parked lines reach the default branch, and
the CLAUDE.md section only says "never push to the default branch". A session reading them
gets the branch model wrong.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `SCOPE.md` describes `develop` as the standing integration branch, in one place: card branches are cut from it, their PRs target it, passed cards are merged into it; Next up, Parked and `docs/open-questions.md` live on it, pushed after every change; a ruleset blocks force-push and deletion; `ci` runs on every push to it and a red `develop` stops merges until a fix card lands; changes reach `main` only by a `develop` → `main` PR that the owner asks for and merges; `main` requires a PR and `ci`, admins included · check: `grep -nE "develop|force-push|admins" SCOPE.md` shows each point, and reading the passage confirms all of them
- [ ] A2: `SCOPE.md`'s existing branch lines agree with A1: "More than one machine" says `CARD.md` is never on `develop` or the default branch, and nothing else in the file still says cards branch from, or PRs target, the default branch · check: `grep -n "default branch" SCOPE.md`, each hit read against A1
- [ ] A3: `kit/setup/templates/CLAUDE-section.md` describes the pattern generically: the repo's integration branch is `develop` (or its like) when it has one, else the default branch; card branches are cut from it and draft PRs target it; a session never merges and never pushes to it or to the default branch. The heading, the eight numbered rules and the Commands line stay · check: `grep -n "integration branch" kit/setup/templates/CLAUDE-section.md` (at least one hit, inside rule 7) and `grep -cE '^[0-9]\. \*\*' kit/setup/templates/CLAUDE-section.md` prints `8`
- [ ] A4: the kit's `/card` and `/handoff` templates say the integration branch: `/card` step 5 creates `card/<id>` from the integration branch (the default branch when there is none); `/handoff` step 5 says parked lines reach the integration branch when the card's PR merges, and the session pushes to neither it nor the default branch · check: `grep -n "integration branch\|default branch" kit/setup/templates/skills/card/SKILL.md kit/setup/templates/skills/handoff/SKILL.md`, each hit read against this criterion
- [ ] A5: format, lint, typecheck and tests pass (`kit/**` sits outside every workspace package, so `scripts/ci-scope.mjs` scopes the PR to every package and CI runs the full set) · check: `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, each exit 0

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `SCOPE.md`
- `kit/setup/templates/CLAUDE-section.md`
- `kit/setup/templates/skills/card/SKILL.md`
- `kit/setup/templates/skills/handoff/SKILL.md`

## Out of scope

Named on purpose, so the session doesn't drift into them.

- Re-installing the kit here: the root `CLAUDE.md` and `.claude/skills/{card,handoff}/SKILL.md` are agent config (a separate `needs you` step), and so is anything under `~/.claude`.
- `kit/setup/templates/skills/done/SKILL.md` and `kit/setup/SKILL.md`: T-0027 (in progress) edits both; `/done`'s PR base waits for it (parked).
- Night mode's `night/<date>` branch and the rest of SCOPE.md's night-mode text, the shell's display branch (its own card), and creating rulesets or `develop` in other repos.

## Constraints

- No new dependencies.
- Prose only: no code, no test, no CI or ruleset change.
- Keep the CLAUDE section's heading, rule numbers and Commands line, so an installed copy can still be diffed against it.
- Plain, short sentences in the repo's existing voice; no new section in `SCOPE.md` beyond one short "Branches" part (a subsection or bullets under "More than one machine").

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `docs/native-writing` — the whole card is prose people read in the kit and the scope.

## Stop and ask

Besides the standing list in CLAUDE.md:

- If describing `develop` seems to need a change to `/setup` (creating the branch or a ruleset) or to `/done`, stop: those are out of scope here.

## Next step

Start with `SCOPE.md` "More than one machine": add the Branches part (A1), fix the default-branch lines (A2), then `kit/setup/templates/CLAUDE-section.md` rule 7 (A3), then the `/card` and `/handoff` templates (A4); run A5.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: decided for the owner: the kit's CLAUDE section and skills say "the integration branch (e.g. `develop`) when the repo has one, else the default branch", so repos without `develop` still work (alternative: name `develop` outright and require it) — the kit installs into other repos.
- 2026-11-25: decided for the owner: `/setup` (`kit/setup/SKILL.md`) is unchanged; it neither creates `develop` nor a ruleset (alternative: `/setup` offers to create both) — creating branches and rulesets is CI/repo config, and T-0027 holds that file.
- 2026-11-25: decided for the owner: `/done`'s template is left for after T-0027; rule 7 of the CLAUDE section already says draft PRs target the integration branch (alternative: edit `/done` here and overlap T-0027) — no two cards on one file.
- 2026-11-25: decided for the owner: `/park` is unchanged; "on the default branch, don't commit" still holds, and parking on `develop` is the foreman's job (alternative: add the integration branch to its rule) — keeps the card at four files.
- 2026-11-25: decided for the owner: `main`'s protection is described as it is now (PR and `ci` required, admins included; read with `gh api repos/arynbht/Rachetari/branches/main/protection`) (alternative: leave `main` out of SCOPE.md).

## Questions for me

One question per line, in this shape; options are separated by `;`.

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
