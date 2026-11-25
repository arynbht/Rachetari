// The shell frame: the window, the sidebar, the tab bar and the theme, before
// any view is built. Each tab is an honest placeholder that names its card.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

const TABS = ["Now", "Tasks", "Checklist", "History", "Map"];

let repo: string;
let launched: LaunchedApp;

test.beforeEach(async () => {
  repo = mkdtempSync(join(tmpdir(), "rachetari-frame-"));
  launched = await launchApp({ repos: [{ path: repo, name: "frame-repo" }] });
});

test.afterEach(async () => {
  await closeApp(launched);
  rmSync(repo, { recursive: true, force: true });
});

/** Save a screenshot for the PR when SCREENSHOT_DIR is set. */
async function shot(name: string): Promise<void> {
  const dir = process.env.SCREENSHOT_DIR;
  if (dir) await launched.page.screenshot({ path: join(dir, `${name}.png`) });
}

test("Home opens first, and the sidebar says sign-in is shelved", async () => {
  const { page } = launched;
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByText(/GitHub sign-in isn't built/)).toBeVisible();
  await shot("frame-home");
});

test("a repo opens on Now with the five tabs in order", async () => {
  const { page } = launched;
  await page.getByRole("button", { name: /^frame-repo/ }).click();
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveText(TABS);
  await expect(page.getByRole("tab", { name: "Now" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("heading", { name: "Now" })).toBeVisible();
  await shot("frame-repo-now");
  expect(await runAxe(page)).toEqual([]);
});

test("the tab bar moves with the arrow keys, Home and End, and wraps", async () => {
  const { page } = launched;
  await page.getByRole("button", { name: /^frame-repo/ }).click();
  await page.getByRole("tab", { name: "Now" }).focus();
  const selected = page.locator('[role="tab"][aria-selected="true"]');

  await page.keyboard.press("ArrowRight");
  await expect(selected).toHaveText("Tasks");
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await page.keyboard.press("End");
  await expect(selected).toHaveText("Map");
  await page.keyboard.press("ArrowRight");
  await expect(selected).toHaveText("Now");
  await page.keyboard.press("ArrowLeft");
  await expect(selected).toHaveText("Map");
  await page.keyboard.press("Home");
  await expect(selected).toHaveText("Now");
});

test("Settings holds only the theme, and the theme applies", async () => {
  const { page } = launched;
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText(/Anthropic/)).toHaveCount(0);
  await expect(page.getByText(/Check for updates/)).toHaveCount(0);

  await page.getByLabel("Theme").selectOption("light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await shot("frame-settings-light");
  await page.getByLabel("Theme").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await runAxe(page)).toEqual([]);
});
