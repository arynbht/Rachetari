// The shell's own status on the display branch's line, in Now, Tasks and
// Checklist: the repo's background fetch ("fetched N s ago", or why it
// failed), and, when the shell runs live, the commit it runs and why it's
// behind develop.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { cardText, kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

const RUNNING = "d5e49a186c786d31cc2ee90994408780f049f139";
const TARGET = "cb8b60c0a1b2c3d4e5f60718293a4b5c6d7e8f90";
const BEHIND =
  "Live shell is behind: the build of cb8b60c failed; still running d5e49a1.";

let fx: KitFixture;
let launched: LaunchedApp | null = null;
let statusDir: string | null = null;

test.beforeEach(() => {
  fx = kitFixture();
});

test.afterEach(async () => {
  if (launched) await closeApp(launched);
  launched = null;
  fx.remove();
  if (statusDir) rmSync(statusDir, { recursive: true, force: true });
  statusDir = null;
});

async function open(env: Record<string, string> = {}): Promise<Page> {
  launched = await launchApp({
    repos: [{ path: fx.repo, name: "kit-repo" }],
    // Not live unless a test says so, whatever the runner's own env holds.
    env: { RIVETARI_LIVE_STATUS: "", ...env },
  });
  await launched.page.getByRole("button", { name: /^kit-repo/ }).click();
  return launched.page;
}

/** A view's panel: the others stay mounted, hidden. */
const panel = (page: Page, tab: string) =>
  page.getByRole("tabpanel", { name: tab });

async function showTab(page: Page, tab: string): Promise<void> {
  await page.getByRole("tab", { name: tab }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: tab }),
  ).toBeVisible();
}

const FETCHED = /^fetched \d+ (s|min) ago$/;

/** Now's header, from the window's top down to `height`. */
async function headerShot(
  page: Page,
  name: string,
  height = 280,
): Promise<void> {
  const dir = process.env.SCREENSHOT_DIR;
  if (!dir) return;
  await showTab(page, "Now");
  const width = await page.evaluate(() => window.innerWidth);
  await page.screenshot({
    path: join(dir, name),
    clip: { x: 0, y: 0, width, height },
  });
}

/** A live status file as scripts/live-shell.mjs writes it. */
function writeStatus(path: string, failure: unknown): void {
  writeFileSync(
    path,
    JSON.stringify({
      running: RUNNING,
      develop: TARGET,
      checkedAt: new Date().toISOString(),
      fetchError: null,
      failure,
    }),
  );
}

test("shows fetched N s ago, and it ticks", async () => {
  const page = await open();
  for (const tab of ["Now", "Tasks", "Checklist"]) {
    await showTab(page, tab);
    const fetched = panel(page, tab).getByText(FETCHED);
    await expect(fetched).toBeVisible();
    const first = await fetched.textContent();
    await expect(fetched).not.toHaveText(first ?? "", { timeout: 5000 });
    await expect(
      panel(page, tab).getByText("showing main", { exact: true }),
    ).toBeVisible();
    // Not live: no running commit, no warning.
    await expect(panel(page, tab).getByText(/^running /)).toHaveCount(0);
    await expect(
      panel(page, tab).getByText(/Live shell is behind/),
    ).toHaveCount(0);
    expect(await runAxe(page)).toEqual([]);
  }
});

test("a failing fetch shows in the header", async () => {
  const missing = join(fx.repo, "..", "no-such-remote");
  execFileSync("git", ["remote", "add", "gone", missing], { cwd: fx.repo });
  const page = await open();

  for (const tab of ["Now", "Tasks", "Checklist"]) {
    await showTab(page, tab);
    await expect(
      panel(page, tab).getByText(/^fetch failed: .*no-such-remote/),
    ).toBeVisible();
    expect(await runAxe(page)).toEqual([]);
  }
  // The repo's own error box stays the only alert.
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(page.getByRole("alert")).toContainText("Couldn't fetch");
  // Taller: the repo's error box sits above the tabs.
  await headerShot(page, "fetch-failed.png", 430);
});

test("a card pushed to the origin shows after the next background fetch, without reopening the repo", async () => {
  const page = await open({ RIVETARI_FETCH_INTERVAL_MS: "1000" });
  await expect(page.getByText("4 waiting", { exact: true })).toBeVisible();
  await expect(panel(page, "Now").getByText(FETCHED)).toBeVisible();

  fx.pushToOrigin(
    "T-0012",
    cardText({
      id: "T-0012",
      title: "feat: from the laptop",
      status: "draft",
      gate: "needs you",
    }),
  );
  await expect(page.getByText("5 waiting", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  expect(await runAxe(page)).toEqual([]);
});

test("shows the running commit and the behind warning from the live status, and neither without it", async () => {
  statusDir = mkdtempSync(join(tmpdir(), "rivetari-e2e-live-"));
  const statusFile = join(statusDir, "status.json");
  writeStatus(statusFile, {
    sha: TARGET,
    step: "build",
    reason: "exit 1",
    at: new Date().toISOString(),
  });
  const page = await open({ RIVETARI_LIVE_STATUS: statusFile });

  for (const tab of ["Now", "Tasks", "Checklist"]) {
    await showTab(page, tab);
    const header = panel(page, tab);
    await expect(
      header.getByText("running d5e49a1", { exact: true }),
    ).toBeVisible();
    await expect(header.getByText(BEHIND, { exact: true })).toBeVisible();
    await expect(header.getByText(FETCHED)).toBeVisible();
    expect(await runAxe(page)).toEqual([]);
  }
  await expect(page.getByRole("alert")).toHaveCount(0);
  await headerShot(page, "header.png");

  // The build passes: the warning goes, the running commit stays.
  writeStatus(statusFile, null);
  const now = panel(page, "Now");
  await expect(now.getByText(BEHIND)).toHaveCount(0, { timeout: 10_000 });
  await expect(now.getByText("running d5e49a1", { exact: true })).toBeVisible();

  // The file goes: nothing is said about a live shell.
  rmSync(statusFile);
  await expect(now.getByText(/^running /)).toHaveCount(0, { timeout: 10_000 });
});
