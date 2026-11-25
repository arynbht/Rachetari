// The Map tab: the repo's floorplan/index.html in a fenced webview.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

let fx: KitFixture;
let bare: string;
let launched: LaunchedApp;

test.beforeEach(async () => {
  fx = kitFixture();
  // A map that asks for something outside floorplan/, which the fence blocks.
  writeFileSync(
    join(fx.repo, "floorplan", "index.html"),
    '<!doctype html><title>map</title><h1>The map</h1><img alt="" src="https://example.com/beacon.png">\n',
  );
  bare = mkdtempSync(join(tmpdir(), "rachetari-no-map-"));
  launched = await launchApp({
    repos: [
      { path: fx.repo, name: "kit-repo" },
      { path: bare, name: "no-map" },
    ],
  });
});

test.afterEach(async () => {
  await closeApp(launched);
  fx.remove();
  rmSync(bare, { recursive: true, force: true });
});

test("the map shows in its webview, and a request outside floorplan/ is blocked and listed", async () => {
  const { page } = launched;
  await page.getByRole("button", { name: /^kit-repo/ }).click();
  await page.getByRole("tab", { name: "Map" }).click();
  const webview = page.locator("webview");
  await expect(webview).toHaveAttribute("src", /floorplan\/index\.html$/);
  await expect(page.getByText("Blocked requests (1)")).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("list", { name: "Blocked requests" }),
  ).toContainText("https://example.com/beacon.png");
  const dir = process.env.SCREENSHOT_DIR;
  if (dir) await page.screenshot({ path: join(dir, "map.png") });
  expect(await runAxe(page)).toEqual([]);
});

test("with no map, the tab says none has been drawn yet", async () => {
  const { page } = launched;
  await page.getByRole("button", { name: /^no-map/ }).click();
  await page.getByRole("tab", { name: "Map" }).click();
  await expect(
    page.getByText("No map has been drawn for this repository yet."),
  ).toBeVisible();
  await expect(page.locator("webview")).toHaveCount(0);
  await expect(page.getByText(/floorplan: true|profile/)).toHaveCount(0);
});
