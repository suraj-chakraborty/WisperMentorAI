import React from 'react';

interface TitleBarProps {
    isOverlay: boolean;
}


export function TitleBar({ isOverlay }: TitleBarProps) {
    if (isOverlay) return null;

    return (
        <div className="titlebar" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
            <div className="titlebar__brand">
                <img src="/logo-short.png" alt="WM" className="titlebar__logo" />
                <span className="titlebar__title">WhisperMentor AI</span>
                <span className="titlebar__version">v0.1.0</span>
            </div>
            <div className="titlebar__controls" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                    className="titlebar__btn"
                    onClick={() => window.electronAPI?.minimizeWindow()}
                    title="Minimize"
                >
                    ─
                </button>
                <button
                    className="titlebar__btn"
                    onClick={() => window.electronAPI?.maximizeWindow()}
                    title="Maximize"
                >
                    □
                </button>
                <button
                    className="titlebar__btn titlebar__btn--close"
                    onClick={() => window.electronAPI?.closeWindow()}
                    title="Close"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
