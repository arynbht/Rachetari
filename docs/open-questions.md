# Open questions

## T-0044 · feat(shell): CI state for develop and each card PR, via gh

Part 1 of 2: a `gh` reader in main (`gh pr list` and `gh run list` only, spawned with an argument array and a 15 s limit), a new IPC channel, and a "CI on develop: passed · sha" line in the header. About 120 `gh` calls an hour, piggybacking on the background fetch. The shell never reads or stores the token; it stays in gh's own store.

1. (answer individually) May the shell run `gh` on your existing sign-in, read-only? — Recommended: yes. Other options: S-16's device flow (the shell signs in itself); leave CI state out.

Answer:
