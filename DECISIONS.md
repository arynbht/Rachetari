# Decisions made for the owner

Made overnight (from 2026-11-25, card T-0003 on), under the owner's rule: where I would
have asked, I pick the option I'd have recommended and log it here. Decisions the owner
made themselves are in the cards and in `inventory/PHASE-0.md` §8, not here.

Each entry: the question, the options, what I chose and why, and how to reverse it.

## D-01 · T-0003 · The kit was installed outside the repo before the overnight rules

- **Question:** The overnight rules say to shelve anything that writes outside this repo.
  `kit/setup/` had already been copied to `~/.claude/skills/setup/` (build prompt phase 1
  step 4) a few minutes before the rules arrived. Undo it?
- **Options:** (a) leave it installed; (b) delete it and shelve T-0003's install and `/setup`.
- **Chose:** (a). It was done under the build prompt before the rule existed, it's an
  exact copy of `kit/setup/` (`diff -r` is empty), and `/setup` has already run from it.
  Nothing else will be written outside the repo tonight; the `~/.claude/kit-skills/`
  install in phase 3 is shelved instead.
- **Reverse:** `rm -r ~/.claude/skills/setup`.

## D-02 · T-0003 · What `/setup` writes into `CLAUDE.md` when there is none

- **Question:** The template `CLAUDE-section.md` starts with an HTML comment telling a person
  to paste the section into `CLAUDE.md`. With no `CLAUDE.md` at all, what goes in it?
- **Options:** (a) the section from "## How work is done here" to the end; (b) the whole
  template, comment included; (c) a title line plus the section.
- **Chose:** (a). The comment is an instruction for a person pasting, not part of the
  section, and the skill says to add "the 'How work is done here' section".
- **Reverse:** edit `CLAUDE.md`.

## D-03 · T-0003 · The template's example lines in a real `BACKLOG.md`

- **Question:** `templates/BACKLOG.md` holds a "Next up" placeholder, two "Example:" lines
  under Parked and two `<repo-specific…>` checklist placeholders. Keep them?
- **Options:** (a) drop them and write real lines; (b) keep them as written.
- **Chose:** (a). The shell will read "Next up" and "Parked" as real items, so examples
  would show up as work. The headings, intro lines and format line are kept as written.
  Parked as a `[tool]` line: the template has no rule for this.
- **Reverse:** copy the example lines back from `kit/setup/templates/BACKLOG.md`.

## D-04 · T-0003 · `DESIGN.md` when the repo has no UI

- **Question:** `/setup` drafts `DESIGN.md` "if there is UI". There is none yet.
- **Options:** (a) skip `DESIGN.md`; (b) write a short draft saying there is no UI yet and
  when to redraft.
- **Chose:** (b). It records what the code does today (no UI), and the shell's Docs view
  and the next `/setup` both find it.
- **Reverse:** delete `DESIGN.md`.

## D-05 · T-0003 · Records added to a card's scope

- **Question:** The overnight rules ask for `DECISIONS.md`, `SHELVED.md` and `MORNING.md`,
  kept in the same PR as the work. Cards written before the rules don't list them.
- **Options:** (a) add them to each card's "Files in scope" from T-0003 on; (b) keep them
  out of the cards and commit them separately.
- **Chose:** (a), recorded in each card's Decisions.
- **Reverse:** n/a (records only).

## D-06 · T-0004 on · How cards start tonight

- **Question:** The kit's `/card` branches from the default branch and leaves the card as
  `draft` for the owner to mark `ready`; CLAUDE.md rule 1 stops on a draft card. Tonight
  the owner isn't here to mark anything ready, and asked for each card's branch to be cut
  from the previous card's branch.
- **Options:** (a) write each card from `cards/TEMPLATE.md` on a branch cut from the
  previous card's, set it `ready` myself, then `in progress`; (b) leave cards as drafts
  and stop.
- **Chose:** (a), for every card tonight. Each card says which branch it's stacked on,
  and its criteria come from the build prompt and `inventory/PHASE-0.md`, not new scope.
- **Reverse:** set any card back to `draft` and re-plan it.

## D-07 · T-0005 · Which skills count as "passed the scan cleanly"

- **Question:** The owner's rule takes only skills that passed the scan cleanly with a
  permissive license. Five skills passed only because the owner had allowed a flagged
  line; three are CC-BY-SA-4.0.
- **Options:** (a) clean means no finding at all, allowed or not; (b) clean includes
  allowed lines.
- **Chose:** (a). An allowed line is a finding the owner accepted for Rivetari; tonight
  the owner isn't here to accept it again. Those five and the three CC-BY-SA skills are
  shelved with issues (S-02 to S-09), each with a recommendation.
- **Reverse:** take any of them from its issue; the skill folder copies in unchanged.

## D-08 · T-0005 · Skills shelved after reading, though they scanned clean

- **Question:** Reading the bodies found things the scan rules don't catch:
  `skill-creator` loads a remote script in `eval-viewer/viewer.html`; `accessibility-lead`
  pre-justifies running hidden skill files to subagents and needs ~35 absent siblings
  (its contract `a11y-core` is useless alone); `webapp-testing` tells the agent to run
  its scripts before reading them; `hallmark` ships a hook installer.
