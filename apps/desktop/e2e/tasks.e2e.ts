// The Tasks view on a repo laid out the way the kit leaves it.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expect, type Locator, type Page, test } from "@playwright/test";

import { cardText, kitFixture, type KitFixture } from "../test/kit-fixture";
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
      scale: "css",
    });
}

/** The shell's default window, whatever frame this machine's OS draws round it. */
async function atWindowSize(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1140, height: 780 });
}

/** Whether the window's main area scrolls, down or sideways. */
const mainScrolls = (page: Page) =>
  page.locator("main").evaluate((el) => ({
    down: el.scrollHeight > el.clientHeight,
    sideways: el.scrollWidth > el.clientWidth,
  }));

/** The box an element takes on the page. */
async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("not on the page");
  return b;
}

test("the board has five columns with the line's loads, and Next up and Done as bands", async () => {
  const { page } = launched;
  await atWindowSize(page);
  await page.getByRole("tab", { name: "Tasks" }).click();
  const board = page.getByRole("region", { name: "Board" });
  await expect(board.locator("h4")).toHaveText([
    /^Next up 2\b/,
    "Draft + Ready 1/6",
    "In progress 1/3",
    "Blocked 2",
    "PR open 0/3",
    "Done 2",
  ]);
  await expect(board.locator("h5")).toHaveText(["Draft 1", "Ready 0"]);
  // Next up is a band: its count and first line, the rest on a click.
  const nextUp = board.getByRole("button", { name: /^Next up/ });
  await expect(nextUp).toHaveAttribute("aria-expanded", "false");
  await expect(nextUp).toContainText("Export the report as CSV");
  await expect(board.getByText("Dark mode for the settings page")).toHaveCount(
    0,
  );
  // Each card says what it waits on the owner for.
  await expect(board.getByRole("button", { name: /^T-0004/ })).toContainText(
    "Needs your approval",
  );
  await expect(board.getByRole("button", { name: /^T-0005/ })).toContainText(
    "1 open question",
  );
  await expect(board.getByText("Can't be read: card/T-0006")).toBeVisible();
  await expect(
    page.getByText(/Arrow keys move between cards, Enter opens one/),
  ).toBeVisible();
  expect(await mainScrolls(page)).toEqual({ down: false, sideways: false });
  await shot("1-board");
  expect(await runAxe(page)).toEqual([]);

  await nextUp.click();
  await expect(nextUp).toHaveAttribute("aria-expanded", "true");
  await expect(
    board.getByRole("button", { name: /Dark mode for the settings page/ }),
  ).toBeVisible();
});

/** Commit `count` done cards to main, each a day after the one before. */
function commitDoneCards(repo: string, count: number): void {
  const wt = join(repo, "..", "done-cards");
  execFileSync("git", ["-C", repo, "worktree", "add", "-q", wt, "main"]);
  // After the fixture's own done cards, which landed just now.
  const start = Date.now() + 86_400_000;
  for (let i = 0; i < count; i++) {
    const id = `T-${String(10 + i).padStart(4, "0")}`;
    const path = join(wt, "cards", "done", `${id}.md`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      cardText({
        id,
        title: `feat: done card ${i + 1}`,
        status: "done",
        pr: 10 + i,
      }),
    );
    const at = new Date(start + i * 86_400_000).toISOString();
    execFileSync("git", ["-C", wt, "add", "-A"]);
    execFileSync(
      "git",
      ["-C", wt, "commit", "-q", "-m", `chore(card): ${id} done`],
      { env: { ...process.env, GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at } },
    );
  }
  execFileSync("git", ["-C", repo, "worktree", "remove", "--force", wt]);
}

