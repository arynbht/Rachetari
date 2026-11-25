// The checklist in CHECKLIST.md (T-0029's format): the parser, the file
// source's choice between it and BACKLOG.md's "Repo checklist", Now's health
// on it, and this repo's own CHECKLIST.md read whole.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CHECKLIST, checklistFixture } from "../../../test/checklist-fixture";
import { kitFixture, type KitFixture } from "../../../test/kit-fixture";
import { nowHealth } from "../engine/now";
import { parseBacklog, parseChecklist } from "./parse";
import { readBacklog } from "./source";
import { EMPTY_SNAPSHOT } from "./watch";

const SECTIONS = [
  "accessibility",
  "cicd",
  "cloud",
  "data",
  "development",
  "documentation",
  "hygiene",
  "legal",
  "observability",
  "performance",
  "product",
  "quality",
  "security",
  "testing",
  "ux",
];

const group = (text: string, name: string) => {
  const g = parseChecklist(text).groups.find((x) => x.name === name);
  if (!g) throw new Error(`no section ${name}`);
  return g;
};

/** A CHECKLIST.md with one section holding the given lines. */
const oneSection = (...lines: string[]) =>
  `# Checklist\n\n## testing\n\n${lines.join("\n")}\n`;

describe("parseChecklist", () => {
  it("reads the stage, the last /setup and all fifteen sections in file order", () => {
    const c = parseChecklist(CHECKLIST);
    expect(c.source).toBe("CHECKLIST.md");
    expect(c.stage).toBe("Foundation");
    expect(c.stageWhy).toMatch(/^decided by `test.coverage-threshold`/);
    expect(c.lastSetup).toBe("2026-11-25, on main.");
    expect(c.groups.map((g) => g.name)).toEqual(SECTIONS);
    expect(group(CHECKLIST, "ux")).toEqual({ name: "ux", na: null, lines: [] });
  });

  it("reads each line's status, id, stage tag, check and new mark", () => {
    const testing = group(CHECKLIST, "testing").lines;
    expect(testing.map((l) => [l.status, l.id, l.stage])).toEqual([
      ["pass", "test.runner.configured", "building"],
      ["fail", "test.e2e.present", "building"],
      ["fail", null, "foundation"],
      ["unchecked", "test.coverage-threshold", "hardening"],
    ]);
    expect(testing[1]).toEqual({
      text: "End-to-end tests present",
      status: "fail",
      id: "test.e2e.present",
      stage: "building",
      check: "`ls e2e` (no such folder)",
      isNew: false,
    });
    expect(testing[2]?.text).toBe("Tests run in CI");
    const security = group(CHECKLIST, "security").lines;
    expect(security.map((l) => l.isNew)).toEqual([false, false, true]);
    expect(security[2]).toMatchObject({
      text: "No secrets in the repo",
      check: "gitleaks dir .",
      stage: "foundation",
    });
  });

  it("reads a catalog id on any line: before or after unchecked:, and after n/a:", () => {
    expect(group(CHECKLIST, "cicd").lines).toEqual([
      {
        text: "The default branch is protected",
        status: "unchecked",
        id: "ci.branch-protection",
        stage: "foundation",
        check: "a person reads the branch settings",
        isNew: false,
      },
    ]);
    expect(group(CHECKLIST, "testing").lines[3]).toMatchObject({
      text: "A coverage floor is set and met",
      status: "unchecked",
      id: "test.coverage-threshold",
    });
    expect(group(CHECKLIST, "data").lines[1]).toMatchObject({
      text: "no database",
      status: "n/a",
      id: "data.backups-tested",
    });
    // A backticked token that isn't a catalog id stays in the text.
    const [line] = group(
      oneSection(
        "- [x] `review --pr` never approves · stage: building · check: `x`",
      ),
      "testing",
    ).lines;
    expect(line).toMatchObject({
      id: null,
      text: "`review --pr` never approves",
    });
    const [second] = group(
      oneSection(
        "- [x] `quality.required-checks.named` `ci` is required · stage: foundation · check: `y`",
      ),
      "testing",
    ).lines;
    expect(second).toMatchObject({
      id: "quality.required-checks.named",
      text: "`ci` is required",
    });
  });

  it("reads a stage tag on either side of the check", () => {
    expect(group(CHECKLIST, "cloud").lines[0]).toMatchObject({
      text: "Infrastructure is described as code",
      stage: "hardening",
      check: "terraform validate",
    });
    const lines = group(
      oneSection(
        "- [x] Before · stage: building · check: `a` new",
        "- [x] After · check: `b` · stage: live new",
        "- [x] None · check: `c`",
      ),
      "testing",
    ).lines;
    expect(lines.map((l) => [l.text, l.stage, l.check, l.isNew])).toEqual([
      ["Before", "building", "a", true],
      ["After", "live", "b", true],
      ["None", null, "c", false],
    ]);
  });

  it("tells a section's n/a from a dropped control's n/a", () => {
    const legal = group(CHECKLIST, "legal");
    expect(legal).toEqual({
      name: "legal",
      na: "nothing is distributed and nobody's data is held",
      lines: [],
    });
    const data = group(CHECKLIST, "data");
    expect(data.na).toBeNull();
    expect(data.lines.map((l) => l.status)).toEqual(["pass", "n/a"]);
  });

  it("skips the format block and the template's placeholder lines", () => {
    const c = parseChecklist(CHECKLIST);
    const all = c.groups.flatMap((g) => g.lines);
    expect(all).toHaveLength(19);
    expect(all.some((l) => /<.*>/.test(l.text))).toBe(false);
    const template = parseChecklist(
      [
        "# Checklist",
        "",
        "Stage: <Foundation|Building|Hardening|Live> — decided by <the failing lines>",
        "",
        "    - [x] `<id>` <what must stay true> · stage: <stage> · check: <what was run>",
        "",
        "## accessibility",
        "",
        "- [x] `<id>` <what must stay true> · stage: <stage> · check: <what was run>",
        "- [ ] unchecked: <what must stay true> · stage: <stage> · check: <what>",
        "- n/a: <why nothing in this section applies to this repo>",
        "- n/a: `<id>` <why>",
        "",
        "## cicd",
      ].join("\n"),
    );
    expect(template.groups).toEqual([
      { name: "accessibility", na: null, lines: [] },
      { name: "cicd", na: null, lines: [] },
    ]);
  });

  it("leaves BACKLOG.md's Repo checklist as it was: no id, no stage tag, no section n/a", () => {
    const backlog = parseBacklog(
      [
        "## Repo checklist",
        "",
        "### Foundation",
        "",
        "- [x] `ci.workflow.present` CI present · check: `ls` new",
        "- n/a: nothing is deployed yet",
      ].join("\n"),
    );
    expect(backlog.checklist.source).toBe("BACKLOG.md");
    expect(backlog.checklist.groups).toEqual([
      {
        name: "Foundation",
        na: null,
        lines: [
          {
            text: "`ci.workflow.present` CI present",
            status: "pass",
            id: null,
            stage: null,
            check: "ls",
            isNew: true,
          },
          {
            text: "nothing is deployed yet",
            status: "n/a",
            id: null,
            stage: null,
            check: null,
            isNew: false,
          },
        ],
      },
    ]);
    expect(parseBacklog("## Next up\n").checklist.source).toBeNull();
  });
});

