// Tasks on a repo with a drafting branch and done branches: the drafting one
// is greyed under Draft, each done one shows once under Done.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expect, test } from "@playwright/test";

import { cardText, kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

let fx: KitFixture;
let launched: LaunchedApp;

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function commitFile(cwd: string, path: string, text: string): void {
  mkdirSync(dirname(join(cwd, path)), { recursive: true });
  writeFileSync(join(cwd, path), text);
  git(cwd, "add", path);
  git(cwd, "commit", "-q", "-m", `add ${path}`);
}

/** A card branch off main whose CARD.md was committed, then moved away. */
function removedCard(repo: string, id: string): void {
  git(repo, "checkout", "-q", "-b", `card/${id}`, "main");
  commitFile(
    repo,
    "CARD.md",
    cardText({ id, title: `feat: ${id}`, status: "in progress" }),
  );
  git(repo, "rm", "-q", "CARD.md");
  git(repo, "commit", "-q", "-m", `chore(card): ${id} done`);
}

test.beforeEach(async () => {
  fx = kitFixture();
  const repo = fx.repo;
  // develop: T-0007 closed there today.
  git(repo, "checkout", "-q", "-b", "develop", "main");
  commitFile(
    repo,
    "cards/done/T-0007.md",
    cardText({ id: "T-0007", title: "feat: closed today", status: "done" }),
  );
  // Done branches: on the default branch, and on develop.
  removedCard(repo, "T-0001");
  removedCard(repo, "T-0007");
  // Drafting: no CARD.md committed yet.
  git(repo, "checkout", "-q", "-b", "card/T-0012", "main");
  commitFile(repo, "notes.md", "an idea\n");
  git(repo, "checkout", "-q", "card/T-0003");

  launched = await launchApp({ repos: [{ path: repo, name: "kit-repo" }] });
  await launched.page.getByRole("button", { name: /^kit-repo/ }).click();
});

test.afterEach(async () => {
  await closeApp(launched);
  fx.remove();
});

test("Tasks greys a drafting branch and shows a done branch under Done", async () => {
  const { page } = launched;
  await page.getByRole("tab", { name: "Tasks" }).click();
  const board = page.getByRole("region", { name: "Board" });
  await expect(board.locator("h4")).toHaveText([
    /^Next up 2/,
    "Draft + Ready 2/6",
    "In progress 1/3",
    "Blocked 2",
    "PR open 0/3",
    "Done 3",
  ]);

  const draft = board.getByRole("region", { name: /^Draft/ });
  const drafting = draft.getByRole("button", { name: /T-0012/ });
  await expect(drafting).toContainText("Drafting: card/T-0012");
  await expect(drafting).toHaveClass(/text-muted-foreground/);
  await expect(drafting).not.toHaveClass(/border-rose/);
  await expect(board.getByText("Can't be read: card/T-0012")).toHaveCount(0);

  // Each done card shows once, under Done; the broken one stays Blocked.
  const done = board.getByRole("region", { name: /^Done/ });
  for (const id of ["T-0001", "T-0002", "T-0007"]) {
    await expect(
      board.getByRole("button", { name: new RegExp(id) }),
    ).toHaveCount(1);
    await expect(
      done.getByRole("button", { name: new RegExp(id) }),
    ).toHaveCount(1);
  }
  await expect(board.getByText("Can't be read: card/T-0006")).toBeVisible();

  const dir = process.env.SCREENSHOT_DIR;
  if (dir) {
    await page.screenshot({
      path: join(dir, "tasks-branch-states.png"),
      fullPage: true,
    });
  }

  // The card closed on develop opens.
  await done.getByRole("button", { name: /T-0007/ }).click();
  const record = page.getByRole("region", { name: "T-0007 record" });
  await expect(record.getByText("add cards/done/T-0007.md")).toBeVisible();

  expect(await runAxe(page)).toEqual([]);
});
