# T-0029 · feat(kit): a checklist by section, drawn from the old catalog

Status: draft <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0029 · Held by: nobody
Created: 2026-11-25 · Source: `docs/queue-2026-11-25.md` §4g (part 1 of 2) · Gate: needs you

## Why

`/setup` builds the repo checklist from a short starter list, kept under "Repo checklist"
in `BACKLOG.md`. It has no sections, so a whole area (legal, observability, data) can be
missing without anyone deciding to leave it out. Rivetari's old catalog listed 111
controls in fifteen sections. This card brings that list over as data only (id, title,
section, phase, detector kind) and gives the checklist its own `CHECKLIST.md`, where all
fifteen sections are always present. `/setup` fills them, tags each line with a stage and
marks a section that doesn't apply as n/a, with its reason.

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: `kit/setup/templates/sections.md` lists all 111 controls in
      `packages/catalog/controls/` at Rivetari `32f4b88`, and nothing else from the YAML.
      They're grouped under `## <section> (<count>)` headings for the fifteen sections in
      the spec's order. Each row is ``| `<id>` | <title> | <phase> | <detect types> |``,
      where the title is verbatim and the types come only from `detect:` entries (not
      `fix:` or `evidence`), comma-separated, with an `any-of` written as
      `any-of(<nested types>)`. Above the lists is a table mapping the nine phases to the
      four stages, as the owner confirms it under "Questions for me". `EXTRACTED.md` gets
      a T-0029 section with one row (target `kit/setup/templates/sections.md`, source
      `packages/catalog/controls/**/*.yml`, 111 files). Its note says what was kept and
      what was left out: `applies`, severity, effort, evidence, fix, references,
      rationale, and every detector, gate, waiver and line of engine code.
      · check (local, reads Rivetari read-only): the script below prints `111`,
      `ids and sections match` and `rows checked`, with no "differs" line between them;
      `grep -nE '^## ' kit/setup/templates/sections.md` shows the fifteen counts from
      §4g's "Known" (accessibility 6 … ux 6); `git diff origin/develop -- EXTRACTED.md`.
      CI can't reach Rivetari (UNTESTED on CI)

  ```bash
  RIV=/c/Users/arynb/Documents/Projects/Rivetari; S=kit/setup/templates/sections.md
  grep -cE '^\| `[a-z0-9.-]+` \|' "$S"
  diff <(git -C $RIV ls-tree -r --name-only 32f4b88 packages/catalog/controls | awk -F/ '{sub(/\.yml$/,"",$NF); print $(NF-1), $NF}' | sort) <(awk '/^## /{lane=$2} /^\| `/{split($0,c,"`"); print lane, c[2]}' "$S" | sort) && echo "ids and sections match"
  for f in $(git -C $RIV ls-tree -r --name-only 32f4b88 packages/catalog/controls); do y=$(git -C $RIV show 32f4b88:$f); id=$(sed -n 's/^id: //p' <<<"$y"); t=$(sed -n 's/^title: //p' <<<"$y"); p=$(sed -n 's/^phase: //p' <<<"$y"); d=$(sed -n '/^detect:/,/^[a-z]/p' <<<"$y" | grep -oE 'type: [a-z-]+' | cut -d' ' -f2 | sort -u | xargs); r=$(grep -F "| \`$id\` |" "$S"); grep -qF "| \`$id\` | $t | $p |" <<<"$r" || echo "title or phase differs: $id"; [ "$(awk -F'|' '{print $5}' <<<"$r" | grep -oE '[a-z-]+' | sort -u | xargs)" = "$d" ] || echo "detect differs: $id"; done; echo "rows checked"
  ```

- [ ] A2: `kit/setup/templates/CHECKLIST.md` is new: the `Stage:` and `Last /setup:`
      lines at the top, then one `## <section>` heading for each of the fifteen sections
      in the spec's order (accessibility, cicd, cloud, data, development, documentation,
      hygiene, legal, observability, performance, product, quality, security, testing,
      ux), and a short block showing the line format. Today's markers are kept (pass
      `[x]`, fail `[ ]`, `[ ] unchecked:` with what a person should look at, `n/a:` with
      the reason); each line adds `· stage: <foundation|building|hardening|live>` and
      `· check: <what was run>`, and a catalog line leads with its id in backticks.
      `kit/setup/SKILL.md` steps 4 to 6 are rewritten. Step 4 writes `CHECKLIST.md` from
      the template if it's missing; fills each section from `sections.md`, keeping only
      the controls that apply to this repo's stack and type, plus today's starter lines
      filed under their sections; tags each line's stage from the mapping table; runs
      each check; marks a line it can't check by command `unchecked`, never passed; keeps
      a section with nothing that applies as `n/a:` with one line saying why; on a
      re-run keeps the owner's lines and edits, adds new lines at the bottom of their
      section marked `new`, and never adds a catalog id twice; moves the lines of an old
      "Repo checklist" in `BACKLOG.md` into `CHECKLIST.md` as they are and leaves one
      line there pointing to `CHECKLIST.md`; and ends by printing pass, fail, unchecked
      and n/a counts per section. Step 5's rule is unchanged (the lowest stage with a
      failing line), written in `CHECKLIST.md`; step 6 reads failing lines from there.
      Parked `[checklist]` lines stay proposals in `BACKLOG.md`. Steps 1, 2, 3 and 7 are
      not edited · check (reading, local): `grep -nE '^## ' kit/setup/templates/CHECKLIST.md`
      prints the fifteen in that order; `git diff origin/develop -- kit/setup/SKILL.md`
      touches only steps 4 to 6; read the rewritten steps against this list
