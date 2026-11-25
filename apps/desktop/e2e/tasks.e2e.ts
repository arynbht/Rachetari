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

/**
 * Commit `count` done cards to the origin's main, each a day after the one
 * before, and fetch them: with no develop, Tasks shows origin/main.
 */
function commitDoneCards(count: number): void {
  // After the fixture's own done cards, which landed just now.
  const start = Date.now() + 86_400_000;
  for (let i = 0; i < count; i++) {
    const id = `T-${String(10 + i).padStart(4, "0")}`;
    const path = join(fx.origin, "cards", "done", `${id}.md`);
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
    execFileSync("git", ["-C", fx.origin, "add", "-A"]);
    execFileSync(
      "git",
      ["-C", fx.origin, "commit", "-q", "-m", `chore(card): ${id} done`],
      { env: { ...process.env, GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at } },
    );
  }
  execFileSync("git", ["-C", fx.repo, "fetch", "-q", "origin"]);
}

test("Done lists the latest five of 20, and History opens the History tab", async () => {
  const { page } = launched;
  commitDoneCards(18);
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
  for (const name of ["Board", /^Next up/, /^Done/])
    await expect(page.getByRole("region", { name })).toHaveCount(0);
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
  // Evidence is collapsed until asked for.
  await expect(record.getByText("pnpm test -> 3 passed")).toBeHidden();
  await record.getByRole("tab", { name: "Evidence" }).click();
  await expect(record.getByText("pnpm test -> 3 passed")).toBeVisible();
  await record.getByRole("tab", { name: "Commits" }).click();
  await expect(record.getByText("feat: the CSV button")).toBeVisible();
  await shot("tasks-record");
  expect(await runAxe(page)).toEqual([]);
});

test("Open in Tasks from Now opens that card's record", async () => {
  const { page } = launched;
  await page.getByRole("button", { name: "Open T-0005 in Tasks" }).click();
  const record = page.getByRole("region", { name: "T-0005 record" });
  await expect(record).toBeVisible();
  await expect(
    record
      .getByRole("group", { name: /open question/ })
      .getByText("Round half up or half even?"),
  ).toBeVisible();
  await record.getByRole("tab", { name: "Commits" }).click();
  await expect(record.getByText("chore(card): T-0005")).toBeVisible();
});

/** Push a card to the origin and fetch it, as another machine's card. */
function pushCard(id: string, text: string): void {
  fx.pushToOrigin(id, text);
  execFileSync("git", ["-C", fx.repo, "fetch", "-q", "origin"]);
}

/** Open a card's record from the board. */
async function openRecord(page: Page, id: string): Promise<Locator> {
  await page.getByRole("tab", { name: "Tasks" }).click();
  await page
    .getByRole("region", { name: "Board" })
    .getByRole("button", { name: new RegExp(`^${id}`) })
    .click();
  const record = page.getByRole("region", { name: `${id} record` });
  await expect(record).toBeVisible();
  return record;
}

