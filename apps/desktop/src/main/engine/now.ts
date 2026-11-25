// Now adapter: a watcher on every repo in the sidebar for as long as the
// window is open, so the Now view and the sidebar's badges stay current
// whichever tab is on show. The repo on show is read every couple of seconds,
// the others less often. Everything here is read from the repo's kit files
// through the file source (kit/source.ts); nothing here writes, and nothing
// here fetches. Electron-free: the pushes and the notification are callbacks
// passed in.
import { resolve } from "node:path";

import {
  EMPTY_SNAPSHOT,
  type KitSnapshot,
  type KitWatcher,
  watchRepo,
  type WatchRepo,
} from "../kit/watch";
import type {
  NeedsYouItem,
  NowBadges,
  NowHealth,
  NowRunning,
  NowState,
  RecentEvent,
} from "../../shared/ipc";

/** What the repo's checklist, skills and last night say. */
export function nowHealth(snapshot: KitSnapshot): NowHealth {
  const lines = (snapshot.backlog?.checklist.groups ?? []).flatMap(
    (g) => g.lines,
  );
  const count = (status: string) =>
    lines.filter((l) => l.status === status).length;
  const night = snapshot.nights[0];
  const onLiveCards = [
    ...new Set(
      snapshot.cards.flatMap((c) =>
        (c.card?.skills ?? []).map(
          (s) => /`([^`]+)`/.exec(s)?.[1] ?? s.split(" ")[0] ?? s,
        ),
      ),
    ),
  ].sort();
  return {
    stage: snapshot.backlog?.checklist.stage ?? null,
    stageWhy: snapshot.backlog?.checklist.stageWhy ?? null,
    counts: {
      pass: count("pass"),
      fail: count("fail"),
      unchecked: count("unchecked"),
      na: count("n/a"),
    },
    lastSetup: snapshot.backlog?.checklist.lastSetup ?? null,
    hasBacklog: snapshot.backlog !== null,
    skills: { count: snapshot.skills.length, onLiveCards },
    lastNight: night
      ? {
          date: night.date,
          merged: night.merged,
          held: night.held,
          blocked: night.blocked,
        }
      : null,
  };
}

/** Everything that waits on the owner, oldest first, each with what to do. */
export function needsYouItems(snapshot: KitSnapshot): NeedsYouItem[] {
  const items: NeedsYouItem[] = [];
  for (const live of snapshot.cards) {
    const card = live.card;
    const at = live.lastCommitAt;
    // A branch being drafted waits on nobody yet.
    if (live.drafting) continue;
    if (!card) {
      items.push({
        kind: "unreadable",
        id: live.branch,
        title: "CARD.md can't be read",
        branch: live.branch,
        why: live.error ?? "unreadable",
        todo: `Fix CARD.md on ${live.branch}: it needs a "# T-NNNN · title" line and a "Status:" line.`,
        at,
      });
      continue;
    }
    const status = card.status.toLowerCase();
    const base = { id: card.id, title: card.title, branch: live.branch, at };
    if (status === "draft")
      items.push({
        ...base,
        kind: "approve",
        why: "Drafted and waiting for you to approve it.",
        todo: `Set Status to ready in CARD.md on ${live.branch}.`,
      });
    const open = card.questions.filter((q) => q.open);
    if (open.length > 0 || status === "blocked")
      items.push({
        ...base,
        kind: "question",
        why:
          open.map((q) => q.text).join(" · ") ||
          "Status is blocked, with no open question written down.",
        todo: `Answer under "Questions for me" in CARD.md on ${live.branch}${
          status === "blocked" ? ", then set Status back to ready" : ""
        }.`,
      });
    if (status === "done" && card.pr !== null)
      items.push({
        ...base,
        kind: "merge",
        why: `PR #${card.pr} waits for you to merge it.`,
        todo: `Review and merge PR #${card.pr} (from ${live.branch}).`,
      });
  }
  const night = snapshot.nights[0];
  for (const row of night?.rows ?? [])
    if (row.result === "held" && night)
      items.push({
        kind: "held",
        id: row.card ?? night.date,
        title:
          snapshot.cards.find((c) => c.card?.id === row.card)?.card?.title ??
          "Held overnight",
        branch: row.card ? `card/${row.card}` : null,
        why: row.text,
        todo: `Read ${night.path}, then fix or re-plan ${
          row.card ? `${row.card} on card/${row.card}` : "the held card"
        }.`,
        at: null,
      });
  // Oldest first; one with no time goes last.
  return items.sort((a, b) =>
    a.at === b.at
      ? 0
      : a.at === null
        ? 1
        : b.at === null
          ? -1
          : a.at.localeCompare(b.at),
  );
}

