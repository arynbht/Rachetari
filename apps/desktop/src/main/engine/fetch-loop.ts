// The background fetch: every sidebar repo is fetched at once, then again a
// set time (60 s) after each of its fetches settles, so the other machine's
// work arrives while a repo stays on screen. One fetch per repo at a time: a
// fetch asked for while one runs (opening the repo) gets that same fetch.
// Electron-free, like engine/now, so it tests without a window.
import { resolve } from "node:path";

/** One repo's fetch as the header shows it. */
export interface FetchState {
  repoPath: string;
  /** The last fetch that succeeded (ISO), or null before one has. */
  fetchedAt: string | null;
  /** The last fetch's message when it failed; null once one succeeds. */
  error: string | null;
}

export interface FetchLoopOptions {
  /** Fetches one repo's remotes (T-0024's `fetchRepo`, with its own limit). */
  fetch: (repoPath: string) => Promise<void>;
  now?: () => Date;
  /** The wait after a fetch settles before the next one: 60 s by default. */
  intervalMs?: number;
  /** Hears a repo's state each time one of its fetches settles. */
  onChange?: (state: FetchState) => void;
}

interface Entry {
  repoPath: string;
  fetchedAt: string | null;
  error: string | null;
  running: Promise<void> | null;
  timer: ReturnType<typeof setTimeout> | null;
}

export const FETCH_INTERVAL_MS = 60_000;

/** Windows paths are case-insensitive: keyed as the NowHub keys them. */
const keyOf = (path: string) => {
  const full = resolve(path);
  return process.platform === "win32" ? full.toLowerCase() : full;
};

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

export class FetchLoop {
  private readonly repos = new Map<string, Entry>();
  private readonly now: () => Date;
  private readonly intervalMs: number;

  constructor(private readonly options: FetchLoopOptions) {
    this.now = options.now ?? (() => new Date());
    this.intervalMs = options.intervalMs ?? FETCH_INTERVAL_MS;
  }

  /** Fetch exactly these repos: new ones at once, ones no longer given stop. */
  setRepos(paths: string[]): void {
    const wanted = new Map(paths.map((p) => [keyOf(p), p]));
    for (const [key, entry] of this.repos)
      if (!wanted.has(key)) this.drop(key, entry);
    for (const [key, repoPath] of wanted)
      if (!this.repos.has(key)) {
        const entry: Entry = {
          repoPath,
          fetchedAt: null,
          error: null,
          running: null,
          timer: null,
        };
        this.repos.set(key, entry);
        void this.run(entry).catch(() => undefined);
      }
  }

  /**
   * Fetch a repo now: joins the fetch that runs, else starts one (and the
   * wait to the next starts again from it). Rejects as the fetch does. A repo
   * the loop isn't given is fetched once, on its own.
   */
  fetchNow(repoPath: string): Promise<void> {
    const entry = this.repos.get(keyOf(repoPath));
    if (!entry) return this.options.fetch(repoPath);
    return entry.running ?? this.run(entry);
  }

  /** A repo's fetch state, or null for a repo the loop isn't given. */
  state(repoPath: string): FetchState | null {
    const entry = this.repos.get(keyOf(repoPath));
    return entry ? this.view(entry) : null;
  }

  /** Stop everything: no fetch starts again, and results that land are dropped. */
  stop(): void {
    for (const [key, entry] of this.repos) this.drop(key, entry);
  }

  private run(entry: Entry): Promise<void> {
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = null;
    const running: Promise<void> = this.options.fetch(entry.repoPath).then(
      (): void => this.settled(entry, running, null),
      (err: unknown): never => {
        this.settled(entry, running, message(err));
        throw err;
      },
    );
    entry.running = running;
    return running;
  }

  private settled(
    entry: Entry,
    running: Promise<void>,
    error: string | null,
  ): void {
    // A dropped repo's, or a stopped loop's, late result speaks for nobody.
    if (entry.running !== running || !this.has(entry)) return;
    entry.running = null;
    if (error === null) entry.fetchedAt = this.now().toISOString();
    entry.error = error;
    entry.timer = setTimeout(() => {
      entry.timer = null;
      void this.run(entry).catch(() => undefined);
    }, this.intervalMs);
    this.options.onChange?.(this.view(entry));
  }

  private drop(key: string, entry: Entry): void {
    this.repos.delete(key);
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = null;
    entry.running = null;
  }

  private has(entry: Entry): boolean {
    return this.repos.get(keyOf(entry.repoPath)) === entry;
  }

  private view(entry: Entry): FetchState {
    return {
      repoPath: entry.repoPath,
      fetchedAt: entry.fetchedAt,
      error: entry.error,
    };
  }
}
