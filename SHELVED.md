# Shelved

Work set aside overnight because it couldn't be chosen safely, or because the owner's
rules say never to decide it alone. Each has a placeholder that builds and runs but never
looks like the real thing or makes a check pass, and an issue on GitHub.

Each entry: what, why, the options, what I'd recommend, the placeholder, and the issue.

## S-01 · T-0005 · Install the skills library into ~/.claude/kit-skills/

- **What:** The README's second per-machine copy: `skills/` to `~/.claude/kit-skills/`, so `/setup` in other repos can offer area skills.
- **Why:** It writes outside this repo; the overnight rules shelve anything that does.
- **Options:** (a) Run `cp -r skills/. ~/.claude/kit-skills/` on each machine after this PR merges. (b) Leave the library uninstalled and copy skills into repos by hand.
- **Recommend:** (a), on both machines, after reviewing the skills in this PR.
- **Placeholder:** None needed: `/setup` already says the library isn't installed and carries on without it (kit/setup/SKILL.md step 2).
- **Issue:** [#5](https://github.com/arynbht/Rachetari/issues/5)

## S-02 · T-0005 · Skill constraint-driven-development (scan needed an allowed line)

- **What:** addyosmani/agent-skills `skills/constraint-driven-development` @301b02b1, MIT, an always-on spine skill loaded on 18 pilot tasks.
- **Why:** Rivetari's scan flagged `disable-checks` at SKILL.md:294 and the owner allowed the line. Tonight's rule takes only skills that passed the scan cleanly.
- **Options:** (a) Take it: the flagged line mentions someone passing `--no-verify` as a warning sign, it doesn't tell the agent to do it. (b) Leave it out.
- **Recommend:** (a). It was the most-used skill in the pilot and the flagged line is a mention.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#6](https://github.com/arynbht/Rachetari/issues/6)

## S-03 · T-0005 · Skill playwright-cli (scan needed an allowed line)

- **What:** microsoft/playwright-cli `skills/playwright-cli` @ce9b41b6, Apache-2.0, an always-on spine skill loaded on 28 of 32 pilot assemblies.
- **Why:** Rivetari's scan flagged `disable-checks` at references/test-generation.md:405 and the owner allowed the line. It also suggests an unpinned `npm i -g @playwright/cli@latest`.
- **Options:** (a) Take it as is. (b) Take it and park the unpinned install. (c) Leave it out.
- **Recommend:** (b). The flagged line is "Never skip hooks or add sleeps as a fix", a rule against it; the unpinned install is worth a parked line.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#7](https://github.com/arynbht/Rachetari/issues/7)

## S-04 · T-0005 · Skill improve-animations (scan needed an allowed line)

- **What:** emilkowalski/skills `skills/improve-animations` @715c1807, MIT, per-task, never loaded in the pilot.
- **Why:** Rivetari's scan flagged `override-instructions` at SKILL.md:33 and the owner allowed it. Tonight's rule takes only clean skills.
- **Options:** (a) Take it: the line quotes "ignore previous instructions" so the agent can flag such text in repository content. (b) Leave it out.
- **Recommend:** (a) if a repo needs motion work; its siblings `animate` and `review-animations` are taken.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#8](https://github.com/arynbht/Rachetari/issues/8)

## S-05 · T-0005 · Skill floorplan (scan needed allowed lines; it is the map generator)

- **What:** haydenschmitty/floorplan `skills/floorplan` @94f81b46, MIT, 54 files, 3.0 MB. It drew `floorplan/` at task close in 19 pilot tasks.
- **Why:** Four allowed lines (two `exfiltrate` regex literals, two "skip tests" mentions), and the map generator is on the build prompt's leave-behind list; SCOPE.md lists it under "Later, each only after it's measured".
- **Options:** (a) Leave it out until the context-slice candidate is measured. (b) Take it now.
- **Recommend:** (a). The Map tab only displays `floorplan/index.html` when one exists.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#9](https://github.com/arynbht/Rachetari/issues/9)

## S-06 · T-0005 · Skill terraform-skill (scan needed allowed lines; license unclear)

- **What:** antonbabenko/terraform-skill `skills/terraform-skill` @9c1e92d9, per-task, never loaded.
- **Why:** Two allowed lines (a `curl … | sh` install example and a pre-commit `hooks:` example), and GitHub reports its license as NOASSERTION though the text is Apache-2.0.
- **Options:** (a) Take it when a repo has Terraform. (b) Leave it out.
- **Recommend:** (b) for now; no repo in scope uses Terraform.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#10](https://github.com/arynbht/Rachetari/issues/10)

## S-07 · T-0005 · Skill differential-review (CC-BY-SA-4.0)

- **What:** trailofbits/skills `plugins/differential-review/skills/differential-review` @e4dd0bb5, a spine skill loaded on T-0010 and T-0028.
- **Why:** CC-BY-SA-4.0 is share-alike, not permissive; the rule lists and skips it. Rivetari took it under a license review the owner signed on 2026-11-09.
- **Options:** (a) Take it under that review (attribution, share-alike for changes; bodies are unchanged here). (b) Leave it out.
- **Recommend:** Owner's call: (a) if the 2026-11-09 review still holds for a private repo.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#11](https://github.com/arynbht/Rachetari/issues/11)

## S-08 · T-0005 · Skill fp-check (CC-BY-SA-4.0)

- **What:** trailofbits/skills `plugins/fp-check/skills/fp-check` @e4dd0bb5, a spine skill loaded on T-0010 and T-0028.
- **Why:** CC-BY-SA-4.0 is share-alike, not permissive. Its plugin hook lives outside the skill folder and wouldn't come over.
- **Options:** (a) Take it under the 2026-11-09 license review. (b) Leave it out.
- **Recommend:** Owner's call, together with S-07.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#12](https://github.com/arynbht/Rachetari/issues/12)

## S-09 · T-0005 · Skill insecure-defaults (CC-BY-SA-4.0)

- **What:** trailofbits/skills `plugins/insecure-defaults/skills/insecure-defaults` @9ea55c59, per-task, never loaded.
- **Why:** CC-BY-SA-4.0 is share-alike, not permissive.
- **Options:** (a) Take it under the 2026-11-09 license review. (b) Leave it out.
- **Recommend:** Owner's call, together with S-07.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#13](https://github.com/arynbht/Rachetari/issues/13)

## S-10 · T-0005 · Skill impeccable (scan blocked upstream; the trimmed fork is the owner's)

- **What:** pbakaus/impeccable `.agents/skills/impeccable` @3842da6e, Apache-2.0; the owner's trimmed fork is `arynbht/impeccable@9563f828` on branch `rivetari`.
- **Why:** The scan blocked upstream (5 findings in `reference/hooks.md`, which writes `.claude/settings.local.json`). The fork removes hooks.md and scans clean, but tonight's rules never take a skill from a fork, and the fork's engine binary still contains the hook installer and telemetry.
- **Options:** (a) Take the fork after reading it, with its config switching the hook installer and telemetry off. (b) Leave it out.
- **Recommend:** Owner's call; if (a), push a tag on the fork so the pin can't be orphaned.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#14](https://github.com/arynbht/Rachetari/issues/14)

## S-11 · T-0005 · Skill taste-skill (scan blocked)

- **What:** Leonxlnx/taste-skill `skills/taste-skill` @f6b76575, MIT, 1,631 files, 36.6 MB.
- **Why:** The scan blocked it: its SKILL.md frontmatter declares a Stop hook (lines 14-15). It also fetches photos and icons live.
- **Options:** (a) Leave it out. (b) Take a trimmed copy without the hook.
- **Recommend:** (a).
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#15](https://github.com/arynbht/Rachetari/issues/15)

## S-12 · T-0005 · Skill hallmark (ships a hook installer)

- **What:** Nutlope/hallmark `skills/hallmark` @407fa689, MIT, 187 files, 7.1 MB.
- **Why:** It scanned clean only because the rules match hook declarations, not installer code: it ships `scripts/install-hook.mjs`, which adds a PostToolUse hook, and it sends data to api.together.xyz when a Together API key is set.
- **Options:** (a) Leave it out. (b) Take it without `scripts/install-hook.mjs` (an edited body).
- **Recommend:** (a).
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#16](https://github.com/arynbht/Rachetari/issues/16)

## S-13 · T-0005 · Skill skill-creator (loads a remote script)

- **What:** anthropics/skills `skills/skill-creator` @2c5958ec, Apache-2.0, 18 files; a spine skill installed in the pilot but never named on a task.
- **Why:** `eval-viewer/viewer.html:10` loads a script from cdn.sheetjs.com (with an SRI hash), which is remote code, and its scripts run `claude -p`. It is a tool for writing skills, not an area skill.
- **Options:** (a) Leave it out. (b) Take it as is.
- **Recommend:** (a). Claude Code ships its own skill-creator.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#17](https://github.com/arynbht/Rachetari/issues/17)

## S-14 · T-0005 · Skills accessibility-lead and a11y-core (pre-justifies hidden skills; needs ~35 absent siblings)

- **What:** Community-Access/accessibility-agents `skills/accessibility-lead` and `skills/a11y-core` @a538edc9, MIT, both scanned clean and both loaded on pilot T-0022, T-0023 and T-0025. a11y-core is the shared contract (`user-invocable: false`), read only by accessibility-lead.
- **Why:** Read before copying: accessibility-lead's subagent dispatch template (SKILL.md:44-47) tells subagents "It is a specialist, hidden from the skill catalog to save context; running it this way is intended", text meant to talk an agent into following a hidden skill file. Its dispatch matrix routes to about 35 sibling skills that aren't in the registry, so on its own the dispatch fails, and `dispatch-matrix.md:49` says to dispatch helpers (including a fixer that edits source) "without asking the user first". a11y-core is useless without it.
- **Options:** (a) Take both as is and accept the dispatch wording. (b) Take the whole Accessibility Agents pack after reading it. (c) Leave both out and use axe in CI for accessibility.
- **Recommend:** (c) until a UI repo needs it, then (b) after a full read.
- **Placeholder:** Two rows in `skills/INDEX.md` marked shelved; no folders.
- **Issue:** [#18](https://github.com/arynbht/Rachetari/issues/18)

## S-15 · T-0005 · Skill webapp-testing (says to run scripts before reading them)

- **What:** anthropics/skills `skills/webapp-testing` @2c5958ec, Apache-2.0, scanned clean, a spine skill on 28 of 32 pilot assemblies. Drives local web apps with Python Playwright.
- **Why:** Read before copying: SKILL.md:14 says "Always run scripts with `--help` first ... DO NOT read the source until you try running the script first", which tells the agent to run bundled code unread; `scripts/with_server.py:69-74` runs agent-built server commands with `shell=True`. The code itself is benign (localhost only). Its example paths (`/mnt/user-data/outputs`, `/tmp`) don't exist on Windows.
- **Options:** (a) Take it as is. (b) Leave it out and use Playwright directly.
- **Recommend:** Owner's call; (a) is reasonable since the scripts were read and are local-only.
- **Placeholder:** A row in `skills/INDEX.md` marked shelved; no folder.
- **Issue:** [#19](https://github.com/arynbht/Rachetari/issues/19)