- [ ] A3: A live trial of the rewritten `/setup` runs twice on the kit-trial scratch repo,
      seeded first with an old-style `BACKLOG.md` whose "Repo checklist" holds one owner
      line. After the first run, `CHECKLIST.md` has all fifteen sections, each with lines
      or an `n/a:` reason; every line has a status, a stage tag and a check; no
      `unchecked` line is `[x]`; the owner line is there; `BACKLOG.md` has no "Repo
      checklist"; the per-section counts are printed. One line is then edited by hand and
      `/setup` runs again: the edit survives and no catalog id appears twice · check
      (local): `node scripts/kit-trial.mjs`, copy `kit/setup/` to the scratch repo's
      `.claude/skills/setup/`, seed `BACKLOG.md`, run `/setup` headless; paste
      `grep -nE '^## |^n/a:' CHECKLIST.md`, the counts, `grep -n 'Repo checklist' BACKLOG.md`
      (nothing), ``grep -oE '^- \[.\] `[a-z0-9.-]+`' CHECKLIST.md | sort | uniq -d``
      (nothing) after the second run, and the edited line before and after. Each run's
      cost goes under Evidence. CI can't run this (UNTESTED on CI)
- [ ] A4: `kit/setup/templates/BACKLOG.md` loses its "Repo checklist" section, and its
      Parked format line says a `[checklist]` line proposes a line for `CHECKLIST.md`.
      `SCOPE.md`: the pieces table's "Checklist and stage" row names `CHECKLIST.md`; setup
      step 4 says the checklist is sectioned and drawn from the old catalog's titles,
      with n/a sections kept; the non-goal line says the catalog's engine (detectors,
      gates, waivers, evidence) and the nine gates remain a non-goal, while its titles
      feed the checklist · check (reading, local):
      `grep -n 'Repo checklist' kit/setup/templates/BACKLOG.md` prints nothing;
      `git diff origin/develop -- SCOPE.md kit/setup/templates/BACKLOG.md`
- [ ] A5: Nothing outside "Files in scope" changes, and `ci` is green on the PR.
      · check: `git diff --stat origin/develop...HEAD`; `node scripts/ci-scope.mjs origin/develop`
      prints `all=true` (`kit/...` is outside every workspace package), so lint, format
      check, boundaries, typecheck and `vitest run` run on Ubuntu and Windows; `gh pr checks`.
      Local before pushing: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `kit/setup/templates/sections.md` (new)
- `kit/setup/templates/CHECKLIST.md` (new)
- `kit/setup/SKILL.md` (steps 4, 5 and 6 only)
- `kit/setup/templates/BACKLOG.md`
- `SCOPE.md` (the pieces table, setup step 4, the catalog non-goal)
- `EXTRACTED.md` (a new T-0029 section only)
- `CARD.md`, `cards/done/T-0029.md`, `DECISIONS.md`, `BACKLOG.md` (Parked lines only: on the line, cards never edit Next up)

## Out of scope

Named on purpose, so the session doesn't drift into them.

- The shell: `apps/desktop/src/main/kit/parse.ts`, `engine/checklist.ts`, `Checklist.tsx`, `test/kit-fixture.ts` and their tests. That's §4h, which follows this card
- Running `/setup` on this repo, moving this repo's "Repo checklist" into `CHECKLIST.md`, and reinstalling the kit into `~/.claude/skills/setup` (part 2, and the owner's step)
- The five starter checklist lines (§4e-3), and any detector, gate, waiver, evidence or engine code from the catalog, or its `applies`, severity, effort, references and rationale fields

## Constraints

- No new dependencies. No product code.
- Rivetari is read only, through `git -C <Rivetari> show 32f4b88:<path>` and `ls-tree`.
- `kit/**` and `SCOPE.md` are prettier-ignored and kept as written: no reformatting of untouched lines.
- `kit/setup/SKILL.md` steps 1, 2, 3 and 7 stay as they are (T-0023 and T-0027 edit them).
- Line markers stay as today's (`[x]`, `[ ]`, `[ ] unchecked:`, `n/a:`), so §4h's parser can reuse `checklistLine`.
- The live trial writes only inside the gitignored `.scratch/kit-trial/`, and pushes nowhere but its own origin.

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `docs/native-writing`: the deliverables are prose instructions and a template that a session reads and acts on

## Stop and ask

Besides the standing list in CLAUDE.md:

