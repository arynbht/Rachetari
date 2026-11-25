// Screenshots of the Tasks prototype, and the checks behind them (T-0028).
//
//   node docs/prototypes/T-0028/shoot.mjs
//
// 1. Builds the shell's own stylesheet: apps/desktop/src/renderer/index.css
//    through the desktop's Tailwind with its tailwind.config.ts, the renderer's
//    sources plus this page as content, into out/shell.css here (git ignores
//    out/, so the build output is never committed).
// 2. Opens index.html from disk in the desktop's own Electron (main.mjs, one
//    1140×780 window) through Playwright's _electron, as the e2e tests do.
// 3. Drives each state, checks it, runs axe and writes docs/screenshots/T-0028/.
//
// Exits non-zero if a check fails, the page requests anything that isn't a
// file:// URL, logs a console error, or has a serious or critical axe
// violation. No new dependencies: Tailwind, PostCSS, Playwright, Electron and
// axe-core all load from apps/desktop/node_modules.
/* global window, document, getComputedStyle, Node */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const desktop = join(root, "apps", "desktop");
const shots = join(root, "docs", "screenshots", "T-0028");
const require = createRequire(join(desktop, "package.json"));

const slash = (p) => p.replace(/\\/g, "/");
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

// --- 1. The shell's stylesheet -------------------------------------------------

async function buildCss() {
  const loadConfig = require("tailwindcss/loadConfig");
  const tailwind = require("tailwindcss");
  const postcss = require("postcss");
  const autoprefixer = require("autoprefixer");
  const config = loadConfig(join(desktop, "tailwind.config.ts"));
  const input = join(desktop, "src", "renderer", "index.css");
  const result = await postcss([
    tailwind({
      ...config,
      content: [
        slash(join(desktop, "src", "renderer", "index.html")),
        slash(join(desktop, "src", "renderer", "**", "*.{ts,tsx}")),
        slash(join(here, "index.html")),
        slash(join(here, "fixture.js")),
      ],
    }),
    autoprefixer,
  ]).process(readFileSync(input, "utf8"), { from: input });
  mkdirSync(join(here, "out"), { recursive: true });
  writeFileSync(join(here, "out", "shell.css"), result.css);
  console.log(
    `built ${slash(join("docs", "prototypes", "T-0028", "out", "shell.css"))} from ${slash(join("apps", "desktop", "src", "renderer", "index.css"))} (${result.css.length} bytes)`,
  );
}

// --- 2. The window -------------------------------------------------------------

const page_url = (query = "") =>
  pathToFileURL(join(here, "index.html")).href + query;

async function launch() {
  const { _electron } = require("@playwright/test");
  const app = await _electron.launch({
    executablePath: require("electron"),
    args: [join(here, "main.mjs")],
    env: { ...process.env, T0028_URL: page_url() },
  });
  const page = await app.firstWindow();
  page.on("request", (r) => {
    if (!r.url().startsWith("file://"))
      failures.push(`the page requested ${r.url()}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error") failures.push(`console error: ${m.text()}`);
  });
  page.on("pageerror", (e) => failures.push(`page error: ${e.message}`));
  await page.waitForLoadState("domcontentloaded");
  // The window asks for 1140×780; the OS's display scaling can round its
  // content a pixel or two off, so the page's viewport is pinned to it.
  await page.setViewportSize({ width: 1140, height: 780 });
  await page.reload();
  return { app, page };
}

const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

async function axe(page, label) {
  await page.evaluate((src) => window.eval(src), axeSource);
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      resultTypes: ["violations"],
    });
    return result.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map(
        (v) =>
          `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      );
  });
  check(
    violations.length === 0,
    `${label}: no serious or critical axe violations${violations.length ? `: ${violations.join("; ")}` : ""}`,
  );
}

async function shoot(page, name) {
  // CSS pixels, so every machine writes 1140×780 whatever its display scaling.
  await page.screenshot({
    path: join(shots, name),
    fullPage: true,
    scale: "css",
  });
  console.log(`wrote docs/screenshots/T-0028/${name}`);
}

const text = (page, sel) => page.locator(sel).first().innerText();
const attr = (page, sel, name) => page.locator(sel).first().getAttribute(name);
const focusedKey = (page) =>
  page.evaluate(() => document.activeElement?.getAttribute("data-key") ?? null);
const shownKeys = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-card]")]
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.getAttribute("data-key"))
      .sort(),
  );
const box = (page, sel) => page.locator(sel).first().boundingBox();

// --- 3. The states -------------------------------------------------------------