test("the record header fits at 1140×780 and stays put while the record scrolls", async () => {
  const { page } = launched;
  const title =
    "feat: the totals row on the monthly export rounds each line half even and says which rule it used in a footnote below it";
  const nextStep =
    "Write the failing test for the totals row first: a report of three lines whose cents round differently half up and half even, " +
    "checked against the bank's own statement for the same month. Then change the totals writer so it rounds each line half even, " +
    "sums the rounded lines and writes the rule it used in a footnote under the row. Run the CSV and the PDF export again and " +
    "compare both with the statement before moving on to the footnote's wording. Push the branch and paste what you ran under Evidence.";
  expect(title).toHaveLength(120);
  expect(nextStep.length).toBeGreaterThanOrEqual(500);
  pushCard(
    "T-0060",
    cardText({
      id: "T-0060",
      title,
      status: "in progress",
      heldBy: "laptop",
      nextStep,
      pr: 9,
    }),
  );
  await atWindowSize(page);
  const record = await openRecord(page, "T-0060");

  const header = record.locator("[data-record=header]");
  const heading = header.getByRole("heading", { level: 3 });
  await expect(heading).toHaveText(`T-0060 ${title}`);
  for (const text of [
    "Status",
    "in progress",
    "Held by",
    "laptop",
    "PR",
    "#9, draft",
    "Branch",
    "card/T-0060",
    "Next step",
  ])
    await expect(header).toContainText(text);

  // Wholly inside the window, short, not scrolling in itself, the title whole.
  const at = await box(header);
  expect(at.y).toBeGreaterThanOrEqual(0);
  expect(at.x + at.width).toBeLessThanOrEqual(1140);
  expect(at.y + at.height).toBeLessThanOrEqual(780);
  expect(at.height).toBeLessThanOrEqual(220);
  expect(
    await header.evaluate((el) => el.scrollHeight <= el.clientHeight),
  ).toBe(true);
  expect(
    await heading.evaluate(
      (el) =>
        el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight,
    ),
  ).toBe(true);
  // The next step takes two lines at most here; the Card tab has it in full.
  expect(
    await header
      .locator("[data-next-step]")
      .evaluate(
        (el) =>
          el.getBoundingClientRect().height <=
          2 * parseFloat(getComputedStyle(el).lineHeight) + 1,
      ),
  ).toBe(true);
  await expect(
    record
      .getByRole("tabpanel", { name: "Card" })
      .getByText(nextStep, { exact: true }),
  ).toBeAttached();
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(780);
  await expect(
    record.getByRole("tablist", { name: "T-0060 record tabs" }),
  ).toBeInViewport();

  // The body scrolls under the header, which doesn't move.
  const body = record.locator("[data-record=body]");
  expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect
    .poll(() => body.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  expect(await box(header)).toEqual(at);
  expect(await runAxe(page)).toEqual([]);
});

test("open questions are pinned above the tabs, each with its recommendation, leaving room for answer buttons", async () => {
  const { page } = launched;
  pushCard(
    "T-0061",
    cardText({
      id: "T-0061",
      title: "fix: the totals row rounds wrong",
      status: "blocked",
      heldBy: "laptop",
      nextStep: "Answer the two questions, then fix the rounding.",
    }).replace(
      "- [ ] (none)",
      [
        "- [x] Keep the old totals column? — Recommended: no.",
        "- [ ] Round half up or half even? — Recommended: half even, as the bank's statements do. Options: half up; truncate.",
        "- [ ] Round the totals row too, or only each line?",
      ].join("\n"),
    ),
  );
  await atWindowSize(page);
  const record = await openRecord(page, "T-0061");

  const pinned = record.getByRole("group", { name: "2 open questions" });
  const rows = pinned.getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Round half up or half even?");
  await expect(rows.nth(0)).toContainText(
    "Recommended: half even, as the bank's statements do",
  );
  await expect(rows.nth(0)).toContainText("Other options: half up; truncate");
  await expect(rows.nth(1)).toContainText(
    "Round the totals row too, or only each line?",
  );
  await expect(rows.nth(1)).toContainText("No recommendation written");
  await expect(pinned).not.toContainText("Keep the old totals column?");
  // The answered one is in the Card tab.
  await expect(
    record
      .getByRole("tabpanel", { name: "Card" })
      .getByText(/Keep the old totals column\?/),
  ).toBeAttached();

  // Above the tabs, whole, with room under the tabs for a 32 px row of answer
  // buttons per question.
  const tabs = record.getByRole("tablist", { name: "T-0061 record tabs" });
  const q = await box(pinned);
  const t = await box(tabs);
  expect(q.y + q.height).toBeLessThanOrEqual(t.y);
  expect(
    await pinned.evaluate((el) => el.scrollHeight <= el.clientHeight),
  ).toBe(true);
  const pane = await box(page.locator("[data-pane=record]"));
  expect(t.y + t.height).toBeLessThanOrEqual(pane.y + pane.height - 64);
  expect(await mainScrolls(page)).toEqual({ down: false, sideways: false });
  await shot("3-blocked-question");
  expect(await runAxe(page)).toEqual([]);

  // Anything else it waits on the owner for is one line, with what to do.
  await page
    .getByRole("region", { name: "Cards" })
    .getByRole("button", { name: /^T-0004/ })
    .click();
  const draft = page.getByRole("region", { name: "T-0004 record" });
  const waits = draft.locator("[data-record=waits]");
  await expect(waits).toContainText("Needs your approval");
  await expect(waits).toContainText(
    "Set Status to ready in CARD.md on card/T-0004.",
  );
  await expect(draft.getByRole("group", { name: /open question/ })).toHaveCount(
    0,
  );
});

test("the record's Card, Evidence and Commits tabs, by click and by arrow keys", async () => {
  const { page } = launched;
  await atWindowSize(page);
  const record = await openRecord(page, "T-0003");
  const tablist = record.getByRole("tablist", { name: "T-0003 record tabs" });
  const tab = (name: string) => tablist.getByRole("tab", { name });
  await expect(tablist.getByRole("tab")).toHaveText([
    "Card",
    "Evidence",
    "Commits",
  ]);
  await expect(tab("Card")).toHaveAttribute("aria-selected", "true");
  await expect(record.getByRole("tabpanel")).toHaveCount(1);

  // Card: what the card is, in full.
  const card = record.getByRole("tabpanel", { name: "Card" });
  for (const text of [
    "Because feat: export the report as csv is missing.",
    "prompt",
    "A CSV downloads",
    "Commas are quoted",
    "Files in scope",
    "Out of scope",
    "the other thing",
    "Constraints",
    "No new dependencies.",
    "testing/test-driven-development",
    "2026-11-20: Keep it small",
    "No answered questions.",
  ])
    await expect(card.getByText(text).first()).toBeAttached();
  expect(await mainScrolls(page)).toEqual({ down: false, sideways: false });
  await shot("2-selected");
  expect(await runAxe(page)).toEqual([]);

  // Click.
  await tab("Evidence").click();
  await expect(tab("Evidence")).toHaveAttribute("aria-selected", "true");
  await expect(tab("Card")).toHaveAttribute("aria-selected", "false");
  await expect(record.getByRole("tabpanel")).toHaveCount(1);
  await expect(
    record.getByRole("tabpanel", { name: "Evidence" }),
  ).toContainText("pnpm test -> 3 passed");

  // Arrow keys, Home and End; focus moves with the selection.
  await page.keyboard.press("ArrowRight");
  await expect(tab("Commits")).toBeFocused();
  await expect(tab("Commits")).toHaveAttribute("aria-selected", "true");
  const commits = record.getByRole("tabpanel", { name: "Commits" });
  await expect(commits).toContainText("feat: the CSV button");
  await expect(commits).toContainText(
    "on its branch, not on the default branch",
  );
  await page.keyboard.press("ArrowRight");
  await expect(tab("Card")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(tab("Commits")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(tab("Card")).toBeFocused();
  await expect(tab("Card")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tab("Commits")).toBeFocused();
  await expect(tab("Commits")).toHaveAttribute("aria-selected", "true");
  expect(await runAxe(page)).toEqual([]);

  // Escape on a tab stays in the record.
  await page.keyboard.press("Escape");
  await expect(record).toBeVisible();

  // Another card opens on Card.
  const list = page.getByRole("region", { name: "Cards" });
  await list.getByRole("button", { name: /^T-0005/ }).click();
  await expect(
    page
      .getByRole("region", { name: "T-0005 record" })
      .getByRole("tab", { name: "Card" }),
  ).toHaveAttribute("aria-selected", "true");

  // An unreadable card keeps its note in Card, and has no evidence.
  await list.getByRole("button", { name: /^T-0006/ }).click();
  const t6 = page.getByRole("region", { name: "T-0006 record" });
  await expect(t6.getByRole("tabpanel", { name: "Card" })).toContainText(
    "unreadable",
  );
  await t6.getByRole("tab", { name: "Evidence" }).click();
  await expect(t6.getByRole("tabpanel", { name: "Evidence" })).toHaveText(
    "No evidence written yet.",
  );

  // A Next up line: its header and note, no tabs.
  await list.getByRole("button", { name: /^T-0006/ }).focus();
  await page.keyboard.press("Escape");
  const board = page.getByRole("region", { name: "Board" });
  await board.getByRole("button", { name: /^Next up/ }).click();
  await board
    .getByRole("button", { name: /Dark mode for the settings page/ })
    .click();
  const line = page.getByRole("region", { name: "Next up 2 record" });
  await expect(line.locator("[data-record=header]")).toContainText("next up");
  await expect(line).toContainText("not a card yet");
  await expect(line.getByRole("tablist")).toHaveCount(0);
});
