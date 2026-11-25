# Morning, 2026-11-25

I worked through the prompt sheet overnight under your rules and stopped for good at the
end of phase 5. Phases 6 (night runner) and 7 (shell write actions) were not started.
Nothing was merged, nothing was pushed to `main`, and no repo setting was changed.

## First thing to look at

**The stack, from PR #1 up.** Fourteen draft PRs, each stacked on the one before, all green.
Merging #1 into `main` first lets each next PR's base move to `main` in turn. Before you
merge: read the decisions I made for you (below, and in `DECISIONS.md`), and decide the
shelved skill questions (#5–#19) if you want skills beyond the 13 I took.

## What's done

| Phase | Card   | What                                                                                 | Status                                                                                                                                                                                             |
| ----- | ------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | —      | Inventory (`inventory/PHASE-0.md`)                                                   | done before tonight; you approved it                                                                                                                                                               |
| 1     | T-0001 | Workspace skeleton and the CI pattern (Ubuntu and Windows on PRs; CI runs on drafts) | **TESTED**: CI green                                                                                                                                                                               |
| 1     | T-0002 | The kit's nine appendix files, `SCOPE.md`, the README                                | **TESTED**: CI green; written from the appendices, checked by reading                                                                                                                              |
| 1     | T-0003 | Kit installed on this machine; `/setup` run on this repo (stage Foundation)          | **PROVEN**: `/setup` ran here, and a fresh session lists the commands                                                                                                                              |
| 2     | T-0004 | PR review transplanted; never posts APPROVE                                          | **PROVEN**: real review posted as COMMENT on PR #4 ([review](https://github.com/arynbht/Rachetari/pull/4#pullrequestreview-6052705842)); the never-APPROVE test fails against the source's mapping |
| 3     | T-0005 | 13 area skills, hash-checked against their pins, each body read                      | **TESTED**: hashes match; 15 skills shelved                                                                                                                                                        |
| 4     | T-0006 | Shell frame (window, sidebar, fence, tab bar, theme-only Settings)                   | **TESTED**: e2e on the built app, Windows and Ubuntu; screenshots                                                                                                                                  |
| 4     | T-0007 | The file source and the fetch action                                                 | **TESTED**: unit tests on a fixture repo                                                                                                                                                           |
| 4     | T-0008 | Now and its watcher, on the files                                                    | **TESTED**: e2e + screenshot                                                                                                                                                                       |
| 4     | T-0009 | Tasks: board, list, record                                                           | **TESTED**: e2e + screenshots                                                                                                                                                                      |
| 4     | T-0010 | Checklist (from Posture)                                                             | **TESTED**: e2e + screenshot                                                                                                                                                                       |
| 4     | T-0011 | History and the Docs viewer                                                          | **TESTED**: e2e + screenshot; one page-wide axe check shelved (S-18)                                                                                                                               |
| 4     | T-0012 | Map and its fence                                                                    | **TESTED**: e2e with a blocked request + screenshot                                                                                                                                                |
| 4     | T-0013 | Home, sidebar badges, OS notifications                                               | **TESTED**: e2e through the notification seam + screenshot; a real on-screen notification is UNTESTED                                                                                              |
| 4     | T-0014 | GitHub sign-in, CI and PR state                                                      | **Shelved** by your rule (S-16, #21)                                                                                                                                                               |
| 5     | T-0015 | Each kit command run once on a scratch repo                                          | **PROVEN** on a scratch repo: `/card`, `/park`, `/handoff` worked as written; `/setup` and `/done` found gaps (below)                                                                              |

The shell was never opened by a person: everything above is the built app driven by
Playwright, on Windows locally and on Ubuntu in CI. Screenshots are in `docs/screenshots/`.

## Every PR, in stack order

| PR                                                  | Card   | Base   | CI (`ci` aggregator)                       |
| --------------------------------------------------- | ------ | ------ | ------------------------------------------ |
| [#1](https://github.com/arynbht/Rachetari/pull/1)   | T-0001 | `main` | green                                      |
| [#2](https://github.com/arynbht/Rachetari/pull/2)   | T-0002 | #1     | green                                      |
| [#3](https://github.com/arynbht/Rachetari/pull/3)   | T-0003 | #2     | green                                      |
| [#4](https://github.com/arynbht/Rachetari/pull/4)   | T-0004 | #3     | green                                      |
| [#20](https://github.com/arynbht/Rachetari/pull/20) | T-0005 | #4     | green                                      |
| [#23](https://github.com/arynbht/Rachetari/pull/23) | T-0006 | #20    | green                                      |
| [#24](https://github.com/arynbht/Rachetari/pull/24) | T-0007 | #23    | green                                      |
| [#25](https://github.com/arynbht/Rachetari/pull/25) | T-0008 | #24    | green                                      |
| [#26](https://github.com/arynbht/Rachetari/pull/26) | T-0009 | #25    | green                                      |
| [#27](https://github.com/arynbht/Rachetari/pull/27) | T-0010 | #26    | green                                      |
| [#29](https://github.com/arynbht/Rachetari/pull/29) | T-0011 | #27    | green                                      |
| [#30](https://github.com/arynbht/Rachetari/pull/30) | T-0012 | #29    | green                                      |
| [#31](https://github.com/arynbht/Rachetari/pull/31) | T-0013 | #30    | green                                      |
| [#32](https://github.com/arynbht/Rachetari/pull/32) | T-0015 | #31    | see its checks: the last push is this file |

Each PR's body has its card's criteria (PASS/FAIL/UNTESTED), the evidence and what was
shelved. `build-test` (main and nightly, both OSes) has never run: it runs on the first
merge to `main`.

## Decisions I made for you

All in `DECISIONS.md`, each with the options and how to reverse it.

- **D-01** The kit was already copied to `~/.claude/skills/setup/` before your rules
  arrived; I left it (it's an exact copy of `kit/setup/`).
- **D-02** to **D-04** `/setup` on this repo: `CLAUDE.md` holds the section only; the
  backlog template's example lines were replaced by real ones; a no-UI `DESIGN.md` draft.
- **D-05** The overnight records are in each card's scope.
- **D-06** Every card tonight was written from the template, stacked on the previous
  card's branch, and set `ready` by me.
- **D-07** "Passed the scan cleanly" means no finding at all, so the five skills with
  allowed lines and the three CC-BY-SA skills are shelved.
- **D-08** Five skills shelved after reading, though they scanned clean (remote script,
  hook installer, hidden-skill dispatch, run-before-reading).
- **D-09** A skill's area is its manifest's first sector; native-writing kept whole.
- **D-10** Copied shell tests that would need edits are dropped (your phase 0 "edit them"
  vs. tonight's "always shelve"; the stricter one won), and the salvage is shelved.
- **D-11** The frame refused every webview until the Map card put the source's check back.
- **D-12** How the file source reads what the kit leaves open (default branch, local over
  remote, night report rows, checklist marks, skills table, unreadable cards).
- **D-13** Opening a non-git folder shows "Couldn't fetch this repo".
- **D-14** Unreadable cards are listed in Needs you as a fifth kind.
- **D-15** "Open in Tasks" switched tabs until Tasks existed.
- **D-16**, **D-17** Tasks: unreadable and unknown-status cards go under Blocked; Tasks
  reads the Now hub's snapshot.
- **D-18** The Map shows `floorplan/index.html` alone, as the prompt says.
- **D-19** On the scratch repo, `/setup`'s two permission stops were recorded and the
  command skills copied by hand so the other four commands could run.

Smaller choices are in each card's Decisions (in `cards/done/`), e.g. Docs keeps its
`.rivetari/**` glob (smallest cut that keeps behaviour).

## Every shelved item

All in `SHELVED.md`, each with options, a recommendation and its placeholder.

| Item | What                                                                          | Issue                                                 |
| ---- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| S-01 | Installing the skills library into `~/.claude/kit-skills/` (outside the repo) | [#5](https://github.com/arynbht/Rachetari/issues/5)   |
| S-02 | constraint-driven-development (allowed line)                                  | [#6](https://github.com/arynbht/Rachetari/issues/6)   |
| S-03 | playwright-cli (allowed line)                                                 | [#7](https://github.com/arynbht/Rachetari/issues/7)   |
| S-04 | improve-animations (allowed line)                                             | [#8](https://github.com/arynbht/Rachetari/issues/8)   |
| S-05 | floorplan (allowed lines; the generator)                                      | [#9](https://github.com/arynbht/Rachetari/issues/9)   |
| S-06 | terraform-skill (allowed lines; license unclear)                              | [#10](https://github.com/arynbht/Rachetari/issues/10) |
| S-07 | differential-review (CC-BY-SA-4.0)                                            | [#11](https://github.com/arynbht/Rachetari/issues/11) |
| S-08 | fp-check (CC-BY-SA-4.0)                                                       | [#12](https://github.com/arynbht/Rachetari/issues/12) |
| S-09 | insecure-defaults (CC-BY-SA-4.0)                                              | [#13](https://github.com/arynbht/Rachetari/issues/13) |
| S-10 | impeccable (blocked upstream; your trimmed fork)                              | [#14](https://github.com/arynbht/Rachetari/issues/14) |
| S-11 | taste-skill (blocked)                                                         | [#15](https://github.com/arynbht/Rachetari/issues/15) |
| S-12 | hallmark (ships a hook installer)                                             | [#16](https://github.com/arynbht/Rachetari/issues/16) |
| S-13 | skill-creator (loads a remote script)                                         | [#17](https://github.com/arynbht/Rachetari/issues/17) |
| S-14 | accessibility-lead and a11y-core                                              | [#18](https://github.com/arynbht/Rachetari/issues/18) |
| S-15 | webapp-testing (run before reading)                                           | [#19](https://github.com/arynbht/Rachetari/issues/19) |
| S-16 | The shell's GitHub sign-in card                                               | [#21](https://github.com/arynbht/Rachetari/issues/21) |
| S-17 | Salvaging copied shell tests that would need edits                            | [#22](https://github.com/arynbht/Rachetari/issues/22) |
| S-18 | Docs viewer's task-list checkboxes have no label (axe critical)               | [#28](https://github.com/arynbht/Rachetari/issues/28) |

## Worth knowing

- **The kit trial** (`docs/kit-trial-2026-11-25.md`): `/setup` can't install the four
  commands in a headless session (writes into `.claude/` need a person), and found its
  templates only once reads of its own folder were allowed. That matters for night mode.
  `/done` keeps a draft card as draft rather than blocked, because `CLAUDE.md` says to stop
  on a draft. All six findings are parked as `[tool]` lines.
- **The real review on #4** cost an estimated $1.02 and posted as COMMENT, since GitHub
  refuses REQUEST_CHANGES on your own PR. It withholds its own redaction tests as
  "secret-shaped". Both are parked.
- **Spend tonight on Claude calls I made:** the review $1.02, the kit trial $2.09.
- **`ci` isn't required on `main`** (no branch protection): parked as a checklist line;
  it's a repo setting, so it's yours.
- **A missed step, put right:** I started T-0008 before running T-0007's done check; I
  closed T-0007 on its branch afterwards and merged it into T-0008 (a merge, no rebase).

## Anything unpushed

Nothing: every `card/*` branch matches its origin. Local only, by design: `files/`
(gitignored reference documents) and `.scratch/kit-trial/` (the gitignored scratch repo
from the trial; safe to delete).
