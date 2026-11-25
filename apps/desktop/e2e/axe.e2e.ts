import { expect, test } from "@playwright/test";

import { kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, type LaunchedApp, runAxe } from "./helpers";

// axe-core accessibility checks on each screen. Fails on any serious/critical
// violation (missing labels, roles, contrast, etc.).
test.describe("accessibility (axe)", () => {
  let launched: LaunchedApp;
  let fx: KitFixture | undefined;

  test.afterEach(async () => {
    if (launched) await closeApp(launched);
    fx?.remove();
    fx = undefined;
  });

  test("each screen is free of serious/critical axe violations", async () => {
    fx = kitFixture();
    const repoPath = fx.repo;
    launched = await launchApp({
      repos: [{ path: repoPath, name: "sample-repo" }],
    });
    const { page } = launched;

    // No repo selected: Home.
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await expect(
      page.getByRole("article", { name: "sample-repo" }),
    ).toBeVisible();
    expect(await runAxe(page), "home").toEqual([]);

    await page
      .getByRole("button", { name: /sample-repo/ })
      .first()
      .click();
    // A repo opens on Now.
    await expect(
      page
        .locator("#panel-now")
        .getByRole("heading", { name: "Now", exact: true }),
    ).toBeVisible();
    expect(await runAxe(page), "now").toEqual([]);

    await page.getByRole("tab", { name: "Tasks" }).click();
    const tasks = page.locator("#panel-tasks");
    await expect(
      tasks.getByRole("heading", { name: "Tasks", exact: true }),
    ).toBeVisible();
    await expect(tasks.getByRole("region", { name: "Board" })).toBeVisible();
    expect(await runAxe(page), "tasks").toEqual([]);

    await page.getByRole("tab", { name: "Checklist" }).click();
    await expect(
      page
        .locator("#panel-checklist")
        .getByRole("region", { name: "Stage", exact: true })
        .getByText("Building", { exact: true }),
    ).toBeVisible();
    expect(await runAxe(page), "checklist").toEqual([]);

    await page.getByRole("tab", { name: "History" }).click();
    await expect(
      page.locator("#panel-history").getByRole("heading", { name: "Backlog" }),
    ).toBeVisible();
    expect(await runAxe(page), "history").toEqual([]);

    await page.getByRole("tab", { name: "Map" }).click();
    await expect(page.locator("#panel-map webview")).toHaveAttribute(
      "src",
      /floorplan\/index\.html$/,
    );
    expect(await runAxe(page), "map").toEqual([]);

    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(await runAxe(page), "settings").toEqual([]);
  });
});
