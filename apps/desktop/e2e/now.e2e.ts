// The Now view on a repo laid out the way the kit leaves it.
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

test("Now shows what waits on you, each with what to do and where", async () => {
  const { page } = launched;
  const needsYou = page.getByRole("region", { name: /Needs you/ });
  await expect(page.getByText("4 waiting")).toBeVisible();
  await expect(
    needsYou.getByText("Set Status to ready in CARD.md on card/T-0004."),
  ).toBeVisible();
  await expect(needsYou.getByText("Round half up or half even?")).toBeVisible();
  await expect(
    needsYou.getByText(
      "Read nights/2026-11-24.md, then fix or re-plan T-0009 on card/T-0009.",
    ),
  ).toBeVisible();
  await expect(needsYou.getByText("Card can't be read")).toBeVisible();
  await shot("now");
  expect(await runAxe(page)).toEqual([]);
});

test("Now shows the card in progress, the health and the recent events", async () => {
  const { page } = launched;
  const running = page.getByRole("region", { name: "Running" });
  await expect(
    running.getByText("feat: export the report as CSV"),
  ).toBeVisible();
  await expect(running.getByText(/held by pc · last commit/)).toBeVisible();
  await expect(running.getByText("Write the CSV writer's test.")).toBeVisible();

  const health = page.getByRole("region", { name: "Health" });
  await expect(health.getByText("Building")).toBeVisible();
  await expect(health.getByText("3 pass · 1 fail · 1 unchecked")).toBeVisible();
  await expect(health.getByText("2 skills in the index")).toBeVisible();
  await expect(health.getByText("1 merged · 1 held")).toBeVisible();

  const recent = page.getByRole("region", { name: "Recent" });
  await recent.getByRole("button", { name: /feat: the CSV button/ }).click();
  await expect(page.getByRole("tab", { name: "Tasks" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("a card pushed to the repo shows up without reopening it", async () => {
  const { page } = launched;
  await expect(page.getByText("4 waiting")).toBeVisible();
  // Another machine's card arrives with the next fetch; here the local branch
  // appears directly, as the watcher's next read would see it.
  const { execFileSync } = await import("node:child_process");
  execFileSync("git", ["branch", "card/T-0012", "card/T-0004"], {
    cwd: fx.repo,
  });
  // The copy is a second draft with the same id, so it shows as a second item.
  await expect(page.getByText("5 waiting")).toBeVisible({ timeout: 20_000 });
});
