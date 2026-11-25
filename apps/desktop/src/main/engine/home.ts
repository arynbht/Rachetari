// Home's read: one line per registered repo, from the readers the per-repo
// views already use. Its live cards, what needs the owner, its stage and its
// last night all come from the Now watchers' last read.
// Kept free of any electron import so it unit-tests as plain functions.
import type { HomeRepo, HomeView, NowState, RepoEntry } from "../../shared/ipc";

export interface HomeDeps {
  /** The registered repos: Home reads these and no others. */
  listRepos: () => Promise<RepoEntry[]>;
  /** The Now hub's state for a repo, as it last read it. */
  state: (repoPath: string) => NowState;
}

/** One repo's line. */
export async function homeRepo(
  repo: RepoEntry,
  deps: HomeDeps,
): Promise<HomeRepo> {
  return { repoPath: repo.path, name: repo.name, now: deps.state(repo.path) };
}

/** Every registered repo's line, in the sidebar's order. */
export async function readHome(deps: HomeDeps): Promise<HomeView> {
  const repos = await deps.listRepos();
  return { repos: await Promise.all(repos.map((r) => homeRepo(r, deps))) };
}
