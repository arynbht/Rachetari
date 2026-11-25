import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const slopLines = (path: string): string[] => {
  const text = readFileSync(new URL(path, import.meta.url), "utf8");
  const [, section = ""] = text.split(/^## Slop\r?$/m);
  return section.split(/\r?\n/).filter((line) => line.startsWith("- "));
};

describe("the slop list", () => {
  it("is the same twelve lines in /setup's template and the deslop skill", () => {
    const template = slopLines("./setup/templates/CONSTRAINTS-slop.md");
    const skill = slopLines("../skills/quality/deslop/SKILL.md");
    expect(template).toHaveLength(12);
    expect(skill).toEqual(template);
  });
});
