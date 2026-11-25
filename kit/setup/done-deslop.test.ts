import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const done = read("./templates/skills/done/SKILL.md");
const setup = read("./SKILL.md");
const deslop = "skills/quality/deslop/SKILL.md";

describe("/done's deslop step", () => {
  it("names only files that sit beside it in the done template", () => {
    const names = [...done.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/([\w.-]+)/g)].map(
      ([, name]) => name,
    );
    expect(names).toContain("comment-report.mjs");
    for (const name of names)
      expect(
        existsSync(new URL(`./templates/skills/done/${name}`, import.meta.url)),
        name,
      ).toBe(true);
  });

  it("reads the deslop skill where /setup copies it, and it exists here", () => {
    expect(done).toContain(deslop);
    expect(setup).toContain("`skills/quality/deslop/`");
    expect(existsSync(new URL(`../../${deslop}`, import.meta.url))).toBe(true);
  });
});
