export { };

declare global {
    interface Window {
        electronAPI: {
            getVersion: () => Promise<string>;
            minimizeWindow: () => void;
            maximizeWindow: () => void;
            closeWindow: () => void;
            toggleOverlay: () => Promise<boolean>;
            getOverlayStatus: () => Promise<boolean>;
            onOverlayToggled: (callback: (isOverlay: boolean) => void) => void;
            onToggleMic: (callback: () => void) => void;
            onMeetingDetected: (callback: (appName: string) => void) => void;
            getDesktopSources: () => Promise<any[]>;
            startAudioCapture: () => Promise<void>;
            stopAudioCapture: () => Promise<void>;
            onMessage: (channel: string, callback: (...args: any[]) => void) => void;
            removeListener: (channel: string) => void;
        };
    }
}
