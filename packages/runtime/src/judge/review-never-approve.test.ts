// A review is advice: it never posts APPROVE, which would satisfy a
// one-approval merge rule. An approve verdict posts as a comment, and so does
// every retry after GitHub refuses a review.
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AiClient } from "@arynbht/rivetari-engine";
import { simpleGit } from "simple-git";
import { afterEach, describe, expect, it, vi } from "vitest";

import { reviewPullRequest } from "./review.js";

// What the fake GitHub saw, and how it should answer.
const github = vi.hoisted(() => ({
  head: "",
  refuseFirst: false,
  created: [] as { event: string; body: string }[],
}));

vi.mock("@arynbht/rivetari-engine", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@arynbht/rivetari-engine")>();
  class FakeOctokit {
    rest = {
      pulls: {
        get: async () => ({
          data: { base: { ref: "main" }, head: { sha: github.head } },
        }),
        listReviews: async () => ({ data: [] }),
        createReview: async (params: { event: string; body: string }) => {
          github.created.push({ event: params.event, body: params.body });
          if (github.refuseFirst && github.created.length === 1)
            throw Object.assign(new Error("Unprocessable Entity"), {
              status: 422,
            });
          return { data: { html_url: "https://github.test/o/r/pull/1#r" } };
        },
      },
      users: { getAuthenticated: async () => ({ data: { login: "me" } }) },
    };
    paginate = async () => [];
  }
  return {
    ...actual,
    Octokit: FakeOctokit,
    // The origin is a local folder, so the slug comes from here.
    parseRepoSlug: () => ({ owner: "o", repo: "r" }),
  };
});

const made: string[] = [];
afterEach(async () => {
  for (const d of made) await rm(d, { recursive: true, force: true });
  made.length = 0;
  github.created.length = 0;
  github.refuseFirst = false;
});

/** An origin with main and a PR head at refs/pull/1/head, and a clone of it. */
async function pullRequest(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "rachetari-never-approve-"));
  made.push(root);
  const origin = join(root, "origin");
  await mkdir(origin);
  const git = simpleGit(origin);
  await git.init(["-b", "main"]);
  await git.addConfig("user.email", "t@t");
  await git.addConfig("user.name", "t");
  await writeFile(join(origin, "a.js"), "export const a = 1;\n");
  await git.add(["-A"]);
  await git.commit("base", ["--no-verify"]);
  await git.checkoutLocalBranch("change");
  await writeFile(join(origin, "a.js"), "export const a = 2;\n");
  await git.add(["-A"]);
  await git.commit("change", ["--no-verify"]);
  github.head = (await git.revparse(["HEAD"])).trim();
  await git.raw(["update-ref", "refs/pull/1/head", github.head]);
  await git.checkout("main");
  const clone = join(root, "clone");
  await simpleGit(root).clone(origin, clone);
  return clone;
}

/** A reviewer with nothing to say: the verdict is approve. */
const approving: AiClient = {
  async complete(params) {
    return {
      text: '```json\n{"findings": []}\n```',
      usage: { inputTokens: 10, outputTokens: 5 },
      model: params.model ?? "m",
    };
  },
};

describe("review never posts APPROVE", { timeout: 30_000 }, () => {
  it("posts an approve verdict as a comment", async () => {
    const repo = await pullRequest();
    const outcome = await reviewPullRequest({
      repoPath: repo,
      ai: approving,
      model: "judge",
      pr: 1,
      token: "t",
      post: true,
    });
    expect(outcome.verdict).toBe("approve");
    expect(outcome.posted?.event).toBe("COMMENT");
    expect(github.created.map((c) => c.event)).toEqual(["COMMENT"]);
  });

  it("never sends APPROVE on any retry after GitHub refuses a review", async () => {
    const repo = await pullRequest();
    github.refuseFirst = true;
    const outcome = await reviewPullRequest({
      repoPath: repo,
      ai: approving,
      model: "judge",
      pr: 1,
      token: "t",
      post: true,
    });
    expect(outcome.verdict).toBe("approve");
    expect(github.created.length).toBeGreaterThan(1);
    expect(github.created.map((c) => c.event)).not.toContain("APPROVE");
  });
});
