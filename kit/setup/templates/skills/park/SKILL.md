---
name: park
description: Append one line to the Parked list in BACKLOG.md without acting on it. Use when the user types /park, or when you notice something outside the current card.
---

Park this, then go back to the card: $ARGUMENTS

1. Append one line under "Parked" in `BACKLOG.md`:
   `- <today> [product|tool|checklist] <what> · seen on <card id> · <file or command>`
2. Pick the tag: `tool` for Rivetari, the shell or CI; `checklist` for something that
   should always be true of this repo; `product` for everything else.
3. Change nothing else. Do not investigate or fix it. Say the line you added in one
   sentence and continue the card from its "Next step".
