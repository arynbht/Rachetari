// Opening a repo whose fetch hangs: a remote that's a local TCP server which
// accepts connections and never answers, and a short fetch limit.
import { execFileSync } from "node:child_process";
import { createServer, type Server, type Socket } from "node:net";

import { expect, test } from "@playwright/test";

import { cardText, kitFixture, type KitFixture } from "../test/kit-fixture";
import { closeApp, launchApp, type LaunchedApp } from "./helpers";

const LIMIT_MS = 2000;
const MESSAGE = `Couldn't fetch this repo: git fetch timed out after ${LIMIT_MS / 1000} s`;

let server: Server;
let sockets: Set<Socket>;
let connections: number;
let hangUrl: string;
let fixtures: KitFixture[];
let launched: LaunchedApp | null;

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd });
}

test.beforeEach(async () => {
  sockets = new Set();
  connections = 0;
  server = createServer((socket) => {
    connections += 1;
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => undefined);
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  hangUrl = `http://127.0.0.1:${address.port}/repo.git`;
  fixtures = [];
  launched = null;
});

test.afterEach(async () => {
  // Server first: a git process still waiting on it would hold the app's
  // pipes open on Linux, and closing the app would wait for it forever.
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  for (const socket of sockets) socket.destroy();
  await closed;
  if (launched) await closeApp(launched);
  for (const fx of fixtures) {
    for (let waited = 0; ; waited += 100) {
      try {
        fx.remove();
        break;
      } catch (err) {
        // Windows won't remove a folder a cut-off git process still runs in.
        if (waited >= 10_000) throw err;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
});

/**
 * The timed-out fetch reached the hanging remote, and the kill took every git
 * process down with it: none is left holding a connection open.
 */
async function connectionsClosed(): Promise<void> {
  expect(connections).toBeGreaterThan(0);
  await expect.poll(() => sockets.size).toBe(0);
}

/** A kit repo with a second remote that never answers. */
function hangingRepo(): KitFixture {
  const fx = kitFixture();
  fixtures.push(fx);
  git(fx.repo, "remote", "add", "hang", hangUrl);
  return fx;
}

async function launch(repos: { path: string; name: string }[]) {
  launched = await launchApp({
    repos,
    env: { RIVETARI_GIT_FETCH_LIMIT_MS: String(LIMIT_MS) },
  });
  return launched.page;
}

test("a fetch that hangs shows its message in that repo's error box, and opening the repo again recovers", async () => {
  const fx = hangingRepo();
  const page = await launch([{ path: fx.repo, name: "hang-repo" }]);

  await page.getByRole("button", { name: /^hang-repo/ }).click();
  await expect(page.getByRole("alert")).toHaveText(MESSAGE);
  await expect(page.getByText("4 waiting", { exact: true })).toBeVisible();
  await connectionsClosed();

  // The remote answers now; another machine's draft arrives with the next fetch.
  git(fx.repo, "remote", "set-url", "hang", fx.origin);
  fx.pushToOrigin(
    "T-0012",
    cardText({
      id: "T-0012",
      title: "feat: from the laptop",
      status: "draft",
      gate: "needs you",
    }),
  );
  await page.getByRole("button", { name: /^hang-repo/ }).click();
  await expect(page.getByText("5 waiting", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a late fetch failure doesn't show on the repo opened since", async () => {
  const hanging = hangingRepo();
  const calm = kitFixture();
  fixtures.push(calm);
  const page = await launch([
    { path: hanging.repo, name: "hang-repo" },
    { path: calm.repo, name: "calm-repo" },
  ]);

  await page.getByRole("button", { name: /^hang-repo/ }).click();
  // The fetch has reached the remote that never answers.
  await expect.poll(() => connections).toBeGreaterThan(0);
  await page.getByRole("button", { name: /^calm-repo/ }).click();
  await expect(page.getByRole("heading", { name: "calm-repo" })).toBeVisible();

  // Past the limit, the hanging repo's fetch has failed; calm-repo doesn't show it.
  await page.waitForTimeout(LIMIT_MS + 2000);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await connectionsClosed();
});
