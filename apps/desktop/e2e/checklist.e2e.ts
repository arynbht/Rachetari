// The Checklist view on a repo laid out the way the kit leaves it.
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { BACKLOG, kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

let fx: KitFixture;
let launched: LaunchedApp;

test.beforeEach(async () => {
  fx = kitFixture();
  launched = await launchApp({ repos: [{ path: fx.repo, name: "kit-repo" }] });
  await launched.page.getByRole("button", { name: /^kit-repo/ }).click();
  await launched.page.getByRole("tab", { name: "Checklist" }).click();
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

test("Checklist shows the stage, the totals and each line with its check", async () => {
  const { page } = launched;
  const stage = page.getByRole("region", { name: "Stage", exact: true });
  await expect(stage.getByText("Building", { exact: true })).toBeVisible();
  await expect(stage.getByText(/What decides it: .*README/)).toBeVisible();
  await expect(page.getByText(/last \/setup 2026-11-22/)).toBeVisible();

  const totals = page.getByRole("definition");
  await expect(totals).toHaveText(["3", "1", "1", "1", "6"]);

  // Groups with a failing or unchecked line start open; Hardening doesn't.
  await expect(
    page.getByRole("button", { name: /^Foundation/ }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: /^Building/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  const hardening = page.getByRole("button", { name: /^Hardening/ });
  await expect(hardening).toHaveAttribute("aria-expanded", "false");
  await hardening.click();
  await expect(page.getByText("nothing is deployed yet")).toBeVisible();

  await expect(page.getByText("pnpm build")).toBeVisible();
  await expect(page.getByText("new", { exact: true })).toBeVisible();
  await shot("checklist");
  expect(await runAxe(page)).toEqual([]);
});

test("Reload reads the backlog again, after the other machine's change is fetched", async () => {
  const { page } = launched;
  const stage = page.getByRole("region", { name: "Stage", exact: true });
  await expect(stage.getByText("Building", { exact: true })).toBeVisible();
  fx.commitOnOrigin(
    "BACKLOG.md",
    BACKLOG.replace("Stage: Building", "Stage: Hardening"),
  );
  execFileSync("git", ["fetch", "-q"], { cwd: fx.repo });
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(stage.getByText("Hardening", { exact: true })).toBeVisible();
});
