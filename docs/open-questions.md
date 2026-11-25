# Open questions

## T-0043 · build(lint): set complexity and file-length limits

Measured on develop (e03bcc0, 137 files): complexity max 41, 95th percentile 13 (worst: runTier2 41, parseCard 36, Checklist 31, renderReview 31, Now 28); longest file `Tasks.tsx` at 1151 lines without blanks and comments, 95th percentile 442 (next: tier2.ts 961, tier2.test.ts 613, source.ts 575, live-shell.mjs 497). Changing `eslint.config.js` is lint config, so it's yours.

Update (21:40): T-0035 (PR #57, the Tasks record) grows `Tasks.tsx` to 1484 lines, so 1250 would fail once it merges.

1. Which limits? — Recommended: complexity 45 everywhere, and max-lines 1250 for every file except `Tasks.tsx`, which gets 1600 until a card splits it (queue that split card). Other options: 45/1600 for every file; 20/500 with the files over it allowed 45/1600; 20/500 everywhere, which fails 13+ places today.

Answer:
