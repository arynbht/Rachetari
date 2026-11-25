// CiWatch with a fake reader: how gh's answers fold into CiState, one read
// per repo at a time, and at most one a minute.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CiState } from "../../shared/ipc";
import type { GhRead } from "../kit/gh";
import { CiWatch, prState, runState } from "./ci";

const SHA = "a1b1ca7abbf00a895ef3ff2b9f4cd304ec0e44fd";
const SHA2 = "238fac2ad884269622dd9ac262b620ffebf6bbca";
const NOW = new Date("2026-11-25T22:00:00.000Z");

const run = (status: string, conclusion: string, more = {}) => ({
  status,
  conclusion,
  headBranch: "card/T-0041",
  headSha: SHA2,
  workflowName: "CI",
  event: "pull_request",
  ...more,
});

const branchRun = (status: string, conclusion: string) => ({
  databaseId: 7,
  status,
  conclusion,
  headSha: SHA,
  url: "https://github.com/acme/kit/actions/runs/7",
});

const pull = (ref: string, number = 60, sha = SHA2) => ({
  number,
  url: `https://github.com/acme/kit/pull/${number}`,
  ref,
  sha,
});

function ok(over: Partial<Extract<GhRead, { gh: "ok" }>> = {}): GhRead {
  return {
    gh: "ok",
    branch: "develop",
    branchRuns: [branchRun("completed", "success")],
    runs: [],
    pulls: [],
    ...over,
  };
}

/** A reader whose reads are settled by the test. */
function fakeRead() {
  const calls: {
    repo: string;
    resolve: (r: GhRead) => void;
    reject: (e: Error) => void;
  }[] = [];
  const read = vi.fn(
    (repo: string) =>
      new Promise<GhRead>((resolve, reject) =>
        calls.push({ repo, resolve, reject }),
      ),
  );
  return { read, calls };
}

const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("folding gh's answers", () => {
  it("folds a rollup into passed, failed, running or none", () => {
    expect(prState([])).toBe("none");
    expect(prState([run("completed", "success")])).toBe("passed");
    expect(
      prState([run("completed", "success"), run("completed", "skipped")]),
    ).toBe("passed");
    for (const failed of [
      "failure",
      "cancelled",
      "timed_out",
      "action_required",
      "startup_failure",
    ])
      expect(
        prState([run("completed", "success"), run("completed", failed)]),
        failed,
      ).toBe("failed");
    expect(prState([run("completed", "success"), run("in_progress", "")])).toBe(
      "running",
    );
    expect(prState([run("queued", ""), run("completed", "failure")])).toBe(
      "failed",
    );
  });

  it("maps a run's status and conclusion", () => {
    expect(runState("completed", "success")).toBe("passed");
    expect(runState("completed", "neutral")).toBe("passed");
    expect(runState("completed", "failure")).toBe("failed");
    expect(runState("completed", "timed_out")).toBe("failed");
    expect(runState("completed", "cancelled")).toBe("cancelled");
    expect(runState("in_progress", "")).toBe("running");
    expect(runState("queued", "")).toBe("running");
  });

  it("maps the branch's last run, and null with no run", async () => {
    const f = fakeRead();
    const watch = new CiWatch({ read: f.read });
    const first = watch.read("/r/a");
    f.calls[0]?.resolve(ok());
    expect(await first).toEqual({
      repoPath: "/r/a",
      gh: "ok",
      message: null,
      readAt: NOW.toISOString(),
      branch: {
        name: "develop",
        run: {
          state: "passed",
          sha7: "a1b1ca7",
          url: "https://github.com/acme/kit/actions/runs/7",
        },
      },
      prs: [],
    });

    const other = watch.read("/r/b");
    f.calls[1]?.resolve(ok({ branch: "main", branchRuns: [] }));
    expect((await other)?.branch).toEqual({ name: "main", run: null });
  });

  it("keeps only card/* PRs, each folded from its head's latest runs", async () => {
    const f = fakeRead();
    const watch = new CiWatch({ read: f.read });
    const read = watch.read("/r/a");
    f.calls[0]?.resolve(
      ok({
        pulls: [
          pull("card/T-0041", 60),
          pull("card/T-0036", 59, SHA),
          pull("dependabot/npm/zod", 61),
          pull("feature/x", 62),
          pull("card/T-0040", 55, "f".repeat(40)),
        ],
        runs: [
          // Newest first: a re-run passed after the first run failed.
          run("completed", "success"),
          run("completed", "failure"),
          run("in_progress", "", { headBranch: "card/T-0036", headSha: SHA }),
          // Another commit on the same branch: not the PR's head.
          run("completed", "failure", { headSha: SHA }),
        ],
      }),
    );
    expect((await read)?.prs).toEqual([
      {
        branch: "card/T-0041",
        number: 60,
        state: "passed",
        url: "https://github.com/acme/kit/pull/60",
      },
      {
        branch: "card/T-0036",
        number: 59,
        state: "running",
        url: "https://github.com/acme/kit/pull/59",
      },
      {
        branch: "card/T-0040",
        number: 55,
        state: "none",
        url: "https://github.com/acme/kit/pull/55",
      },
    ]);
  });

  it("drops anything in gh's answer that isn't a known value", async () => {
    const f = fakeRead();
    const watch = new CiWatch({ read: f.read });
    const read = watch.read("/r/a");
    f.calls[0]?.resolve(
      ok({
        branchRuns: [{ ...branchRun("completed", "success"), headSha: "zz" }],
        pulls: [
          { ...pull("card/T-0041"), number: "60; rm -rf" },
          { ...pull("card/T-0042", 61), number: 6.5 },
          { ...pull("card/T-0043", 62), url: "https://evil.example/pull/62" },
          pull("card/T-0044", 63),
          "not a pull",
        ],
        runs: "not a list",
      }),
    );
    const state = await read;
    expect(state?.branch).toEqual({ name: "develop", run: null });
    expect(state?.prs).toEqual([
      {
        branch: "card/T-0044",
        number: 63,
        state: "none",
        url: "https://github.com/acme/kit/pull/63",
      },
    ]);
  });
});

