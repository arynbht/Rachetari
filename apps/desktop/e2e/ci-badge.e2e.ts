// A CI badge on each card with an open PR, in Tasks' board and Now's running
// rows. gh is the fake (test/fake-gh.mjs), named by RIVETARI_GH; the fixture's
// origin is a GitHub URL that git rewrites (insteadOf), so fetches stay offline.
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
const SHA = (n: number) => n.toString(16).repeat(40).slice(0, 40);

let fx: KitFixture;
let scratch: string;
let dataFile: string;
let launched: LaunchedApp | null = null;

type Outcome = "success" | "failure" | "running";

/** The fake's answer: an open PR per card branch, each with one run. */
function write(prs: Record<string, Outcome>): void {
  const entries = Object.entries(prs);
  writeFileSync(
    dataFile,
    JSON.stringify({
      runs: { develop: [] },
      allRuns: entries.map(([branch, outcome], i) => ({
        status: outcome === "running" ? "in_progress" : "completed",
        conclusion: outcome === "running" ? "" : outcome,
        headBranch: branch,
        headSha: SHA(i + 1),
        workflowName: "CI",
        event: "pull_request",
      })),
      pulls: entries.map(([branch], i) => ({
        number: 10 + i,
        url: `https://github.com/acme/kit/pull/${10 + i}`,
        ref: branch,
        sha: SHA(i + 1),
      })),
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
  scratch = mkdtempSync(join(tmpdir(), "rivetari-e2e-gh-"));
  dataFile = join(scratch, "gh.json");
  write({});
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
      RIVETARI_LIVE_STATUS: "",
      RIVETARI_GH: JSON.stringify([process.execPath, FAKE]),
      RIVETARI_CI_MIN_MS: "500",
      FAKE_GH_DATA: dataFile,
      FAKE_GH_MODE: "ok",
      ...env,
    },
  });
  await launched.page.getByRole("button", { name: /^kit-repo/ }).click();
  return launched.page;
}

async function showTab(page: Page, tab: string): Promise<void> {
  await page.getByRole("tab", { name: tab }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: tab }),
  ).toBeVisible();
}

async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env.SCREENSHOT_DIR;
  if (dir) await page.screenshot({ path: join(dir, name) });
}

const board = (page: Page) => page.getByRole("region", { name: "Board" });
const running = (page: Page) => page.getByRole("region", { name: "Running" });

test("a failing PR shows CI failed on its card", async () => {
  write({ "card/T-0003": "failure" });
  const page = await open();
  await showTab(page, "Now");
  const badge = running(page).getByRole("link", { name: "CI failed" });
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute(
    "href",
    "https://github.com/acme/kit/pull/10",
  );
  await expect(badge).toHaveClass(/text-amber-400/);
  await expect(page.getByRole("alert").filter({ hasText: /CI/ })).toHaveCount(
    0,
  );
  expect(await runAxe(page)).toEqual([]);
});

test("no PR: no badge", async () => {
  const page = await open();
  await showTab(page, "Now");
  await expect(
    running(page).getByText("feat: export the report as CSV"),
  ).toBeVisible();
  await showTab(page, "Tasks");
  await expect(board(page).getByText("feat: dark mode")).toBeVisible();
  // Long enough for a read to have landed, were there one.
  await page.waitForTimeout(2000);
  await expect(page.getByRole("link", { name: /^CI / })).toHaveCount(0);
  expect(await runAxe(page)).toEqual([]);
});

test("Tasks board: passed, failed and running badges", async () => {
  write({
    "card/T-0003": "success",
    "card/T-0004": "failure",
    "card/T-0005": "running",
    // Unreadable: no badge, whatever its PR.
    "card/T-0006": "failure",
  });
  const page = await open();
  await showTab(page, "Tasks");
  const links = board(page).getByRole("link", { name: /^CI / });
  await expect(
    board(page).getByRole("link", { name: "CI passed" }),
  ).toHaveCount(1);
  await expect(
    board(page).getByRole("link", { name: "CI failed" }),
  ).toHaveCount(1);
  await expect(
    board(page).getByRole("link", { name: "CI running" }),
  ).toHaveCount(1);
  await expect(links).toHaveCount(3);
  expect(await runAxe(page)).toEqual([]);
  await shot(page, "ci-badge-tasks.png");
});

test("Now: the running card's badge", async () => {
  write({ "card/T-0003": "success" });
  const page = await open();
  await showTab(page, "Now");
  await expect(
    running(page).getByRole("link", { name: "CI passed" }),
  ).toBeVisible();
  expect(await runAxe(page)).toEqual([]);
  await shot(page, "ci-badge-now.png");
});

test("badge follows the next background fetch", async () => {
  write({ "card/T-0003": "running" });
  const page = await open({ RIVETARI_FETCH_INTERVAL_MS: "1000" });
  await showTab(page, "Now");
  await expect(
    running(page).getByRole("link", { name: "CI running" }),
  ).toBeVisible();
  write({ "card/T-0003": "success" });
  await expect(
    running(page).getByRole("link", { name: "CI passed" }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    running(page).getByRole("link", { name: "CI running" }),
  ).toHaveCount(0);
});

test("gh not installed: no badges, views still work", async () => {
  write({ "card/T-0003": "success" });
  const page = await open({
    RIVETARI_GH: JSON.stringify([join(scratch, "no-such-gh")]),
  });
  await showTab(page, "Now");
  await expect(
    running(page).getByText("feat: export the report as CSV"),
  ).toBeVisible();
  await showTab(page, "Tasks");
  await expect(board(page).getByText("feat: dark mode")).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(page.getByRole("link", { name: /^CI / })).toHaveCount(0);
  expect(await runAxe(page)).toEqual([]);
});
