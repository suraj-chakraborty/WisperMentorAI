"use strict";
const electron = require("electron");
const path = require("path");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
let mainWindow = null;
let tray = null;
let isOverlayMode = false;
let isQuitting = false;
let meetingCheckInterval = null;
let lastDetectedMeetingApp = null;
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const DIST = process.env.DIST || path__namespace.join(__dirname, "../dist");
const VITE_PUBLIC = process.env.VITE_PUBLIC || path__namespace.join(__dirname, "../public");
function createMainWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "WhisperMentor AI",
    icon: path__namespace.join(VITE_PUBLIC, "logo-short.png"),
    frame: false,
    // Custom titlebar
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path__namespace.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: "#0a0a0f",
    show: false
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path__namespace.join(DIST, "index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow == null ? void 0 : mainWindow.hide();
    }
  });
  startMeetingDetection();
}
function toggleOverlay() {
  if (!mainWindow) return;
  isOverlayMode = !isOverlayMode;
  if (isOverlayMode) {
    mainWindow.setAlwaysOnTop(true, "screen-saver");
    mainWindow.setVisibleOnAllWorkspaces(true);
    mainWindow.setSize(420, 600);
    mainWindow.setMinimumSize(320, 400);
    mainWindow.setPosition(
      Math.floor(mainWindow.getBounds().x),
      Math.floor(mainWindow.getBounds().y)
    );
    mainWindow.setOpacity(0.95);
    mainWindow.setSkipTaskbar(true);
  } else {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setVisibleOnAllWorkspaces(false);
    mainWindow.setSize(1200, 800);
    mainWindow.setMinimumSize(800, 600);
    mainWindow.setOpacity(1);
    mainWindow.setSkipTaskbar(false);
  }
  mainWindow.webContents.send("overlay:toggled", isOverlayMode);
}
function createTray() {
  const iconPath = path__namespace.join(VITE_PUBLIC, "logo-short.png");
  const icon = electron.nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new electron.Tray(icon);
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "Show WhisperMentor",
      click: () => {
        mainWindow == null ? void 0 : mainWindow.show();
        mainWindow == null ? void 0 : mainWindow.focus();
      }
    },
    {
      label: "Toggle Overlay",
      click: () => toggleOverlay()
    },
    {
      label: "Toggle Mic",
      click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("mic:toggle")
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        electron.app.quit();
      }
    }
  ]);
  tray.setToolTip("WhisperMentor AI");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow == null ? void 0 : mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow == null ? void 0 : mainWindow.show();
    }
  });
}
function registerIpcHandlers() {
  electron.ipcMain.handle("app:version", () => electron.app.getVersion());
  electron.ipcMain.on("window:minimize", () => mainWindow == null ? void 0 : mainWindow.minimize());
  electron.ipcMain.on("window:maximize", () => {
    if (mainWindow == null ? void 0 : mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow == null ? void 0 : mainWindow.maximize();
    }
  });
  electron.ipcMain.on("window:close", () => mainWindow == null ? void 0 : mainWindow.close());
  electron.ipcMain.handle("overlay:toggle", () => {
    toggleOverlay();
    return isOverlayMode;
  });
  electron.ipcMain.handle("overlay:status", () => isOverlayMode);
  electron.ipcMain.handle("audio:get-sources", async () => {
    const sources = await electron.desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 0, height: 0 }
    });
    return sources.map((s) => ({ id: s.id, name: s.name }));
  });
}
function startMeetingDetection() {
  if (meetingCheckInterval) clearInterval(meetingCheckInterval);
  meetingCheckInterval = setInterval(async () => {
    if (!mainWindow) return;
    try {
      const sources = await electron.desktopCapturer.getSources({ types: ["window"] });
      const meetingApps = ["Zoom Meeting", "Microsoft Teams", "Meet - ", "Webex"];
      let detectedApp = null;
      for (const source of sources) {
        for (const app2 of meetingApps) {
          if (source.name.includes(app2)) {
            detectedApp = app2 === "Meet - " ? "Google Meet" : app2.replace(" Meeting", "");
            break;
          }
        }
        if (detectedApp) break;
      }
      if (detectedApp && detectedApp !== lastDetectedMeetingApp) {
        lastDetectedMeetingApp = detectedApp;
        mainWindow.webContents.send("meeting:detected", detectedApp);
        const { Notification } = require("electron");
        new Notification({
          title: "Meeting Detected",
          body: `${detectedApp} is running. Start WhisperMentor?`,
          silent: true
        }).show();
      } else if (!detectedApp) {
        lastDetectedMeetingApp = null;
      }
    } catch (error) {
      console.error("Error detecting meetings:", error);
    }
  }, 5e3);
}
electron.app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();
  createTray();
  electron.globalShortcut.register("CommandOrControl+Shift+M", () => {
    mainWindow == null ? void 0 : mainWindow.webContents.send("mic:toggle");
  });
  electron.globalShortcut.register("CommandOrControl+Shift+O", () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
      }
      toggleOverlay();
    }
  });
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    isQuitting = true;
    electron.app.quit();
  }
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
});
