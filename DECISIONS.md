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
