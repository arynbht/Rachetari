// Copy all gives every open question in full, through the panel and the
// clipboard: two cards whose questions run over several lines (T-0044's card
// as drafted, and one with a question of over 500 characters) come out whole.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, type LaunchedApp } from "./helpers";

const fixtures = join(
  dirname(fileURLToPath(import.meta.url)),
  "../test/fixtures/copy-all",
);
/** A fixture file, line ends read as LF. */
const fixture = (name: string) =>
  readFileSync(join(fixtures, name), "utf8").replace(/\r\n/g, "\n");

let fx: KitFixture;
let launched: LaunchedApp;

test.beforeEach(async () => {
  fx = kitFixture();
  // Other machines' cards; a fetch brings them in.
  fx.pushToOrigin("T-0044", fixture("T-0044.CARD.md"));
  fx.pushToOrigin("T-0090", fixture("T-0090.CARD.md"));
  execFileSync("git", ["fetch", "-q"], { cwd: fx.repo });
  launched = await launchApp({ repos: [{ path: fx.repo, name: "kit-repo" }] });
  await launched.page.getByRole("button", { name: /^kit-repo/ }).click();
});

test.afterEach(async () => {
  await closeApp(launched);
  fx.remove();
});

test("Copy all puts every open question on the clipboard in full", async () => {
  const { app, page } = launched;
  await app.evaluate(({ clipboard }) => clipboard.writeText(""));
  const panel = page.getByRole("region", { name: "Questions", exact: true });
  await expect(
    panel.getByRole("group", {
      name: "T-0090 · feat(export): dates in the CSV export",
    }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Copy all" }).click();
  await expect(panel.getByRole("status")).toHaveText("Copied");

  // The kit fixture's own question first (T-0005), then the two cards exactly
  // as open-questions.md has them after its title.
  const expected = [
    "## T-0005 · fix: the export rounds wrong",
    "",
    "1. Round half up or half even?",
    "",
    "Answer:",
    "",
    fixture("open-questions.md").replace(/^# Open questions\n\n/, ""),
  ].join("\n");
  // Chromium writes Windows' clipboard with CRLF line ends; the text is the same.
  await expect
    .poll(async () =>
      (await app.evaluate(({ clipboard }) => clipboard.readText())).replace(
        /\r\n/g,
        "\n",
      ),
    )
    .toBe(expected);
});
