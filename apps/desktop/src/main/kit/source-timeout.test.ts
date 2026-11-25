// The file source's time limits, against real git and a remote that never
// answers: a local TCP server that accepts connections and stays silent.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { kitFixture, type KitFixture } from "../../../test/kit-fixture";
import { fetchRepo, readLiveCards } from "./source";
import { type KitEvent, watchRepo } from "./watch";

const LIMIT_MS = 2000;
const ENV = ["RIVETARI_GIT_READ_LIMIT_MS", "RIVETARI_GIT_FETCH_LIMIT_MS"];

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

/**
 * Remove a folder, waiting up to 10 s for git processes cut off by the
 * teardown to exit and let go of it (Windows won't remove a process's cwd).
 */
async function removeDir(dir: string): Promise<void> {
  for (let waited = 0; ; waited += 100) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      if (waited >= 10_000) throw err;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * The timed-out call reached the hanging remote, and the kill took every git
 * process down with it: none is left holding a connection open.
 */
async function connectionsClosed(): Promise<void> {
  expect(connections).toBeGreaterThan(0);
  await expect.poll(() => sockets.size, { timeout: 3_000 }).toBe(0);
}

let server: Server;
let sockets: Set<Socket>;
let connections: number;
let hangUrl: string;
let fx: KitFixture;
let scratch: string;
let saved: Record<string, string | undefined>;

beforeEach(async () => {
  saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  for (const k of ENV) process.env[k] = String(LIMIT_MS);

  sockets = new Set();
  connections = 0;
  server = createServer((socket) => {
    connections += 1;
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => undefined);
    // Read and drop what git sends, so its side closing is seen (a paused
    // socket never notices the end on Linux); never answer.
    socket.resume();
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  hangUrl = `http://127.0.0.1:${address.port}/repo.git`;

  fx = kitFixture();
  scratch = mkdtempSync(join(tmpdir(), "rachetari-hang-"));
});

afterEach(async () => {
  // Stop taking connections, then cut the open ones, so a failed test leaves
  // no git process waiting on the remote.
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  for (const socket of sockets) socket.destroy();
  await closed;
  await removeDir(scratch);
  await removeDir(dirname(fx.repo));
  for (const k of ENV)
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
});

describe("the file source's time limits", { timeout: 30_000 }, () => {
  it("a git read that hangs fails at the read limit, and the watcher reports it", async () => {
    // A partial clone without blobs: reading a file at a ref fetches its blob
    // from origin, and origin now never answers.
    git(fx.origin, "config", "uploadpack.allowFilter", "true");
    const clone = join(scratch, "partial");
    git(
      scratch,
      "clone",
      "-q",
      "--filter=blob:none",
      "--no-checkout",
      pathToFileURL(fx.origin).href,
      clone,
    );
    git(clone, "remote", "set-url", "origin", hangUrl);

    const started = Date.now();
    await expect(readLiveCards(clone)).rejects.toThrow(
      `git show timed out after ${LIMIT_MS / 1000} s`,
    );
    expect(Date.now() - started).toBeLessThan(6_000);
    await connectionsClosed();

    const events: KitEvent[] = [];
    const watchStarted = Date.now();
    const watcher = watchRepo(clone, (e) => events.push(e), {
      intervalMs: 60_000,
    });
    await watcher.ready;
    await watcher.stop();
    expect(Date.now() - watchStarted).toBeLessThan(6_000);
    // An error the Now view shows, never a snapshot with a missing or drafting card.
    expect(events).toEqual([
      {
        kind: "error",
        message: `git show timed out after ${LIMIT_MS / 1000} s`,
      },
    ]);
  });

  it("a fetch that hangs fails at the fetch limit, and the next fetch works", async () => {
    git(fx.repo, "remote", "add", "hang", hangUrl);

    const started = Date.now();
    await expect(fetchRepo(fx.repo)).rejects.toThrow(
      `git fetch timed out after ${LIMIT_MS / 1000} s`,
    );
    const took = Date.now() - started;
    expect(took).toBeGreaterThanOrEqual(LIMIT_MS - 100);
    expect(took).toBeLessThan(6_000);
    await connectionsClosed();

    git(fx.repo, "remote", "remove", "hang");
    await expect(fetchRepo(fx.repo)).resolves.toBeUndefined();
  });
});
