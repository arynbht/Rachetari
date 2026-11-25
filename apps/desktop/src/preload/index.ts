// The preload bridge: the ONLY surface the renderer can reach. It exposes a
// typed, allow-listed API over contextBridge; the renderer never touches
// ipcRenderer, fs, git, or the network. Every request is zod-validated before it
// leaves and every response is zod-validated before the renderer sees it.
import { contextBridge, ipcRenderer } from "electron";

import {
  ChecklistRequest,
  ChecklistView,
  CiState,
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
  HomeView,
  NowBadges,
  NowFocus,
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
  ShellStatus,
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
    async badges() {
      const raw: unknown = await ipcRenderer.invoke(IpcChannel.NowBadges);
      return NowBadges.parse(raw);
    },
    onBadges(callback: (badges: NowBadges) => void) {
      const listener = (_event: unknown, payload: unknown): void => {
        const parsed = NowBadges.safeParse(payload);
        if (parsed.success) callback(parsed.data);
      };
      ipcRenderer.on(IpcChannel.NowBadgesUpdate, listener);
      return () => {
        ipcRenderer.removeListener(IpcChannel.NowBadgesUpdate, listener);
      };
    },
    /** A clicked notification's item, to show; returns an unsubscribe fn. */
    onFocus(callback: (focus: NowFocus) => void) {
      const listener = (_event: unknown, payload: unknown): void => {
        const parsed = NowFocus.safeParse(payload);
        if (parsed.success) callback(parsed.data);
      };
      ipcRenderer.on(IpcChannel.NowFocus, listener);
      return () => {
        ipcRenderer.removeListener(IpcChannel.NowFocus, listener);
      };
    },
  },

  home: {
    /** One line per registered repo; main reads its own list, not a path from here. */
    async get() {
      const raw: unknown = await ipcRenderer.invoke(IpcChannel.HomeGet);
      return HomeView.parse(raw);
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

  shell: {
    /** The header's status: the live shell's commit, and the repo on show's fetch. */
    async status() {
      const raw: unknown = await ipcRenderer.invoke(IpcChannel.ShellStatus);
      return ShellStatus.parse(raw);
    },
    /** Hears the status after every change; returns an unsubscribe fn. */
    onStatus(callback: (status: ShellStatus) => void) {
      const listener = (_event: unknown, payload: unknown): void => {
        // A malformed push is dropped rather than thrown into the IPC event loop.
        const parsed = ShellStatus.safeParse(payload);
        if (parsed.success) callback(parsed.data);
      };
      ipcRenderer.on(IpcChannel.ShellStatusUpdate, listener);
      return () => {
        ipcRenderer.removeListener(IpcChannel.ShellStatusUpdate, listener);
      };
    },
  },

  ci: {
    /** The repo on show's CI, read through gh; null before its first read. */
    async state() {
      const raw: unknown = await ipcRenderer.invoke(IpcChannel.CiState);
      return CiState.parse(raw);
    },
    /** Hears the repo on show's CI after each read; returns an unsubscribe fn. */
    onState(callback: (state: CiState) => void) {
      const listener = (_event: unknown, payload: unknown): void => {
        // A malformed push is dropped rather than thrown into the IPC event loop.
        const parsed = CiState.safeParse(payload);
        if (parsed.success) callback(parsed.data);
      };
      ipcRenderer.on(IpcChannel.CiStateUpdate, listener);
      return () => {
        ipcRenderer.removeListener(IpcChannel.CiStateUpdate, listener);
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