- **Options:** (a) shelve them; (b) take them with notes.
- **Chose:** (a) for all five (S-12 to S-15). Remote code and hook installers are on the
  owner's stop list; the other two can't be judged safe without the owner.
- **Reverse:** take any of them from its issue.

## D-09 · T-0005 · A skill with several areas, and native-writing's extra files

- **Question:** A manifest can list several sectors (`code-review-and-quality`:
  workflow, security, perf, api), and `native-writing` is its upstream repo root, so it
  brings `.github/`, `evals/` and a README with an `npx skills add` line for people.
- **Options:** for the area, (a) the manifest's first sector, (b) a sector chosen by
  judgement. For native-writing, (a) copy the folder unchanged, (b) copy only
  `SKILL.md` and `references/`.
- **Chose:** the first sector, and native-writing unchanged. "Unchanged" is the rule, the
  hash check depends on it, and a nested `.github/` has no effect on this repo.
- **Reverse:** move a folder to another area and update `skills/INDEX.md`; or delete
  native-writing's extra files (its hash would no longer match).

## D-10 · T-0006 · Copied shell tests that would need edits

- **Question:** In phase 0 the owner chose to edit salvageable shell tests and list the
  edits (S1). Tonight's rules say always shelve a copied test that would need changing.
- **Options:** (a) follow tonight's rule: drop and list them, write new tests for the
  kept views, shelve the salvage; (b) follow S1 and edit them.
- **Chose:** (a). Tonight's rule is the newer and stricter one, and the new tests don't
  touch copied code. Shelved as S-17 with a recommendation to salvage two of them.
- **Reverse:** follow S-17's issue.

## D-11 · T-0006 · What the frame does about the map's webview before the Map exists

- **Question:** The frame keeps `webviewTag: true` (the Map tab needs it), but the
  map's attach check (`attachMapWebview`) comes with the Map card.
- **Options:** (a) refuse every webview attach until the Map card; (b) bring `map.ts`
  into the frame early; (c) turn the webview tag off and back on later.
- **Chose:** (a). It is stricter than the source and changes nothing a person can see:
  no view attaches a webview yet. T-0012 puts the source's check back.
- **Reverse:** n/a; T-0012 replaces it.

## D-12 · T-0007 · How the file source reads formats the kit leaves open

- **Question:** §6.1 says what to read but not how to settle a few details the kit's
  files don't pin down.
- **Options and choices:**
  - _Default branch:_ origin's `HEAD`, else `main`, else `master`, else the current
    branch. (Alternative: always `main`.)
  - _A card on both a local branch and its remote-tracking copy:_ the local one is
    shown, since that's what this machine would work on. (Alternative: the newer one.)
  - _Night reports:_ the format isn't fixed until the night runner exists, so a table
    row counts as merged, held or blocked by a cell that starts with that word.
  - _Checklist lines:_ `[x]` is pass, `[ ]` is fail, `[ ] unchecked:` is unchecked,
    `- n/a:` is n/a, and a trailing `new` marks a line `/setup` added — as `/setup`
    writes them.
  - _Skills:_ only the first table in `skills/INDEX.md` (the skills taken), not the
    shelved table.
  - _A card that doesn't parse:_ it needs a `# T-NNNN · title` line and a `Status:`
    line; anything else is shown as unreadable with its branch.
- **Why:** each is the simplest reading of the kit's own templates, and each is one
  function in `apps/desktop/src/main/kit/parse.ts` or `source.ts`.
- **Reverse:** change that function and its test.

## D-13 · T-0007 · What opening a non-git folder does

- **Question:** "Add" accepts any folder. Opening a repo now fetches it; a folder that
  isn't a git repo (or a fetch with no network) fails.
- **Options:** (a) show "Couldn't fetch this repo: …" in the repo's error box and carry
  on; (b) say nothing.
- **Chose:** (a). The source showed every repo error in that box; staying quiet would
  hide why the other machine's cards are missing.
- **Reverse:** drop the `.catch` message in `App.tsx`'s `handleSelect`.

## D-14 · T-0008 · Unreadable cards in Needs you

- **Question:** §6.2 lists four needs-you kinds; §6.1 says a card that doesn't parse is
  shown as unreadable, never skipped. Where does Now show one?
- **Options:** (a) a fifth kind, "Card can't be read", that says to fix CARD.md on its
  branch; (b) only in Tasks (T-0009).
- **Chose:** (a), and Tasks lists it too. A broken card does need the owner, and Now is
  where they look first.
- **Reverse:** drop the `unreadable` branch in `needsYouItems` (`engine/now.ts`).

## D-15 · T-0008 · What happens to "Open in Tasks" before Tasks is built

- **Question:** Now's items and recent events open a card in Tasks, which arrives with
  T-0009.
- **Options:** (a) the button switches to the Tasks tab (still the "not built yet"
  placeholder until T-0009); (b) hide the buttons until then.
- **Chose:** (a): it keeps the source's behaviour, and T-0009 makes it open the card.
- **Reverse:** n/a; T-0009 completes it.
