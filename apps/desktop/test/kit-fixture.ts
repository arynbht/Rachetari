// A repo laid out the way the kit leaves it, for the file source's unit tests
// and the shell's e2e tests: an origin, a default branch with the backlog, two
// finished cards, a night report, the skills index and a map, and live cards on
// card/* branches — checked out, local only, on the origin only, unreadable, and
// one pushed to the origin after the clone, which only a fetch brings in.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export interface KitFixture {
  /** The clone a person works in (what the shell registers). */
  repo: string;
  /** Its origin. */
  origin: string;
  /** Push a new card branch to the origin only (seen after a fetch). */
  pushToOrigin(id: string, card: string): void;
  /** Commit a file to the origin's main (seen after a fetch). */
  commitOnOrigin(path: string, text: string): void;
  remove(): void;
}

export interface CardSpec {
  id: string;
  title: string;
  status: string;
  heldBy?: string;
  nextStep?: string;
  question?: string;
  pr?: number;
  /** One criterion per entry: [text, state]. */
  criteria?: [string, "ticked" | "unticked" | "untested"][];
}

/** A CARD.md in the kit's template layout. */
export function cardText(spec: CardSpec): string {
  const criteria = (
    spec.criteria ?? [["The thing works", "unticked"] as const]
  ).map(([text, state], i) => {
    const box = state === "ticked" ? "[x]" : "[ ]";
    const untested = state === "untested" ? " UNTESTED" : "";
    return `- ${box} A${i + 1}: ${text} · check: \`pnpm test\`${untested}`;
  });
  return [
    `# ${spec.id} · ${spec.title}`,
    "",
    `Status: ${spec.status} <!-- draft | ready | in progress | blocked | done -->`,
    `Branch: card/${spec.id} · Held by: ${spec.heldBy ?? "nobody"}`,
    `Created: 2026-11-20 · Source: prompt`,
    "",
    "## Why",
    "",
    `Because ${spec.title.toLowerCase()} is missing.`,
    "",
    "## Acceptance criteria",
    "",
    ...criteria,
    "",
    "## Files in scope",
    "",
    "- `src/app.ts`",
    "",
    "## Out of scope",
    "",
    "- the other thing",
    "",
    "## Constraints",
    "",
    "- No new dependencies.",
    "",
    "## Skills",
    "",
    "- `testing/test-driven-development` — tests first",
    "",
    "## Stop and ask",
    "",
    "- nothing extra",
    "",
    "## Next step",
    "",
    spec.nextStep ?? "Start with the first criterion.",
    "",
    "## Decisions",
    "",
    "- 2026-11-20: Keep it small — one card",
    "",
    "## Questions for me",
    "",
    spec.question ? `- [ ] ${spec.question}` : "- [ ] (none)",
    "",
    "## Done",
    "",
    "- [ ] Every criterion ticked, with the command run and its result pasted below",
    spec.pr ? `- [x] Draft PR opened: #${spec.pr}` : "- [ ] Draft PR opened: #",
    "",
    "### Evidence",
    "",
    "```",
    "$ pnpm test -> 3 passed",
    "```",
    "",
  ].join("\n");
}

export const BACKLOG = `# Backlog

Three lists. I order "Next up". Sessions only ever append to "Parked".

## Next up

Ordered. The top line becomes the next \`CARD.md\`.

1. Export the report as CSV · from spec §3
2. Dark mode for the settings page · from parked line

## Parked

Anything noticed while working on something else. One line, no fixing.
Format: \`- YYYY-MM-DD [product|tool|checklist] <what> · seen on T-NNNN · <file or command>\`

- 2026-11-21 [product] Top bar overlaps the title at 961px · seen on T-0002 · \`src/TopBar.tsx\`
- 2026-11-22 [tool] The shell names a command that doesn't exist · seen on T-0003 · \`Now.tsx\`

## Repo checklist

What must stay true for this repo. Each line names how to check it.

Stage: Building — decided by "README says how to run it" (fails).
Last \`/setup\`: 2026-11-22, on main.

### Foundation

- [x] It builds · check: \`pnpm build\`
- [x] Tests exist and pass · check: \`pnpm test\`
- [ ] unchecked: main's CI is green · check: \`gh run list\`

### Building

- [ ] README says how to run it · check: read \`README.md\`
- [x] Every page passes axe · check: \`pnpm e2e\` new

### Hardening

- n/a: nothing is deployed yet
`;

