---
name: deslop
description: Remove slop from the current card's diff without changing what the code does, and report each removal in one line. Use when a card's work is finished, or when asked to deslop or clean up a diff.
---

# Deslop

Slop is what a session leaves in a diff that nobody asked for. This skill takes it out of
the current card's work and touches nothing else.

1. **Read the list.** Use the `## Slop` section of the repo's `CONSTRAINTS.md` when there
   is one. Otherwise use the defaults at the end of this file.
2. **Read the diff.** Review only the current card's diff against the branch's base, the
   branch its PR targets: `git diff <base>...HEAD`. Lines the diff didn't add or change
   are not this skill's to clean.
3. **Remove what's on the list.** Edit only the files under the card's "Files in scope",
   and report slop in any other file without editing it. A removal never changes
   behaviour: the same inputs give the same outputs, errors and side effects, and the
   existing tests pass unedited. When you aren't sure a removal is safe, or that a line
   is slop, leave it.
4. **Report.** One line per removal: the file, the line and the slop it was. Then one line
   per thing you left, and why you weren't sure. If nothing was removed, say so.

## Slop

Defaults, used when the repo's `CONSTRAINTS.md` has no `## Slop` section:

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
