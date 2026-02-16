import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getVersion: () => ipcRenderer.invoke('app:version'),

    // Window controls
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close'),

    // Audio capture (Phase 2)
    startAudioCapture: () => ipcRenderer.invoke('audio:start'),
    stopAudioCapture: () => ipcRenderer.invoke('audio:stop'),

    // IPC listeners
    onMessage: (channel: string, callback: (...args: unknown[]) => void) => {
        ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    },
    removeListener: (channel: string) => {
        ipcRenderer.removeAllListeners(channel);
    },
});
