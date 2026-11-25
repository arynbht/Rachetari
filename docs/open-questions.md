# Open questions

## T-0040 · test: set a coverage floor

Held at inspection (PR #55): the 3.5-point margin you approved was measured on an old commit. On today's develop, `build-test` (run 45705140457) measured lines 45.93 %, branches 82.87 %, functions 76.86 %, statements 45.93 % on Ubuntu (Windows within 0.3 points). A floor of 45 leaves under 1 point, so one desktop card could turn develop red and stop merges.

1. Which floor now? — Recommended: 42/79/73/42, today's develop less about 3.5 points, as you intended. Other options: keep 45/78/72/45 (under 1 point of room); 44/80/75/44.

Answer:
