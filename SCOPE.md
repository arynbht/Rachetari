# Scope: the direction layer

2026-11-24, revised. If something isn't in this file, it isn't being built.

## Who it's for

One person: me, on my own repos, across more than one machine. Not a team, not clients,
not a product.

## Goal

A plain Claude Code session that works one card at a time and stays on it, in any repo,
with the repo holding what's planned, done, left and not yet accounted for. By day I
start a card with one command. By night I leave it a list and review the result in the
morning.

## The goals kept from Rivetari

| # | Goal | How it's met here | How I'll know |
| --- | --- | --- | --- |
| 4 | Drop into any repo, new or existing | `/setup` (below) | Setup on a repo takes under 15 minutes and overwrites nothing |
| 9 | One place to see it all | The shell: Home, Now, Tasks, Checklist, History, Map, reading the files | I open the shell instead of the files |
| 5 | Right expertise per task | `skills/<area>/<name>/`; a card names at most three | Cards with a skill need fewer review fixes than cards without |
| 7 | Cheaper and faster than a plain session | It is a plain session plus a few files | Same card with and without the kit: tokens, minutes, my minutes |
| 3 | No holes | The repo checklist, every line with a check that runs | Everything I later wish had been caught becomes a line |
| 6 | Code that fits the repo | `DESIGN.md` and `CONSTRAINTS.md` read from the repo's own code, card scope, PR review as advice | Review comments about style and fit trend down |
| 1 | Autonomy | Night mode (below) | Cards merged per night, and how many I had to undo |

Not kept: an AI "passed" that can be merged unread, and anything for teams or clients.

## The pieces

| Piece | File | Job |
| --- | --- | --- |
| Card | `CARD.md` on its own `card/<id>` branch | What one session does, how it's checked, what's out of scope |
| Parking lot | `BACKLOG.md` | Where every off-card idea, bug and discovery goes |
| Checklist and stage | `CHECKLIST.md` | What must stay true, in fifteen sections; which stage the repo is at |
| Fit | `DESIGN.md`, `CONSTRAINTS.md` | The repo's own conventions, written down once |
| Session rules | section in `CLAUDE.md` | Binds the session to the card |
| Skills | `skills/`, `skills/INDEX.md` | Guidance per area |
| Commands | `/setup`, `/card`, `/park`, `/done`, `/handoff` | One command each |
| Night runner | one small script | Works through the `ready` cards unattended |
| History | `cards/done/`, `nights/` | Finished cards and night reports |
| Shell | existing desktop app, cut down | Reads all of the above, across every registered repo |

Kept from Rivetari, used as-is: `review --pr` as advice, and each repo's own CI as the gate.

## Setup, audit and stage (goals 4 and 3)

`/setup` in any repo:

1. Detects the stack and the commands for test, lint, typecheck and build, and runs them.
2. Writes the kit files. An existing file is never overwritten; the kit's version goes
   beside it as `name.kit.md` for me to merge.
3. Reads the repo and drafts `DESIGN.md` and `CONSTRAINTS.md` from what the code already
   does, marked as drafts.
4. Drafts the repo checklist in `CHECKLIST.md`, in fifteen sections drawn from the old
   catalog's titles plus a starter list for the stack. A section that doesn't apply is
   kept, marked not applicable with the reason. Every line has a stage and a check that
   can be run, and setup runs each one and records pass, fail or unchecked.
5. States the stage, with the checklist lines that put it there.
6. Seeds "Next up" from the failing lines and from any spec it finds, then stops for me.

Stages (a proposal; mine to change):

| Stage | The repo… |
| --- | --- |
| Foundation | builds, has tests, lint and CI that run |
| Building | has a spec or backlog being worked through; foundation checks green |
| Hardening | features complete; security, accessibility and docs lines being closed |
| Live | deployed; monitoring and release lines green |

The stage is the lowest one whose checklist lines aren't all passing. `/setup` can be
re-run at any time to refresh the checklist and the stage; it never edits code.

## Night mode (goal 1)

I approve a list of cards. It works through them overnight. In the morning I get a branch
and a report.

**Before the night**

- The queue is every `card/*` branch whose card has status `ready` and is held by
  nobody, in "Next up" order. Each was approved by me and has: runnable checks for every
  criterion, files in scope, out of scope, and no open question.
- For a fix or feature card, the card names the new tests, and they must fail on the base.
- Cards are ordered; a card that depends on another says so.

**During the night, per card**

1. A fresh session on the card's branch, rebased onto the night branch `night/<date>`, in
   its own worktree, with the card held by this machine. The session gets the card and the rules, nothing else.
2. One build. When it stops, the runner (not the agent) runs the card's checks, the
   repo's tests, lint and typecheck, and compares the diff against "Files in scope"
   (the card and the backlog aside).
3. If something fails, one fix attempt with the failure output. A second failure holds
   the card. A round that changes nothing holds the card at once.
4. If all checks pass, a second fresh session that didn't see the build reviews the diff
   against the card. A blocking finding holds the card; it does not loop.
5. Green and unblocked: the card's branch is merged into `night/<date>` and the next
   card starts from there. Held or blocked: its branch is left as is, the reason is
   written to the card, and the runner moves on to the next card that doesn't depend on it.

**Limits**

- Nothing is pushed to or merged into the default branch. I merge in the morning.
- Any stop-and-ask trigger (dependency, schema, auth, existing test, lint or CI config)
  holds the card. Nothing is decided on my behalf.
