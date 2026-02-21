import React from 'react';

interface DashboardProps {
    isConnected: boolean;
    sessionStatus: string;
    sessionId: string | null;
    isCapturing: boolean;
    onStartSession: () => void;
    onResumeSession: (id: string) => void;
    onNavigate: (page: string) => void;
}

export function Dashboard({ isConnected, sessionStatus, sessionId, isCapturing, onStartSession, onResumeSession, onNavigate }: DashboardProps) {
    const [sessions, setSessions] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Fetch sessions on mount
    React.useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await fetch('http://localhost:3001/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (e) {
            console.error("Failed to fetch sessions", e);
        }
    };

    const handleGenerateSummary = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3001/sessions/${id}/summarize`, { method: 'POST' });
            if (res.ok) {
                await fetchSessions(); // Refresh to show new summary
            }
        } catch (e) {
            console.error("Summary failed", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard">
            {/* Welcome Card */}
            <div className="dashboard__welcome">
                <div className="dashboard__welcome-content">
                    <h1 className="dashboard__title">WhisperMentor AI</h1>
                    <p className="dashboard__subtitle">
                        Your private co-mentor for live sessions. Start a session to begin capturing knowledge in real time.
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
                    </div>
                </div>
                <div className="dashboard__welcome-visual">
                    <div className="dashboard__orb" />
                </div>
            </div>

            {/* Stats Grid - Restored */}
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
                    <div className="stat-card__value">{sessions.length}</div>
                    <div className="stat-card__label">Total Sessions</div>
                </div>
            </div>

            {/* Connection Details - Restored */}
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
                        <span className="connection-value">{isCapturing ? <span>Active</span> : <span>Idle</span>}</span>
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

            {/* Session History */}
            <div className="dashboard__hx">
                <h3 className="dashboard__section-title">Recent Sessions</h3>
                {sessions.length === 0 ? (
                    <div className="dashboard__empty-hx">No sessions recorded yet.</div>
                ) : (
                    <div className="session-list">
                        {sessions.map(s => (
                            <div key={s.id} className="session-card">
                                <div className="session-card__header">
                                    <span className="session-card__date">
                                        {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString()}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={`session-card__status ${s.endedAt ? 'ended' : 'active'}`}>
                                            {s.endedAt ? <span>Completed</span> : <span>Active</span>}
                                        </span>
                                        <button
                                            className="btn btn--sm btn--primary"
                                            onClick={() => {
                                                onResumeSession(s.id);
                                                onNavigate('session');
                                            }}
                                        >
                                            View Session
                                        </button>
                                    </div>
                                </div>

                                {s.summary ? (
                                    <div className="session-card__summary">
                                        <h4>📝 Executive Summary</h4>
                                        <p>{s.summary}</p>

                                        {/* Topics / Keywords */}
                                        {s.topics && s.topics.length > 0 && (
                                            <div className="session-card__topics">
                                                {s.topics.map((topic: string, i: number) => (
                                                    <span key={i} className="topic-tag">#{topic}</span>
                                                ))}
                                            </div>
                                        )}

                                        {s.actionItems && s.actionItems.length > 0 && (
                                            <div className="session-card__actions">
                                                <h5>Action Items:</h5>
                                                <ul>
                                                    {s.actionItems.map((item: string, i: number) => (
                                                        <li key={i}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="session-card__no-summary">
                                        <p><span>No summary available.</span></p>
                                        {s.endedAt && (
                                            <button
                                                className="btn btn--sm btn--secondary"
                                                onClick={() => handleGenerateSummary(s.id)}
                                                disabled={loading}
                                            >
                                                {loading ? <span>Generating...</span> : <span>✨ Generate AI Summary</span>}
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="session-card__stats">
                                    <span>💬 {s._count?.transcripts || 0} <span>transcripts</span></span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
