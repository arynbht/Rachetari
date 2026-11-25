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

test("the Docs viewer shows each task-list item's tick as text", async () => {
  const { page } = launched;
  const docs = page.getByRole("region", { name: "Docs" });
  await expect(docs.getByRole("heading", { name: "Backlog" })).toBeVisible();
  await expect(docs.locator("input")).toHaveCount(0);

  // The fixture's checklist: "It builds" is ticked, "README says how to run it" is not.
  const items = docs.getByRole("listitem");
  const ticked = items.filter({ hasText: "It builds" });
  const unticked = items.filter({ hasText: "README says how to run it" });
  await expect(ticked).toHaveText(/^☑\s*done\s+It builds/);
  await expect(unticked).toHaveText(
    /^☐\s*not done\s+README says how to run it/,
  );

  // The box is what the eye reads; "done" / "not done" is what a screen reader reads.
  await expect(ticked.getByText("☑", { exact: true })).toBeVisible();
  await expect(unticked.getByText("☐", { exact: true })).toBeVisible();
  const doneLabel = ticked.getByText("done", { exact: true });
  const notDoneLabel = unticked.getByText("not done", { exact: true });
  for (const label of [doneLabel, notDoneLabel]) {
    await expect(label).toHaveClass(/\bsr-only\b/);
    await expect(label).toHaveCSS("position", "absolute");
    await expect(label).toHaveCSS("width", "1px");
  }
  expect(await ticked.ariaSnapshot()).toContain("done It builds");
  expect(await ticked.ariaSnapshot()).not.toContain("☑");
  expect(await unticked.ariaSnapshot()).toContain("not done README says");

  // Every box in the doc carries its words: one "done" per ☑, one "not done" per ☐.
  const boxes = await docs.getByText(/^[☑☐]$/).allTextContents();
  expect(boxes.filter((b) => b === "☑").length).toBeGreaterThan(0);
  expect(boxes.filter((b) => b === "☐").length).toBeGreaterThan(0);
  await expect(docs.getByText("done", { exact: true })).toHaveCount(
    boxes.filter((b) => b === "☑").length,
  );
  await expect(docs.getByText("not done", { exact: true })).toHaveCount(
    boxes.filter((b) => b === "☐").length,
  );
  await shot("history-backlog");
});

test("the Docs viewer lists the repo's Markdown and renders one", async () => {
  const { page } = launched;
  const docs = page.getByRole("region", { name: "Docs" });
  await docs.getByRole("button", { name: "README.md" }).click();
  await expect(
    docs.getByRole("heading", { name: "Fixture app" }),
  ).toBeVisible();
});
