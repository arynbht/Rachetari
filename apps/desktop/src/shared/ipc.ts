// The IPC contract shared by main, preload, and renderer. Every channel has a
// zod schema validated on BOTH sides: the main process re-validates each request
// it receives, and the preload re-validates each response before handing it to
// the renderer. The renderer only ever sees the typed `window.rivetari` surface
// (see preload) — never ipcRenderer, fs, git, or the network directly.
import { z } from "zod";

/** Allow-listed channel names. The preload exposes exactly these. */
export const IpcChannel = {
  Ping: "app:ping",
  ReposList: "repos:list",
  ReposAdd: "repos:add",
  ReposRemove: "repos:remove",
  /** Fetch a repo's remotes, so the other machine's card branches appear. */
  ReposFetch: "repos:fetch",
  SettingsLoad: "settings:load",
  SettingsSave: "settings:save",
  NowGet: "now:get",
  NowSelect: "now:select",
  /** Push channel (main → renderer): one repo's Now state after a change. */
  NowUpdate: "now:update",
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];

// app:ping — a smoke round-trip proving the typed, validated bridge works.
export const PingResponse = z.object({
  reply: z.string(),
  version: z.string(),
});
export type PingResponse = z.infer<typeof PingResponse>;

export const PingRequest = z.object({ message: z.string().min(1).max(200) });
export type PingRequest = z.infer<typeof PingRequest>;

// Repos — local repo folders the user has added (persisted in userData).
export const RepoEntry = z.object({
  /** Absolute path to the repo on disk. */
  path: z.string(),
  /** Display name (folder basename). */
  name: z.string(),
});
export type RepoEntry = z.infer<typeof RepoEntry>;

export const RepoList = z.array(RepoEntry);
export type RepoList = z.infer<typeof RepoList>;

export const RepoRemoveRequest = z.object({ path: z.string().min(1) });
export type RepoRemoveRequest = z.infer<typeof RepoRemoveRequest>;

export const RepoFetchRequest = z.object({ repoPath: z.string().min(1) });
export type RepoFetchRequest = z.infer<typeof RepoFetchRequest>;

// Settings — personal preferences in `userData` (never the repo).
export const Theme = z.enum(["system", "light", "dark"]);
export type Theme = z.infer<typeof Theme>;

export const Settings = z.object({
  /** UI theme; "system" follows the OS preference. */
  theme: Theme,
});
export type Settings = z.infer<typeof Settings>;

/** What the renderer sees: the stored settings. */
export const SettingsView = Settings;
export type SettingsView = z.infer<typeof SettingsView>;

/** A partial update — only the provided fields change. */
export const SettingsSaveRequest = Settings.partial();
export type SettingsSaveRequest = z.infer<typeof SettingsSaveRequest>;

// Now — a repo as it stands, read from its kit files by the file source: the
// health of the repo, what waits on the owner, the cards in progress, and
// what just happened. The watcher pushes a new state on every change.
export const NowRepoRequest = z.object({ repoPath: z.string().min(1) });
export const NowSelectRequest = z.object({
  repoPath: z.string().min(1).nullable(),
});

export const NowHealth = z.object({
  /** The checklist's stage and what decides it, or null with no backlog. */
  stage: z.string().nullable(),
  stageWhy: z.string().nullable(),
  counts: z.object({
    pass: z.number(),
    fail: z.number(),
    unchecked: z.number(),
    na: z.number(),
  }),
  lastSetup: z.string().nullable(),
  hasBacklog: z.boolean(),
  skills: z.object({
    /** Skills listed in skills/INDEX.md. */
    count: z.number(),
    /** Skills named under "Skills" on the live cards. */
    onLiveCards: z.array(z.string()),
  }),
  lastNight: z
    .object({
      date: z.string(),
      merged: z.number(),
      held: z.number(),
      blocked: z.number(),
    })
    .nullable(),
});
export type NowHealth = z.infer<typeof NowHealth>;

export const NeedsYouItem = z.object({
  kind: z.enum(["approve", "question", "held", "merge", "unreadable"]),
  /** The card's id (or the branch, for a card that can't be read). */
  id: z.string(),
  title: z.string(),
  branch: z.string().nullable(),
  /** Why it waits: the question, the night's finding, the PR. */
  why: z.string(),
  /** Exactly what to do, and where. */
  todo: z.string(),
  /** When it started waiting, as far as the files say (ISO), or null. */
  at: z.string().nullable(),
});
export type NeedsYouItem = z.infer<typeof NeedsYouItem>;

export const NowRunning = z.object({
  id: z.string(),
  title: z.string(),
  branch: z.string(),
  heldBy: z.string().nullable(),
  nextStep: z.string(),
  /** When the card's branch last had a commit (ISO), or null. */
  lastCommitAt: z.string().nullable(),
});
export type NowRunning = z.infer<typeof NowRunning>;

export const RecentEvent = z.object({
  sha: z.string(),
  at: z.string(),
  author: z.string(),
  subject: z.string(),
  cardId: z.string().nullable(),
});
export type RecentEvent = z.infer<typeof RecentEvent>;

export const NowState = z.object({
  repoPath: z.string(),
  ready: z.boolean(),
  error: z.string().nullable(),
  /** Live cards on card/* branches, readable or not. */
  cardCount: z.number(),
  health: NowHealth,
  needsYou: z.array(NeedsYouItem),
  running: z.array(NowRunning),
  recent: z.array(RecentEvent),
});
export type NowState = z.infer<typeof NowState>;

export const NowBadges = z.array(
  z.object({ repoPath: z.string(), count: z.number().int() }),
);
export type NowBadges = z.infer<typeof NowBadges>;
