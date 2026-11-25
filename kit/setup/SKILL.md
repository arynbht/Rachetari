---
name: setup
description: Install the direction kit into this repo, audit the repo into a checklist, state its stage and seed the backlog. Use when the user types /setup, in a new or existing repo. Safe to re-run.
---

Set this repo up, or refresh it. You never edit product code in this step.

Notes from me: $ARGUMENTS

## 1. Look before writing

- Find the stack from manifests and lockfiles. Find the commands for test, lint, typecheck
  and build from the repo's own scripts and CI. Run each one and record the result. A
  command that doesn't exist is recorded as missing, not guessed.
- Note what already exists: `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`, `CONSTRAINTS.md`,
  `BACKLOG.md`, `CARD.md`, `.claude/`, CI workflows, a spec or roadmap document.

## 2. Write the kit, overwriting nothing

- Branch first. Work on the current branch, unless it's the default branch: then create
  `chore/kit-setup` from it and work there. Everything this skill writes goes on that
  branch, and step 7 commits it.
- Missing file: write it. Identical file: leave it.
- Different file: keep theirs and write the kit's version beside it as `name.kit.md`.
  For `CLAUDE.md`, propose the section as a diff and wait for my yes.
- Add the line `BACKLOG.md merge=union` to `.gitattributes`, so lines parked on two
  machines merge without conflict.
- Sources: everything comes from this skill's own templates folder,
  `${CLAUDE_SKILL_DIR}/templates/`. The `templates/...` paths below are inside it. Do not
  write the kit files from memory.
- Files: `BACKLOG.md`, `cards/TEMPLATE.md` (from `templates/CARD.md`), `cards/done/`,
  `nights/`, the "How work is done here" section for `CLAUDE.md` (from
  `templates/CLAUDE-section.md`), and the commands `card`, `park`, `done` and `handoff`
  into `.claude/skills/` (from `templates/skills/`).
- Area skills: show me `~/.claude/kit-skills/INDEX.md` and ask which areas this repo
  needs. Copy only those into the repo's `skills/`, with an `INDEX.md` listing what was
  copied. If the library isn't installed on this machine, say so and carry on without it.

## 3. Draft the fit files

Only if they're missing, with one exception: the `## Slop` section below. Read the code
and write down what it already does, not what it should do: `DESIGN.md` (tokens,
components, layout and naming patterns) and `CONSTRAINTS.md` (dependencies policy, error
handling, test style, what must not change). Mark each one you write `Status: draft,
written by /setup` at the top.

Write `DESIGN.md` only when the repo has UI. Without UI, skip it: don't write a
placeholder or a "no UI" version, and say in your report that you skipped it and why.

End every `CONSTRAINTS.md` you write with the `## Slop` section from
`templates/CONSTRAINTS-slop.md`, copied as it is: its lines are defaults for me to edit
for this repo. When `CONSTRAINTS.md` already exists without a `## Slop` heading, show me
the section appended to it as a diff and wait for my yes, as for `CLAUDE.md`. If nobody
is there to answer, write the section alone to `CONSTRAINTS.kit.md` beside it and say
so. Never change a `CONSTRAINTS.md` that already has a `## Slop` heading.

## 4. Build the checklist

Under "Repo checklist" in `BACKLOG.md`, one line per thing that must stay true, grouped
by stage (Foundation, Building, Hardening, Live). Start from what applies to this stack:
builds; tests exist and pass; lint and typecheck clean; CI runs them on PRs; no secrets
in the repo; dependencies locked; README says how to run it; plus accessibility for UI,
migrations reversible for a database, and so on.

- Every line names a check that can be run. Run it. Mark pass `[x]`, fail `[ ]`, or
  `n/a` with the reason. A line you can't check is marked `unchecked`, never passed.
- On a re-run, keep my lines and my edits. Only update results and add new lines at the
  bottom of each group, marked `new`.

## 5. State the stage

The stage is the lowest group with a failing line. Write it at the top of the checklist
as `Stage: <name>` with the lines that decide it.

## 6. Seed the backlog

Add failing checklist lines and any unbuilt items from a spec you found to "Next up", in
the order you'd do them, each one line. Do not draft cards.

## 7. Commit, report and stop

Commit everything this run wrote as one commit on the branch from step 2, with the
message `chore(kit): set up the direction kit`. Never push.

Tell me: the branch and the commit, the stack and commands found, files written and files
placed beside existing ones, whether `DESIGN.md` was written or skipped, the stage and
why, the count of passing, failing and unchecked lines, and the first three items in
"Next up". Then stop. I decide what becomes a card.
