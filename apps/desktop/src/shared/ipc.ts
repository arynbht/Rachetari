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
