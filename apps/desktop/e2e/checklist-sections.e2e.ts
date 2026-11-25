// The Checklist tab on a repo whose checklist has moved to CHECKLIST.md: the
// stage, the totals and one row per section, gaps first.
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { checklistFixture } from "../test/checklist-fixture";
import type { KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

let fx: KitFixture;
let launched: LaunchedApp;

test.beforeEach(async () => {
  fx = checklistFixture();
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

const AZ = [
  "accessibility",
  "cicd",
  "cloud",
  "data",
  "development",
  "documentation",
  "hygiene",
  "legal",
  "observability",
  "performance",
  "product",
  "quality",
  "security",
  "testing",
  "ux",
];
const GAPS_FIRST = [
  "testing",
  "cicd",
  ...AZ.filter((s) => !/^(testing|cicd)$/.test(s)),
];

/** The sections as shown, top to bottom. */
const order = (page: Page) =>
  page
    .locator("[data-section]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));

const section = (page: Page, name: string) =>
  page.locator(`[data-section="${name}"]`);

test("Checklist reads CHECKLIST.md: the totals and one row per section, gaps first", async () => {
  const { page } = launched;
  const stage = page.getByRole("region", { name: "Stage", exact: true });
  await expect(stage.getByText("Foundation", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/from CHECKLIST\.md · last \/setup 2026-11-25/),
  ).toBeVisible();

  await expect(
    page.getByLabel("Checklist totals").getByRole("definition"),
  ).toHaveText(["14", "2", "2", "1", "19"]);

  await expect(page.getByRole("heading", { level: 4 })).toHaveCount(15);
  expect(await order(page)).toEqual(GAPS_FIRST);

  // Each row's counts, labelled in their own columns.
  await expect(
    section(page, "testing").getByRole("button"),
  ).toHaveAccessibleName("testing 1 pass 2 fail 1 unchecked 0 n/a");
  await expect(section(page, "data").getByRole("button")).toHaveAccessibleName(
    "data 1 pass 0 fail 0 unchecked 1 n/a",
  );
  await shot("checklist-sections");
  expect(await runAxe(page)).toEqual([]);
});

test("a neglected section starts open and a full one closed, with each line's stage and check", async () => {
  const { page } = launched;
  const testing = section(page, "testing");
  await expect(testing.getByRole("button")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(section(page, "cicd").getByRole("button")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  const coverage = testing.getByRole("listitem").filter({
    hasText: "A coverage floor is set and met",
  });
  await expect(coverage.getByText("hardening", { exact: true })).toBeVisible();
  await expect(
    coverage.getByText("test.coverage-threshold", { exact: true }),
  ).toBeVisible();
  await expect(
    coverage.getByText("a person reads the coverage report"),
  ).toBeVisible();

  const security = section(page, "security");
  await expect(security.getByRole("button")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(section(page, "data").getByRole("button")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await security.getByRole("button").click();
  const secrets = security.getByRole("listitem").filter({
    hasText: "No secrets in the repo",
  });
  await expect(secrets.getByText("foundation", { exact: true })).toBeVisible();
  await expect(
    secrets.getByText("sec.no-secrets", { exact: true }),
  ).toBeVisible();
  await expect(
    secrets.getByText("gitleaks dir .", { exact: true }),
  ).toBeVisible();
  await expect(secrets.getByText("new", { exact: true })).toBeVisible();
  expect(await runAxe(page)).toEqual([]);
});

test("an n/a section is greyed with its reason, and an empty one says not assessed", async () => {
  const { page } = launched;
  const legal = section(page, "legal");
  await expect(legal).toHaveAttribute("data-state", "n/a");
  await expect(
    legal.getByText("n/a: nothing is distributed and nobody's data is held"),
  ).toBeVisible();
  await expect(legal.getByRole("button")).toHaveCount(0);
  await expect(
    legal.getByRole("heading", { level: 4, name: "legal" }),
  ).toBeVisible();

  const ux = section(page, "ux");
  await expect(ux).toHaveAttribute("data-state", "empty");
  await expect(ux.getByText("not assessed", { exact: true })).toBeVisible();
  await expect(ux.getByRole("button")).toHaveCount(0);
  expect(await runAxe(page)).toEqual([]);
});

test("Alphabetical orders the sections A to Z and back", async () => {
  const { page } = launched;
  const toggle = page.getByRole("button", { name: "Alphabetical" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await order(page)).toEqual(GAPS_FIRST);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(await order(page)).toEqual(AZ);
  expect(await runAxe(page)).toEqual([]);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await order(page)).toEqual(GAPS_FIRST);
});
