// The display branch in the header of Now, Tasks and Checklist: "showing
// develop" (from the newer of local and origin/develop), "showing main" with
// no develop, and a warning when the two develops have diverged.
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { BACKLOG, kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

const DIVERGED =
  "Local develop and origin/develop have diverged: showing this machine's develop.";

let fx: KitFixture;
let launched: LaunchedApp | null = null;

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

/** BACKLOG.md with `line` as Next up's first item. */
const backlogWith = (line: string) =>
  BACKLOG.replace("1. Export the report as CSV", `1. ${line}`);

async function open(): Promise<Page> {
  launched = await launchApp({
    repos: [{ path: fx.repo, name: "kit-repo" }],
  });
  await launched.page.getByRole("button", { name: /^kit-repo/ }).click();
  return launched.page;
}

/** A view's panel: the others stay mounted, hidden. */
const panel = (page: Page, tab: string) =>
  page.getByRole("tabpanel", { name: tab });

/** Each of Now, Tasks and Checklist names `branch` under its title. */
async function expectShowing(page: Page, branch: string): Promise<void> {
  for (const tab of ["Now", "Tasks", "Checklist"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: tab }),
    ).toBeVisible();
    await expect(
      panel(page, tab).getByText(`showing ${branch}`, { exact: true }),
    ).toBeVisible();
    expect(await runAxe(page)).toEqual([]);
  }
}

test.beforeEach(() => {
  fx = kitFixture();
});

test.afterEach(async () => {
  if (launched) await closeApp(launched);
  launched = null;
  fx.remove();
});

test("shows develop, ahead of origin, in the header of Now, Tasks and Checklist", async () => {
  fx.commitOnDevelop("origin", "BACKLOG.md", backlogWith("From origin"));
  git(fx.repo, "fetch", "-q", "origin");
  fx.commitOnDevelop("local", "BACKLOG.md", backlogWith("From this machine"));
  const page = await open();

  await expectShowing(page, "develop");
  await expect(page.getByText(DIVERGED)).toHaveCount(0);

  // Tasks shows local develop's Next up, not origin's.
  await page.getByRole("tab", { name: "Tasks" }).click();
  const board = page.getByRole("region", { name: "Board" });
  await expect(board.getByText("From this machine")).toBeVisible();
  await expect(board.getByText("From origin")).toHaveCount(0);

  const dir = process.env.SCREENSHOT_DIR;
  if (dir) {
    await page.getByRole("tab", { name: "Now" }).click();
    await expect(
      panel(page, "Now").getByText("showing develop", { exact: true }),
    ).toBeVisible();
    // Now's header: the window's top, down to the health strip.
    const width = await page.evaluate(() => window.innerWidth);
    await page.screenshot({
      path: join(dir, "showing-develop.png"),
      clip: { x: 0, y: 0, width, height: 280 },
    });
  }
});

test("a commit to local develop shows in Tasks without a fetch", async () => {
  fx.commitOnDevelop("local", "BACKLOG.md", backlogWith("First on develop"));
  const page = await open();
  await page.getByRole("tab", { name: "Tasks" }).click();
  const board = page.getByRole("region", { name: "Board" });
  await expect(board.getByText("First on develop")).toBeVisible();

  fx.commitOnDevelop("local", "BACKLOG.md", backlogWith("Merged just now"));
  await expect(board.getByText("Merged just now")).toBeVisible({
    timeout: 15_000,
  });
  await expect(board.getByText("First on develop")).toHaveCount(0);
  await expect(
    panel(page, "Tasks").getByText("showing develop", { exact: true }),
  ).toBeVisible();
  expect(await runAxe(page)).toEqual([]);
});

test("shows main in a repo with no develop", async () => {
  const page = await open();
  await expectShowing(page, "main");
});

test("warns when local and origin develop have diverged", async () => {
  fx.commitOnDevelop("origin", "BACKLOG.md", backlogWith("First"));
  git(fx.repo, "fetch", "-q", "origin");
  fx.commitOnDevelop("local", "BACKLOG.md", backlogWith("Mine"));
  fx.commitOnDevelop("origin", "BACKLOG.md", backlogWith("Theirs"));
  git(fx.repo, "fetch", "-q", "origin");
  const page = await open();

  await expectShowing(page, "develop");
  for (const tab of ["Now", "Tasks", "Checklist"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(panel(page, tab).getByText(DIVERGED)).toBeVisible();
  }
  await page.getByRole("tab", { name: "Tasks" }).click();
  await expect(
    page.getByRole("region", { name: "Board" }).getByText("Mine"),
  ).toBeVisible();
  expect(await runAxe(page)).toEqual([]);
});
