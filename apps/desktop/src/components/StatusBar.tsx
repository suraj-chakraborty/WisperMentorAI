import React from 'react';

interface StatusBarProps {
    isConnected: boolean;
    sessionId: string | null;
    isOverlay: boolean;
    onToggleOverlay: () => void;
    elapsed: number;
}

export function StatusBar({ isConnected, sessionId, isOverlay, onToggleOverlay, elapsed }: StatusBarProps) {
    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="statusbar">
            <div className="statusbar__left">
                <div className={`statusbar__conn ${isConnected ? 'statusbar__conn--on' : 'statusbar__conn--off'}`}>
                    <span className="statusbar__dot" />
                    <span>{isConnected ? 'Connected' : 'Offline'}</span>
                </div>
                {sessionId && (
                    <div className="statusbar__session">
                        <span className="statusbar__rec" />
                        <span>{formatTime(elapsed)}</span>
                    </div>
                )}
            </div>
            <div className="statusbar__right">
                <button
                    className="statusbar__overlay-btn"
                    onClick={onToggleOverlay}
                    title={isOverlay ? 'Exit Overlay' : 'Enter Overlay'}
                >
                    {isOverlay ? '⤢ Expand' : '⤡ Overlay'}
                </button>
            </div>
        </div>
    );
}
