# Open questions

## T-0049 · chore(agents): drafter, builder and inspector subagent definitions

A subagent's `tools` list can't allow only some Bash commands, so "no role gets merge rights" can't be enforced in the role files themselves. The documented way is a `permissions.deny` rule in the project's `.claude/settings.json`, which applies to every session, the foreman included. The foreman merges with local `git` and never uses `gh pr merge` or `gh pr ready`, so denying those costs nothing; a subagent's `git push` to `develop` can't be blocked by pattern without also blocking the foreman's pushes, so that stays a written rule.

1. (answer individually) Add a project `.claude/settings.json` with `permissions.deny` for `gh pr merge *` and `gh pr ready *`, as part of T-0049? — Recommended: yes. Other options: leave merge rights to the written rules only; also deny `git push * main`.

Answer:

## Morning step 5 · install the skills library on this machine

4a (T-0016) and 4e have merged, so this step can run.

1. (answer individually) Copy `skills/` to `~/.claude/kit-skills/` and reinstall `kit/setup` to `~/.claude/skills/setup/`? — Recommended: yes. Other options: no; later, after T-0049 lands.

Answer:
