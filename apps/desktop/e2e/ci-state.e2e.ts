// The repo on show's CI, read through gh, on its own line under "showing
// develop" in Now, Tasks and Checklist. gh is the fake (test/fake-gh.mjs),
// named by RACHETARI_GH; the fixture's origin is a GitHub URL that git
// rewrites (insteadOf) to the local origin, so fetches stay offline.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Page, test } from "@playwright/test";

import { kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

const FAKE = join(
  dirname(fileURLToPath(import.meta.url)),
  "../test/fake-gh.mjs",
);
const GITHUB_URL = "https://github.com/acme/kit.git";
const SHA = "a1b1ca7abbf00a895ef3ff2b9f4cd304ec0e44fd";
const SHA2 = "b2c2d8b0a1b2c3d4e5f60718293a4b5c6d7e8f90";
const TABS = ["Now", "Tasks", "Checklist"];

let fx: KitFixture;
let scratch: string;
let dataFile: string;
let launched: LaunchedApp | null = null;

/** The fake's answer: develop's last run, as given. */
function writeRun(conclusion: string, sha = SHA): void {
  writeFileSync(
    dataFile,
    JSON.stringify({
      runs: {
        develop: [
          {
            databaseId: 7,
            status: "completed",
            conclusion,
            headSha: sha,
            url: "https://github.com/acme/kit/actions/runs/7",
          },
        ],
      },
      allRuns: [],
      pulls: [],
    }),
  );
}

test.beforeEach(() => {
  fx = kitFixture();
  fx.commitOnDevelop("local", "notes.md", "develop\n");
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: fx.repo });
  git("remote", "set-url", "origin", GITHUB_URL);
  git("config", `url.${fx.origin}.insteadOf`, GITHUB_URL);
  scratch = mkdtempSync(join(tmpdir(), "rachetari-e2e-gh-"));
  dataFile = join(scratch, "gh.json");
  writeRun("success");
});

test.afterEach(async () => {
  if (launched) await closeApp(launched);
  launched = null;
  fx.remove();
  rmSync(scratch, { recursive: true, force: true });
});

async function open(env: Record<string, string> = {}): Promise<Page> {
  launched = await launchApp({
    repos: [{ path: fx.repo, name: "kit-repo" }],
    env: {
      RACHETARI_LIVE_STATUS: "",
      RACHETARI_GH: JSON.stringify([process.execPath, FAKE]),
      RACHETARI_CI_MIN_MS: "500",
      FAKE_GH_DATA: dataFile,
      FAKE_GH_MODE: "ok",
      ...env,
    },
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

/** Now's header, from the window's top down, when SCREENSHOT_DIR is set. */
async function headerShot(page: Page, name: string): Promise<void> {
  const dir = process.env.SCREENSHOT_DIR;
  if (!dir) return;
  await showTab(page, "Now");
  const width = await page.evaluate(() => window.innerWidth);
  await page.screenshot({
    path: join(dir, name),
    clip: { x: 0, y: 0, width, height: 300 },
  });
}

/** Each tab shows `line`, the branch line above it, no CI alert, axe clean. */
async function shownInEveryTab(page: Page, line: string): Promise<void> {
  for (const tab of TABS) {
    await showTab(page, tab);
    await expect(
      panel(page, tab).getByText(line, { exact: true }),
    ).toBeVisible();
    await expect(
      panel(page, tab).getByText("showing develop", { exact: true }),
    ).toBeVisible();
    expect(await runAxe(page)).toEqual([]);
  }
  await expect(page.getByRole("alert").filter({ hasText: /CI/ })).toHaveCount(
    0,
  );
}

test("shows develop's passing run from gh", async () => {
  const page = await open();
  await shownInEveryTab(page, "CI on develop: passed · a1b1ca7");
  await headerShot(page, "ci-passed.png");
});

test("shows a failing run after the next background fetch", async () => {
  const page = await open({ RACHETARI_FETCH_INTERVAL_MS: "1000" });
  await showTab(page, "Now");
  const now = panel(page, "Now");
  await expect(
    now.getByText("CI on develop: passed · a1b1ca7", { exact: true }),
  ).toBeVisible();

  writeRun("failure", SHA2);
  const failed = now.getByText("CI on develop: failed · b2c2d8b", {
    exact: true,
  });
  await expect(failed).toBeVisible({ timeout: 20_000 });
  // The state, not the whole line, takes the warning colour.
  await expect(failed.getByText("failed", { exact: true })).toHaveClass(
    /text-amber-400/,
  );
  await shownInEveryTab(page, "CI on develop: failed · b2c2d8b");
  await headerShot(page, "ci-failed.png");
});

test("not signed in: the quiet line, and the rest of the view works", async () => {
  const page = await open({ FAKE_GH_MODE: "signed-out" });
  await shownInEveryTab(page, "CI unknown: gh not signed in");
  // The rest of the view still reads: Now's waiting count is there.
  await showTab(page, "Now");
  await expect(page.getByText(/^\d+ waiting$/).first()).toBeVisible();
  await headerShot(page, "ci-needs-gh.png");
});

test("gh not installed: the same line", async () => {
  const page = await open({
    RACHETARI_GH: JSON.stringify([join(scratch, "no-such-gh")]),
  });
  await shownInEveryTab(page, "CI unknown: gh not signed in");
});

test("no RACHETARI_GH under E2E: no CI line", async () => {
  const page = await open({ RACHETARI_GH: "" });
  for (const tab of TABS) {
    await showTab(page, tab);
    await expect(
      panel(page, tab).getByText("showing develop", { exact: true }),
    ).toBeVisible();
    expect(await runAxe(page)).toEqual([]);
  }
  // Long enough for a read to have landed, were there one.
  await page.waitForTimeout(3000);
  await expect(page.getByText(/^CI (on |unknown|state couldn)/)).toHaveCount(0);
});
