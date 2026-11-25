# Open questions

## T-0043 · build(lint): set complexity and file-length limits

Measured on develop (e03bcc0, 137 files): complexity max 41, 95th percentile 13 (worst: runTier2 41, parseCard 36, Checklist 31, renderReview 31, Now 28); longest file `Tasks.tsx` at 1151 lines without blanks and comments, 95th percentile 442 (next: tier2.ts 961, tier2.test.ts 613, source.ts 575, live-shell.mjs 497). Changing `eslint.config.js` is lint config, so it's yours.

1. Which limits? — Recommended: complexity 45 and max-lines 1250 for every file, at error; passes today with about 10 % room (Tasks.tsx then has about 100 lines left before it must be split). Other options: 20/500 with the 10 files over it today allowed 45/1250; 20/500 everywhere, which fails 13 places today.

Answer:
