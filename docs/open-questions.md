# Open questions

## main · branch rules

1. `main` now requires a pull request and `ci`, but admins are exempt (your choice this morning), and your account, which this session's `gh` uses, is an admin, so it can still push to `main` directly. Should the rules apply to admins too? — Recommended: yes, include admins, so nothing reaches `main` except through a PR with `ci` green; you can lift it for an emergency in the repo settings. Other options: keep admins exempt.

Answer:
