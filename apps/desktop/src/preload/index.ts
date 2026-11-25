// The preload bridge: the ONLY surface the renderer can reach. It exposes a
// typed, allow-listed API over contextBridge; the renderer never touches
// ipcRenderer, fs, git, or the network. Every request is zod-validated before it
// leaves and every response is zod-validated before the renderer sees it.
import { contextBridge, ipcRenderer } from "electron";

import {
  ChecklistRequest,
  ChecklistView,
  DocContent,
  DocList,
  DocsListRequest,
  DocsReadRequest,
  HistoryNight,
  HistoryNightRequest,
  HistoryRequest,
  HistoryView,
  IpcChannel,
  MapBlocked,
  MapGetRequest,
  MapView,
  NowRepoRequest,
  NowSelectRequest,
  NowState,
  PingRequest,
  PingResponse,
  RepoFetchRequest,
  RepoList,
  RepoRemoveRequest,
  SettingsSaveRequest,
  SettingsView,
  TaskDetail,
  TaskDetailRequest,
  TasksRequest,
  TasksState,
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

  now: {
    /** A repo's Now state as main last read it; `onUpdate` hears every change. */
    async get(repoPath: string) {
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.NowGet,
        NowRepoRequest.parse({ repoPath }),
      );
      return NowState.parse(raw);
    },
    /** The repo on show (or none), which main reads more often. */
    async select(repoPath: string | null) {
      await ipcRenderer.invoke(
        IpcChannel.NowSelect,
        NowSelectRequest.parse({ repoPath }),
      );
    },
    onUpdate(callback: (state: NowState) => void) {
      const listener = (_event: unknown, payload: unknown): void => {
        // A malformed push is dropped rather than thrown into the IPC event loop.
        const parsed = NowState.safeParse(payload);
        if (parsed.success) callback(parsed.data);
      };
      ipcRenderer.on(IpcChannel.NowUpdate, listener);
      return () => {
        ipcRenderer.removeListener(IpcChannel.NowUpdate, listener);
      };
    },
  },

  tasks: {
    /** A repo's cards as main last read them; `onUpdate` hears every change. */
    async get(repoPath: string) {
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.TasksGet,
        TasksRequest.parse({ repoPath }),
      );
      return TasksState.parse(raw);
    },
    /** One card in full, by the key the board gave it. */
    async detail(repoPath: string, key: string) {
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.TasksDetail,
        TaskDetailRequest.parse({ repoPath, key }),
      );
      return TaskDetail.parse(raw);
    },
    onUpdate(callback: (state: TasksState) => void) {
      const listener = (_event: unknown, payload: unknown): void => {
        // A malformed push is dropped rather than thrown into the IPC event loop.
        const parsed = TasksState.safeParse(payload);
        if (parsed.success) callback(parsed.data);
      };
      ipcRenderer.on(IpcChannel.TasksUpdate, listener);
      return () => {
        ipcRenderer.removeListener(IpcChannel.TasksUpdate, listener);
      };
    },
  },

  checklist: {
    /** The repo checklist in BACKLOG.md on the default branch, read now. */
    async get(repoPath: string) {
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.ChecklistGet,
        ChecklistRequest.parse({ repoPath }),
      );
      return ChecklistView.parse(raw);
    },
  },

  history: {
    /** The finished cards and the night reports on the default branch. */
    async get(repoPath: string) {
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.HistoryGet,
        HistoryRequest.parse({ repoPath }),
      );
      return HistoryView.parse(raw);
    },
    /** One night report's text. */
    async night(repoPath: string, date: string) {
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.HistoryNight,
        HistoryNightRequest.parse({ repoPath, date }),
      );
      return HistoryNight.parse(raw);
    },
  },

  docs: {
    async list(repoPath: string) {
      const request = DocsListRequest.parse({ repoPath });
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.DocsList,
        request,
      );
      return DocList.parse(raw);
    },
    async read(repoPath: string, path: string) {
      const request = DocsReadRequest.parse({ repoPath, path });
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.DocsRead,
        request,
      );
      return DocContent.parse(raw);
    },
  },

  map: {
    /** The repo's floorplan map (or why there's none); fences the map's session to it. */
    async get(repoPath: string) {
      const raw: unknown = await ipcRenderer.invoke(
        IpcChannel.MapGet,
        MapGetRequest.parse({ repoPath }),
      );
      return MapView.parse(raw);
    },
    /** Subscribe to the requests the map's session cancelled; returns an unsubscribe fn. */
    onBlocked(callback: (blocked: MapBlocked) => void) {
      const listener = (_event: unknown, payload: unknown): void => {
        const parsed = MapBlocked.safeParse(payload);
        if (parsed.success) callback(parsed.data);
      };
      ipcRenderer.on(IpcChannel.MapBlocked, listener);
      return () => {
        ipcRenderer.removeListener(IpcChannel.MapBlocked, listener);
      };
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
