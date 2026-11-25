// The Tasks view on a repo laid out the way the kit leaves it.
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

test("the board has the seven columns, with every card where it stands", async () => {
  const { page } = launched;
  await page.getByRole("tab", { name: "Tasks" }).click();
  const board = page.getByRole("region", { name: "Board" });
  const columns = board.locator("h4");
  await expect(columns).toHaveText([
    "Next up2",
    "Draft1",
    "Ready0",
    "In progress1",
    "Blocked2",
    "PR open0",
    "Done2",
  ]);
  await expect(board.getByText("Can't be read: card/T-0006")).toBeVisible();
  await shot("tasks-board");
  expect(await runAxe(page)).toEqual([]);
});

test("the list shows status, holder, branch and update, and the choice is kept", async () => {
  const { page } = launched;
  await page.getByRole("tab", { name: "Tasks" }).click();
  await page.getByRole("button", { name: "List" }).click();
  await expect(page.getByRole("button", { name: "List" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const table = page.getByRole("table");
  await expect(table.locator("th")).toHaveText([
    "Task",
    "Status",
    "Held by",
    "Branch",
    "Updated",
  ]);
  const row = table.getByRole("row", { name: /T-0005/ });
  await expect(row).toContainText("blocked");
  await expect(row).toContainText("laptop");
  await expect(row).toContainText("card/T-0005");
  await shot("tasks-list");

  // Another repo switch and back keeps the list: the choice is remembered.
  await page.getByRole("button", { name: "Home" }).click();
  await page.getByRole("button", { name: /^kit-repo/ }).click();
  await page.getByRole("tab", { name: "Tasks" }).click();
  await expect(page.getByRole("table")).toBeVisible();
});

test("a card opens in full: criteria, scope, skills, questions, evidence and commits", async () => {
  const { page } = launched;
  await page.getByRole("tab", { name: "Tasks" }).click();
  await page
    .getByRole("region", { name: "Board" })
    .getByRole("button", { name: /T-0003/ })
    .click();
  const record = page.getByRole("region", { name: "T-0003 record" });
  await expect(record.getByText("Write the CSV writer's test.")).toBeVisible();
  await expect(record.getByText("ticked", { exact: true })).toBeVisible();
  await expect(record.getByText("unticked", { exact: true })).toBeVisible();
  await expect(record.getByText("`src/app.ts`")).toBeVisible();
  await expect(
    record.getByText("testing/test-driven-development"),
  ).toBeVisible();
  await expect(record.getByText("feat: the CSV button")).toBeVisible();
  // Evidence is collapsed until asked for.
  await expect(record.getByText("pnpm test -> 3 passed")).toBeHidden();
  await record.getByText("Show the evidence").click();
  await expect(record.getByText("pnpm test -> 3 passed")).toBeVisible();
  await shot("tasks-record");
  expect(await runAxe(page)).toEqual([]);
});

test("Open in Tasks from Now opens that card's record", async () => {
  const { page } = launched;
  await page.getByRole("button", { name: "Open T-0005 in Tasks" }).click();
  const record = page.getByRole("region", { name: "T-0005 record" });
  await expect(record).toBeVisible();
  await expect(
    record.getByText("Open: Round half up or half even?"),
  ).toBeVisible();
  await expect(record.getByText("chore(card): T-0005")).toBeVisible();
});
