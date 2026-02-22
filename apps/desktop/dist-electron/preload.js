"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // App info
  getVersion: () => electron.ipcRenderer.invoke("app:version"),
  // Window controls
  minimizeWindow: () => electron.ipcRenderer.send("window:minimize"),
  maximizeWindow: () => electron.ipcRenderer.send("window:maximize"),
  closeWindow: () => electron.ipcRenderer.send("window:close"),
  // Overlay
  toggleOverlay: () => electron.ipcRenderer.invoke("overlay:toggle"),
  getOverlayStatus: () => electron.ipcRenderer.invoke("overlay:status"),
  onOverlayToggled: (callback) => {
    electron.ipcRenderer.on("overlay:toggled", (_event, isOverlay) => callback(isOverlay));
  },
  onToggleMic: (callback) => {
    electron.ipcRenderer.on("mic:toggle", () => callback());
  },
  onMeetingDetected: (callback) => {
    electron.ipcRenderer.on("meeting:detected", (_event, appName, meetingTitle) => callback(appName, meetingTitle));
  },
  // Audio capture
  getDesktopSources: () => electron.ipcRenderer.invoke("audio:get-sources"),
  startAudioCapture: () => electron.ipcRenderer.invoke("audio:start"),
  stopAudioCapture: () => electron.ipcRenderer.invoke("audio:stop"),
  // Generic IPC listeners
  onMessage: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeListener: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
});
