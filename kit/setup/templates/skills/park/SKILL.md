---
name: park
description: Append one line to the Parked section of the current CARD.md without acting on it. Use when the user types /park, or when you notice something outside the current card.
---

Park this, then go back to the card: $ARGUMENTS

1. Append one line under "## Parked" in the current `CARD.md`:
   `- <today> [product|tool|checklist] <what> · seen on <card id> · <file or command>`
2. Pick the tag: `tool` for Rivetari, the shell or CI; `checklist` for something that
   should always be true of this repo; `product` for everything else.
3. Commit the line on its own, with only `CARD.md` in the commit:
   `git commit -m "chore(park): <what>" -- CARD.md`. Do not push. Never edit
   `BACKLOG.md` from a card branch. On the default or integration branch with no
   card, fall back to `BACKLOG.md` under "Parked", and leave the line uncommitted
   and say so.
4. Change nothing else. Do not investigate or fix it. Say the line you added in one
   sentence and continue the card from its "Next step".
