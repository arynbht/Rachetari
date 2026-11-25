## Slop

Defaults from the direction kit, for you to edit for this repo: delete a line that
doesn't apply here and add any this repo needs. The `deslop` skill removes what this list
names from a card's diff.

- comments that restate the code, or narrate the change ("added", "now we", "fix")
- try/catch that only logs, rethrows or swallows
- null and type checks on values the types already guarantee
- a helper, wrapper or abstraction used once
- unused exports, parameters, variables and branches; leftover debug logging
- `any`, casts and suppressions used to quiet the type checker or linter
- logic that duplicates an existing utility (search before writing)
- fallbacks, flags and compatibility shims nobody asked for
- renaming or reformatting lines the card didn't need to touch
- a new dependency for something small
- tests that assert the mock or the implementation, not the behaviour
- docs, READMEs, banners and emoji nobody asked for
