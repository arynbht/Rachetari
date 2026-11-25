# Backlog

Three lists. I order "Next up". Sessions only ever append to "Parked".

## Next up

Ordered. The top line becomes the next `CARD.md`.

1. <one line> · from <spec §, issue, or parked line>

## Parked

Anything noticed while working on something else. One line, no fixing.
Format: `- YYYY-MM-DD [product|tool|checklist] <what> · seen on T-NNNN · <file or command>`

- 2026-11-24 [product] Example: top bar overlaps title at 961px · seen on T-0021 · `src/components/TopBar.tsx`
- 2026-11-24 [tool] Example: shell Now view names a command that doesn't exist · seen on T-0021 · `Now.tsx:656`

## Repo checklist

What must stay true for this repo. It grows as the repo grows; a `[checklist]` line in
Parked is a proposal to add one. Each line names how to check it.

- [ ] CI runs lint, typecheck and tests on every PR · check: `.github/workflows/ci.yml`
- [ ] No secrets in the repo · check: `gitleaks detect`
- [ ] <repo-specific: every page passes axe at 375/768/1280> · check: `<command>`
- [ ] <repo-specific: contract types change only with a card that names them> · check: review
