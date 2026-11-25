// The preload bridge: the ONLY surface the renderer can reach. It exposes a
// typed, allow-listed API over contextBridge; the renderer never touches
// ipcRenderer, fs, git, or the network. Every request is zod-validated before it
// leaves and every response is zod-validated before the renderer sees it.
import { contextBridge, ipcRenderer } from "electron";

import {
  IpcChannel,
  PingRequest,
  PingResponse,
  RepoFetchRequest,
  RepoList,
  RepoRemoveRequest,
  SettingsSaveRequest,
  SettingsView,
} from "../shared/ipc";

const api = {
  /** Smoke round-trip: validate the request, invoke main, validate the reply. */
  async ping(message: string) {
    const request = PingRequest.parse({ message });
    const raw: unknown = await ipcRenderer.invoke(IpcChannel.Ping, request);
    return PingResponse.parse(raw);
  },

  repos: {
    async list() {
      const raw: unknown = await ipcRenderer.invoke(IpcChannel.ReposList);
      return RepoList.parse(raw);
    },
    /** Opens a native folder picker in main; returns the updated list. */
    async add() {
      const raw: unknown = await ipcRenderer.invoke(IpcChannel.ReposAdd);
      return RepoList.parse(raw);
    },
    async remove(path: string) {
      const request = RepoRemoveRequest.parse({ path });
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.ReposRemove,
        request,
      );
      return RepoList.parse(raw);
    },
    /** Fetch the repo's remotes, so the other machine's card branches appear. */
    async fetch(repoPath: string) {
      await ipcRenderer.invoke(
        IpcChannel.ReposFetch,
        RepoFetchRequest.parse({ repoPath }),
      );
    },
  },

  settings: {
    /** The personal settings. */
    async load() {
      const raw: unknown = await ipcRenderer.invoke(IpcChannel.SettingsLoad);
      return SettingsView.parse(raw);
    },
    /** Apply a partial update; returns the full, saved settings view. */
    async save(patch: SettingsSaveRequest) {
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.SettingsSave,
        SettingsSaveRequest.parse(patch),
      );
      return SettingsView.parse(raw);
    },
  },
};

/** The shape exposed as `window.rivetari` in the renderer. */
export type RivetariApi = typeof api;

contextBridge.exposeInMainWorld("rivetari", api);
