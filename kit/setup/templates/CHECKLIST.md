# Checklist

Stage: <Foundation|Building|Hardening|Live> — decided by <the failing lines that put it there>
Last `/setup`: <YYYY-MM-DD>, on <branch>.

What must stay true for this repo, in fifteen sections. Every section stays, even one
that doesn't apply: it says `n/a` and why, so leaving it out is a recorded choice.
`/setup` writes the lines, runs each check and records the result. Edit, add or retag
lines as you like, and a re-run keeps your changes. A `[checklist]` line parked in
`BACKLOG.md` proposes a new line here.

Each line has a status, a stage and the check that was run. A line from the old catalog
leads with its id, so a re-run finds it instead of adding it again:

    - [x] `<id>` <what must stay true> · stage: <foundation|building|hardening|live> · check: <what was run>
    - [ ] <what must stay true> · stage: <stage> · check: <what was run> (<what it showed>)
    - [ ] unchecked: <what must stay true> · stage: <stage> · check: <what a person should look at>
    - n/a: <why nothing in this section applies to this repo>

`[x]` is passed and `[ ]` is failed. `new` at the end of a line marks one the last
`/setup` added. To drop a catalog line for good, change it to ``- n/a: `<id>` <why>``
rather than deleting it, so a re-run doesn't add it back.

## accessibility

## cicd

## cloud

## data

## development

## documentation

## hygiene

## legal

## observability

## performance

## product

## quality

## security

## testing

## ux
