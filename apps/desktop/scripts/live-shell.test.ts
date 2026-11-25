import { describe, expect, it } from "vitest";

import { checkOnce, tail } from "./live-shell.mjs";

// The live shell's decision logic, driven by a fake runner: each command it
// would run answers with an exit code and output from a scenario, and every
// call is recorded so a test can say what ran and where.

const REPO = "/r";
const LIVE = "/r/.claude/worktrees/shell-live";
const CHECK = "/r/.claude/worktrees/shell-live-check";
const NOW = "2026-11-25T12:00:00.000Z";

const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);

interface Scenario {
  running: string;
  local?: string;
  origin?: string;
  // [ancestor, descendant] pairs; a commit is always its own ancestor.
  ancestors?: [string, string][];
  fetch?: { code: number; output: string };
  dirty?: string;
  changed?: string[];
  fail?: Partial<Record<"install" | "build" | "test", string>>;
}

interface Call {
  where: string;
  command: string;
}

function fakeRunner(s: Scenario) {
  const calls: Call[] = [];
  const where = (cwd: string) =>
    cwd === REPO
      ? "repo"
      : cwd === LIVE
        ? "live"
        : cwd === CHECK
          ? "check"
          : cwd;
  const ok = (output = "") => ({ code: 0, output });
  const run = async (
    cmd: string,
    args: string[],
    opts: { cwd: string; timeoutMs?: number },
  ) => {
    const command = [cmd, ...args].join(" ");
    const at = where(opts.cwd);
    calls.push({ where: at, command });
    if (command === "git fetch --quiet origin develop") {
      expect(opts.timeoutMs).toBe(60_000);
      return s.fetch ?? ok();
    }
    if (command === "git rev-parse HEAD" && at === "live") {
      return ok(`${s.running}\n`);
    }
    if (command === "git rev-parse --verify --quiet refs/heads/develop") {
      return s.local ? ok(`${s.local}\n`) : { code: 1, output: "" };
    }
    if (
      command === "git rev-parse --verify --quiet refs/remotes/origin/develop"
    ) {
      return s.origin ? ok(`${s.origin}\n`) : { code: 1, output: "" };
    }
    if (command.startsWith("git merge-base --is-ancestor ")) {
      const [a, b] = args.slice(2);
      const yes =
        a === b || (s.ancestors ?? []).some(([x, y]) => x === a && y === b);
      return { code: yes ? 0 : 1, output: "" };
    }
    if (command === "git status --porcelain") return ok(s.dirty ?? "");
    if (command.startsWith("git diff --name-only ")) {
      return ok((s.changed ?? []).join("\n"));
    }
    if (command === "pnpm install --frozen-lockfile --prefer-offline") {
      return s.fail?.install && at === "check"
        ? { code: 1, output: s.fail.install }
        : ok("installed");
    }
    if (command === "pnpm --filter @arynbht/rivetari-desktop build") {
      return s.fail?.build ? { code: 1, output: s.fail.build } : ok("built");
    }
    if (
      command === "pnpm exec vitest run apps/desktop --coverage.enabled=false"
    ) {
      return s.fail?.test ? { code: 1, output: s.fail.test } : ok("passed");
    }
    return ok();
  };
  return { run, calls };
}

function check(s: Scenario, previous: unknown = null) {
  const fake = fakeRunner(s);
  const result = checkOnce({
    run: fake.run,
    repo: REPO,
    live: LIVE,
    check: CHECK,
    previous,
    now: () => NOW,
  });
  return result.then((r) => ({ ...r, calls: fake.calls }));
}

const ranIn = (calls: Call[], where: string) =>
  calls.filter((c) => c.where === where).map((c) => c.command);
const lines = (n: number, label: string) =>
  Array.from({ length: n }, (_, i) => `${label} line ${i + 1}`).join("\n");

