import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url))
  .replace(/\\/g, "/")
  .replace(/[()[\]{}*?!+@]/g, "\\$&");
const inOneFork = (glob: string): [string, "forks"] => [
  `${root}${glob}`,
  "forks",
];

// A loaded Windows runner can slow a test's git read past the product's 10 s,
// so on Windows tests give reads 20 s unless the var is set already. That is
// still under the 30 s test timeout, so a real hang fails with git's own
// message. The product keeps 10 s; source-timeout.test.ts sets its own 2 s.
const gitReadLimit: Record<string, string> =
  process.platform === "win32" && !process.env.RACHETARI_GIT_READ_LIMIT_MS
    ? { RACHETARI_GIT_READ_LIMIT_MS: "20000" }
    : {};

export default defineConfig({
  test: {
    // Discover *.test.ts / *.spec.ts across all workspace packages.
    include: [
      "packages/**/*.{test,spec}.ts",
      "apps/**/*.{test,spec}.ts",
      "kit/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // Many tests drive real git repos and child processes. Under the whole suite
    // they timed each other out on a loaded Windows machine, so they run one at a
    // time in a single fork; the rest of the suite runs in threads beside them.
    // On Windows a child that one worker thread starts can inherit the pipes of
    // another thread's child, whose `close` then waits until the first one
    // exits (T-0045's repro: 94 of 400 waits of ~5 s in one process, none
    // across two). Any test that spawns a child belongs in the fork.
    pool: "threads",
    poolMatchGlobs: [
      inOneFork("packages/runtime/src/**"),
      inOneFork("packages/engine/src/fix-pr.test.ts"),
      inOneFork("packages/engine/src/orchestrate/**"),
      inOneFork("packages/engine/src/github/token.test.ts"),
      inOneFork("packages/engine/src/detectors/exec.test.ts"),
      inOneFork("packages/cli/src/commands/**"),
      inOneFork("packages/registry/src/skills.test.ts"),
      inOneFork("packages/engine/src/ai/call-limit.test.ts"),
      inOneFork("apps/desktop/src/main/**"),
    ],
    poolOptions: { forks: { singleFork: true } },
    env: gitReadLimit,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      // On for every run, failing or not, so `pnpm test` always writes
      // coverage-summary.json and checks the floor in `thresholds` below.
      enabled: true,
      reportOnFailure: true,
      provider: "v8",
      reporter: ["json-summary", "text-summary"],
      include: ["packages/*/src/**/*.ts", "apps/desktop/src/**/*.{ts,tsx}"],
      exclude: ["**/*.{test,spec}.ts", "**/*.d.ts", "**/dist/**"],
      thresholds: {
        lines: 42,
        branches: 79,
        functions: 73,
        statements: 42,
      },
    },
  },
});
