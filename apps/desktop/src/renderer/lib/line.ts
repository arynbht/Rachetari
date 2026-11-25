// The line's limits: how many cards each stage may hold at once, as
// docs/queue-2026-11-25.md §The line sets them ("Limits (owner, 2026-11-25,
// widened)"). The Tasks board shows each stage's load against them. Change
// them here when the line's limits change.

/** Draft plus ready: cards drafted or waiting for a builder. */
export const DRAFT_READY_LIMIT = 6;

/** In progress: cards a builder holds. */
export const IN_PROGRESS_LIMIT = 3;

/** PR open: cards in inspection, against the inspection cap. */
export const PR_OPEN_LIMIT = 3;
