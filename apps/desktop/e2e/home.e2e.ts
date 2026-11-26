// Home, the sidebar's badges and the OS notifications, on a kit-shaped repo.
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { cardText, kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

let fx: KitFixture;
let launched: LaunchedApp;

test.beforeEach(async () => {
  fx = kitFixture();
  launched = await launchApp({ repos: [{ path: fx.repo, name: "kit-repo" }] });
});

test.afterEach(async () => {
  await closeApp(launched);
  fx.remove();
});

type Notices = { repoPath: string; id: string; title: string }[];
const notices = () =>
  launched.app.evaluate(
    () =>
      (globalThis as unknown as { rachetariE2E: { notices: Notices } })
        .rachetariE2E.notices,
  );

test("Home shows each repo's live cards, what needs you, its stage and last night", async () => {
  const { page } = launched;
  await expect(
    page.getByText("1 repository · 4 live cards · 4 waiting on you"),
  ).toBeVisible();
  const card = page.getByRole("article", { name: "kit-repo" });
  await expect(card.getByText("T-0003 · in progress · pc")).toBeVisible();
  await expect(card.getByText("T-0005 · blocked · laptop")).toBeVisible();
  await expect(card.getByText("and 1 more")).toBeVisible();
  await expect(card.getByText("Building")).toBeVisible();
  await expect(card.getByText("2026-11-24 · 1 merged · 1 held")).toBeVisible();
  const dir = process.env.SCREENSHOT_DIR;
  if (dir) await page.screenshot({ path: join(dir, "home.png") });
  expect(await runAxe(page)).toEqual([]);

  await card.getByRole("button", { name: "Open kit-repo" }).click();
  await expect(page.getByRole("heading", { name: "Now" })).toBeVisible();
});

test("the sidebar counts what waits, and a new item raises a notification that opens it", async () => {
  const { page } = launched;
  const repoButton = page.getByRole("button", { name: /^kit-repo/ });
  await expect(repoButton).toContainText("4 waiting on you");
  // What was already waiting at launch raises nothing.
  await expect.poll(notices).toEqual([]);

  // Another machine pushes a new draft; the next fetch brings it in.
  fx.pushToOrigin(
    "T-0013",
    cardText({
      id: "T-0013",
      title: "feat: from the laptop",
      status: "draft",
      gate: "needs you",
    }),
  );
  execFileSync("git", ["fetch", "-q"], { cwd: fx.repo });

  await expect(repoButton).toContainText("5 waiting on you", {
    timeout: 20_000,
  });
  await expect.poll(notices).toEqual([
    {
      repoPath: fx.repo,
      id: "T-0013",
      title: "T-0013 needs you: approve the card",
    },
  ]);

  // Clicking it opens the repo on Now with the item in view.
  await launched.app.evaluate(() =>
    (
      globalThis as unknown as { rachetariE2E: { click: (i: number) => void } }
    ).rachetariE2E.click(0),
  );
  await expect(page.locator("#now-item-T-0013")).toBeFocused();
});
