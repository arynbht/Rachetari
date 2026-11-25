import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Notification,
  session,
  shell,
} from "electron";
import type { ZodType } from "zod";

import {
  ChecklistRequest,
  ChecklistView,
  DocList,
  DocsListRequest,
  DocsReadRequest,
  HistoryNight,
  HistoryNightRequest,
  HistoryRequest,
  HistoryView,
  IpcChannel,
  MapGetRequest,
  MapView,
  HomeView,
  type NeedsYouItem,
  NowBadges,
  type NowFocus,
  NowRepoRequest,
  NowSelectRequest,
  NowState,
  PingRequest,
  type PingResponse,
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
import { APP_ID } from "./app-id";
import { readChecklist } from "./engine/checklist";
import { listDocs, readDoc } from "./engine/docs";
import { FETCH_INTERVAL_MS, FetchLoop } from "./engine/fetch-loop";
import {
  attachMapWebview,
  getMap,
  guardMapSession,
  MapFence,
  MAP_PARTITION,
  mapRequestAllowed,
} from "./engine/map";
import { readHistory, readNight } from "./engine/history";
import { readHome } from "./engine/home";
import { liveStatus, type LiveStatus } from "./engine/live-status";
import { itemKey, NowHub } from "./engine/now";
import { taskDetail, tasksState } from "./engine/tasks";
import { fetchRepo } from "./kit/source";
import { registeredRepo } from "./store/registered";
import { addRepo, listRepos, removeRepo } from "./store/repos";
import { loadSettings, saveSettings } from "./store/settings";

/** The renderer-facing settings: the stored prefs. */
async function settingsView(): Promise<SettingsView> {
  return loadSettings();
}

// In dev the renderer is served by Vite (HMR needs a looser policy); in prod it
// loads from the bundle under a strict self-only policy. Either way: no remote
// origins, ever.
const DEV_RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
const isDev = Boolean(DEV_RENDERER_URL);
// End-to-end test mode (Playwright): loosens the CSP enough to inject axe-core and
// routes sign-in through a canned device flow so the suite runs without the network.
// Never set in a real session — it gates test-only seams, nothing user-facing.
const isE2E = process.env.RIVETARI_E2E === "1";

// Dev convenience: load apps/desktop/.env into process.env so config like the
// GitHub client id persists across restarts without exporting it each time. The
// values aren't secret (an OAuth client id is public) and the file is gitignored.
if (isDev) {
  try {
    const envFile = readFileSync(
      join(import.meta.dirname, "../../.env"),
      "utf8",
    );
    for (const line of envFile.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const key = match[1];
      if (key && process.env[key] === undefined) {
        process.env[key] = (match[2] ?? "").trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // no .env — fine
  }
}

let mainWindow: BrowserWindow | null = null;

/** The map on show, whose floorplan/ is the only place its session may load from. */
const mapFence = new MapFence();

/** What each kind of item asks of the person, in the notification's title. */
const NEEDS_YOU_ASK: Record<NeedsYouItem["kind"], string> = {
  approve: "approve the card",
  question: "answer a question",
  held: "it was held overnight",
  merge: "a PR to merge",
  unreadable: "its card can't be read",
};

/** Bring the window up on a Needs-you item (a clicked notification). */
function focusItem(focus: NowFocus): void {
  const window = mainWindow;
  if (!window) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
  window.webContents.send(IpcChannel.NowFocus, focus);
}

/**
 * Notifications raised under E2E, which shows none on the desktop: the suite
 * reads them, and clicks one, through `globalThis.rivetariE2E`.
 */
const e2eNotices: { repoPath: string; id: string; title: string }[] = [];
if (isE2E)
  (globalThis as unknown as { rivetariE2E: unknown }).rivetariE2E = {
    notices: e2eNotices,
    click: (i: number) => {
      const notice = e2eNotices[i];
      if (notice) focusItem({ repoPath: notice.repoPath, id: notice.id });
    },
  };

/**
 * Notifications shown, by repo and item. Each is held until it's clicked or
 * its item leaves Needs you: on Windows a notice moved to the Action Center
 * has fired 'close' but can still be clicked, and a collected one can't.
 */
const shownNotices = new Map<string, Notification>();
const noticeKey = (repoPath: string, key: string) => `${repoPath}\0${key}`;

/** Tell the person, through the OS, that something new waits on them. */
function notifyNeedsYou(repoPath: string, item: NeedsYouItem): void {
  const title = `${item.id} needs you: ${NEEDS_YOU_ASK[item.kind]}`;
  if (isE2E) {
    e2eNotices.push({ repoPath, id: item.id, title });
    return;
  }
  if (!Notification.isSupported()) return;
  const key = noticeKey(repoPath, itemKey(item));
  const notice = new Notification({ title, body: item.title });
  shownNotices.set(key, notice);
  notice.on("click", () => {
    if (shownNotices.get(key) === notice) shownNotices.delete(key);
    focusItem({ repoPath, id: item.id });
  });
  notice.show();
}

/** An item left Needs you: its notice has nothing left to open, so it goes. */
function withdrawNotice(repoPath: string, key: string): void {
  const notice = shownNotices.get(noticeKey(repoPath, key));
  if (!notice) return;
  shownNotices.delete(noticeKey(repoPath, key));
  notice.close();
}

/** A push that doesn't match the contract is said and dropped, never thrown into the watcher. */
function push(channel: string, schema: ZodType, payload: unknown): void {
  const parsed = schema.safeParse(payload);
  if (parsed.success) mainWindow?.webContents.send(channel, parsed.data);
  else
    console.error(
      `[main] dropped a ${channel} push that doesn't match the contract: ${String(parsed.error)}`,
    );
}

/** Every sidebar repo's kit files, watched while the window is open (see engine/now). */
const nowHub = new NowHub({
  onState: (state) => {
    push(IpcChannel.NowUpdate, NowState, state);
    // The Tasks tab reads the same snapshot, so no repo is polled twice.
    push(
      IpcChannel.TasksUpdate,
      TasksState,
      tasksState(
        state.repoPath,
        nowHub.snapshot(state.repoPath),
        state.ready,
        state.error,
      ),
    );
  },
  onBadges: (badges) => push(IpcChannel.NowBadgesUpdate, NowBadges, badges),
  onNew: notifyNeedsYou,
  onGone: withdrawNotice,
});

/**
 * How long after a background fetch settles the next one starts; the env var
 * is for the e2e only (as T-0024's git limits are).
 */
function fetchIntervalMs(): number {
  const set = Number(process.env.RIVETARI_FETCH_INTERVAL_MS);
  return Number.isFinite(set) && set > 0 ? set : FETCH_INTERVAL_MS;
}

/** Every sidebar repo fetched in the background, beside the NowHub (see engine/fetch-loop). */
const fetchLoop = new FetchLoop({
  fetch: fetchRepo,
  intervalMs: fetchIntervalMs(),
  onChange: () => pushShellStatus(),
});

/** The repo on show, as `now:select` last named it. */
let shownRepo: string | null = null;
/** The live shell's status as last read, null when not live. */
let live: LiveStatus | null = null;

/** The header's status: the live shell, and the repo on show's fetch. */
function shellStatus(): ShellStatus {
  return {
    live,
    fetch: shownRepo === null ? null : fetchLoop.state(shownRepo),
  };
}

function pushShellStatus(): void {
  push(IpcChannel.ShellStatusUpdate, ShellStatus, shellStatus());
}

/** The live status is read every 2 s while the window is open, when live. */
const LIVE_STATUS_MS = 2000;
let liveTimer: ReturnType<typeof setTimeout> | null = null;
/** Bumped on each start and stop, so a read that lands late starts nothing. */
let liveRun = 0;

/** Read the live status now and every 2 s after each read settles; told on a change. */
function readLiveStatus(run: number): void {
  liveTimer = null;
  void liveStatus().then((read) => {
    if (run !== liveRun) return;
    if (JSON.stringify(read) !== JSON.stringify(live)) {
      live = read;
      pushShellStatus();
    }
    liveTimer = setTimeout(() => readLiveStatus(run), LIVE_STATUS_MS);
  });
}

function stopLiveStatus(): void {
  liveRun += 1;
  if (liveTimer) clearTimeout(liveTimer);
  liveTimer = null;
}

/** Watch exactly these repos (the sidebar's list); a failure is said, not thrown. */
function watchRepos(repos: { path: string }[]): void {
  fetchLoop.setRepos(repos.map((r) => r.path));
  nowHub
    .setRepos(repos.map((r) => r.path))
    .catch((err: unknown) =>
      console.error(
        `[main] couldn't watch the sidebar's repos: ${String(err)}`,
      ),
    );
}

/** Watch the repos in the sidebar now; a failure to list them is said, not thrown. */
function watchSidebarRepos(): void {
  listRepos().then(watchRepos, (err: unknown) =>
    console.error(`[main] couldn't list the repos to watch: ${String(err)}`),
  );
}

/** Hosts `shell.openExternal` is allowed to hand to the OS browser. */
const ALLOWED_EXTERNAL_HOSTS = new Set([
  "github.com",
  "docs.github.com",
  "www.w3.org",
]);

/**
 * Content-Security-Policy applied to every response. Strict self-only in prod; in
 * dev it's loosened only as far as Vite's HMR needs (inline/eval bootstrap + ws),
 * never fully policy-free — the Docs screen renders arbitrary repo Markdown, so
 * even a dev session gets a CSP backstop.
 */
function contentSecurityPolicy(): string {
  const base = [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'", // bundled CSS + any injected <style>
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ];
  if (isDev || isE2E) {
    // E2E needs inline <script> so Playwright can inject axe-core for the audit.
    base.push(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' ws: http://localhost:*",
    );
  } else {
    base.push("script-src 'self'", "connect-src 'self'");
  }
  return base.join("; ");
}

/** The exact URL our renderer loads from (the only navigation we allow in-window). */
function rendererUrl(): string {
  return (
    DEV_RENDERER_URL ??
    pathToFileURL(join(import.meta.dirname, "../renderer/index.html")).href
  );
}

/** Open an allow-listed https link in the OS browser; silently drop anything else. */
function openExternalIfAllowed(url: string): void {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" &&
      ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname)
    ) {
      void shell.openExternal(url);
    }
  } catch {
    // not a valid URL — ignore
  }
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1140,
    height: 780,
    show: false,
    backgroundColor: "#0b0f17",
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // For the Map tab's one webview; will-attach-webview below refuses any
      // other and locks the map's down.
      webviewTag: true,
    },
  });

  mainWindow = window;
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
    void nowHub.stop();
    fetchLoop.stop();
    stopLiveStatus();
  });
  watchSidebarRepos();
  if (process.env.RIVETARI_LIVE_STATUS) {
    stopLiveStatus();
    readLiveStatus(liveRun);
  }

  // Show as soon as the first paint is ready; in E2E show immediately so a slow or
  // non-painting headless renderer can't keep the window (and Playwright) waiting.
  if (isE2E) window.show();
  else window.once("ready-to-show", () => window.show());

  if (isDev || isE2E) {
    if (isDev) window.webContents.openDevTools({ mode: "detach" });
    // Forward renderer console + load failures to the main process so they're
    // visible when driving the app headlessly (dev or E2E on CI).
    window.webContents.on(
      "console-message",
      (_event, level, message, line, sourceId) => {
        console.error(`[renderer:${level}] ${message} (${sourceId}:${line})`);
      },
    );
    window.webContents.on("did-fail-load", (_event, code, desc, url) => {
      console.error(`[renderer] did-fail-load ${code} ${desc} ${url}`);
    });
    window.webContents.on("render-process-gone", (_event, details) => {
      console.error(
        `[renderer] render-process-gone ${JSON.stringify(details)}`,
      );
    });
  }

  // Only the map's webview attaches, on the map's session, loading the map.
  window.webContents.on(
    "will-attach-webview",
    (event, webPreferences, params) => {
      if (!attachMapWebview({ params, webPreferences }, mapFence.dir))
        event.preventDefault();
    },
  );
  // The map opens no windows and navigates nowhere outside floorplan/.
  window.webContents.on("did-attach-webview", (_event, guest) => {
    guest.setWindowOpenHandler(() => ({ action: "deny" }));
    guest.on("will-navigate", (navigation, url) => {
      if (!mapRequestAllowed(url, mapFence.dir)) navigation.preventDefault();
    });
  });

  // Never open a second window in-app; route an allow-listed link to the browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalIfAllowed(url);
    return { action: "deny" };
  });

  // Block navigation anywhere but our own renderer URL (prefix covers #hash and
  // ?query). A bare "file://" prefix would let any local file through, so match
  // the exact renderer URL instead.
  const allowedPrefix = rendererUrl();
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(allowedPrefix)) {
      event.preventDefault();
      openExternalIfAllowed(url);
    }
  });

  if (DEV_RENDERER_URL) {
    void window.loadURL(DEV_RENDERER_URL);
  } else {
    void window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
  }
}