const DONE_1 = cardText({
  id: "T-0001",
  title: "chore: set up the workspace",
  status: "done",
  pr: 1,
  criteria: [["It builds", "ticked"]],
});
const DONE_2 = cardText({
  id: "T-0002",
  title: "feat: add the report page",
  status: "done",
  pr: 2,
  criteria: [
    ["The page renders", "ticked"],
    ["It's fast", "untested"],
  ],
});

const NIGHT = `# Night 2026-11-24

| Card | Result | Checks | Review | Minutes |
| --- | --- | --- | --- | --- |
| T-0008 | merged into night/2026-11-24 | 3 pass | no blocking | 21 |
| T-0009 | held: test failed twice | 1 fail | — | 34 |
`;

const SKILLS = `# Area skills

| Area | Skill | When to use it | Upstream | Commit | License | Used on a real task |
| --- | --- | --- | --- | --- | --- | --- |
| testing | [test-driven-development](testing/test-driven-development/) | Adding logic | addyosmani/agent-skills | \`301b02b1\` | MIT | yes |
| ui | [frontend-design](ui/frontend-design/) | Building UI | anthropics/skills | \`2c5958ec\` | Apache-2.0 | yes |
`;

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function write(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

function commitAll(cwd: string, message: string): void {
  git(cwd, "add", "-A");
  git(cwd, "commit", "-q", "--no-verify", "-m", message);
}

function initRepo(dir: string): void {
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.email", "fixture@example.test");
  git(dir, "config", "user.name", "Fixture");
  git(dir, "config", "commit.gpgsign", "false");
  git(dir, "config", "core.autocrlf", "false");
}

/** Build the fixture in a fresh temp folder. */
export function kitFixture(): KitFixture {
  const root = mkdtempSync(join(tmpdir(), "rachetari-kit-"));
  const origin = join(root, "origin");
  const repo = join(root, "repo");
  mkdirSync(origin);

  initRepo(origin);
  write(origin, "README.md", "# Fixture app\n");
  write(origin, "BACKLOG.md", BACKLOG);
  write(origin, "cards/done/T-0001.md", DONE_1);
  write(origin, "cards/done/T-0002.md", DONE_2);
  write(origin, "nights/2026-11-24.md", NIGHT);
  write(origin, "skills/INDEX.md", SKILLS);
  write(origin, "floorplan/index.html", "<!doctype html><title>map</title>\n");
  commitAll(origin, "chore: the kit");

  // On the origin only: a blocked card with a question.
  git(origin, "checkout", "-q", "-b", "card/T-0005");
  write(
    origin,
    "CARD.md",
    cardText({
      id: "T-0005",
      title: "fix: the export rounds wrong",
      status: "blocked",
      heldBy: "laptop",
      question: "Round half up or half even?",
    }),
  );
  commitAll(origin, "chore(card): T-0005");
  git(origin, "checkout", "-q", "main");

  execFileSync("git", [
    "clone",
    "-q",
    "-c",
    "core.autocrlf=false",
    origin,
    repo,
  ]);
  git(repo, "config", "user.email", "fixture@example.test");
  git(repo, "config", "user.name", "Fixture");
  git(repo, "config", "commit.gpgsign", "false");

  // Local only: a draft.
  git(repo, "checkout", "-q", "-b", "card/T-0004");
  write(
    repo,
    "CARD.md",
    cardText({ id: "T-0004", title: "feat: dark mode", status: "draft" }),
  );
  commitAll(repo, "chore(card): T-0004");

  // Local only and unreadable.
  git(repo, "checkout", "-q", "main");
  git(repo, "checkout", "-q", "-b", "card/T-0006");
  write(repo, "CARD.md", "this isn't a card\n");
  commitAll(repo, "chore(card): T-0006");

  // Checked out: in progress, with a PR.
  git(repo, "checkout", "-q", "main");
  git(repo, "checkout", "-q", "-b", "card/T-0003");
  write(
    repo,
    "CARD.md",
    cardText({
      id: "T-0003",
      title: "feat: export the report as CSV",
      status: "in progress",
      heldBy: "pc",
      nextStep: "Write the CSV writer's test.",
      pr: 7,
      criteria: [
        ["A CSV downloads", "ticked"],
        ["Commas are quoted", "unticked"],
      ],
    }),
  );
  commitAll(repo, "feat: the CSV button");

  return {
    repo,
    origin,
    pushToOrigin(id, card) {
      git(origin, "checkout", "-q", "-b", `card/${id}`, "main");
      write(origin, "CARD.md", card);
      commitAll(origin, `chore(card): ${id}`);
      git(origin, "checkout", "-q", "main");
    },
    commitOnOrigin(path, text) {
      write(origin, path, text);
      commitAll(origin, `docs: update ${path}`);
    },
    remove() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}
