import { resolve } from "node:path";

import { AiError, createAiClient, githubToken } from "@arynbht/rivetari-engine";
import {
  JUDGE_DEFAULT_MODEL,
  type ReviewOutcome,
  reviewLocal,
  reviewPullRequest,
} from "@arynbht/rivetari-runtime";

export interface ReviewFlags {
  pr?: string;
  base?: string;
  head?: string;
  model?: string;
  token?: string;
  dryRun?: boolean;
  fresh?: boolean;
  json?: boolean;
}

const EXIT = { approve: 0, "request-changes": 1, "needs-human": 2 } as const;

/**
 * `rivetari review`: judge tier 2. With `--pr <n>`, reviews that pull request and
 * posts one review (unless `--dry-run`); otherwise reviews the local change
 * from `--base` (default origin/main) to `--head` and prints it.
 */
export async function runReview(
  path: string,
  flags: ReviewFlags,
): Promise<number> {
  const repo = resolve(path);
  const log = flags.json
    ? undefined
    : (line: string) => process.stderr.write(`· ${line}\n`);

  const model = flags.model ?? JUDGE_DEFAULT_MODEL;
  const common = {
    repoPath: repo,
    // One retry: a call that failed for a passing reason is worth one more.
    ai: createAiClient({ timeoutMs: 600_000, maxRetries: 1 }),
    model,
    // No risk is derived here; medium keeps the long runaway reviews away.
    effort: "medium" as const,
    log,
  };

  let outcome: ReviewOutcome;
  try {
    if (flags.pr) {
      if (!/^[1-9]\d*$/.test(flags.pr)) {
        console.error(
          `rivetari review: --pr takes a PR number, not "${flags.pr}".`,
        );
        return 1;
      }
      const token = (await githubToken(repo, flags.token))?.token;
      if (!token) {
        console.error(
          "rivetari review: --pr needs GitHub: Rivetari's App installed on the repo, GITHUB_TOKEN, or `gh auth login`.",
        );
        return 1;
      }
      outcome = await reviewPullRequest({
        ...common,
        pr: Number(flags.pr),
        token,
        post: !flags.dryRun,
        fresh: flags.fresh,
      });
    } else {
      outcome = await reviewLocal({
        ...common,
        base: flags.base ?? "origin/main",
        head: flags.head,
      });
    }
  } catch (err) {
    console.error(
      `rivetari review: ${err instanceof AiError ? err.message : (err as Error).message}`,
    );
    return 1;
  }

  if (flags.json) {
    process.stdout.write(
      `${JSON.stringify({ ...outcome, result: { ...outcome.result, packed: { ...outcome.result.packed, lines: undefined } } }, null, 2)}\n`,
    );
  } else {
    process.stdout.write(`${outcome.body}\n`);
    if (outcome.posted) {
      process.stdout.write(
        `\nposted (${outcome.posted.event}): ${outcome.posted.url}\n`,
      );
    }
    if (outcome.check) process.stdout.write(`${outcome.check}\n`);
    const r = outcome.result;
    process.stderr.write(
      outcome.carried
        ? `· carried ${outcome.verdict} from ${outcome.carried.from.slice(0, 12)} (${outcome.carried.source}): identical tree, no review call\n`
        : `· review: ${r.model}${r.effort ? ` at ${r.effort} effort` : ""} · ${r.calls} call(s) · ${r.usage.tokens} tokens · $${r.usage.costUsd.toFixed(2)}\n`,
    );
  }
  return EXIT[outcome.verdict];
}