describe("the file source's checklist", { timeout: 30_000 }, () => {
  let moved: KitFixture;
  let unmoved: KitFixture;
  beforeAll(() => {
    moved = checklistFixture();
    unmoved = kitFixture();
  });
  afterAll(() => {
    moved.remove();
    unmoved.remove();
  });

  it("takes the checklist from CHECKLIST.md when the repo has one", async () => {
    const backlog = await readBacklog(moved.repo);
    expect(backlog?.checklist.source).toBe("CHECKLIST.md");
    expect(backlog?.checklist.stage).toBe("Foundation");
    expect(backlog?.checklist.groups.map((g) => g.name)).toEqual(SECTIONS);
    // The rest of the backlog still comes from BACKLOG.md.
    expect(backlog?.nextUp[0]).toMatch(/^Export the report as CSV/);
  });

  it("falls back to BACKLOG.md's Repo checklist without one", async () => {
    const backlog = await readBacklog(unmoved.repo);
    expect(backlog?.checklist.source).toBe("BACKLOG.md");
    expect(backlog?.checklist.stage).toBe("Building");
    expect(backlog?.checklist.groups.map((g) => g.name)).toEqual([
      "Foundation",
      "Building",
      "Hardening",
    ]);
  });

  it("Now's health takes the stage and counts from CHECKLIST.md", async () => {
    const backlog = await readBacklog(moved.repo);
    const health = nowHealth({ ...EMPTY_SNAPSHOT, backlog });
    expect(health).toMatchObject({
      stage: "Foundation",
      lastSetup: "2026-11-25, on main.",
      hasBacklog: true,
      counts: { pass: 14, fail: 2, unchecked: 2, na: 1 },
    });
  });
});

describe("this repo's CHECKLIST.md", () => {
  it("parses this repo's CHECKLIST.md: fifteen sections in order, as many lines as the file has under them, every non-n/a line with a stage", () => {
    const text = readFileSync(
      fileURLToPath(new URL("../../../../../CHECKLIST.md", import.meta.url)),
      "utf8",
    );
    const c = parseChecklist(text);
    expect(c.stage).toBe("Foundation");
    expect(c.lastSetup).toMatch(/^\d{4}-\d\d-\d\d/);
    expect(c.groups.map((g) => g.name)).toEqual(SECTIONS);

    // Every `- ` line under a `## ` heading is either a line or a section's n/a.
    const body = text.slice(text.search(/^## /m));
    const written = body.split(/\r?\n/).filter((l) => /^- /.test(l)).length;
    const lines = c.groups.flatMap((g) => g.lines);
    const sectionNa = c.groups.filter((g) => g.na !== null).length;
    expect(lines.length + sectionNa).toBe(written);
    expect(lines.length).toBeGreaterThan(0);

    for (const l of lines.filter((x) => x.status !== "n/a"))
      expect(l.stage, l.text).toMatch(/^(foundation|building|hardening|live)$/);
    for (const g of c.groups.filter((x) => x.na !== null))
      expect(g.lines, g.name).toEqual([]);
  });
});
