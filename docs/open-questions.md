# Open questions

## T-0067 · feat(kit): an installer, a version stamp and an update mode

Installing Rachetari today means copying `kit/setup` into `~/.claude/skills/setup` by hand on each machine; that copy goes stale and nothing records which kit version a repo got. T-0067 (part 1 of 4) adds `kit/install.mjs` (installs or replaces the machine's copy and stamps it with `.kit-version`; `--check` reports a stale copy), a `pnpm kit:install` script, its tests (temp HOME) and the README. It writes into `~/.claude` (agent config), so it needs you. Parts 2–4 are queued in Next up: the kit's Rivetari wording, `/setup`'s repo stamp and update mode, and `/setup`'s gaps from the pilot.

1. (answer individually) How should Rachetari install on a machine? — Recommended: a `pnpm kit:install` script now, since it's small, tested and needs nothing new; a Claude Code plugin can come later once its format is checked. Other options: a Claude Code plugin now; both.

Answer:

## T-0070 · docs(scope): night-mode rules from the breathband-console pilot

The pilot night bent its written rules on 11 of 38 cards because the rules had no answer (second fix rounds, scope widened, an unlisted type let through while another card was held for the same thing). T-0070 writes those answers into SCOPE.md "Night mode" and docs/army-mode.md. SCOPE.md is your spec, so it needs you.

1. The pilot ran width 3 for 25 cards in one night, and its one held card was held for a contract field, not a file conflict. Does that meet "Parallel night cards", so the row leaves "Later" and SCOPE rule 3 allows `width` night cards? — Recommended: yes, width 3 as the ceiling, held to 2 while builders share a machine under 4 GB free. Other options: keep one card a night until you've reviewed the pilot's merge; yes, with no ceiling.

Answer:

2. The pilot night held read-write Turso credentials and migrated and seeded the shared database, although "Later" says sandboxed night sessions come first on any repo with real credentials or data. Should SCOPE.md say a night may write to a shared database only through the lead, with each write listed in the report, until sandboxing exists? — Recommended: yes. Other options: no shared-database writes at night at all; leave the row as it is.

Answer:

3. Should a card with one part needing you merge the rest and turn the held part into a follow-up card (the lead did this by hand on T-0116)? — Recommended: yes, the held part becomes a drafted card with its question. Other options: hold the whole card, as now.

Answer:

## T-0071 · docs(kit): park only outside scope, and reviewers judge what a fix broke nearby

It edits `CLAUDE.md` and `.claude/agents/inspector.md` (agent config), so it needs you. No questions; it waits only for "ready".
