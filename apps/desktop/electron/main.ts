import { app, BrowserWindow, globalShortcut } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production';

function createMainWindow(): void {
    const VITE_PUBLIC = process.env.VITE_PUBLIC || path.join(__dirname, '../public');
    const DIST = process.env.DIST || path.join(__dirname, '../dist');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'WhisperMentor AI',
        icon: path.join(VITE_PUBLIC, 'logo-short.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        backgroundColor: '#0a0a0f',
        show: false,
    });

    // Load app
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(DIST, 'index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ─── App Lifecycle ──────────────────────────────────────────────

app.whenReady().then(() => {
    createMainWindow();

    // Global hotkey: Ctrl+Shift+M to toggle overlay (Phase 1)
    globalShortcut.register('CommandOrControl+Shift+M', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
