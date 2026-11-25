# Open questions

## T-0044 · feat(shell): CI state for develop and each card PR, via gh

1. (answer individually) May the shell run the `gh` CLI on your existing sign-in to read CI (`gh pr list`, `gh run list` only; the token stays in `gh`'s store, never read or stored by the shell)? — Recommended: yes, as drafted (S-16 option (b)). Other options: no, build S-16's device flow (option (a)) instead; no, leave CI out of the shell (option (c)).

Answer:

## T-0090 · feat(export): dates in the CSV export

1. (answer individually) Should the export write dates the way `toISOString()` does (`2026-11-25T10:00:00.000Z`, always UTC), or in the owner's zone, as the [RFC 3339 profile](https://www.rfc-editor.org/rfc/rfc3339#section-5.6) allows (`2026-11-25T11:00:00+01:00`)? The spreadsheet the owner opens it in reads both, but the importer at https://example.test/importer/v2 reads only the first, and `parseDate` in `src/csv/dates.ts` would need a second branch for the other, with its own tests for the hour either side of a clock change. — Recommended: UTC, as `toISOString()` writes it, with the zone named in the header row (`date (UTC)`). Other options: the owner's zone, with its offset on every value; both, as two columns (`date (UTC)` and `date (local)`).
2. Name the file `report.csv` or `report-<date>.csv`? — Recommended: `report-<date>.csv`. Other options: `report.csv`.

Answer:
