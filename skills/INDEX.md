# Area skills

Plain folders, each unchanged from its upstream at the pinned commit (each folder's
content hash equals the pin's hash in Rivetari's manifest). A card names at most three
under its "Skills" heading; only those are read for that card.

"Used on a real task" means the skill was loaded at build on a BreathBand pilot task
(from the pilot ledgers), or loaded as an always-on skill there.

## Taken

| Area     | Skill                                                                | When to use it                                                                                                           | Upstream                                                                        | Commit     | License    | Used on a real task                           |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ---------- | ---------- | --------------------------------------------- |
| docs     | [native-writing](docs/native-writing/)                               | Writing or editing prose people will read: UI copy, docs, PR bodies, commit messages, posts (English, Chinese, Japanese) | kane50613/native-writing (repo root)                                            | `02e75d01` | MIT        | yes (T-0023, T-0032)                          |
| legal    | [data-inventory-mapping](legal/data-inventory-mapping/)              | Cataloguing what personal data a system holds and where it flows (GDPR Art. 30 record of processing)                     | mukul975/Privacy-Data-Protection-Skills `skills/privacy/data-inventory-mapping` | `9b2ef9ea` | Apache-2.0 | no                                            |
| legal    | [dsar-processing](legal/dsar-processing/)                            | Handling a data subject access request: logging, identity checks, deadlines, exemptions, the response                    | mukul975/Privacy-Data-Protection-Skills `skills/privacy/dsar-processing`        | `9b2ef9ea` | Apache-2.0 | no                                            |
| legal    | [retention-schedule](legal/retention-schedule/)                      | Deciding how long each kind of data is kept, the event that starts the clock, and how it's deleted                       | mukul975/Privacy-Data-Protection-Skills `skills/privacy/retention-schedule`     | `9b2ef9ea` | Apache-2.0 | no                                            |
| motion   | [animate](motion/animate/)                                           | Adding motion or a transition to UI: whether to animate, easing, duration, reduced motion                                | emilkowalski/skills `skills/animate`                                            | `715c1807` | MIT        | no (routed on T-0026, abandoned before build) |
| motion   | [review-animations](motion/review-animations/)                       | Reviewing animation code in a diff against the same standards (only when asked; not auto-invoked)                        | emilkowalski/skills `skills/review-animations`                                  | `715c1807` | MIT        | no                                            |
| testing  | [test-driven-development](testing/test-driven-development/)          | Adding logic, fixing a bug or changing behaviour: write the failing test first, then the fix                             | addyosmani/agent-skills `skills/test-driven-development`                        | `301b02b1` | MIT        | yes (always-on, 18 tasks)                     |
| ui       | [frontend-design](ui/frontend-design/)                               | Building or restyling UI: typography, layout, avoiding generic looks, plan then critique                                 | anthropics/skills `skills/frontend-design`                                      | `2c5958ec` | Apache-2.0 | yes (T-0022, T-0023, T-0025)                  |
| workflow | [code-review-and-quality](workflow/code-review-and-quality/)         | Reviewing a diff or PR on five axes before merge: correctness, readability, architecture, security, performance          | addyosmani/agent-skills `skills/code-review-and-quality`                        | `301b02b1` | MIT        | yes (always-on: T-0008, 10, 11, 28)           |
| workflow | [incremental-implementation](workflow/incremental-implementation/)   | A change that touches more than one file: thin vertical slices, each tested and verified                                 | addyosmani/agent-skills `skills/incremental-implementation`                     | `301b02b1` | MIT        | no (installed always-on, never named)         |
| workflow | [planning-and-task-breakdown](workflow/planning-and-task-breakdown/) | Work too big to start: split a spec into ordered, right-sized tasks with criteria                                        | addyosmani/agent-skills `skills/planning-and-task-breakdown`                    | `301b02b1` | MIT        | no (installed always-on, never named)         |
| workflow | [shipping-and-launch](workflow/shipping-and-launch/)                 | Before a deploy: the pre-launch checklist, rollout, monitoring and a rollback plan                                       | addyosmani/agent-skills `skills/shipping-and-launch`                            | `301b02b1` | MIT        | yes (always-on: T-0010, 28, 31, 32)           |
| workflow | [spec-driven-development](workflow/spec-driven-development/)         | A new feature or unclear requirements: write and approve a spec before any code                                          | addyosmani/agent-skills `skills/spec-driven-development`                        | `301b02b1` | MIT        | yes (always-on: T-0002, 06, 17, 23, 32)       |

