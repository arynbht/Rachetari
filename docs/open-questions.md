# Open questions

## T-0032 · feat(shell): the Tasks board, its columns and the selected-card list

1. The board you picked replaces today's Board/List toggle: drop the toggle and delete its existing e2e test (the "List" test in `tasks.e2e.ts`)? — Recommended: yes; the selected-card list and "Needs me" cover what the List view did. Other options: keep the List view and its test alongside the new board; keep the test but point it at the selected-card list.

Answer:
