import React from 'react';

interface DashboardProps {
    isConnected: boolean;
    sessionStatus: string;
    sessionId: string | null;
    isCapturing: boolean;
    onStartSession: () => void;
    onNavigate: (page: string) => void;
}

export function Dashboard({ isConnected, sessionStatus, sessionId, isCapturing, onStartSession, onNavigate }: DashboardProps) {
    return (
        <div className="dashboard">
            {/* Welcome Card */}
            <div className="dashboard__welcome">
                <div className="dashboard__welcome-content">
                    <h1 className="dashboard__title">WhisperMentor AI</h1>
                    <p className="dashboard__subtitle">
                        Your private co-mentor for live sessions. Start a session to begin
                        capturing knowledge in real time.
                    </p>
                    <div className="dashboard__actions">
                        <button
                            className="btn btn--primary"
                            onClick={() => {
                                onStartSession();
                                onNavigate('session');
                            }}
                        >
                            <span className="btn__icon">◉</span>
                            Start New Session
                        </button>
                        <button className="btn btn--secondary" onClick={() => onNavigate('session')}>
                            <span className="btn__icon">↗</span>
                            Join Session
                        </button>
                    </div>
                </div>
                <div className="dashboard__welcome-visual">
                    <div className="dashboard__orb" />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="dashboard__stats">
                <div className="stat-card">
                    <div className="stat-card__value">{isConnected ? '✓' : '✗'}</div>
                    <div className="stat-card__label">Backend</div>
                    <div className={`stat-card__indicator ${isConnected ? 'stat-card__indicator--ok' : 'stat-card__indicator--err'}`} />
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">{sessionId ? '1' : '0'}</div>
                    <div className="stat-card__label">Active Sessions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">0</div>
                    <div className="stat-card__label">Transcripts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">0</div>
                    <div className="stat-card__label">Questions Asked</div>
                </div>
            </div>

            {/* Connection Details */}
            <div className="dashboard__connection">
                <h3 className="dashboard__section-title">System Status</h3>
                <div className="connection-grid">
                    <div className="connection-item">
                        <span className={`connection-dot ${isConnected ? 'connection-dot--on' : 'connection-dot--off'}`} />
                        <span className="connection-label">WebSocket</span>
                        <span className="connection-value">{sessionStatus}</span>
                    </div>
                    <div className="connection-item">
                        <span className={`connection-dot ${isCapturing ? 'connection-dot--on' : 'connection-dot--off'}`} />
                        <span className="connection-label">Audio Capture</span>
                        <span className="connection-value">{isCapturing ? 'Active' : 'Idle'}</span>
                    </div>
                    <div className="connection-item">
                        <span className="connection-dot connection-dot--on" />
                        <span className="connection-label">Transcription</span>
                        <span className="connection-value">Online</span>
                    </div>
                    <div className="connection-item">
                        <span className="connection-dot connection-dot--on" />
                        <span className="connection-label">Knowledge Graph</span>
                        <span className="connection-value">Online</span>
                    </div>
                </div>
            </div>

            {/* Hotkey Hint */}
            <div className="dashboard__hint">
                <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">Shift</kbd> + <kbd className="kbd">M</kbd>
                <span>Toggle overlay mode</span>
            </div>
        </div>
    );
}
