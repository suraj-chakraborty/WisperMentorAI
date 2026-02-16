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
process.env.NODE_ENV !== "production";
function createMainWindow() {
  const VITE_PUBLIC = process.env.VITE_PUBLIC || path__namespace.join(__dirname, "../public");
  const DIST = process.env.DIST || path__namespace.join(__dirname, "../dist");
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "WhisperMentor AI",
    icon: path__namespace.join(VITE_PUBLIC, "logo-short.png"),
    webPreferences: {
      preload: path__namespace.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: "#0a0a0f",
    show: false
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
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
}
electron.app.whenReady().then(() => {
  createMainWindow();
  electron.globalShortcut.register("CommandOrControl+Shift+M", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
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
    electron.app.quit();
  }
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
});
