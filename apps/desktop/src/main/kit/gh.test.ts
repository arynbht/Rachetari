// The CI reader against a fake `gh` (test/fake-gh.mjs): its outcomes, its
// time limit, and its read-only allow-list, which refuses anything else
// before a process is started.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { kitFixture, type KitFixture } from "../../../test/kit-fixture";
import { ghAllowed, ghCommand, GhRefused, readGitHub, runGh } from "./gh";

const FAKE = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../test/fake-gh.mjs",
);
const GH = [process.execPath, FAKE];
const ENV = [
  "FAKE_GH_MODE",
  "FAKE_GH_DATA",
  "FAKE_GH_LOG",
  "FAKE_GH_PIDS",
  "FAKE_GH_ALL_PIDS",
  "RACHETARI_GH_LIMIT_MS",
];

const RUN = {
  databaseId: 7,
  status: "completed",
  conclusion: "success",
  headSha: "a1b1ca7abbf00a895ef3ff2b9f4cd304ec0e44fd",
  url: "https://github.com/acme/kit/actions/runs/7",
};
const PULL = {
  number: 60,
  url: "https://github.com/acme/kit/pull/60",
  ref: "card/T-0041",
  sha: "238fac2ad884269622dd9ac262b620ffebf6bbca",
};

let fx: KitFixture;
let scratch: string;
let log: string;
let saved: Record<string, string | undefined>;

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd });
}

/** Every call the fake saw, as its argument arrays. */
function calls(): string[][] {
  if (!existsSync(log)) return [];
  return readFileSync(log, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[]);
}

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

beforeEach(() => {
  saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  for (const k of ENV) delete process.env[k];
  fx = kitFixture();
  git(
    fx.repo,
    "remote",
    "set-url",
    "origin",
    "https://github.com/acme/kit.git",
  );
  scratch = mkdtempSync(join(tmpdir(), "rachetari-gh-"));
  log = join(scratch, "calls.jsonl");
  process.env.FAKE_GH_LOG = log;
  const data = join(scratch, "data.json");
  writeFileSync(
    data,
    JSON.stringify({ runs: { main: [RUN] }, allRuns: [RUN], pulls: [PULL] }),
  );
  process.env.FAKE_GH_DATA = data;
  // Every hung call's pids, so the fixture waits for all of them to exit.
  const allPids = join(scratch, "all-pids");
  process.env.FAKE_GH_ALL_PIDS = allPids;
  fx.trackPids(allPids);
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved))
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  fx.remove();
  rmSync(scratch, { recursive: true, force: true });
});

describe("readGitHub", () => {
  it("signed in: reads the open PRs and the branch's last run", async () => {
    const read = await readGitHub(GH, fx.repo);
    expect(read).toEqual({
      gh: "ok",
      branch: "main",
      branchRuns: [RUN],
      runs: [RUN],
      pulls: [PULL],
    });
    // The repo is named from the origin's URL, the branch from git's refs.
    expect(calls()).toEqual(
      expect.arrayContaining([
        [
          "run",
          "list",
          "--repo",
          "acme/kit",
          "--branch",
          "main",
          "--limit",
          "1",
          "--json",
          "databaseId,status,conclusion,headSha,url",
        ],
        [
          "api",
          "--method",
          "GET",
          "repos/acme/kit/pulls?state=open&per_page=100",
          "--jq",
          "[.[] | {number, url: .html_url, ref: .head.ref, sha: .head.sha}]",
        ],
      ]),
    );
    expect(calls()).toHaveLength(3);
  });

  it("not installed: missing", async () => {
    const read = await readGitHub([join(scratch, "no-such-gh")], fx.repo);
    expect(read).toEqual({ gh: "missing", message: null });
  });

  it("not signed in: signed-out", async () => {
    process.env.FAKE_GH_MODE = "signed-out";
    const read = await readGitHub(GH, fx.repo);
    expect(read).toEqual({ gh: "signed-out", message: null });
  });

  it("no GitHub remote: no-github, and gh never runs", async () => {
    git(fx.repo, "remote", "set-url", "origin", fx.origin);
    expect(await readGitHub(GH, fx.repo)).toEqual({
      gh: "no-github",
      message: null,
    });
    git(fx.repo, "remote", "remove", "origin");
    expect(await readGitHub(GH, fx.repo)).toEqual({
      gh: "no-github",
      message: null,
    });
    expect(calls()).toEqual([]);
  });

  it("a failing call: error, with gh's first line", async () => {
    process.env.FAKE_GH_MODE = "fail";
    expect(await readGitHub(GH, fx.repo)).toEqual({
      gh: "error",
      message: "HTTP 502: Bad Gateway (https://api.github.com/)",
    });
  });

  it("output that isn't JSON: error", async () => {
    process.env.FAKE_GH_MODE = "bad-json";
    expect(await readGitHub(GH, fx.repo)).toEqual({
      gh: "error",
      message: "gh's answer wasn't JSON: <html>not json</html>",
    });
  });

  it("a hang is killed at the limit: error, and the process is gone", async () => {
    process.env.FAKE_GH_MODE = "hang";
    process.env.RACHETARI_GH_LIMIT_MS = "1500";
    const pids = join(scratch, "pids");
    process.env.FAKE_GH_PIDS = pids;
    const started = Date.now();
    const read = await readGitHub(GH, fx.repo);
    expect(read).toEqual({ gh: "error", message: "gh timed out after 1.5 s" });
    expect(Date.now() - started).toBeLessThan(10_000);
    // The last of the three calls to start wrote its pids: it and its child
    // are gone (every call was killed the same way).
    const [pid, child] = readFileSync(pids, "utf8").split(" ").map(Number);
    await expect
      .poll(() => alive(pid ?? 0) || alive(child ?? 0), { timeout: 8_000 })
      .toBe(false);
  });

  it("an origin that isn't a known GitHub repo is never passed to gh", async () => {
    for (const url of [
      "https://github.com/acme/kit;rm -rf",
      "https://github.com/-X/POST",
      "https://github.com/acme/..",
      "https://github.com/acme/kit/../../other",
      "https://evil.example/github.com/acme/kit",
      "https://github.com.evil.example/acme/kit",
      "git@github.com:acme/kit --method POST",
    ]) {
      git(fx.repo, "remote", "set-url", "origin", url);
      expect(await readGitHub(GH, fx.repo)).toEqual({
        gh: "no-github",
        message: null,
      });
    }
    expect(calls()).toEqual([]);

    // Each form a GitHub origin takes names the same repo.
    for (const url of [
      "git@github.com:acme/kit.git",
      "ssh://git@github.com/acme/kit",
      "https://someone@github.com/acme/kit/",
    ]) {
      git(fx.repo, "remote", "set-url", "origin", url);
      expect((await readGitHub(GH, fx.repo)).gh).toBe("ok");
    }
    expect(
      calls().every((args) => args.includes("acme/kit") || args[0] === "api"),
    ).toBe(true);
  });
});

