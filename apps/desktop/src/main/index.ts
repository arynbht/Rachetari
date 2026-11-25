import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { app, BrowserWindow, dialog, ipcMain, session, shell } from "electron";

import type { ZodType } from "zod";

import {
  IpcChannel,
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
  TaskDetail,
  TaskDetailRequest,
  TasksRequest,
  TasksState,
} from "../shared/ipc";
import { APP_ID } from "./app-id";
import { NowHub } from "./engine/now";
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
  // The sidebar's badges and the OS notifications arrive with T-0013.
  onBadges: () => undefined,
  onNew: () => undefined,
});

/** Watch exactly these repos (the sidebar's list); a failure is said, not thrown. */
function watchRepos(repos: { path: string }[]): void {
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
  });
  watchSidebarRepos();

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

  // No view attaches a webview yet (the Map's arrives with its own card), so
  // every attach is refused.
  window.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
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
    await fetchRepo(await registered(asked));
  });

  ipcMain.handle(IpcChannel.NowGet, async (_event, raw: unknown) => {
    const { repoPath: asked } = NowRepoRequest.parse(raw);
    const repoPath = await registered(asked);
    return NowState.parse(nowHub.state(repoPath));
  });

  ipcMain.handle(IpcChannel.NowSelect, async (_event, raw: unknown) => {
    const { repoPath: asked } = NowSelectRequest.parse(raw);
    const repoPath = asked === null ? null : await registered(asked);
    await nowHub.select(repoPath);
  });

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