- Per card: a time cap and one fix attempt. Per night: a card cap, a time cap, and stop
  when the usage limit is hit. First nights are capped at three cards.
- The session's credentials can push only to its own branches.
- Tool problems are parked with `[tool]`, never fixed during the night.

**In the morning: `nights/<date>.md`**

One row per card: merged into the night branch, held (with the finding) or blocked (with
the question); the checks and their results; the review's notes; minutes and tokens. Then
the diff of `night/<date>` against the default branch, card by card, for me to review and
merge.

**What this does and doesn't promise.** It makes sure every merged card passed its own
checks, the repo's checks and an independent review, and that anything doubtful was held
rather than guessed. It does not make a pass safe to merge unread: in the pilot the
reviewer missed about half of the known defects. The morning review is part of the mode.

## More than one machine

Everything the kit knows is a file in the repo, so git is the transport. No server, no
sync service, no shared state outside the repo.

- **A live card lives on its own branch.** `CARD.md` is committed only on `card/<id>`,
  never on `develop` or the default branch. Two machines on two cards never touch the
  same file.
- **The branch name is the claim.** `/card` pushes `card/<id>` as soon as it picks an id.
  If the push is refused because the branch exists, it takes the next id.
- **One machine holds a card at a time.** The card's `Held by:` line names the machine. A
  session pulls first and refuses to work a card held by another machine.
- **`/handoff` moves a card.** It writes a resume point a cold session can start from,
  commits unfinished work as `wip(handoff):`, releases the hold and pushes. The other
  machine fetches, checks out the branch and starts.
- **The backlog merges itself.** `BACKLOG.md` is append-only for sessions and uses git's
  union merge, so lines parked on two machines both survive.
- **The shell shows both.** Tasks lists the cards on every remote `card/*` branch with
  who holds each.
- **Night mode fits this.** The PC runs the night; the laptop pulls the night branch and
  the report in the morning.

What does not travel: the chat history of a session, uncommitted or git-ignored files,
local env files, installed dependencies, and each machine's sign-ins. The card's "Next
step", "Decisions" and "Evidence" are the memory; if it isn't written there, the other
machine doesn't know it.

**Branches**

`develop` is the standing integration branch; `main` is the default branch.

- Card branches are cut from `develop`, their draft PRs target it, and passed cards are
  merged into it.
- Next up, Parked and `docs/open-questions.md` live on `develop`, pushed after every
  change.
- A ruleset on `develop` blocks force-push and deletion.
- `ci` runs on every push to `develop`. If it goes red, no more cards are merged until a
  card that fixes it lands.
- Changes reach `main` only by a `develop` → `main` PR, opened when I ask for it. I merge
  it.
- `main` takes changes only through a PR with `ci` passing, and the rule binds admins
  too.

## Done tests

1. **Day:** six real BreathBand cards. Per card: my minutes from start to merge, edits
   outside scope, defects found in review and after merge. First batch is the baseline;
   proposed target after it is 10 minutes or less of my attention per card.
2. **Setup:** run `/setup` on breathband-console and compare its checklist with the old
   audit of that repo (105 controls, 21 pass, 46 fail). Note what each one caught that
   the other missed.
3. **Handoff:** start a card on the laptop, `/handoff` mid-way, finish it on the PC
   without typing any context. Note anything I had to explain again.
4. **Night:** three cards, then six. Per night: cards merged into the night branch, cards
   held, cards I undid in the morning, my morning minutes.

## Build order

1. Inventory of the source. Nothing copied.
2. Skeleton, CI pattern and the kit: `/setup`, `/card`, `/park`, `/done`, `/handoff`.
3. PR review, transplanted.
4. Area skills, transplanted.
5. Shell, transplanted and re-pointed at the files, read-only.
6. The day, setup and handoff done tests. These are mine to run.
7. Night runner, only after the day batch, then the night done test.
8. Shell write actions (answer a question, mark a card ready, add checklist gaps to
   "Next up"), only after I've used the read-only shell.

## Non-goals

Not built, not extended, not fixed:

- The old task pipeline: beats, routes, proof types, leases, parallel tasks.
- An AI judge or proof step whose pass can be merged unread.
- Router, skill registry code, skill lock, sync, sectors. Skills are plain folders picked
  per card.
- Trust ladder and autonomy levels. Night mode has one level: hold when unsure.
- Team, roles, client repos, eject, GitHub App features, billing.
- The 111-control posture catalog's engine (detectors, gates, waivers, evidence) and the
  nine gates. Only its list of controls came over: their titles feed the checklist's
  sections.
- New shell views, or shell logic that doesn't read the files above.
- Signed ledgers. Git history and the night report are the record.

## Rules for changing this file

1. A new item gets in only by replacing an item already here, or by a measurement from a
   done test showing it would save my time.
2. Tool work and product work never share a session. A tool problem found during product
   work gets a workaround and a `[tool]` line in `BACKLOG.md`.
3. No more than two build sessions at once by day. Night mode runs cards one after another.
4. This file is reviewed once a week, not mid-session.

## Later, each only after it's measured

| Candidate | Add it when |
| --- | --- |
| Scope fence (hook that refuses off-card edits) | Off-card edits happen despite the rules |
| Context slice (per-area summary injected at start), and the map generator that feeds the Map tab | The bench shows fewer tokens per card with it than without |
| Sandboxed night sessions (container, restricted network) | Before night mode runs on any repo with real credentials or data |
| Parallel night cards | Six-card nights finish with time to spare and no held cards from conflicts |
