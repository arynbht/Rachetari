# T-0000 · <title, as a conventional commit subject>

Status: draft <!-- draft | ready | in progress | blocked | done -->
Branch: card/T-0000 · Held by: <machine name, or nobody>
Created: YYYY-MM-DD · Source: <spec section, issue, or "prompt">

## Why

<Two or three sentences. What is wrong or missing today, and for whom.>

## Acceptance criteria

Each one is checked by something that can be run or looked at. No criterion without a check.

- [ ] A1: <what must be true> · check: `<command, test name, or "screenshot of /page at 375px">`
- [ ] A2: … · check: …

## Files in scope

Only these may be edited. Anything else needs a stop-and-ask.

- `src/…`
- `src/…/*.test.ts`

## Out of scope

Named on purpose, so the session doesn't drift into them.

- <the adjacent thing that will look tempting>
- <the refactor this card does not include>

## Constraints

- No new dependencies.
- <anything else: no API change, keep the existing component, …>

## Skills

At most three, from `skills/INDEX.md`. Read these and no others.

- `<area>/<name>` — <why this card needs it>

## Stop and ask

Besides the standing list in CLAUDE.md:

- <card-specific trigger, if any>

## Next step

<One line, rewritten by the session before it ends. A new session starts here.>

## Decisions

Appended by the session, one line each, newest last.

- YYYY-MM-DD: <decision> — <why>

## Questions for me

One question per line, in this shape; options are separated by `;`.

- [ ] <question> — Recommended: <answer>. Options: <other>; <other>.

## Parked

Anything noticed that isn't this card. One line each, no fixing. The merger appends these to `BACKLOG.md` on the integration branch.
Format: `- YYYY-MM-DD [product|tool|checklist] <what> · seen on T-NNNN · <file or command>`

- <line>

## Done

- [ ] Every criterion ticked, with the command run and its result pasted below
- [ ] Tests, lint and typecheck run; output below
- [ ] No edits outside "Files in scope" (`git diff --stat` below)
- [ ] Anything not run is marked UNTESTED, never "verified"
- [ ] Draft PR opened: #

### Evidence

```
<commands and results>
```
