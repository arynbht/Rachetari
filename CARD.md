# T-0070 · docs(scope): night-mode rules from the breathband-console pilot

Status: draft
Branch: card/T-0070 · Held by: nobody
Created: 2026-11-26 · Source: breathband-console pilot (`nights/2026-11-26.md`, the lead's ledger, `~/rachetari-scratch/feedback/breathband-console/`) · Gate: needs you (SCOPE.md is your spec; its rule 4 reviews it weekly, not mid-session)

## Why

The pilot's lead broke or bent the written night rules on 11 of 38 cards, mostly because the rules had no answer. It took a second fix round on T-0117, T-0119 and T-0124. It widened scope on 8 cards. It let T-0119's unlisted types through, then held T-0123 for the same kind of change. It settled an open owner question (`NEXT_PUBLIC_API_URL`) on its own. A finding marked "MUST FIX BEFORE DEPLOY" (T-0111) merged anyway. A flaky test known only as a review suggestion (T-0121) broke a later card. No PR was opened, so GitHub CI never ran on any of the 38 cards. SCOPE.md night step 3 and 4 also contradict the night prompt on fix rounds (raw log 02:41).

## Acceptance criteria

- [ ] A1: SCOPE.md "Night mode" defines fix rounds: one round for a failing check or a blocking review; one more reviewer-specified follow-up only when the fix itself introduced a small new defect; an integration fix (a break found when the night tip is merged into an already-reviewed card) is its own round outside that budget. A fix round's reviewer is asked what the fix broke nearby, not only whether the finding is fixed · check: read the section in the diff
- [ ] A2: A finding a reviewer calls must-fix (before deploy, merge or demo) is blocking whatever its label; reviewer suggestions tagged security, flaky or demo become a drafted follow-up card in the same lane, not only a report line · check: read the diff
- [ ] A3: The runner may widen a card's scope by one named file when the card's own change or a blocking finding forces it and the file touches nothing on the stop-and-ask list; it logs "scope widened by the runner: <file>, because <reason>" in Decisions and the report lists it. The night's approvals apply by kind to every card alike, and the runner never answers an open owner question · check: read the diff
- [ ] A4: The morning report is appended after every merge by `kit/runner/merge-card.mjs` (T-0069), with times from the clock; `CARD.md` moves to `cards/done/<id>.md` at merge; the night branch gets a draft PR against the integration branch at its first merge, so CI runs on every push · check: read the diff
- [ ] A5: `docs/army-mode.md` agrees with SCOPE.md on fix rounds, scope widening and the report, and adds the pilot's worktree rules: one e2e port per lane, a compose project name per worktree, and no installs in a worktree while its reviewer runs · check: read both files side by side; `pnpm format` passes

## Files in scope

- `SCOPE.md` (changed: "Night mode" only, and "Later" only if Q1 or Q2 says so)
- `docs/army-mode.md` (changed)
- `CARD.md`

## Out of scope

- Building any of it (T-0069 builds the merge step; follow-up drafting and PR opening are later runner cards).
- `/card --night`, a drafting path with no questions (in Next up as its own card).
- The kit's CLAUDE section and the inspector role (T-0071).

## Constraints

- SCOPE.md rule 1: each new rule cites the pilot measurement that justifies it.
- Plain prose in the file's existing style; no new sections outside "Night mode".

## Skills

## Stop and ask

Besides the standing list in CLAUDE.md:

- Any change to SCOPE.md outside "Night mode" and "Later".

## Next step

Owner: answer Q1–Q3 and mark ready. Then build: edit Night mode per A1–A4, then army-mode.md per A5.

## Decisions

## Questions for me

- [ ] Q1: The pilot ran width 3 for 25 cards in one night, and the one held card was held for a contract field, not a file conflict. Does that meet "Parallel night cards" (six-card nights, time to spare, no held cards from conflicts), so the row leaves "Later" and SCOPE rule 3 allows `width` night cards? — Recommended: yes, width 3 as the ceiling, held to 2 while builders share a machine under 4 GB free. Options: keep one card a night until you've reviewed the pilot's merge; yes, with no ceiling.
- [ ] Q2: "Later" says sandboxed night sessions come before night mode runs on any repo with real credentials or data. The pilot night held read-write Turso credentials and migrated and seeded the shared database. Should SCOPE.md say a night may write to a shared database only through the lead, with each write listed in the report, until sandboxing exists? — Recommended: yes. Options: no shared-database writes at night at all; leave the row as it is.
- [ ] Q3: Should a card with one part needing you merge the rest and turn the held part into a follow-up card (the lead did this by hand on T-0116)? — Recommended: yes, the held part becomes a drafted card with its question. Options: hold the whole card, as now.

## Parked

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```

```