describe("the read-only allow-list", () => {
  it("only ever runs gh run list and gh api GET", async () => {
    await readGitHub(GH, fx.repo);
    const seen = calls();
    expect(seen).toHaveLength(3);
    for (const args of seen) {
      expect(ghAllowed(args)).toBe(true);
      expect(
        (args[0] === "run" && args[1] === "list") ||
          (args[0] === "api" && args[1] === "--method" && args[2] === "GET"),
      ).toBe(true);
    }
  });

  it("refuses any other subcommand or method, and never starts gh", async () => {
    const refused = [
      ["pr", "merge", "60", "--repo", "acme/kit"],
      ["pr", "comment", "60", "--body", "hi"],
      ["pr", "view", "60", "--repo", "acme/kit"],
      ["pr", "list", "--repo", "acme/kit"],
      ["run", "rerun", "7"],
      ["run", "cancel", "7"],
      ["auth", "token"],
      ["auth", "status"],
      ["api", "-X", "POST", "repos/acme/kit/issues"],
      ["api", "--method", "PATCH", "repos/acme/kit/pulls/60"],
      ["api", "--method=POST", "repos/acme/kit/pulls"],
      ["api", "--method", "GET", "-f", "title=x", "repos/acme/kit/pulls"],
      ["api", "-f", "body=x", "repos/acme/kit/issues/1/comments"],
      ["api", "--input", "body.json", "repos/acme/kit/pulls"],
      ["api", "repos/acme/kit/pulls"],
      ["api", "--method", "GET", "graphql"],
      ["api", "--method", "GET", "-H", "X: y", "repos/acme/kit/pulls"],
      ["run", "list", "--repo", "acme/kit", "--branch", "--method"],
      ["run", "list", "--repo", "acme/kit", "--web"],
      ["run", "list", "extra", "--repo", "acme/kit"],
      ["--repo", "acme/kit", "pr", "merge"],
      [],
    ];
    for (const args of refused) {
      expect(ghAllowed(args), args.join(" ")).toBe(false);
      await expect(runGh(GH, args, fx.repo), args.join(" ")).rejects.toThrow(
        GhRefused,
      );
    }
    expect(calls()).toEqual([]);
  });
});

describe("ghCommand", () => {
  it("is gh outside E2E, whatever RACHETARI_GH says", () => {
    expect(ghCommand(false, { RACHETARI_GH: '["/fake"]' })).toEqual(["gh"]);
    expect(ghCommand(false, {})).toEqual(["gh"]);
  });

  it("under E2E is RACHETARI_GH, and nothing without it", () => {
    expect(ghCommand(true, { RACHETARI_GH: '["node","/fake.mjs"]' })).toEqual([
      "node",
      "/fake.mjs",
    ]);
    expect(ghCommand(true, {})).toBeNull();
    expect(ghCommand(true, { RACHETARI_GH: "gh" })).toBeNull();
    expect(ghCommand(true, { RACHETARI_GH: "[]" })).toBeNull();
    expect(ghCommand(true, { RACHETARI_GH: "[1]" })).toBeNull();
  });
});
