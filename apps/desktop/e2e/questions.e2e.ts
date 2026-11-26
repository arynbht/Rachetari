// The Questions panel on Now: one row per open question, grouped by card, and
// "Copy all", which puts them on the clipboard in open-questions.md's format.
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { cardText, kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

let fx: KitFixture;
let launched: LaunchedApp;

const QUESTIONS = [
  "- [ ] Which file holds the answers? — Recommended: `src/answers.ts`. Options: `src/panel.ts`; a new package.",
  "- [x] Already answered? — Recommended: yes.",
  "- [ ] Commit, or commit and push? — Recommended: commit only.",
];

test.beforeEach(async () => {
  fx = kitFixture();
  // Another machine's card with two open questions; a fetch brings it in.
  fx.pushToOrigin(
    "T-0014",
    cardText({
      id: "T-0014",
      title: "feat: answer from the panel",
      status: "in progress",
      heldBy: "laptop",
      question: "PLACEHOLDER",
    }).replace("- [ ] PLACEHOLDER", QUESTIONS.join("\n")),
  );
  execFileSync("git", ["fetch", "-q"], { cwd: fx.repo });
  launched = await launchApp({ repos: [{ path: fx.repo, name: "kit-repo" }] });
  await launched.page.getByRole("button", { name: /^kit-repo/ }).click();
});

test.afterEach(async () => {
  await closeApp(launched);
  fx.remove();
});

test("the Questions panel shows one row per open question, grouped by card, each with its recommendation", async () => {
  const { page } = launched;
  const panel = page.getByRole("region", { name: "Questions", exact: true });

  const blocked = panel.getByRole("group", {
    name: "T-0005 · fix: the export rounds wrong",
  });
  await expect(blocked.getByRole("listitem")).toHaveCount(1);
  await expect(blocked.getByText("Round half up or half even?")).toBeVisible();
  await expect(blocked.getByText("No recommendation written")).toBeVisible();

  const shaped = panel.getByRole("group", {
    name: "T-0014 · feat: answer from the panel",
  });
  const rows = shaped.getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Which file holds the answers?");
  await expect(rows.nth(0)).toContainText("Recommended: src/answers.ts");
  await expect(rows.nth(0)).toContainText("src/panel.ts");
  await expect(rows.nth(0)).toContainText("a new package");
  await expect(rows.nth(1)).toContainText("Commit, or commit and push?");
  await expect(rows.nth(1)).toContainText("Recommended: commit only");
  await expect(panel.getByText("Already answered?")).toHaveCount(0);

  // Cards in id order, and Copy all plus only the named answer controls.
  const headings = await panel
    .getByRole("heading", { level: 4 })
    .allTextContents();
  expect(headings).toEqual([
    "T-0005 · fix: the export rounds wrong",
    "T-0014 · feat: answer from the panel",
  ]);
  await expect(panel.getByRole("button", { name: "Copy all" })).toBeVisible();
  const names = await panel.getByRole("button").allTextContents();
  expect(names.filter((n) => n.trim() === "Copy all")).toHaveLength(1);
  for (const n of names.filter((n) => n.trim() !== "Copy all"))
    expect(n).toMatch(/^(Accept all recommended|Accept recommended|Answer)/);

  // Needs you is unchanged: still one question item per card.
  await expect(page.getByText("5 waiting", { exact: true })).toBeVisible();

  const dir = process.env.SCREENSHOT_DIR;
  if (dir) {
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(dir, "questions.png"), fullPage: true });
  }
  expect(await runAxe(page)).toEqual([]);
});

test("Copy all puts every open question on the clipboard in open-questions.md's format", async () => {
  const { app, page } = launched;
  await app.evaluate(({ clipboard }) => clipboard.writeText(""));
  const panel = page.getByRole("region", { name: "Questions", exact: true });
  await panel.getByRole("button", { name: "Copy all" }).click();
  await expect(panel.getByRole("status")).toHaveText("Copied");

  const expected = [
    "## T-0005 · fix: the export rounds wrong",
    "",
    "1. Round half up or half even?",
    "",
    "Answer:",
    "",
    "## T-0014 · feat: answer from the panel",
    "",
    "1. Which file holds the answers? — Recommended: `src/answers.ts`. Other options: `src/panel.ts`; a new package.",
    "2. Commit, or commit and push? — Recommended: commit only.",
    "",
    "Answer:",
    "",
  ].join("\n");
  // Chromium writes Windows' clipboard with CRLF line ends; the text is the same.
  await expect
    .poll(async () =>
      (await app.evaluate(({ clipboard }) => clipboard.readText())).replace(
        /\r\n/g,
        "\n",
      ),
    )
    .toBe(expected);
});