async function run(page) {
  const size = await page.evaluate(() => [
    window.innerWidth,
    window.innerHeight,
  ]);
  check(
    size[0] === 1140 && size[1] === 780,
    `the window is 1140×780 (${size.join("×")})`,
  );
  const background = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  check(
    background !== "rgba(0, 0, 0, 0)" && background !== "rgb(255, 255, 255)",
    `the shell's stylesheet and its dark tokens are applied (body ${background})`,
  );

  // A1: the board.
  check(
    (await page.locator("[data-view=board]").count()) === 1,
    "A1: the board shows",
  );
  const columns = await page.$$eval("[data-board] [data-column]", (els) =>
    els.map((e) => e.getAttribute("data-column")),
  );
  check(
    columns.join() === "draft,ready,progress,blocked,pr",
    `A1: columns Draft, Ready, In progress, Blocked, PR open (${columns.join()})`,
  );
  const loads = await page.$$eval("[data-board] [data-stage]", (els) =>
    els.map(
      (e) =>
        `${e.firstChild.textContent} ${e.querySelector("[data-load]").getAttribute("data-load")}`,
    ),
  );
  check(
    loads.join(" | ") ===
      "Draft + Ready 1/5 | In progress 1/2 | Blocked 2 | PR open 0/3",
    `A1: headers show load (${loads.join(" | ")})`,
  );
  check(
    (await attr(page, "[data-rail=next] [data-count]", "data-count")) === "2",
    "A1: the Next up rail is collapsed with its count, 2",
  );
  check(
    (await attr(page, "[data-rail=next]", "aria-expanded")) === "false",
    "A1: Next up starts collapsed",
  );
  check(
    (await attr(page, "#rail-done [data-count]", "data-count")) === "2",
    "A1: the Done rail counts 2",
  );
  check(
    (await page.locator("a", { hasText: "History" }).count()) === 1,
    "A1: Done links to History",
  );
  check(
    (await shownKeys(page)).join() ===
      "T-0001,T-0002,T-0003,T-0004,T-0005,T-0006",
    `A1: the fixture's cards are on the board (${(await shownKeys(page)).join()})`,
  );
  const boardHeight = (await box(page, "[data-board]")).height;
  await axe(page, "A1 board");
  await shoot(page, "1-board.png");

  // A2: select by keys, the record, the blocked card, the tabs, Escape.
  await page.locator("[data-board] [data-card]").first().focus();
  check(
    (await focusedKey(page)) === "T-0004",
    "A2: the board's first card takes focus",
  );
  await page.keyboard.press("ArrowRight");
  check(
    (await focusedKey(page)) === "T-0003",
    "A2: Right skips the empty Ready column to T-0003",
  );
  await page.keyboard.press("Enter");
  check(
    (await page.locator("[data-view=split]").count()) === 1,
    "A2: Enter collapses the board to the list and the record",
  );
  check(
    (await attr(page, "[data-record]", "data-record")) === "T-0003",
    "A2: the record is T-0003's",
  );
  const header = await text(page, "[data-record] header");
  check(
    [
      "T-0003",
      "export the report as CSV",
      "Status",
      "in progress",
      "Held by",
      "pc",
      "Next step",
      "Write the CSV writer's test.",
      "PR",
      "#7",
    ].every((s) => header.includes(s)),
    "A2: the record's header has id, title, status, held by, next step and PR",
  );
  const tabs = await page.$$eval("[data-record] [role=tab]", (els) =>
    els.map((e) => e.textContent),
  );
  check(
    tabs.join() === "Card,Evidence,Commits",
    `A2: tabs Card, Evidence, Commits (${tabs.join()})`,
  );
  const listBox = await box(page, "[data-list]");
  const recordBox = await box(page, "[data-record]");
  check(
    listBox.x + listBox.width < recordBox.x,
    "A2: the list is on the left, the record on the right",
  );
  check(
    (await focusedKey(page)) === "T-0003",
    "A2: focus is on T-0003 in the list",
  );
  await axe(page, "A2 selected");
  await shoot(page, "2-selected.png");

  await page.keyboard.press("ArrowDown");
  check(
    (await attr(page, "[data-record]", "data-record")) === "T-0005",
    "A2: Down opens the next card, T-0005",
  );
  check(
    (await attr(page, "[data-record] [data-questions]", "data-questions")) ===
      "2",
    "A2/A7: T-0005 pins two open questions",
  );
  check(
    (await text(page, "[data-record] [data-questions]")).includes(
      "Round half up or half even?",
    ),
    "A2: the fixture's question is pinned",
  );
  const pinnedFirst = await page.evaluate(() => {
    const q = document.querySelector("[data-record] [data-questions]");
    const t = document.querySelector("[data-record] [role=tablist]");
    return Boolean(
      q && t && q.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
  check(pinnedFirst, "A2: open questions come before the tabs");
  await axe(page, "A2 blocked");
  await shoot(page, "3-blocked-question.png");

  await page.locator("[data-record] [role=tab][aria-selected=true]").focus();
  const selectedTab = () =>
    page.evaluate(() =>
      document.activeElement?.getAttribute("role") === "tab" &&
      document.activeElement.getAttribute("aria-selected") === "true"
        ? document.activeElement.textContent
        : null,
    );
  await page.keyboard.press("ArrowRight");
  const t1 = await selectedTab();
  await page.keyboard.press("ArrowRight");
  const t2 = await selectedTab();
  await page.keyboard.press("ArrowLeft");
  const t3 = await selectedTab();
  check(
    `${t1},${t2},${t3}` === "Evidence,Commits,Evidence",
    `A2: the arrow keys switch the tabs (${t1}, ${t2}, ${t3})`,
  );
  await axe(page, "A2 evidence tab");

  await page.keyboard.press("Escape");
  check(
    (await page.locator("[data-view=board]").count()) === 1,
    "A2: Escape brings the full board back",
  );
  check(
    (await focusedKey(page)) === "T-0005",
    "A2: focus is on the card that was open, T-0005",
  );

  // A3: Needs me.
  await page.locator("#needs-me").click();
  // The pointer moves off, so the screenshot shows the pressed state, not hover.
  await page.mouse.move(700, 760);
  check(
    (await attr(page, "#needs-me", "aria-pressed")) === "true",
    "A3: Needs me is on",
  );
  const needs = (await shownKeys(page)).join();
  check(
    needs === "T-0004,T-0005,T-0006",
    `A3: exactly T-0004, T-0005 and T-0006 are shown (${needs})`,
  );
  await axe(page, "A3 needs me");
  await shoot(page, "5-needs-me.png");

  // A4: 20 done cards.
  await page.goto(page_url("?done=20"));
  check(
    (await attr(page, "#rail-done [data-count]", "data-count")) === "20",
    "A4: the Done rail reads 20",
  );
  const listed = await page.locator("[data-done-item]").count();
  check(listed === 5, `A4: the Done rail lists exactly five (${listed})`);
  const tallBoard = (await box(page, "[data-board]")).height;
  check(
    tallBoard <= boardHeight,
    `A4: the board is no taller than in 1-board.png (${tallBoard} <= ${boardHeight})`,
  );
  const fits = await page.evaluate(
    () => document.querySelector("main").scrollHeight <= window.innerHeight,
  );
  check(fits, "A4: the page fits the 780 px window with 20 done cards");
  await axe(page, "A4 done=20");
  await shoot(page, "4-done-20.png");

  // A5: the alternative layout.
  await page.goto(page_url("?layout=list"));
  check(
    (await page.locator("[data-view=list]").count()) === 1,
    "A5: ?layout=list shows the list layout",
  );
  check(
    (await page.getByText("Pick a card").count()) === 1,
    "A5: the record pane says Pick a card",
  );
  const altLoads = await page.$$eval(
    "[data-list] [data-stage] [data-load]",
    (els) => els.map((e) => e.getAttribute("data-load")),
  );
  check(
    altLoads.join() === "1/5,1/2,2,0/3",
    `A5: the list's headers show load (${altLoads.join()})`,
  );
  const before = await box(page, "[data-list]");
  await axe(page, "A5 list");
  await shoot(page, "6-alt-board.png");

  await page.locator("[data-list] [data-card]").first().focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  check(
    (await attr(page, "[data-record]", "data-record")) === "T-0003",
    "A5/A7: the list layout shows T-0003, as 2-selected.png does",
  );
  const after = await box(page, "[data-list]");
  check(
    before.x === after.x &&
      before.y === after.y &&
      before.width === after.width &&
      before.height === after.height,
    "A5: selecting a card doesn't reflow the list",
  );
  await axe(page, "A5 selected");
  await shoot(page, "7-alt-selected.png");
  await page.keyboard.press("Escape");
  check(
    (await page.getByText("Pick a card").count()) === 1,
    "A5: Escape closes the record",
  );
}

// --- Main ------------------------------------------------------------------------

mkdirSync(shots, { recursive: true });
await buildCss();
const { app, page } = await launch();
try {
  await run(page);
} catch (err) {
  failures.push(
    `the script stopped: ${err instanceof Error ? err.stack : err}`,
  );
} finally {
  await app.close();
}
if (failures.length) {
  console.error(`\n${failures.length} failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nall checks passed");
