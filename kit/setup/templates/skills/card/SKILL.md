---
name: card
description: Draft CARD.md for one piece of work from a request, a spec section or the top of BACKLOG.md. Use when the user types /card.
---

Draft a card. Do not edit any code in this session step.

Request: $ARGUMENTS

1. If `CARD.md` exists and its status isn't `done`, stop and say which card is open.
2. If the request is empty, take the top line of "Next up" in `BACKLOG.md`.
3. Read only what you need to name the files: the request, the spec section it cites, and
   the files it would touch.
4. Ask me one question at a time until every acceptance criterion has a check that can be
   run or looked at. Stop asking as soon as that's true.
5. Fetch, pick the next id not used by any `card/*` branch or file in `cards/`, create
   branch `card/<id>` from the integration branch (`develop` or its like; the default
   branch when there is none) and push it at once. If the push is refused because the
   branch exists, take the next id and try again.
   Write `CARD.md` on that branch from the template in `cards/TEMPLATE.md`. Fill
   "Out of scope" with the two or three adjacent things most likely to tempt a session.
   Under "Skills", propose at most three from `skills/INDEX.md` that match the files and
   the criteria, each with a reason. Propose none if nothing clearly fits.
6. If the work needs more than about five files or five criteria, propose splitting it and
   put the remainder in "Next up".
7. Leave the status as `draft` and `Held by:` as `nobody`, commit and push the card, and
   show it to me. I change it to `ready`.
