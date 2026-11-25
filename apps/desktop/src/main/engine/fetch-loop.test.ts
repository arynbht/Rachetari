// The background fetch loop with fake timers and a fake fetch: every repo at
// once, then 60 s after each fetch settles; never two at a time; a fetch asked
// for while one runs joins it; failures kept until a success; stopping.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FetchLoop, type FetchState } from "./fetch-loop";

/** A fetch the test settles by hand, one pending call per start. */
function fakeFetch() {
  const calls: {
    repo: string;
    resolve: () => void;
    reject: (err: Error) => void;
  }[] = [];
  const fetch = vi.fn(
    (repo: string) =>
      new Promise<void>((resolve, reject) =>
        calls.push({ repo, resolve, reject }),
      ),
  );
  const running = (repo: string) => calls.filter((c) => c.repo === repo);
  return { fetch, calls, running };
}

const T0 = Date.UTC(2026, 10, 25, 12, 0, 0);
const at = (ms: number) => new Date(T0 + ms).toISOString();

/** Let settled promises' handlers run. */
const flush = () => vi.advanceTimersByTimeAsync(0);

let loop: FetchLoop | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  loop?.stop();
  loop = null;
  vi.useRealTimers();
});

function makeLoop(fetch: (repo: string) => Promise<void>) {
  const changes: FetchState[] = [];
  loop = new FetchLoop({
    fetch,
    now: () => new Date(),
    onChange: (state) => changes.push(state),
  });
  return { loop, changes };
}

describe("FetchLoop", () => {
  it("fetches every repo at once, then every 60 s", async () => {
    const f = fakeFetch();
    const { loop } = makeLoop(f.fetch);
    loop.setRepos(["/r/a", "/r/b"]);
    expect(f.fetch.mock.calls.map(([r]) => r)).toEqual(["/r/a", "/r/b"]);

    // a settles after 5 s, b after 20 s: each one's next is 60 s after that.
    await vi.advanceTimersByTimeAsync(5000);
    f.calls[0]?.resolve();
    await vi.advanceTimersByTimeAsync(15_000);
    f.calls[1]?.resolve();
    await flush();
    expect(loop.state("/r/a")).toEqual({
      repoPath: "/r/a",
      fetchedAt: at(5000),
      error: null,
    });

    await vi.advanceTimersByTimeAsync(64_999 - 20_000);
    expect(f.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.fetch).toHaveBeenCalledTimes(3);
    expect(f.calls[2]?.repo).toBe("/r/a");
    await vi.advanceTimersByTimeAsync(80_000 - 65_000);
    expect(f.fetch).toHaveBeenCalledTimes(4);
    expect(f.calls[3]?.repo).toBe("/r/b");
  });

  it("never starts a second fetch of a repo while one runs", async () => {
    const f = fakeFetch();
    const { loop } = makeLoop(f.fetch);
    loop.setRepos(["/r/a"]);
    // A fetch that hangs for ten minutes: nothing else starts meanwhile.
    await vi.advanceTimersByTimeAsync(600_000);
    loop.setRepos(["/r/a"]);
    expect(f.fetch).toHaveBeenCalledTimes(1);

    f.calls[0]?.resolve();
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.fetch).toHaveBeenCalledTimes(2);
  });

  it("a fetch asked for while one runs joins it", async () => {
    const f = fakeFetch();
    const { loop } = makeLoop(f.fetch);
    loop.setRepos(["/r/a"]);
    const joined = loop.fetchNow("/r/a");
    expect(f.fetch).toHaveBeenCalledTimes(1);
    f.calls[0]?.reject(new Error("no route"));
    await expect(joined).rejects.toThrow("no route");

    // Asked for when idle: it runs at once, and the 60 s start again from it.
    await vi.advanceTimersByTimeAsync(30_000);
    const asked = loop.fetchNow("/r/a");
    expect(f.fetch).toHaveBeenCalledTimes(2);
    f.calls[1]?.resolve();
    await expect(asked).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(59_999);
    expect(f.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.fetch).toHaveBeenCalledTimes(3);

    // A Windows path in another case is the same repo.
    if (process.platform === "win32") {
      void loop.fetchNow("/R/A").catch(() => undefined);
      expect(f.fetch).toHaveBeenCalledTimes(3);
    }
  });

  it("a failed fetch is in the state, with its message, until one succeeds", async () => {
    const f = fakeFetch();
    const { loop, changes } = makeLoop(f.fetch);
    loop.setRepos(["/r/a"]);
    expect(loop.state("/r/a")).toEqual({
      repoPath: "/r/a",
      fetchedAt: null,
      error: null,
    });
    f.calls[0]?.resolve();
    await flush();

    await vi.advanceTimersByTimeAsync(60_000);
    f.calls[1]?.reject(new Error("git fetch timed out after 60 s"));
    await flush();
    // The last success stays beside the failure.
    expect(loop.state("/r/a")).toEqual({
      repoPath: "/r/a",
      fetchedAt: at(0),
      error: "git fetch timed out after 60 s",
    });
    expect(changes.at(-1)).toEqual(loop.state("/r/a"));

    // It keeps trying, and a success clears the failure.
    await vi.advanceTimersByTimeAsync(60_000);
    f.calls[2]?.resolve();
    await flush();
    expect(loop.state("/r/a")).toEqual({
      repoPath: "/r/a",
      fetchedAt: at(120_000),
      error: null,
    });
    expect(changes.at(-1)).toEqual(loop.state("/r/a"));
    expect(loop.state("/r/unknown")).toBeNull();
  });

  it("stops fetching a removed repo, and everything on stop", async () => {
    const f = fakeFetch();
    const { loop, changes } = makeLoop(f.fetch);
    loop.setRepos(["/r/a", "/r/b"]);
    f.calls[0]?.resolve();
    await flush();
    const told = changes.length;

    // b leaves while its fetch runs: its result lands for nobody.
    loop.setRepos(["/r/a"]);
    f.calls[1]?.resolve();
    await flush();
    expect(loop.state("/r/b")).toBeNull();
    expect(changes).toHaveLength(told);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(f.running("/r/b")).toHaveLength(1);
    expect(f.running("/r/a").length).toBeGreaterThan(1);

    // Stopped while a's fetch runs: no result lands, nothing starts again.
    const before = f.fetch.mock.calls.length;
    const last = f.calls.at(-1);
    loop.stop();
    last?.resolve();
    await flush();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(f.fetch).toHaveBeenCalledTimes(before);
    expect(loop.state("/r/a")).toBeNull();
    expect(changes).toHaveLength(told);
    expect(vi.getTimerCount()).toBe(0);
  });
});