describe("live shell: one check", () => {
  it("does nothing when develop has not moved", async () => {
    const r = await check({ running: A, local: A, origin: A });
    expect(r.actions).toEqual(["fetch", "unmoved"]);
    expect(ranIn(r.calls, "check")).toEqual([]);
    expect(ranIn(r.calls, "live")).toEqual(["git rev-parse HEAD"]);
    expect(r.restartDev).toBe(false);
    expect(r.status).toEqual({
      running: A,
      develop: A,
      checkedAt: NOW,
      fetchError: null,
      failure: null,
    });
  });

  it("builds, tests and fast-forwards when develop moved and all pass", async () => {
    const r = await check({
      running: A,
      local: B,
      origin: B,
      ancestors: [[A, B]],
      changed: ["apps/desktop/src/renderer/App.tsx"],
    });
    expect(r.actions).toEqual(["fetch", "check", "fast-forward"]);
    expect(ranIn(r.calls, "check")).toEqual([
      `git checkout --detach --force ${B}`,
      "pnpm install --frozen-lockfile --prefer-offline",
      "pnpm --filter @arynbht/rivetari-desktop build",
      "pnpm exec vitest run apps/desktop --coverage.enabled=false",
    ]);
    expect(ranIn(r.calls, "live")).toContain(`git checkout --detach ${B}`);
    expect(ranIn(r.calls, "live")).not.toContain(
      "pnpm install --frozen-lockfile --prefer-offline",
    );
    expect(r.restartDev).toBe(false);
    expect(r.status).toEqual({
      running: B,
      develop: B,
      checkedAt: NOW,
      fetchError: null,
      failure: null,
    });
  });

  it("keeps the live worktree when the build fails, with the output's last 20 lines", async () => {
    const output = lines(30, "build");
    const r = await check({
      running: A,
      local: B,
      origin: B,
      ancestors: [[A, B]],
      fail: { build: output },
    });
    expect(r.actions).toEqual(["fetch", "check", "failed"]);
    expect(ranIn(r.calls, "live")).toEqual([
      "git rev-parse HEAD",
      "git status --porcelain",
    ]);
    expect(ranIn(r.calls, "check")).not.toContain(
      "pnpm exec vitest run apps/desktop --coverage.enabled=false",
    );
    expect(r.status.running).toBe(A);
    expect(r.status.develop).toBe(B);
    expect(r.status.failure).toEqual({
      sha: B,
      step: "build",
      reason: output.split("\n").slice(10).join("\n"),
      at: NOW,
    });
  });

  it("keeps the live worktree when the tests fail, naming step test", async () => {
    const output =
      lines(25, "vitest") + "\nFAIL live-trial.test.ts > one is two";
    const r = await check({
      running: A,
      local: B,
      origin: B,
      ancestors: [[A, B]],
      fail: { test: output },
    });
    expect(r.actions).toEqual(["fetch", "check", "failed"]);
    expect(ranIn(r.calls, "live")).not.toContain(`git checkout --detach ${B}`);
    expect(r.status.running).toBe(A);
    expect(r.status.failure?.step).toBe("test");
    expect(r.status.failure?.reason.split("\n")).toHaveLength(20);
    expect(r.status.failure?.reason).toContain("one is two");
  });

  it("names step install when the check's install fails", async () => {
    const r = await check({
      running: A,
      local: B,
      origin: B,
      ancestors: [[A, B]],
      fail: { install: "ERR_PNPM_OUTDATED_LOCKFILE" },
    });
    expect(r.status.failure?.step).toBe("install");
    expect(r.status.failure?.reason).toBe("ERR_PNPM_OUTDATED_LOCKFILE");
    expect(ranIn(r.calls, "check")).not.toContain(
      "pnpm --filter @arynbht/rivetari-desktop build",
    );
  });

  it("does not build a commit that already failed until develop moves on", async () => {
    const failed = {
      running: A,
      develop: B,
      checkedAt: "earlier",
      fetchError: null,
      failure: { sha: B, step: "test", reason: "1 failed", at: "earlier" },
    };
    const again = await check(
      { running: A, local: B, origin: B, ancestors: [[A, B]] },
      failed,
    );
    expect(again.actions).toEqual(["fetch", "already-failed"]);
    expect(ranIn(again.calls, "check")).toEqual([]);
    expect(again.status.running).toBe(A);
    expect(again.status.failure).toEqual(failed.failure);
    expect(again.status.checkedAt).toBe(NOW);

    const movedOn = await check(
      {
        running: A,
        local: C,
        origin: C,
        ancestors: [
          [A, B],
          [B, C],
          [A, C],
        ],
      },
      failed,
    );
    expect(movedOn.actions).toEqual(["fetch", "check", "fast-forward"]);
    expect(movedOn.status.running).toBe(C);
    expect(movedOn.status.failure).toBeNull();
  });

  it("uses local develop when it is ahead of origin/develop", async () => {
    const r = await check({
      running: A,
      local: C,
      origin: B,
      ancestors: [
        [A, B],
        [B, C],
        [A, C],
      ],
    });
    expect(r.status.develop).toBe(C);
    expect(r.status.running).toBe(C);
    expect(ranIn(r.calls, "check")[0]).toBe(
      `git checkout --detach --force ${C}`,
    );
  });

  it("uses origin/develop when it is ahead of local develop", async () => {
    const r = await check({
      running: A,
      local: B,
      origin: C,
      ancestors: [
        [A, B],
        [B, C],
        [A, C],
      ],
    });
    expect(r.status.develop).toBe(C);
    expect(r.status.running).toBe(C);
  });

  it("uses whichever develop exists when only one does", async () => {
    const r = await check({
      running: A,
      origin: B,
      ancestors: [[A, B]],
    });
    expect(r.status.develop).toBe(B);
    expect(r.status.running).toBe(B);
  });

  it("moves nothing and writes the reason when local and origin develop diverged", async () => {
    const r = await check({
      running: A,
      local: B,
      origin: C,
      ancestors: [
        [A, B],
        [A, C],
      ],
    });
    expect(r.actions).toEqual(["fetch", "failed"]);
    expect(ranIn(r.calls, "check")).toEqual([]);
    expect(ranIn(r.calls, "live")).toEqual(["git rev-parse HEAD"]);
    expect(r.status.running).toBe(A);
    expect(r.status.failure?.step).toBe("diverged");
    expect(r.status.failure?.reason).toMatch(/diverged/);
    expect(r.status.failure?.reason).toContain(B.slice(0, 7));
    expect(r.status.failure?.reason).toContain(C.slice(0, 7));
  });

  it("moves nothing when develop does not descend from the running commit", async () => {
    const r = await check({
      running: B,
      local: A,
      origin: A,
      ancestors: [[A, B]],
    });
    expect(r.actions).toEqual(["fetch", "failed"]);
    expect(ranIn(r.calls, "check")).toEqual([]);
    expect(r.status.running).toBe(B);
    expect(r.status.failure).toEqual({
      sha: A,
      step: "not-forward",
      reason: expect.stringContaining("does not descend from the running"),
      at: NOW,
    });
  });

  it("moves nothing when the live worktree has local changes", async () => {
    const r = await check({
      running: A,
      local: B,
      origin: B,
      ancestors: [[A, B]],
      dirty: " M apps/desktop/src/renderer/App.tsx\n",
    });
    expect(r.actions).toEqual(["fetch", "failed"]);
    expect(ranIn(r.calls, "check")).toEqual([]);
    expect(r.status.failure?.step).toBe("dirty");
    expect(r.status.failure?.reason).toContain("App.tsx");
  });

  it.each([
    "pnpm-lock.yaml",
    "package.json",
    "apps/desktop/package.json",
    "packages/engine/package.json",
    "apps/desktop/electron.vite.config.ts",
  ])(
    "installs in the live worktree and restarts the dev server when %s changes",
    async (file) => {
      const r = await check({
        running: A,
        local: B,
        origin: B,
        ancestors: [[A, B]],
        changed: ["apps/desktop/src/main/index.ts", file],
      });
      expect(r.actions).toEqual([
        "fetch",
        "check",
        "fast-forward",
        "install-live",
        "restart-dev",
      ]);
      expect(ranIn(r.calls, "live").slice(-2)).toEqual([
        `git checkout --detach ${B}`,
        "pnpm install --frozen-lockfile --prefer-offline",
      ]);
      expect(r.restartDev).toBe(true);
      expect(r.status.running).toBe(B);
    },
  );

  it("does not install or restart for a package.json-like name that is not one", async () => {
    const r = await check({
      running: A,
      local: B,
      origin: B,
      ancestors: [[A, B]],
      changed: [
        "docs/package.json.md",
        "apps/desktop/electron.vite.config.ts.bak",
      ],
    });
    expect(r.actions).toEqual(["fetch", "check", "fast-forward"]);
    expect(r.restartDev).toBe(false);
  });

  it("logs a failed fetch and goes on with what it has", async () => {
    const r = await check({
      running: A,
      local: B,
      origin: A,
      ancestors: [[A, B]],
      fetch: {
        code: 128,
        output: "fatal: unable to access 'https://github.com/x/y.git/'\n",
      },
    });
    expect(r.status.fetchError).toBe(
      "fatal: unable to access 'https://github.com/x/y.git/'",
    );
    expect(r.status.running).toBe(B);
    expect(r.status.failure).toBeNull();
  });
});

describe("tail", () => {
  it("keeps the last n non-trailing lines", () => {
    expect(tail("a\nb\nc\n\n", 2)).toBe("b\nc");
    expect(tail("a\r\nb", 5)).toBe("a\nb");
  });
});
