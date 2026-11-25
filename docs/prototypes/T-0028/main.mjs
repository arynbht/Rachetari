// The smallest Electron main that shows the prototype the way the shell shows
// its renderer: one window at the shell's default size (1140×780,
// apps/desktop/src/main/index.ts), its dark background, sandboxed, no preload
// and no IPC. shoot.mjs launches it with the desktop's own Electron and passes
// the page's file:// URL in T0028_URL.
import { app, BrowserWindow } from "electron";

const url = process.env.T0028_URL;
if (!url || !url.startsWith("file://")) {
  console.error("T0028_URL must be the prototype's file:// URL");
  process.exit(1);
}

app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 1140,
    height: 780,
    // The screenshots are the page at exactly 1140×780, without the frame.
    useContentSize: true,
    backgroundColor: "#0b0f17",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  void window.loadURL(url);
});

app.on("window-all-closed", () => app.quit());