/** The cards in progress, whoever holds them. */
export function runningCards(snapshot: KitSnapshot): NowRunning[] {
  return snapshot.cards.flatMap((live) =>
    live.card && live.card.status.toLowerCase() === "in progress"
      ? [
          {
            id: live.card.id,
            title: live.card.title,
            branch: live.branch,
            heldBy: live.card.heldBy,
            nextStep: live.card.nextStep,
            lastCommitAt: live.lastCommitAt,
          },
        ]
      : [],
  );
}

/** Up to 50 events, newest first. */
export function recentEvents(snapshot: KitSnapshot): RecentEvent[] {
  return snapshot.events.slice(0, 50);
}

export function nowState(
  repoPath: string,
  snapshot: KitSnapshot,
  ready: boolean,
  error: string | null,
): NowState {
  return {
    repoPath,
    ready,
    error,
    cardCount: snapshot.cards.length,
    cards: snapshot.cards.map((c) =>
      c.drafting
        ? {
            id: /T-\d{4,}/.exec(c.branch)?.[0] ?? c.branch,
            title: "No CARD.md yet",
            status: "drafting",
            heldBy: null,
            branch: c.branch,
          }
        : {
            id: c.card?.id ?? c.branch,
            title: c.card?.title ?? "CARD.md can't be read",
            status: c.card?.status ?? "unreadable",
            heldBy: c.card?.heldBy ?? null,
            branch: c.branch,
          },
    ),
    health: nowHealth(snapshot),
    needsYou: needsYouItems(snapshot),
    running: runningCards(snapshot),
    recent: recentEvents(snapshot),
  };
}

/** One item as the notifications tell it apart: its kind, its card and its text. */
export const itemKey = (item: NeedsYouItem) =>
  `${item.kind}#${item.id}#${item.why}`;

export interface NowHubOptions {
  /** Hears each repo's state after every change. */
  onState: (state: NowState) => void;
  /** Hears the per-repo counts of items waiting, when one changes. */
  onBadges: (badges: NowBadges) => void;
  /**
   * Hears an item that entered Needs you while the app was running: never one
   * that was already waiting when the repo was first read, and never a PR to
   * merge (the line merges those; it stays listed in Needs you).
   */
  onNew: (repoPath: string, item: NeedsYouItem) => void;
  /**
   * Hears an item (by `itemKey`) that left Needs you, or whose repo left the
   * sidebar: whatever was raised for it has nothing left to point at.
   */
  onGone?: (repoPath: string, key: string) => void;
  /** How often the repo on show is read, and every other one. */
  intervals?: { shown: number; others: number };
  watch?: WatchRepo;
}

interface Watched {
  repoPath: string;
  watcher: KitWatcher | null;
  interval: number;
  snapshot: KitSnapshot;
  ready: boolean;
  error: string | null;
  /** Items already heard of, so each is told once. */
  known: Set<string>;
  primed: boolean;
  /** Settles once the first read lands, or once the repo stops being watched. */
  firstRead: Promise<void>;
  read: () => void;
}

/** Windows paths are case-insensitive: C:\Repo and c:\repo are one repo. */
const keyOf = (path: string) => {
  const full = resolve(path);
  return process.platform === "win32" ? full.toLowerCase() : full;
};

export class NowHub {
  private readonly repos = new Map<string, Watched>();
  private sidebar: string[] = [];
  /** The sidebar's repos: only theirs get badges and notifications. */
  private sidebarKeys = new Set<string>();
  private shown: string | null = null;
  private lastBadges = "";
  private readonly intervals: { shown: number; others: number };
  private readonly watch: WatchRepo;

  constructor(private readonly options: NowHubOptions) {
    this.intervals = options.intervals ?? { shown: 2000, others: 10_000 };
    this.watch = options.watch ?? watchRepo;
  }

  /** Watch exactly these repos: new ones start, ones no longer listed stop. */
  async setRepos(paths: string[]): Promise<void> {
    this.sidebar = paths;
    this.sidebarKeys = new Set(paths.map(keyOf));
    await this.sync();
  }

  /** The repo on show (or none): it's read more often than the rest. */
  async select(repoPath: string | null): Promise<void> {
    this.shown = repoPath === null ? null : keyOf(repoPath);
    await this.retune();
  }

  state(repoPath: string): NowState {
    const entry = this.repos.get(keyOf(repoPath));
    return entry
      ? nowState(entry.repoPath, entry.snapshot, entry.ready, entry.error)
      : nowState(repoPath, EMPTY_SNAPSHOT, false, null);
  }

  /** The kit files the hub last read for `repoPath`, for views that show them. */
  snapshot(repoPath: string): KitSnapshot {
    return this.repos.get(keyOf(repoPath))?.snapshot ?? EMPTY_SNAPSHOT;
  }

