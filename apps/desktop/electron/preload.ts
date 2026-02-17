import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getVersion: () => ipcRenderer.invoke('app:version'),

    // Window controls
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close'),

    // Overlay
    toggleOverlay: () => ipcRenderer.invoke('overlay:toggle'),
    getOverlayStatus: () => ipcRenderer.invoke('overlay:status'),
    onOverlayToggled: (callback: (isOverlay: boolean) => void) => {
        ipcRenderer.on('overlay:toggled', (_event, isOverlay) => callback(isOverlay));
    },

    // Audio capture (Phase 2)
    startAudioCapture: () => ipcRenderer.invoke('audio:start'),
    stopAudioCapture: () => ipcRenderer.invoke('audio:stop'),

    // Generic IPC listeners
    onMessage: (channel: string, callback: (...args: unknown[]) => void) => {
        ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    },
    removeListener: (channel: string) => {
        ipcRenderer.removeAllListeners(channel);
    },
});
