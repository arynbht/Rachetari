# T-0023 · feat(skills): take code-simplification, add a deslop skill and the Slop defaults /setup drafts

Status: draft <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0023 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §4e · Gate: needs you

## Why

Sessions leave slop in their diffs (narrating comments, one-use helpers, casts, unasked
fallbacks), and nothing in the kit names it or removes it. This card is the first of three
from §4e: it brings in the guidance only, so a later card can make `/done` apply it. It
takes `code-simplification` at the addyosmani pin, writes our own short `deslop` skill
around §4e's slop list, and makes `/setup` put that list in each repo's `CONSTRAINTS.md`
as defaults the owner edits.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `code-simplification` is at `skills/quality/code-simplification/`, one file, byte-identical to `addyosmani/agent-skills` `skills/code-simplification` at `301b02b12bff98e4688e6984af6556802322bbde`, and its body was read and scanned before copying (no hooks, remote fetch, disabled checks or ignore-instructions) · check (local): `git ls-tree -r --name-only HEAD skills/quality/code-simplification/` lists only `SKILL.md`; `git rev-parse HEAD:skills/quality/code-simplification/SKILL.md` prints the upstream blob `c4f794aa3fc63ea041989b30be7a3887c79c53ed`; Rivetari's `hashSkillDir` (`packages/registry/src/hash.ts` at `32f4b88`, read-only) over a `git archive HEAD` copy of the folder prints `sha256:f4104cecf31ebce5d879adda3b6ae7a3afaa8f687824863c165dcc972c042030` (computed by the drafter from the pin; there is no manifest hash); T-0005's pattern scan (`grep -nEi 'hook|settings\.json|--no-verify|curl|wget|npx|pip install|ignore (all|previous)'`) with each hit explained in Evidence
- [ ] A2: `skills/quality/deslop/SKILL.md` (ours, about 30 lines, at most 40) has `name` and `description` frontmatter and says: it reviews only the current card's diff against the branch's base; it removes slop without changing behaviour, and leaves and reports anything it isn't sure of; it edits only the card's "Files in scope"; it reports each removal in one line; its list is the `## Slop` section of the repo's `CONSTRAINTS.md` when there is one, else its own defaults · check (local): `wc -l` ≤ 40; read the file for the five rules; the slop-list `diff` in A3
- [ ] A3: `/setup` puts a `## Slop` section, marked as defaults for the owner to edit per repo, into the `CONSTRAINTS.md` it drafts, from a new template `kit/setup/templates/CONSTRAINTS-slop.md`; when `CONSTRAINTS.md` exists without a `## Slop` heading it appends the section, and it never touches an existing one · check (local): `grep -n 'CONSTRAINTS-slop\|Slop' kit/setup/SKILL.md` shows step 3 using the template and the append rule; `diff <(sed -n '/^The slop list:/,/^Known/p' docs/queue-2026-11-25.md | grep '^- ') <(grep '^- ' kit/setup/templates/CONSTRAINTS-slop.md)` and the same against `sed -n '/^## Slop/,$p' skills/quality/deslop/SKILL.md | grep '^- '` print nothing, and each list has 12 lines
- [ ] A4: `skills/INDEX.md` has a "Taken" row for `quality/code-simplification` (upstream, `301b02b1`, MIT) and a row for `quality/deslop` marked as written here, not taken; the intro no longer claims every folder matches a manifest hash; `EXTRACTED.md` logs the take with the computed hash · check (local): `grep -n 'code-simplification\|deslop\|manifest' skills/INDEX.md EXTRACTED.md`; `pnpm exec prettier --check skills/INDEX.md EXTRACTED.md`
- [ ] A5: Nothing outside "Files in scope" changes, and `ci` is green on the PR · check: `git diff --stat origin/day/2026-11-25...HEAD`; `gh pr checks` (`skills/**` and `kit/**` Markdown isn't docs to CI's `code` filter, and `scripts/ci-scope.mjs` finds them outside every workspace package, so lint, format check, boundaries, typecheck and tests run in full on both OSes; desktop-e2e is skipped and `ci` doesn't need it). Local before pushing: `pnpm test`, `pnpm lint`, `pnpm typecheck`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `skills/quality/code-simplification/SKILL.md` (new, copied unchanged)
- `skills/quality/deslop/SKILL.md` (new)
- `kit/setup/templates/CONSTRAINTS-slop.md` (new)
- `kit/setup/SKILL.md` (step 3 only)
- `skills/INDEX.md`
- `EXTRACTED.md`, `DECISIONS.md`, `CARD.md`, `cards/done/T-0023.md`, `BACKLOG.md` (parked lines; this card's Next up line)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- `/done` applying the deslop skill to the card's diff and committing the result on its own, and listing the comments the diff adds (§4f's report): the split's card 2
- The five starter checklist lines in `/setup` and re-running `/setup` on this repo (which is what adds `## Slop` to this repo's `CONSTRAINTS.md`): the split's card 3
- Running deslop or `code-simplification` on any existing code, editing `code-simplification`'s body, or re-installing the kit into `.claude/skills/`

## Constraints

- No new dependencies. No product code.
- `code-simplification` stays byte-identical to the pin; its dead links to sibling skills stay as they are.
- `kit/**` and `skills/**` (except `skills/INDEX.md`) are prettier-ignored and kept as written: no reformatting of untouched lines.
- The slop list is §4e's twelve lines, word for word, in both the template and the deslop skill.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `docs/native-writing` — the deliverables are prose instructions a session reads and acts on

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0017 (kit/setup/SKILL.md)
- Depends on: T-0022 (skills/INDEX.md)
- Merge the day branch into this card branch (no rebase) after each of those merges, before editing the shared file
- The upstream file at the pin isn't blob `c4f794aa…` / 13,719 bytes, or its body installs hooks, fetches remote code, disables checks or says to ignore instructions
- The deslop skill can't say its five rules and the list in 40 lines

## Next step

Waiting on the owner: answer "Questions for me" and mark ready. The builder then starts after T-0017 and T-0022 merge, merges the day branch in, and starts with A1.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `needs you` by the owner's ruling on §4e (it changes what `/done` does on every card)
- 2026-11-25: §4e split in three; this card is part 1 (guidance only), so it doesn't touch `/done` and depends on T-0017 for `kit/setup/SKILL.md` only
- 2026-11-25: Hash computed by the drafter from the pin with Rivetari's `hashSkillDir`: `sha256:f4104cec…2030`, one file, blob `c4f794aa…`, 13,719 bytes, no CR bytes

## Questions for me

- [ ] Split §4e in three? (1) this card; (2) `/done` deslops the card's diff first and commits that on its own, with §4f's comment report; (3) the five checklist lines and the `/setup` re-run on this repo. Recommended: yes.
- [ ] Which area holds `code-simplification`? Recommended: `quality`, beside `deslop`, so a card wanting clean-code guidance finds both in one place (the other addyosmani skills are in `workflow`).
- [ ] Where does the slop list live? Recommended: one template, `kit/setup/templates/CONSTRAINTS-slop.md`, that `/setup` puts in `CONSTRAINTS.md`; the deslop skill carries the same twelve lines as defaults and uses the repo's `## Slop` section when there is one.
- [ ] `/setup` only drafts `CONSTRAINTS.md` when it's missing, so this repo's would never get the section. Recommended: `/setup` appends `## Slop` to an existing `CONSTRAINTS.md` that has none, and never changes one that has it.
- [ ] For card 2: `/done` in another repo can only apply deslop if that repo has it, but area skills are copied only for the areas the owner picks. Recommended: card 2 has `/setup` always copy `quality/deslop`.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

Waiting on the owner (wall clock, UTC):
