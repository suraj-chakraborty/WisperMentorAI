import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, desktopCapturer } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isOverlayMode = false;
let isQuitting = false;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const DIST = process.env.DIST || path.join(__dirname, '../dist');
const VITE_PUBLIC = process.env.VITE_PUBLIC || path.join(__dirname, '../public');

// ─── Window Creation ────────────────────────────────────────────

function createMainWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'WhisperMentor AI',
        icon: path.join(VITE_PUBLIC, 'logo-short.png'),
        frame: false, // Custom titlebar
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        backgroundColor: '#0a0a0f',
        show: false,
    });

    if (VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL);
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

    // Minimize to tray instead of closing
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow?.hide();
        }
    });
}

// ─── Overlay Toggle ─────────────────────────────────────────────

function toggleOverlay(): void {
    if (!mainWindow) return;

    isOverlayMode = !isOverlayMode;

    if (isOverlayMode) {
        // Switch to overlay mode
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.setVisibleOnAllWorkspaces(true);
        mainWindow.setSize(420, 600);
        mainWindow.setMinimumSize(320, 400);
        mainWindow.setPosition(
            Math.floor(mainWindow.getBounds().x),
            Math.floor(mainWindow.getBounds().y),
        );
        mainWindow.setOpacity(0.95);
        mainWindow.setSkipTaskbar(true);
    } else {
        // Switch back to normal mode
        mainWindow.setAlwaysOnTop(false);
        mainWindow.setVisibleOnAllWorkspaces(false);
        mainWindow.setSize(1200, 800);
        mainWindow.setMinimumSize(800, 600);
        mainWindow.setOpacity(1);
        mainWindow.setSkipTaskbar(false);
    }

    // Notify renderer of mode change
    mainWindow.webContents.send('overlay:toggled', isOverlayMode);
}

// ─── System Tray ────────────────────────────────────────────────

function createTray(): void {
    const iconPath = path.join(VITE_PUBLIC, 'logo-short.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show WhisperMentor',
            click: () => {
                mainWindow?.show();
                mainWindow?.focus();
            },
        },
        {
            label: 'Toggle Overlay',
            click: () => toggleOverlay(),
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.setToolTip('WhisperMentor AI');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow?.isVisible()) {
            mainWindow.focus();
        } else {
            mainWindow?.show();
        }
    });
}

// ─── IPC Handlers ───────────────────────────────────────────────

function registerIpcHandlers(): void {
    ipcMain.handle('app:version', () => app.getVersion());

    ipcMain.on('window:minimize', () => mainWindow?.minimize());
    ipcMain.on('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
    });
    ipcMain.on('window:close', () => mainWindow?.close());

    ipcMain.handle('overlay:toggle', () => {
        toggleOverlay();
        return isOverlayMode;
    });

    ipcMain.handle('overlay:status', () => isOverlayMode);

    // Audio capture
    ipcMain.handle('audio:get-sources', async () => {
        const sources = await desktopCapturer.getSources({
            types: ['screen', 'window'],
            thumbnailSize: { width: 0, height: 0 },
        });
        return sources.map((s) => ({ id: s.id, name: s.name }));
    });
}

// ─── App Lifecycle ──────────────────────────────────────────────

app.whenReady().then(() => {
    registerIpcHandlers();
    createMainWindow();
    createTray();

    // Global hotkey: Ctrl+Shift+M to toggle overlay
    globalShortcut.register('CommandOrControl+Shift+M', () => {
        if (mainWindow) {
            if (!mainWindow.isVisible()) {
                mainWindow.show();
                mainWindow.focus();
            }
            toggleOverlay();
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
        isQuitting = true;
        app.quit();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
