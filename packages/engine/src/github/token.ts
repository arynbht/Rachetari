import { execFileSync } from "node:child_process";

/** Where a token came from: Rivetari's App acts as itself, the rest as a person. */
export type TokenSource = "explicit" | "env" | "app" | "gh";

/**
 * The token Rivetari acts on a repo with: an explicit one,
 * else `GITHUB_TOKEN`/`GH_TOKEN`, else the `gh` login. There is no GitHub App
 * here, so reviews come from whoever ran it.
 */
export async function githubToken(
  _repoPath: string,
  explicit?: string,
): Promise<{ token: string; source: TokenSource } | null> {
  if (explicit) return { token: explicit, source: "explicit" };
  const fromEnv = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (fromEnv) return { token: fromEnv, source: "env" };
  const gh = resolveToken();
  return gh ? { token: gh, source: "gh" } : null;
}

/**
 * Resolve a GitHub token from, in order: an explicit value, the `GITHUB_TOKEN`
 * or `GH_TOKEN` environment variables, then the `gh` CLI's stored auth.
 *
 * The engine is source-agnostic about tokens: in CI this slot receives a GitHub
 * App installation token (ADR-0007); locally it is typically the `gh` login.
 */
export function resolveToken(explicit?: string): string | undefined {
  if (explicit) return explicit;

  const fromEnv = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (fromEnv) return fromEnv;

  try {
    const out = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}
