// A repo's kit files, read whole on each tick: the watcher the Now hub polls
// with. It only reads (through the file source) and never fetches; it tells
// its listener when what it read changed, or when a read failed.
import type { DisplayBranch } from "../../shared/ipc";
import {
  displayBranch,
  type DoneCard,
  hasMap,
  type LiveCard,
  type Night,
  readBacklog,
  readDoneCards,
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
  /** The branch the kit files were read from; null before the first read. */
  display: DisplayBranch | null;
  backlog: Backlog | null;
  /** The finished cards in cards/done/ on the display and default branches. */
  done: DoneCard[];
  nights: Night[];
  skills: SkillRow[];
  events: RepoEvent[];
  map: boolean;
}

export const EMPTY_SNAPSHOT: KitSnapshot = {
  cards: [],
  display: null,
  backlog: null,
  done: [],
  nights: [],
  skills: [],
  events: [],
  map: false,
};

/** Read a repo's kit files once, from the display branch read once first. */
export async function readKit(repo: string): Promise<KitSnapshot> {
  const display = await displayBranch(repo);
  const [cards, backlog, done, nights, skills, events, map] = await Promise.all(
    [
      readLiveCards(repo, display),
      readBacklog(repo, display),
      readDoneCards(repo, display),
      readNights(repo, display),
      readSkills(repo, display),
      readEvents(repo, 50, display),
      hasMap(repo),
    ],
  );
  return { cards, display, backlog, done, nights, skills, events, map };
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