  /**
   * How many items wait on a person in each sidebar repo; told on only when
   * `force` or changed.
   */
  badges(force = false): NowBadges {
    const badges = [...this.repos.entries()]
      .filter(([key]) => this.sidebarKeys.has(key))
      .map(([, e]) => ({
        repoPath: e.repoPath,
        count: needsYouItems(e.snapshot).length,
      }));
    const said = JSON.stringify(badges);
    if (force || said !== this.lastBadges) {
      this.lastBadges = said;
      this.options.onBadges(badges);
    }
    return badges;
  }

  async stop(): Promise<void> {
    const all = [...this.repos.values()];
    this.repos.clear();
    for (const entry of all) entry.read();
    await Promise.all(all.map((e) => e.watcher?.stop()));
  }

  /** Watch the sidebar's repos: start the new, stop the rest. */
  private async sync(): Promise<void> {
    const wanted = new Map(this.sidebar.map((p) => [keyOf(p), p]));
    const gone = [...this.repos.entries()].filter(([k]) => !wanted.has(k));
    for (const [key, entry] of gone) {
      this.repos.delete(key);
      entry.read();
      for (const item of entry.known)
        this.options.onGone?.(entry.repoPath, item);
    }
    for (const [key, repoPath] of wanted)
      if (!this.repos.has(key)) {
        let read = () => undefined as void;
        const firstRead = new Promise<void>((r) => (read = r));
        const entry: Watched = {
          repoPath,
          watcher: null,
          interval: this.intervalFor(key),
          snapshot: EMPTY_SNAPSHOT,
          ready: false,
          error: null,
          known: new Set(),
          primed: false,
          firstRead,
          read,
        };
        this.repos.set(key, entry);
        this.start(entry);
      }
    this.badges(true);
    await Promise.all(gone.map(([, entry]) => entry.watcher?.stop()));
  }

  /** Restart any watcher whose repo is now read more or less often. */
  private async retune(): Promise<void> {
    const restarts: Promise<void>[] = [];
    for (const [key, entry] of this.repos) {
      const interval = this.intervalFor(key);
      if (interval === entry.interval) continue;
      entry.interval = interval;
      const old = entry.watcher;
      // The snapshot in hand stays on show until the new watcher's first read.
      this.start(entry);
      if (old) restarts.push(old.stop());
    }
    await Promise.all(restarts);
  }

  private intervalFor(key: string): number {
    return key === this.shown ? this.intervals.shown : this.intervals.others;
  }

  private start(entry: Watched): void {
    const watcher = this.watch(
      entry.repoPath,
      (event) => {
        // A replaced or stopped watcher's late events speak for nobody.
        if (entry.watcher !== watcher || !this.has(entry)) return;
        if (event.kind === "snapshot") {
          entry.snapshot = event.snapshot;
          entry.error = null;
        } else entry.error = event.message;
        entry.ready = true;
        entry.read();
        this.heard(entry);
        this.told(entry);
        this.badges();
      },
      { intervalMs: entry.interval },
    );
    entry.watcher = watcher;
    watcher.ready.catch((err: unknown) => {
      if (entry.watcher !== watcher || !this.has(entry)) return;
      entry.error = err instanceof Error ? err.message : String(err);
      entry.ready = true;
      entry.read();
      this.told(entry);
    });
  }

  /** Push the repo's state to the Now view. */
  private told(entry: Watched): void {
    this.options.onState(
      nowState(entry.repoPath, entry.snapshot, entry.ready, entry.error),
    );
  }

  private has(entry: Watched): boolean {
    return this.repos.get(keyOf(entry.repoPath)) === entry;
  }

  /**
   * Tell `onNew` about items it hasn't heard of, for a sidebar repo, and
   * `onGone` about every one that went. The first read only learns what's
   * there: an item already waiting when the app started isn't news.
   */
  private heard(entry: Watched): void {
    if (!entry.ready) return;
    const items = needsYouItems(entry.snapshot);
    const keys = new Set(items.map(itemKey));
    if (!entry.primed) {
      entry.known = keys;
      entry.primed = true;
      return;
    }
    const tells = this.sidebarKeys.has(keyOf(entry.repoPath));
    for (const item of items) {
      const key = itemKey(item);
      if (entry.known.has(key)) continue;
      entry.known.add(key);
      if (tells && item.kind !== "merge")
        this.options.onNew(entry.repoPath, item);
    }
    for (const key of entry.known)
      if (!keys.has(key)) {
        entry.known.delete(key);
        this.options.onGone?.(entry.repoPath, key);
      }
  }
}
