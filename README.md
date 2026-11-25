# Rachetari

The direction layer: a plain Claude Code session that works one card at a time, with the
repo's own files holding what's planned, done, left and not yet accounted for. It is
built from the working parts of Rivetari, which is parked at `32f4b88`. `SCOPE.md` is
the spec; if something isn't in it, it isn't being built.

What's here:

| Path                         | What it is                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kit/setup/`                 | The `/setup` skill and the templates it installs into a repo: the card, the backlog, the `CLAUDE.md` section, and the `/card`, `/park`, `/done` and `/handoff` commands |
| `skills/`                    | Area skills (UI, testing, docs, …) with `skills/INDEX.md`. Arrives in phase 3                                                                                           |
| `packages/`, `apps/desktop/` | PR review (`review --pr`) and the desktop shell, transplanted from Rivetari                                                                                             |
| `EXTRACTED.md`               | Every file copied from Rivetari, with what was cut                                                                                                                      |
| `cards/done/`                | Finished cards                                                                                                                                                          |

## Install on a machine

Two copies, once per machine:

1. `kit/setup/` to `~/.claude/skills/setup/`, so `/setup` works in any repo.
2. `skills/` to `~/.claude/kit-skills/`, the library `/setup` offers from. Until phase 3
   lands there is no `skills/` folder; `/setup` says so and carries on without it.

On Windows (Git Bash), from this repo:

```sh
mkdir -p ~/.claude/skills ~/.claude/kit-skills
cp -r kit/setup ~/.claude/skills/
cp -r skills/. ~/.claude/kit-skills/   # once skills/ exists
```

Then, in any repo, run `/setup`. It writes the kit files without overwriting anything,
drafts the repo checklist and states the repo's stage. After that, `/card <request>`
starts a card.

Re-run the copies after pulling a change to `kit/` or `skills/`.