- Depends on: T-0023 (`kit/setup/SKILL.md`, `EXTRACTED.md`)
- Depends on: T-0025 (`EXTRACTED.md`)
- Depends on: T-0027 (`kit/setup/SKILL.md`)
- After each of those merges, merge `origin/develop` into this branch (no rebase) before editing the shared file
- If the owner hasn't confirmed the phase mapping, don't write the mapping table
- If step 4 can't be written without changing steps 1, 2, 3 or 7 (for example, if step 2's Files list has to name `CHECKLIST.md`)
- If a control at `32f4b88` has no `phase`, or a detect type outside the twelve named in §4g

## Next step

Draft, waiting on the owner (needs you: it changes what `/setup` writes in every repo). First confirm the phase mapping and approve. Once it's ready, wait for T-0023, T-0025 and T-0027 to merge, merge `origin/develop` in, then start with A1.

## Decisions

Appended by the session, one line each, newest last.

- 2026-11-25: Gate `needs you`: it changes what `/setup` writes in every repo, and §4g is six working files, so it's split. This card is part 1: six files, five criteria.
- 2026-11-25: The split, decided for the owner. Part 2 runs `/setup` on this repo with the new kit, moves its "Repo checklist" into `CHECKLIST.md` and shows the owner the per-section counts, after §4h merges and the kit is reinstalled on this machine. Proposed Next up line for the foreman: "Checklist by section, the kit, part 2: run `/setup` on this repo, move its checklist to `CHECKLIST.md`, show per-section counts (after T-0029 and §4h)". Alternative: one card for all of §4g.
- 2026-11-25: The shell, decided for the owner: this card leaves the shell alone. No repo's checklist moves until `/setup` runs there again, so the Checklist tab keeps working. §4h starts when this card merges, and part 2 waits for §4h, so this repo's tab is never empty. Alternative: this card also makes the shell read both files, which adds shell files and repeats §4h.
- 2026-11-25: The old checklist on a re-run, decided for the owner: its lines move into `CHECKLIST.md` as they are, each under the closest section, and the old section becomes one line pointing there. Alternative: leave the old section for the owner to delete, which leaves two checklists that drift apart.
- 2026-11-25: Starter lines, decided for the owner: today's starter list (builds, tests, lint, typecheck, CI, secrets, lockfile, README) stays, each line under its section beside the catalog lines. Alternative: catalog lines only. §4e-3 adds five more starter lines, so the list stays.
- 2026-11-25: `sections.md` columns, decided for the owner: id, title, phase and detect types, with the phase-to-stage table written once at the top. Alternative: a stage column on every row, which repeats the mapping 111 times.
- 2026-11-25: Fields left out, decided for the owner: `applies` and the rest stay behind, as §4g says "copy only that list", and `/setup` judges whether a line applies from its title and the repo. Alternative: an `applies` column, so the filter is the catalog's own.
- 2026-11-25: Line format, decided for the owner: today's markers, plus `· stage:` and `· check:`. A catalog line leads with its id in backticks, so a re-run matches it rather than adding it twice. Starter and owner lines have no id. Alternative: no ids, and matching by title.
- 2026-11-25: Per-section counts, decided for the owner: step 4 prints them, and step 7's report (T-0027's) isn't touched. Alternative: add them to step 7 after T-0027 merges.
- 2026-11-25: Checks, decided for the owner: one local headless `/setup` trial on the kit-trial scratch repo, run twice (about $0.50 a run, going by the kit trial). The deliverable is prose, so only a run shows it works. Alternative: reading checks only.
- 2026-11-25: Base, on the foreman's word: `develop` replaces `day/2026-11-25`. The card merges `origin/develop`, and its PR targets `develop`.

## Questions for me

- [ ] Map the nine old phases onto the four stages as follows? scaffold → foundation (CI, lint, lockfile and README are what Foundation means). discovery → building (brief, risk register and build-vs-buy are the spec that Building works through; a sound repo shouldn't stay at Foundation over a document). requirements → building (stories, NFRs and out-of-scope are the spec and backlog). design → building (tokens, breakpoints and states are set while features are built). architecture → building (ADRs, diagrams and IaC are decided while features are built). build → building (same stage). harden → hardening (same stage). launch → hardening (privacy policy, terms, load test and go/no-go must pass before going live, so they close in Hardening). operate → live (on-call, dashboards, runbooks and restore drills only mean something once deployed). That gives 22 foundation, 51 building, 31 hardening and 7 live — Recommended: yes, as listed. Options: launch → live; discovery → foundation; per-control overrides as a stage column in `sections.md`.
- [ ] Approve the card as drafted (part 1 of 2, part 2 after §4h)? — Recommended: yes. Options: one card for all of §4g; hold.

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
Waiting on the owner (wall clock, UTC):
  draft 19:36:10 →

Drafting: A1's check script was tried on a scratch sections.md generated from
32f4b88 (not the deliverable): 111 / ids and sections match / rows checked, no
"differs" lines. Rivetari 32f4b88 phases: scaffold 22, build 30, harden 25,
requirements 6, design 7, architecture 5, discovery 3, launch 6, operate 7.
```
