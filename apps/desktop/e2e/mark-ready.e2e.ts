// The Mark ready button and its diff dialog, on a repo laid out the way the kit
// leaves it: T-0004 is a local draft, T-0003 is in progress.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { cardText, kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

let fx: KitFixture;
let launched: LaunchedApp;

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/** Open the Tasks board, then one card's record. */
async function openRecord(page: Page, id: string) {
  await page.setViewportSize({ width: 1140, height: 780 });
  await page.getByRole("tab", { name: "Tasks" }).click();
  await page
    .getByRole("region", { name: "Board" })
    .getByRole("button", { name: new RegExp(`^${id}`) })
    .click();
  return page.getByRole("region", { name: `${id} record` });
}

async function start(prepare?: (repo: string) => void) {
  fx = kitFixture();
  // T-0004 has an origin copy so the push has something to fast-forward.
  git(fx.repo, "push", "-q", "origin", "card/T-0004");
  prepare?.(fx.repo);
  launched = await launchApp({ repos: [{ path: fx.repo, name: "kit-repo" }] });
  await launched.page.getByRole("button", { name: /^kit-repo/ }).click();
}

test.afterEach(async () => {
  await closeApp(launched);
  fx.remove();
});

test("the button shows on a draft card and not on any other status", async () => {
  await start();
  const { page } = launched;
  const draft = await openRecord(page, "T-0004");
  await expect(draft.getByRole("button", { name: "Mark ready" })).toBeVisible();
  const other = await openRecord(page, "T-0003").catch(() => null);
  if (other === null) {
    await page
      .getByRole("region", { name: "Cards" })
      .getByRole("button", { name: /^T-0003/ })
      .click();
  }
  await expect(
    page
      .getByRole("region", { name: "T-0003 record" })
      .getByRole("button", { name: "Mark ready" }),
  ).toHaveCount(0);
});

test("the dialog shows the diff first; cancel writes nothing; confirm commits it", async () => {
  await start();
  const { page } = launched;
  const tip = () => git(fx.repo, "rev-parse", "card/T-0004");
  const before = tip();
  const record = await openRecord(page, "T-0004");
  const button = record.getByRole("button", { name: "Mark ready" });

  // The header still fits at the default window size.
  const main = page.locator("main");
  expect(await main.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );

  await button.click();
  const dialog = page.getByRole("dialog", { name: "Mark ready" });
  await expect(dialog).toBeVisible();
  const diff = dialog.locator("[data-mark-ready=diff]");
  await expect(diff).toContainText("-Status: draft");
  await expect(diff).toContainText("+Status: ready");
  expect(tip()).toBe(before);
  expect(await runAxe(page)).toEqual([]);
  const dir = process.env.SCREENSHOT_DIR;
  if (dir)
    await page.screenshot({
      path: join(dir, "mark-ready-dialog.png"),
      scale: "css",
    });

  // Focus moved in; Escape cancels and focus returns to the button.
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
  expect(tip()).toBe(before);

  // Cancel by the button, too.
  await button.click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  expect(tip()).toBe(before);

  await button.click();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toHaveCount(0);
  expect(tip()).not.toBe(before);
  expect(git(fx.repo, "show", "card/T-0004:CARD.md")).toContain(
    "Status: ready",
  );
  const after = page.getByRole("region", { name: "T-0004 record" });
  await expect(after.getByText("ready", { exact: true })).toBeVisible();
  await expect(after.getByRole("button", { name: "Mark ready" })).toHaveCount(
    0,
  );
});

test("Cancel and Escape are held back while the commit runs, and the dialog stays until it returns", async () => {
  await start((repo) => {
    // Slow every ref update so apply is still pending when we press keys.
    const hook = join(repo, ".git", "hooks", "reference-transaction");
    writeFileSync(
      hook,
      `#!/bin/sh\nif [ "$1" = "prepared" ]; then sleep 3; fi\ncat >/dev/null\n`,
      { mode: 0o755 },
    );
  });
  const { page } = launched;
  const record = await openRecord(page, "T-0004");
  await record.getByRole("button", { name: "Mark ready" }).click();
  const dialog = page.getByRole("dialog", { name: "Mark ready" });
  await expect(dialog.locator("[data-mark-ready=diff]")).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCount(0, { timeout: 30_000 });
  expect(git(fx.repo, "show", "card/T-0004:CARD.md")).toContain(
    "Status: ready",
  );
});

test("a refusal at apply time shows its reason and writes nothing", async () => {
  await start();
  const { page } = launched;
  const record = await openRecord(page, "T-0004");
  await record.getByRole("button", { name: "Mark ready" }).click();
  const dialog = page.getByRole("dialog", { name: "Mark ready" });
  await expect(dialog.locator("[data-mark-ready=diff]")).toBeVisible();
  // The card is taken after the preview was shown.
  git(fx.repo, "checkout", "-q", "card/T-0004");
  writeFileSync(
    join(fx.repo, "CARD.md"),
    cardText({
      id: "T-0004",
      title: "feat: dark mode",
      status: "draft",
      heldBy: "laptop",
      gate: "needs you",
    }),
  );
  git(fx.repo, "commit", "-qam", "chore(card): taken");
  git(fx.repo, "push", "-q", "origin", "card/T-0004");
  git(fx.repo, "checkout", "-q", "main");
  const tip = git(fx.repo, "rev-parse", "card/T-0004");
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog.locator("[data-mark-ready=refusal]")).not.toBeEmpty();
  await expect(dialog).toBeVisible();
  expect(git(fx.repo, "rev-parse", "card/T-0004")).toBe(tip);
});

test("a refusal shows its reason, keeps the dialog open and writes nothing", async () => {
  await start((repo) => {
    // A held-by card: T-0004 now says a machine holds it.
    git(repo, "checkout", "-q", "card/T-0004");
    writeFileSync(
      join(repo, "CARD.md"),
      cardText({
        id: "T-0004",
        title: "feat: dark mode",
        status: "draft",
        heldBy: "laptop",
        gate: "needs you",
      }),
    );
    git(repo, "commit", "-qam", "chore(card): held");
    git(repo, "push", "-q", "origin", "card/T-0004");
    git(repo, "checkout", "-q", "main");
  });
  const { page } = launched;
  const before = git(fx.repo, "rev-parse", "card/T-0004");
  const record = await openRecord(page, "T-0004");
  await record.getByRole("button", { name: "Mark ready" }).click();
  const dialog = page.getByRole("dialog", { name: "Mark ready" });
  const reason = dialog.locator("[data-mark-ready=refusal]");
  await expect(reason).toContainText("laptop");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Confirm" })).toBeDisabled();
  expect(git(fx.repo, "rev-parse", "card/T-0004")).toBe(before);
  expect(await runAxe(page)).toEqual([]);
});