/**
 * The registered repo a request names, as main's own list spells it. Every
 * handler that takes a repo path goes through here, so a renderer that sends
 * any other folder is refused before anything there is read or written.
 */
async function registered(asked: string): Promise<string> {
  return registeredRepo(asked, await listRepos());
}

function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannel.Ping, (_event, raw: unknown) => {
    const request = PingRequest.parse(raw); // re-validate the renderer's request
    const response: PingResponse = {
      reply: `pong: ${request.message}`,
      version: app.getVersion(),
    };
    return response;
  });

  ipcMain.handle(IpcChannel.ReposList, async () =>
    RepoList.parse(await listRepos()),
  );

  ipcMain.handle(IpcChannel.ReposAdd, async () => {
    const result = await dialog.showOpenDialog({
      title: "Add a repository folder",
      properties: ["openDirectory"],
    });
    const chosen = result.filePaths[0];
    if (result.canceled || !chosen) {
      return RepoList.parse(await listRepos());
    }
    const repos = RepoList.parse(await addRepo(chosen));
    watchRepos(repos);
    return repos;
  });

  ipcMain.handle(IpcChannel.ReposRemove, async (_event, raw: unknown) => {
    const { path } = RepoRemoveRequest.parse(raw);
    const repos = RepoList.parse(await removeRepo(path));
    watchRepos(repos);
    return repos;
  });

  ipcMain.handle(IpcChannel.ReposFetch, async (_event, raw: unknown) => {
    const { repoPath: asked } = RepoFetchRequest.parse(raw);
    // Through the loop: joins a background fetch that runs, never a second.
    await fetchLoop.fetchNow(await registered(asked));
  });

  ipcMain.handle(IpcChannel.HomeGet, async () =>
    // The sidebar's own list, never a path the renderer sends.
    HomeView.parse(
      await readHome({
        listRepos,
        state: (repoPath) => nowHub.state(repoPath),
      }),
    ),
  );

  ipcMain.handle(IpcChannel.NowBadges, () => NowBadges.parse(nowHub.badges()));

  ipcMain.handle(IpcChannel.NowGet, async (_event, raw: unknown) => {
    const { repoPath: asked } = NowRepoRequest.parse(raw);
    const repoPath = await registered(asked);
    return NowState.parse(nowHub.state(repoPath));
  });

  ipcMain.handle(IpcChannel.NowSelect, async (_event, raw: unknown) => {
    const { repoPath: asked } = NowSelectRequest.parse(raw);
    const repoPath = asked === null ? null : await registered(asked);
    shownRepo = repoPath;
    pushShellStatus();
    await nowHub.select(repoPath);
  });

  ipcMain.handle(IpcChannel.ShellStatus, () =>
    ShellStatus.parse(shellStatus()),
  );

  ipcMain.handle(IpcChannel.TasksGet, async (_event, raw: unknown) => {
    const { repoPath: asked } = TasksRequest.parse(raw);
    const repoPath = await registered(asked);
    const now = nowHub.state(repoPath);
    return TasksState.parse(
      tasksState(repoPath, nowHub.snapshot(repoPath), now.ready, now.error),
    );
  });

  ipcMain.handle(IpcChannel.TasksDetail, async (_event, raw: unknown) => {
    const { repoPath: asked, key } = TaskDetailRequest.parse(raw);
    const repoPath = await registered(asked);
    // The card is looked up by the board's key in the hub's snapshot, never
    // by a path the renderer sends.
    return TaskDetail.parse(
      await taskDetail(repoPath, nowHub.snapshot(repoPath), key),
    );
  });

  ipcMain.handle(IpcChannel.ChecklistGet, async (_event, raw: unknown) => {
    const { repoPath: asked } = ChecklistRequest.parse(raw);
    const repoPath = await registered(asked);
    return ChecklistView.parse(await readChecklist(repoPath));
  });

  ipcMain.handle(IpcChannel.HistoryGet, async (_event, raw: unknown) => {
    const { repoPath: asked } = HistoryRequest.parse(raw);
    const repoPath = await registered(asked);
    return HistoryView.parse(await readHistory(repoPath));
  });

  ipcMain.handle(IpcChannel.HistoryNight, async (_event, raw: unknown) => {
    const { repoPath: asked, date } = HistoryNightRequest.parse(raw);
    const repoPath = await registered(asked);
    return HistoryNight.parse(await readNight(repoPath, date));
  });

  ipcMain.handle(IpcChannel.DocsList, async (_event, raw: unknown) => {
    const { repoPath: asked } = DocsListRequest.parse(raw);
    const repoPath = await registered(asked);
    return DocList.parse(await listDocs(repoPath));
  });

  ipcMain.handle(IpcChannel.DocsRead, async (_event, raw: unknown) => {
    const { repoPath: asked, path } = DocsReadRequest.parse(raw);
    const repoPath = await registered(asked);
    return readDoc(repoPath, path);
  });

  ipcMain.handle(IpcChannel.MapGet, async (_event, raw: unknown) => {
    const { repoPath: asked } = MapGetRequest.parse(raw);
    const repoPath = await registered(asked);
    return MapView.parse(await mapFence.open(repoPath, getMap));
  });

  ipcMain.handle(IpcChannel.SettingsLoad, async () =>
    SettingsView.parse(await settingsView()),
  );

  ipcMain.handle(IpcChannel.SettingsSave, async (_event, raw: unknown) => {
    const patch = SettingsSaveRequest.parse(raw);
    await saveSettings(patch);
    return SettingsView.parse(await settingsView());
  });
}

app.whenReady().then(
  () => {
    // Enforce a CSP on every response. Strict in prod; dev loosens only enough for
    // Vite's inline bootstrap + HMR websocket (see contentSecurityPolicy). The Docs
    // screen renders arbitrary repo Markdown, so even dev keeps a policy backstop.
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [contentSecurityPolicy()],
        },
      });
    });

    guardMapSession(
      session.fromPartition(MAP_PARTITION),
      () => mapFence.dir,
      (url) => {
        const blocked = mapFence.block(url);
        if (blocked)
          mainWindow?.webContents.send(IpcChannel.MapBlocked, blocked);
      },
    );

    // Windows shows an app's notifications only under its app id, the one
    // the installer registers (electron-builder.yml's appId).
    if (process.platform === "win32") app.setAppUserModelId(APP_ID);

    registerIpcHandlers();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  },
  (err: unknown) => {
    // Make a startup failure loud (it otherwise manifests as "no window" in E2E).
    process.stderr.write(`[main] app failed to start: ${String(err)}\n`);
    console.error(err);
  },
);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