test("Done lists the latest five of 20, and History opens the History tab", async () => {
  const { page } = launched;
  commitDoneCards(fx.repo, 18);
  await atWindowSize(page);
  await page.getByRole("tab", { name: "Tasks" }).click();
  const done = page
    .getByRole("region", { name: "Board" })
    .getByRole("region", { name: /^Done/ });
  await expect(done.locator("h4")).toHaveText("Done 20");
  const rows = done.getByRole("button", { name: /^T-\d{4}/ });
  await expect(rows).toHaveCount(5);
  for (const [i, n] of [27, 26, 25, 24, 23].entries()) {
    await expect(rows.nth(i)).toHaveAccessibleName(new RegExp(`^T-00${n}`));
    await expect(rows.nth(i)).toContainText(`PR #${n}`);
    await expect(rows.nth(i)).toContainText(/\d{4}-\d{2}-\d{2}/);
  }
  expect(await mainScrolls(page)).toEqual({ down: false, sideways: false });
  await shot("4-done-20");
  expect(await runAxe(page)).toEqual([]);

  await done.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("tab", { name: "History" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("selecting a card collapses the board to the list, and Escape brings it back", async () => {
  const { page } = launched;
  await atWindowSize(page);
  await page.getByRole("tab", { name: "Tasks" }).click();
  const board = page.getByRole("region", { name: "Board" });
  const card = (id: string) =>
    board.getByRole("button", { name: new RegExp(`^${id}`) });

  // Left and Right across the columns that have cards, Up and Down within one.
  await card("T-0004").focus();
  await page.keyboard.press("ArrowRight");
  await expect(card("T-0003")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(card("T-0005")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(card("T-0006")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(card("T-0005")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(card("T-0003")).toBeFocused();
  await page.keyboard.press("Enter");

  const record = page.getByRole("region", { name: "T-0003 record" });
  await expect(record.getByText("Write the CSV writer's test.")).toBeVisible();
  await expect(board).toHaveCount(0);
  const list = page.getByRole("region", { name: "Cards" });
  await expect(list.locator("h4")).toHaveText([
    "Next up 2",
    "Draft + Ready 1/6",
    "In progress 1/3",
    "Blocked 2",
    "PR open 0/3",
    "Done 2",
  ]);
  const open = list.getByRole("button", { name: /^T-0003/ });
  await expect(open).toHaveAttribute("aria-current", "true");
  await expect(open).toBeFocused();
  // Two lines a row, the title in full.
  await expect(list.getByRole("button", { name: /^T-0004/ })).toContainText(
    "Needs your approval",
  );
  const titles = await list.locator("[data-title]").all();
  expect(titles.length).toBeGreaterThan(0);
  for (const title of titles)
    expect(await title.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );

  // The record's pane: room for its header and the answer buttons, scrolling
  // inside itself.
  const pane = page.locator("[data-pane=record]");
  const at = await box(pane);
  expect(at.width).toBeGreaterThanOrEqual(480);
  expect(at.y).toBeLessThanOrEqual(200);
  expect(at.y + at.height).toBeLessThanOrEqual(780);
  expect(await pane.evaluate((el) => getComputedStyle(el).overflowY)).toBe(
    "auto",
  );
  expect(await mainScrolls(page)).toEqual({ down: false, sideways: false });
  await shot("2-selected");
  expect(await runAxe(page)).toEqual([]);

  // Up and Down open the next card in the list.
  await open.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("region", { name: "T-0005 record" }),
  ).toBeVisible();
  await page.keyboard.press("ArrowUp");
  await expect(record).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(board).toBeVisible();
  await expect(record).toHaveCount(0);
  await expect(card("T-0003")).toBeFocused();
});

test("the selected-card list reaches every card, each with its status and holder", async () => {
  const { page } = launched;
  await page.getByRole("tab", { name: "Tasks" }).click();
  await page
    .getByRole("region", { name: "Board" })
    .getByRole("button", { name: /^T-0003/ })
    .click();
  const list = page.getByRole("region", { name: "Cards" });
  const rows: [string, string, string | null][] = [
    ["T-0004", "draft", null],
    ["T-0003", "in progress", "pc"],
    ["T-0005", "blocked", "laptop"],
    ["T-0006", "unreadable", null],
    ["T-0002", "done", null],
    ["T-0001", "done", null],
  ];
  for (const [id, status, holder] of rows) {
    const row = list.getByRole("button", { name: new RegExp(`^${id}`) });
    await expect(row).toContainText(status);
    if (holder) await expect(row).toContainText(`held by ${holder}`);
    await row.click();
    await expect(
      page.getByRole("region", { name: `${id} record` }),
    ).toBeVisible();
  }
});

test("Needs me shows only the waiting cards, each with what to do", async () => {
  const { page } = launched;
  await atWindowSize(page);
  await page.getByRole("tab", { name: "Tasks" }).click();
  const toggle = page.getByRole("button", { name: /^Needs me/ });
  await expect(toggle).toHaveAccessibleName("Needs me 3");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const needs = page.getByRole("region", { name: /^Needs me/ });
  const rows = needs.getByRole("button", { name: /^T-\d{4}/ });
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText(
    "Set Status to ready in CARD.md on card/T-0004.",
  );
  await expect(rows.nth(1)).toContainText(
    'Answer under "Questions for me" in CARD.md on card/T-0005',
  );
  await expect(rows.nth(2)).toContainText("Fix CARD.md on card/T-0006");
  // The columns, Next up and Done are hidden while it's on.
  await expect(page.getByRole("region", { name: "Board" })).toHaveCount(0);
  await expect(page.getByText("Export the report as CSV")).toHaveCount(0);
  expect(await mainScrolls(page)).toEqual({ down: false, sideways: false });
  await shot("5-needs-me");
  expect(await runAxe(page)).toEqual([]);

  await toggle.click();
  await expect(page.getByRole("region", { name: "Board" })).toBeVisible();
});

test("a card opens in full: criteria, scope, skills, questions, evidence and commits", async () => {
  const { page } = launched;
  await page.getByRole("tab", { name: "Tasks" }).click();
  await page
    .getByRole("region", { name: "Board" })
    .getByRole("button", { name: /T-0003/ })
    .click();
  const record = page.getByRole("region", { name: "T-0003 record" });
  await expect(record.getByText("Write the CSV writer's test.")).toBeVisible();
  await expect(record.getByText("ticked", { exact: true })).toBeVisible();
  await expect(record.getByText("unticked", { exact: true })).toBeVisible();
  await expect(record.getByText("`src/app.ts`")).toBeVisible();
  await expect(
    record.getByText("testing/test-driven-development"),
  ).toBeVisible();
  await expect(record.getByText("feat: the CSV button")).toBeVisible();
  // Evidence is collapsed until asked for.
  await expect(record.getByText("pnpm test -> 3 passed")).toBeHidden();
  await record.getByText("Show the evidence").click();
  await expect(record.getByText("pnpm test -> 3 passed")).toBeVisible();
  await shot("tasks-record");
  expect(await runAxe(page)).toEqual([]);
});

test("Open in Tasks from Now opens that card's record", async () => {
  const { page } = launched;
  await page.getByRole("button", { name: "Open T-0005 in Tasks" }).click();
  const record = page.getByRole("region", { name: "T-0005 record" });
  await expect(record).toBeVisible();
  await expect(
    record.getByText("Open: Round half up or half even?"),
  ).toBeVisible();
  await expect(record.getByText("chore(card): T-0005")).toBeVisible();
});
