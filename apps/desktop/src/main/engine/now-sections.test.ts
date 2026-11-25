// Now's health on a checklist read from CHECKLIST.md: the section with the
// most gaps, which Home shows beside the stage.
import { describe, expect, it } from "vitest";

import { CHECKLIST } from "../../../test/checklist-fixture";
import { type Backlog, parseBacklog, parseChecklist } from "../kit/parse";
import { EMPTY_SNAPSHOT } from "../kit/watch";
import { nowHealth } from "./now";

/** Now's health on a backlog whose checklist is the given CHECKLIST.md. */
const healthOn = (checklistMd: string) => {
  const backlog: Backlog = {
    nextUp: [],
    parked: [],
    checklist: parseChecklist(checklistMd),
  };
  return nowHealth({ ...EMPTY_SNAPSHOT, backlog });
};

/** A CHECKLIST.md with the given sections, each with its lines. */
const checklistMd = (sections: Record<string, string[]>) =>
  [
    "# Checklist",
    "",
    "Stage: Building — decided by the testing lines",
    "",
    ...Object.entries(sections).flatMap(([name, lines]) => [
      `## ${name}`,
      "",
      ...lines,
      "",
    ]),
  ].join("\n");

const PASS = "- [x] It passes · stage: foundation · check: `true`";
const FAIL = "- [ ] It fails · stage: foundation · check: `false` (no)";
const UNCHECKED =
  "- [ ] unchecked: Nobody looked · stage: building · check: a person reads it";

describe("nowHealth's sections", () => {
  it("picks the section with the most gaps from the fixture CHECKLIST.md: testing, 2 failing, 1 unchecked", () => {
    expect(healthOn(CHECKLIST).sections).toEqual({
      worst: { name: "testing", fail: 2, unchecked: 1 },
    });
  });

  it("breaks a tie by more fails, then A to Z", () => {
    const byFails = checklistMd({
      alpha: [FAIL, UNCHECKED],
      beta: [FAIL, FAIL, PASS],
    });
    expect(healthOn(byFails).sections?.worst).toEqual({
      name: "beta",
      fail: 2,
      unchecked: 0,
    });
    const byName = checklistMd({
      zulu: [FAIL, UNCHECKED],
      mike: [UNCHECKED, FAIL],
      echo: [UNCHECKED],
    });
    expect(healthOn(byName).sections?.worst).toEqual({
      name: "mike",
      fail: 1,
      unchecked: 1,
    });
  });

  it("has no worst section when every section is clear", () => {
    const clear = checklistMd({
      security: [PASS, PASS],
      legal: ["- n/a: nobody's data is held"],
      ux: [],
    });
    expect(healthOn(clear).sections).toEqual({ worst: null });
  });

  it("has no sections on a BACKLOG.md checklist", () => {
    const backlog = parseBacklog(
      ["## Repo checklist", "", "### Foundation", "", FAIL, UNCHECKED].join(
        "\n",
      ),
    );
    expect(backlog.checklist.source).toBe("BACKLOG.md");
    expect(nowHealth({ ...EMPTY_SNAPSHOT, backlog }).sections).toBeNull();
    // With no backlog at all, there is no checklist either.
    expect(nowHealth(EMPTY_SNAPSHOT).sections).toBeNull();
  });
});