Notes from reading them (nothing installs hooks, fetches remote code or overrides instructions):

- The addyosmani skills link to sibling skills and `../../references/*.md` files that aren't here; those links are dead.
- `incremental-implementation` says to commit after each slice; `shipping-and-launch` has `git revert … && git push` inside a rollback-plan template.
- `native-writing` is its upstream repo root, so it carries `.github/`, `evals/` and a README with an `npx skills add …` install line for people.
- The legal skills' example companies and people are fictional; `dsar-processing` hard-codes an example fee. Their Python scripts use the standard library only.
- `animate` and `review-animations` open with a fixed reply before the first question.

## Shelved

Not taken tonight; see `SHELVED.md` for why, the options and the issue.

| Area     | Skill                         | Upstream                                                         | Commit     | License                          | Used on a real task         | Shelved |
| -------- | ----------------------------- | ---------------------------------------------------------------- | ---------- | -------------------------------- | --------------------------- | ------- |
| a11y     | accessibility-lead            | Community-Access/accessibility-agents                            | `a538edc9` | MIT                              | yes (T-0022, 23, 25)        | S-14    |
| a11y     | a11y-core                     | Community-Access/accessibility-agents                            | `a538edc9` | MIT                              | yes (T-0022, 23, 25)        | S-14    |
| docs     | floorplan                     | haydenschmitty/floorplan                                         | `94f81b46` | MIT                              | ran at close, 19 tasks      | S-05    |
| infra    | terraform-skill               | antonbabenko/terraform-skill                                     | `9c1e92d9` | Apache-2.0 (GitHub: NOASSERTION) | no                          | S-06    |
| motion   | improve-animations            | emilkowalski/skills                                              | `715c1807` | MIT                              | no                          | S-04    |
| security | differential-review           | trailofbits/skills                                               | `e4dd0bb5` | CC-BY-SA-4.0                     | yes (always-on: T-0010, 28) | S-07    |
| security | fp-check                      | trailofbits/skills                                               | `e4dd0bb5` | CC-BY-SA-4.0                     | yes (always-on: T-0010, 28) | S-08    |
| security | insecure-defaults             | trailofbits/skills                                               | `9ea55c59` | CC-BY-SA-4.0                     | no                          | S-09    |
| testing  | playwright-cli                | microsoft/playwright-cli                                         | `ce9b41b6` | Apache-2.0                       | yes (always-on, 28 of 32)   | S-03    |
| testing  | webapp-testing                | anthropics/skills                                                | `2c5958ec` | Apache-2.0                       | yes (always-on, 28 of 32)   | S-15    |
| ui       | hallmark                      | Nutlope/hallmark                                                 | `407fa689` | MIT                              | no                          | S-12    |
| ui       | impeccable                    | pbakaus/impeccable (owner's fork: arynbht/impeccable `9563f828`) | `3842da6e` | Apache-2.0                       | no                          | S-10    |
| ui       | taste-skill                   | Leonxlnx/taste-skill                                             | `f6b76575` | MIT                              | no                          | S-11    |
| workflow | constraint-driven-development | addyosmani/agent-skills                                          | `301b02b1` | MIT                              | yes (always-on, 18 tasks)   | S-02    |
| workflow | skill-creator                 | anthropics/skills                                                | `2c5958ec` | Apache-2.0                       | no (installed, never named) | S-13    |
