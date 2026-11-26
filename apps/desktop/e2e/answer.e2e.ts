// Answering from the Questions panel: every action shows T-0054's diff first,
// nothing is committed until confirm, a refusal shows its reason, and the
// answered question leaves the panel.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { cardText, kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, runAxe, type LaunchedApp } from "./helpers";

let fx: KitFixture;
let launched: LaunchedApp;

const QUESTIONS = [
  "- [ ] Which file holds the answers? — Recommended: `src/answers.ts`. Options: `src/panel.ts`; a new package.",
  "- [ ] Commit, or commit and push? — Recommended: commit only.",
];

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: fx.repo, encoding: "utf8" }).trim();

test.beforeEach(async () => {
  fx = kitFixture();
  // A card held by nobody, local and on the origin, checked out nowhere.
  git("checkout", "-q", "main");
  git("checkout", "-q", "-b", "card/T-0020");
  writeFileSync(
    join(fx.repo, "CARD.md"),
    cardText({
      id: "T-0020",
      title: "feat: answer from the panel",
      status: "ready",
      question: "PLACEHOLDER",
    }).replace("- [ ] PLACEHOLDER", QUESTIONS.join("\n")),
  );
  git("add", "-A");
  git("commit", "-q", "-m", "chore(card): T-0020");
  git("push", "-q", "origin", "card/T-0020");
  git("checkout", "-q", "main");
  launched = await launchApp({ repos: [{ path: fx.repo, name: "kit-repo" }] });
  await launched.page.getByRole("button", { name: /^kit-repo/ }).click();
});

test.afterEach(async () => {
  await closeApp(launched);
  fx.remove();
});

const group = (page: LaunchedApp["page"]) =>
  page
    .getByRole("region", { name: "Questions", exact: true })
    .getByRole("group", { name: "T-0020 · feat: answer from the panel" });

test("each question can be accepted or answered, each group accepted whole", async () => {
  const g = group(launched.page);
  await expect(
    g.getByRole("button", { name: /^Accept all recommended/ }),
  ).toBeVisible();
  await expect(
    g.getByRole("button", { name: /^Accept recommended/ }),
  ).toHaveCount(2);
  await expect(g.getByRole("button", { name: /^Answer/ })).toHaveCount(2);
  await g.getByRole("button", { name: /^Answer question 1/ }).click();
  await expect(
    g.getByLabel("Your answer to question 1 on T-0020"),
  ).toBeVisible();
});

test("cancelling the diff commits nothing", async () => {
  const { page } = launched;
  const before = git("rev-parse", "card/T-0020");
  await group(page)
    .getByRole("button", { name: /^Accept recommended for question 2/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Diff of CARD.md")).toContainText(
    "Answer: commit only",
  );
  expect(await runAxe(page)).toEqual([]);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect(git("rev-parse", "card/T-0020")).toBe(before);
});

test("confirming commits the answer and the question leaves the panel", async () => {
  const { page } = launched;
  const before = git("rev-parse", "card/T-0020");
  const mainTip = git("rev-parse", "main");
  await group(page)
    .getByRole("button", { name: /^Accept recommended for question 2/ })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Confirm and commit" }).click();
  await expect(dialog).toBeHidden();
  // One commit, touching only CARD.md, and nothing else moved.
  expect(git("rev-list", "--count", `${before}..card/T-0020`)).toBe("1");
  expect(git("diff", "--name-only", before, "card/T-0020")).toBe("CARD.md");
  expect(git("rev-parse", "main")).toBe(mainTip);
  expect(git("show", "card/T-0020:CARD.md")).toContain(
    "- [x] Commit, or commit",
  );
  await expect(page.getByText("Commit, or commit and push?")).toHaveCount(0);
  await expect(page.getByText("Which file holds the answers?")).toBeVisible();
});

test("a free-text answer shows its diff, then commits", async () => {
  const { page } = launched;
  const g = group(page);
  await g.getByRole("button", { name: /^Answer question 1/ }).click();
  await g.getByLabel("Your answer to question 1 on T-0020").fill("src/x.ts");
  await g.getByRole("button", { name: "Review answer" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Diff of CARD.md")).toContainText(
    "Answer: src/x.ts",
  );
  await dialog.getByRole("button", { name: "Confirm and commit" }).click();
  await expect(dialog).toBeHidden();
  expect(git("show", "card/T-0020:CARD.md")).toContain("Answer: src/x.ts");
});

test("on a held card the answer controls are disabled and say who holds it", async () => {
  const { page } = launched;
  // T-0005 is held by another machine.
  execFileSync("git", ["fetch", "-q"], { cwd: fx.repo });
  git("branch", "-f", "card/T-0005", "origin/card/T-0005");
  const held = page
    .getByRole("region", { name: "Questions", exact: true })
    .getByRole("group", { name: "T-0005 · fix: the export rounds wrong" });
  await expect(held.getByText("Held by laptop")).toBeVisible();
  await expect(
    held.getByRole("button", { name: /^Answer question 1/ }),
  ).toBeDisabled();
});

test("a refusal shows its reason and applies nothing", async () => {
  const { page } = launched;
  // A dirty worktree on the card refuses the write.
  const wt = join(fx.repo, "..", "wt-T-0020");
  git("worktree", "add", "-q", wt, "card/T-0020");
  writeFileSync(join(wt, "scratch.txt"), "uncommitted");
  const before = git("rev-parse", "card/T-0020");
  const g = group(page);
  await g.getByRole("button", { name: /^Answer question 1/ }).click();
  await g.getByLabel("Your answer to question 1 on T-0020").fill("src/x.ts");
  await g.getByRole("button", { name: "Review answer" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("uncommitted changes");
  await expect(
    dialog.getByRole("button", { name: "Confirm and commit" }),
  ).toHaveCount(0);
  expect(await runAxe(page)).toEqual([]);
  await dialog.getByRole("button", { name: "Close" }).click();
  expect(git("rev-parse", "card/T-0020")).toBe(before);
});
