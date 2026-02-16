"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // App info
  getVersion: () => electron.ipcRenderer.invoke("app:version"),
  // Window controls
  minimizeWindow: () => electron.ipcRenderer.send("window:minimize"),
  maximizeWindow: () => electron.ipcRenderer.send("window:maximize"),
  closeWindow: () => electron.ipcRenderer.send("window:close"),
  // Audio capture (Phase 2)
  startAudioCapture: () => electron.ipcRenderer.invoke("audio:start"),
  stopAudioCapture: () => electron.ipcRenderer.invoke("audio:stop"),
  // IPC listeners
  onMessage: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeListener: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
});
