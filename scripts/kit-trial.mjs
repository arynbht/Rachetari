// Builds a small scratch repo, with a local origin, for trying the kit's
// commands on: a tiny Node package with a test, a lint script and a README.
// It lives in this repo's gitignored .scratch/, so a trial writes nothing
// outside the repo and pushes nowhere but its own origin.
//
//   node scripts/kit-trial.mjs     -> prints the scratch repo's path
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const trial = join(root, ".scratch", "kit-trial");
const origin = join(trial, "origin.git");
const repo = join(trial, "repo");

const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8" });
const write = (path, text) => {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), text);
};

rmSync(trial, { recursive: true, force: true });
mkdirSync(trial, { recursive: true });
git(trial, "init", "-q", "--bare", "-b", "main", origin);
git(trial, "clone", "-q", origin, repo);
for (const [key, value] of [
  ["user.email", "trial@example.test"],
  ["user.name", "Kit Trial"],
  ["commit.gpgsign", "false"],
  ["core.autocrlf", "false"],
])
  git(repo, "config", key, value);

write(
  "package.json",
  JSON.stringify(
    {
      name: "kit-trial",
      version: "0.0.0",
      private: true,
      type: "module",
      scripts: {
        test: "node --test",
        lint: "node --check src/add.js",
      },
    },
    null,
    2,
  ) + "\n",
);
write(
  "src/add.js",
  "/** The sum of two numbers. */\nexport const add = (a, b) => a + b;\n",
);
write(
  "test/add.test.js",
  'import { test } from "node:test";\nimport assert from "node:assert/strict";\n\nimport { add } from "../src/add.js";\n\ntest("adds", () => assert.equal(add(2, 3), 5));\n',
);
write(
  "README.md",
  "# kit-trial\n\nA tiny package: `npm test` runs the tests.\n",
);
git(repo, "add", "-A");
git(
  repo,
  "commit",
  "-q",
  "--no-verify",
  "-m",
  "chore: a tiny package to try the kit on",
);
git(repo, "push", "-q", "origin", "main");

console.log(repo);
