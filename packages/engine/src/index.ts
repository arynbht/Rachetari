// @arynbht/rivetari-engine
// Headless engine. Catalog loading, context building, detectors, gates,
// generators, GitHub client, AI, inference, and metrics land here from M1 on.
export const PACKAGE = "@arynbht/rivetari-engine" as const;

export { Octokit } from "@octokit/rest";
export { parseRepoSlug } from "./github/slug.js";
export type { RepoSlug } from "./github/slug.js";
export { githubToken, resolveToken, type TokenSource } from "./github/token.js";
export {
  createAiClient,
  resolveAnthropicKey,
  AiError,
  AiKeyError,
  DEFAULT_MODEL,
} from "./ai/client.js";
export type {
  AiClient,
  AiClientOptions,
  AiTransport,
  AiUsage,
  CompleteParams,
  CompleteResult,
  Effort,
  TransportRequest,
} from "./ai/client.js";
export {
  claudeCliTransport,
  claudeCliAvailable,
  claudeCommand,
  isTransientFailure,
  parseClaudeJson,
  type ClaudeCliOptions,
  type ClaudeRunner,
} from "./ai/claude-cli.js";
export {
  budgetSpent,
  CALL_TIMEOUT_ENV,
  CallExitError,
  CallTimeoutError,
  callTimeoutMinutes,
  DEFAULT_CALL_TIMEOUT_MINUTES,
  killTree,
  minutesFromEnv,
  spawnWithLimit,
  type TimeLimit,
  withTimeBudget,
} from "./ai/call-limit.js";
export {
  isEnvTemplate,
  isSensitivePath,
  looksLikeSecret,
} from "./ai/redact.js";
export {
  appendUsage,
  loadUsage,
  summarizeUsage,
  estimateCost,
} from "./ai/usage.js";
export type { UsageEntry, UsageSummary } from "./ai/usage.js";
