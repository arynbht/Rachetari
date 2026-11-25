import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url))
  .replace(/\\/g, "/")
  .replace(/[()[\]{}*?!+@]/g, "\\$&");
const inOneFork = (glob: string): [string, "forks"] => [
  `${root}${glob}`,
  "forks",
];

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
    pool: "threads",
    poolMatchGlobs: [
      inOneFork("packages/runtime/src/**"),
      inOneFork("packages/engine/src/fix-pr.test.ts"),
      inOneFork("packages/engine/src/orchestrate/**"),
      inOneFork("packages/engine/src/github/token.test.ts"),
      inOneFork("packages/engine/src/detectors/exec.test.ts"),
      inOneFork("packages/cli/src/commands/**"),
      inOneFork("packages/registry/src/skills.test.ts"),
    ],
    poolOptions: { forks: { singleFork: true } },
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
