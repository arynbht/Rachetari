// A repo's kit files, read whole on each tick: the watcher the Now hub polls
// with. It only reads (through the file source) and never fetches; it tells
// its listener when what it read changed, or when a read failed.
import {
  hasMap,
  type LiveCard,
  type Night,
  readBacklog,
  readEvents,
  readLiveCards,
  readNights,
  readSkills,
  type RepoEvent,
} from "./source";
import type { Backlog, SkillRow } from "./parse";

/** Everything the shell's views show about one repo, as last read. */
export interface KitSnapshot {
  cards: LiveCard[];
  backlog: Backlog | null;
  nights: Night[];
  skills: SkillRow[];
  events: RepoEvent[];
  map: boolean;
}

export const EMPTY_SNAPSHOT: KitSnapshot = {
  cards: [],
  backlog: null,
  nights: [],
  skills: [],
  events: [],
  map: false,
};

/** Read a repo's kit files once. */
export async function readKit(repo: string): Promise<KitSnapshot> {
  const [cards, backlog, nights, skills, events, map] = await Promise.all([
    readLiveCards(repo),
    readBacklog(repo),
    readNights(repo),
    readSkills(repo),
    readEvents(repo),
    hasMap(repo),
  ]);
  return { cards, backlog, nights, skills, events, map };
}

export type KitEvent =
  | { kind: "snapshot"; snapshot: KitSnapshot }
  | { kind: "error"; message: string };

export interface KitWatcher {
  /** Settles once the first read has landed (or failed). */
  ready: Promise<void>;
  stop(): Promise<void>;
}

export type WatchRepo = (
  repo: string,
  onEvent: (event: KitEvent) => void,
  options: { intervalMs: number },
) => KitWatcher;

/**
 * Read `repo` now and every `intervalMs`, telling `onEvent` the first read and
 * then only what changed. A failed read is told once until it changes.
 */
export const watchRepo: WatchRepo = (repo, onEvent, { intervalMs }) => {
  let stopped = false;
  let last = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> = Promise.resolve();

  const tick = async (): Promise<void> => {
    try {
      const snapshot = await readKit(repo);
      const said = JSON.stringify(snapshot);
      if (!stopped && said !== last) {
        last = said;
        onEvent({ kind: "snapshot", snapshot });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const said = `error:${message}`;
      if (!stopped && said !== last) {
        last = said;
        onEvent({ kind: "error", message });
      }
    }
  };

  const loop = (): void => {
    if (stopped) return;
    timer = setTimeout(() => {
      running = tick().then(loop);
    }, intervalMs);
  };

  const ready = tick();
  running = ready.then(loop);

  return {
    ready,
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await running.catch(() => undefined);
    },
  };
};
