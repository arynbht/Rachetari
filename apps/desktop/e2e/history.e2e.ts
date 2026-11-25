// History and the Docs viewer on a repo laid out the way the kit leaves it.
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

let fx: KitFixture;
let launched: LaunchedApp;

test.beforeEach(async () => {
  fx = kitFixture();
  launched = await launchApp({ repos: [{ path: fx.repo, name: "kit-repo" }] });
  await launched.page.getByRole("button", { name: /^kit-repo/ }).click();
  await launched.page.getByRole("tab", { name: "History" }).click();
});

test.afterEach(async () => {
  await closeApp(launched);
  fx.remove();
});

async function shot(name: string): Promise<void> {
  const dir = process.env.SCREENSHOT_DIR;
  if (dir)
    await launched.page.screenshot({
      path: join(dir, `${name}.png`),
      fullPage: true,
    });
}

test("History lists the finished cards with filters, and a card opens in Tasks", async () => {
  const { page } = launched;
  await expect(page.getByText("2 finished · 1 night report")).toBeVisible();
  const table = page.getByRole("table", { name: /Finished cards/ });
  await expect(table.getByRole("rowheader")).toHaveText([
    "T-0002 · feat: add the report page",
    "T-0001 · chore: set up the workspace",
  ]);
  await expect(table.getByText("#2")).toBeVisible();
  await expect(page.getByRole("button", { name: "All (2)" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Done (2)" }).click();
  await expect(table.getByRole("rowheader")).toHaveCount(2);

  await table.getByRole("button", { name: /T-0002/ }).click();
  await expect(
    page.getByRole("region", { name: "T-0002 record" }),
  ).toBeVisible();
});

test("a night report opens and renders", async () => {
  const { page } = launched;
  await page.getByRole("button", { name: /2026-11-24/ }).click();
  const report = page.getByRole("article", { name: "Night report 2026-11-24" });
  await expect(report.getByRole("table")).toBeVisible();
  await expect(report.getByText("held: test failed twice")).toBeVisible();
  await shot("history");
});

test("History passes axe with the Docs viewer showing a backlog", async () => {
  const { page } = launched;
  await expect(page.getByRole("heading", { name: "Backlog" })).toBeVisible();
  expect(await runAxe(page)).toEqual([]);
});

test("the Docs viewer names each task-list checkbox done or not done", async () => {
  const { page } = launched;
  const docs = page.getByRole("region", { name: "Docs" });
  await expect(docs.getByRole("heading", { name: "Backlog" })).toBeVisible();
  const boxes = docs.getByRole("checkbox");
  const done = docs.getByRole("checkbox", { name: "done", exact: true });
  const notDone = docs.getByRole("checkbox", { name: "not done", exact: true });
  const doneCount = await done.count();
  const notDoneCount = await notDone.count();
  expect(doneCount).toBeGreaterThan(0);
  expect(notDoneCount).toBeGreaterThan(0);
  expect(doneCount + notDoneCount).toBe(await boxes.count());
  for (const box of await boxes.all()) await expect(box).toBeDisabled();
  for (const box of await done.all()) await expect(box).toBeChecked();
  for (const box of await notDone.all()) await expect(box).not.toBeChecked();
});

test("the Docs viewer lists the repo's Markdown and renders one", async () => {
  const { page } = launched;
  const docs = page.getByRole("region", { name: "Docs" });
  await docs.getByRole("button", { name: "README.md" }).click();
  await expect(
    docs.getByRole("heading", { name: "Fixture app" }),
  ).toBeVisible();
});
