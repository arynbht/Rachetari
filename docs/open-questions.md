# Open questions

## T-0067 · feat(kit): an installer, a version stamp and an update mode

Installing Rachetari today means copying `kit/setup` into `~/.claude/skills/setup` by hand on each machine; that copy goes stale and nothing records which kit version a repo got. T-0067 (part 1 of 4) adds `kit/install.mjs` (installs or replaces the machine's copy and stamps it with `.kit-version`; `--check` reports a stale copy), a `pnpm kit:install` script, its tests (temp HOME) and the README. It writes into `~/.claude` (agent config), so it needs you. Parts 2–4 are queued in Next up: the kit's Rivetari wording, `/setup`'s repo stamp and update mode, and `/setup`'s gaps from the pilot.

1. (answer individually) How should Rachetari install on a machine? — Recommended: a `pnpm kit:install` script now, since it's small, tested and needs nothing new; a Claude Code plugin can come later once its format is checked. Other options: a Claude Code plugin now; both.

Answer:
