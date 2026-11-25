// Home's "Most gaps" fact: a repo whose checklist has moved to CHECKLIST.md
// shows its stage and the section with the most gaps; one still on
// BACKLOG.md's "Repo checklist" keeps its stage and says it has no sections.
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { checklistFixture } from "../test/checklist-fixture";
import { kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

let moved: KitFixture;
let unmoved: KitFixture;
let launched: LaunchedApp;

test.beforeEach(async () => {
  moved = checklistFixture();
  unmoved = kitFixture();
  launched = await launchApp({
    repos: [
      { path: moved.repo, name: "moved-repo" },
      { path: unmoved.repo, name: "unmoved-repo" },
    ],
  });
});

test.afterEach(async () => {
  await closeApp(launched);
  moved.remove();
  unmoved.remove();
});

/** The value of a repo card's fact, found by its label. */
const fact = (repo: string, label: string) =>
  launched.page
    .getByRole("article", { name: repo, exact: true })
    .locator("dl > div")
    .filter({
      has: launched.page.locator("dt", { hasText: new RegExp(`^${label}$`) }),
    })
    .locator("dd");

test("Home shows a moved repo's stage and its section with the most gaps", async () => {
  const { page } = launched;
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(fact("moved-repo", "Stage")).toHaveText("Foundation");
  await expect(fact("moved-repo", "Most gaps")).toHaveText(
    "testing · 2 failing · 1 unchecked",
  );
  expect(await runAxe(page)).toEqual([]);

  const dir = process.env.SCREENSHOT_DIR;
  if (dir) {
    await expect(fact("unmoved-repo", "Most gaps")).not.toHaveText("Reading…");
    await page.screenshot({
      path: join(dir, "home-sections.png"),
      fullPage: true,
    });
  }
});

test("an unmoved repo's card keeps its stage and says it has no sections yet", async () => {
  const { page } = launched;
  await expect(fact("unmoved-repo", "Stage")).toHaveText("Building");
  await expect(fact("unmoved-repo", "Most gaps")).toHaveText(
    "no sections yet: the checklist is in BACKLOG.md",
  );
  expect(await runAxe(page)).toEqual([]);
});
