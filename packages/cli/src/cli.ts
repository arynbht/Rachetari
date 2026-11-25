import { Command } from "commander";

import { type ReviewFlags, runReview } from "./commands/review.js";

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("rivetari")
    .description("An auditor and scaffolder for GitHub repositories");

  program
    .command("review")
    .description(
      "Judge tier 2: an AI review where only defects, contract breaches and unmet acceptance criteria block",
    )
    .argument("[path]", "path to the repo", ".")
    .option("--pr <number>", "review this pull request and post one review")
    .option("--dry-run", "with --pr: print the review instead of posting it")
    .option(
      "--fresh",
      "with --pr: review the head even when an earlier verdict on the same tree could carry",
    )
    .option(
      "--base <ref>",
      "local mode: the base the change targets",
      "origin/main",
    )
    .option("--head <ref>", "local mode: the change (default HEAD)")
    .option("--model <model>", "judge model")
    .option(
      "--token <token>",
      "GitHub token for --pr (else GITHUB_TOKEN or gh auth)",
    )
    .option("--json", "output JSON")
    .action(async (path: string, flags: ReviewFlags) => {
      process.exitCode = await runReview(path, flags);
    });

  return program;
}

export async function run(argv: string[]): Promise<void> {
  await buildProgram().parseAsync(argv);
}
