// Copy all gives every open question in full: a question a card wraps over
// several lines reaches the clipboard's text whole, through the same path the
// shell takes (`parseCard` → `nowState(...).questions` → `openQuestionsText`).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseCard, questionParts } from "../kit/parse";
import type { LiveCard } from "../kit/source";
import { EMPTY_SNAPSHOT } from "../kit/watch";
import { openQuestionsText } from "../../shared/open-questions";
import { nowState } from "./now";

/** A fixture file, line ends read as LF. */
const fixture = (name: string) =>
  readFileSync(
    fileURLToPath(
      new URL(`../../../test/fixtures/copy-all/${name}`, import.meta.url),
    ),
    "utf8",
  ).replace(/\r\n/g, "\n");

/** T-0044's card as drafted (`git show 4e8a220:CARD.md`), verbatim. */
const T0044 = fixture("T-0044.CARD.md");
/** A card whose first question runs over 500 characters. */
const T0090 = fixture("T-0090.CARD.md");

/** `open-questions.md` after its `# Open questions` title. */
const EXPECTED = fixture("open-questions.md").replace(
  /^# Open questions\n\n/,
  "",
);

/** One card's section of EXPECTED, as Copy all writes it for that card alone. */
function sectionOf(id: string): string {
  const part = EXPECTED.split(/(?=^## )/m).find((p) =>
    p.startsWith(`## ${id} · `),
  );
  if (!part) throw new Error(`no section for ${id}`);
  return `${part.trimEnd()}\n`;
}

const crlf = (text: string) => text.replace(/\n/g, "\r\n");

function live(text: string): LiveCard {
  const card = parseCard(text);
  if (!card) throw new Error("the fixture card doesn't parse");
  return {
    branch: `card/${card.id}`,
    where: "remote",
    card,
    lastCommitAt: "2026-11-25T10:00:00Z",
  };
}

/** What Copy all puts on the clipboard for a repo holding these cards. */
function copyAll(...cards: string[]): string {
  const state = nowState(
    "/repo",
    { ...EMPTY_SNAPSHOT, cards: cards.map(live) },
    true,
    null,
  );
  return openQuestionsText(state.questions);
}

describe("Copy all", () => {
  it("reads a question written over several lines in full (multi-line)", () => {
    expect(T0044).not.toMatch(/\r/);
    expect(copyAll(T0044)).toBe(sectionOf("T-0044"));
    // The closed question 2 stays out.
    expect(copyAll(T0044)).not.toMatch(/Split CI state/);
  });

  it("gives a question of over 500 characters character for character", () => {
    const question = parseCard(T0090)?.questions[0];
    expect(question?.open).toBe(true);
    expect(question?.text.length).toBeGreaterThan(500);
    expect(question?.text).toMatch(/^\(answer individually\) /);
    expect(question?.text).toMatch(/`toISOString\(\)`/);
    expect(question?.text).toMatch(/\[RFC 3339 profile\]\(https:\/\/[^)]+\)/);
    expect(question?.text).toMatch(/ https:\/\/example\.test\/importer\/v2 /);
    expect(questionParts(question?.text ?? "").options).toHaveLength(2);
    expect(copyAll(T0090)).toBe(sectionOf("T-0090"));
  });

  it("gives two cards together exactly, with LF or CRLF line ends", () => {
    expect(copyAll(T0044, T0090)).toBe(EXPECTED);
    expect(copyAll(T0090, T0044)).toBe(EXPECTED);
    expect(copyAll(crlf(T0044), crlf(T0090))).toBe(EXPECTED);
  });
});