describe("CiWatch", () => {
  it("a read asked for while one runs joins it", async () => {
    const f = fakeRead();
    const watch = new CiWatch({ read: f.read });
    const first = watch.read("/r/a");
    const second = watch.read("/r/a");
    expect(f.read).toHaveBeenCalledTimes(1);
    f.calls[0]?.resolve(ok());
    expect(await second).toEqual(await first);

    // A Windows path in another case is the same repo.
    if (process.platform === "win32") {
      await vi.advanceTimersByTimeAsync(60_000);
      void watch.read("/R/A");
      void watch.read("/r/a");
      expect(f.read).toHaveBeenCalledTimes(2);
    }
  });

  it("reads a repo at most once a minute", async () => {
    const f = fakeRead();
    const watch = new CiWatch({ read: f.read });
    const first = watch.read("/r/a");
    f.calls[0]?.resolve(ok());
    const state = await first;

    // Asked again and again within the minute: the last read, no gh call.
    for (let s = 0; s < 59; s += 1) {
      await vi.advanceTimersByTimeAsync(1000);
      expect(await watch.read("/r/a")).toEqual(state);
    }
    await vi.advanceTimersByTimeAsync(999);
    void watch.read("/r/a");
    expect(f.read).toHaveBeenCalledTimes(1);

    // A minute after the last read started: one more.
    await vi.advanceTimersByTimeAsync(1);
    void watch.read("/r/a");
    void watch.read("/r/a");
    expect(f.read).toHaveBeenCalledTimes(2);

    // Each repo has its own minute.
    void watch.read("/r/b");
    expect(f.read).toHaveBeenCalledTimes(3);
  });

  it("a failed read keeps the reason, not stale PRs", async () => {
    const f = fakeRead();
    const watch = new CiWatch({ read: f.read, minIntervalMs: 1000 });
    const first = watch.read("/r/a");
    f.calls[0]?.resolve(ok({ pulls: [pull("card/T-0041")] }));
    expect((await first)?.prs).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1000);
    const second = watch.read("/r/a");
    f.calls[1]?.resolve({ gh: "error", message: "HTTP 502: Bad Gateway" });
    expect(await second).toEqual({
      repoPath: "/r/a",
      gh: "error",
      message: "HTTP 502: Bad Gateway",
      readAt: new Date(NOW.getTime() + 1000).toISOString(),
      branch: null,
      prs: [],
    });

    await vi.advanceTimersByTimeAsync(1000);
    const third = watch.read("/r/a");
    f.calls[2]?.reject(new Error("git config failed\nmore"));
    expect(await third).toMatchObject({
      gh: "error",
      message: "git config failed",
      branch: null,
      prs: [],
    });

    await vi.advanceTimersByTimeAsync(1000);
    const fourth = watch.read("/r/a");
    f.calls[3]?.resolve({ gh: "signed-out", message: null });
    expect(await fourth).toMatchObject({ gh: "signed-out", prs: [] });
  });

  it("says the repo on show: at once on show, then after each read of it", async () => {
    const f = fakeRead();
    const told: CiState[] = [];
    const watch = new CiWatch({ read: f.read, onState: (s) => told.push(s) });

    watch.show("/r/a");
    expect(told).toEqual([null]);
    expect(f.read).toHaveBeenCalledTimes(1);
    f.calls[0]?.resolve(ok());
    await flush();
    expect(told).toHaveLength(2);
    expect(told[1]?.repoPath).toBe("/r/a");
    expect(watch.state()).toEqual(told[1]);

    // Another repo's read says nothing; back on show, its last read is said.
    watch.show("/r/b");
    expect(told[2]).toBeNull();
    watch.show("/r/a");
    expect(told[3]).toEqual(told[1]);
    expect(f.read).toHaveBeenCalledTimes(2);
    f.calls[1]?.resolve(ok());
    await flush();
    expect(told).toHaveLength(4);

    watch.show(null);
    expect(told[4]).toBeNull();
    expect(watch.state()).toBeNull();
  });

  it("reads again when the repo on show's fetch settles, and only that repo", async () => {
    const f = fakeRead();
    const watch = new CiWatch({ read: f.read });
    watch.show("/r/a");
    f.calls[0]?.resolve(ok());
    await flush();

    await vi.advanceTimersByTimeAsync(60_000);
    watch.fetched("/r/b");
    expect(f.read).toHaveBeenCalledTimes(1);
    watch.fetched("/r/a");
    expect(f.read).toHaveBeenCalledTimes(2);
    expect(f.calls[1]?.repo).toBe("/r/a");
  });

  it("with no gh to run, reads nothing and says nothing", async () => {
    const told: CiState[] = [];
    const watch = new CiWatch({ read: null, onState: (s) => told.push(s) });
    watch.show("/r/a");
    watch.fetched("/r/a");
    expect(await watch.read("/r/a")).toBeNull();
    expect(watch.state()).toBeNull();
    expect(told).toEqual([null]);
  });
});
