import React from 'react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    activePage: string;
    onNavigate: (page: string) => void;
    isConnected: boolean;
    sessionId: string | null;
    isOverlay: boolean;
}

export function Sidebar({ activePage, onNavigate, isConnected, sessionId, isOverlay }: SidebarProps) {
    const { logout } = useAuth();

    return (
        <aside className="sidebar">
            <div className="sidebar__nav">
                <button
                    className={`sidebar__item ${activePage === 'dashboard' ? 'sidebar__item--active' : ''}`}
                    onClick={() => onNavigate('dashboard')}
                >
                    <span className="sidebar__icon">⌂</span>
                    <span className="sidebar__label">Dashboard</span>
                </button>
                <button
                    className={`sidebar__item ${activePage === 'session' ? 'sidebar__item--active' : ''}`}
                    onClick={() => onNavigate('session')}
                >
                    <span className="sidebar__icon">◉</span>
                    <span className="sidebar__label">Active Session</span>
                </button>
                <button
                    className={`sidebar__item ${activePage === 'glossary' ? 'sidebar__item--active' : ''}`}
                    onClick={() => onNavigate('glossary')}
                >
                    <span className="sidebar__icon">📚</span>
                    <span className="sidebar__label">Glossary</span>
                </button>
                <button
                    className={`sidebar__item ${activePage === 'graph' ? 'sidebar__item--active' : ''}`}
                    onClick={() => onNavigate('graph')}
                >
                    <span className="sidebar__icon">🕸️</span>
                    <span className="sidebar__label">Knowledge Graph</span>
                </button>
                <button
                    className={`sidebar__item ${activePage === 'settings' ? 'sidebar__item--active' : ''}`}
                    onClick={() => onNavigate('settings')}
                >
                    <span className="sidebar__icon">⚙</span>
                    <span className="sidebar__label">Settings</span>
                </button>
            </div>

            <div className="sidebar__user-controls">
                <button onClick={logout} className="sidebar__logout-btn" title="Logout">
                    <span className="sidebar__icon">🚪</span>
                    <span className="sidebar__label">Logout</span>
                </button>
            </div>

            <div className="sidebar__footer">
                <div className={`sidebar__status ${isConnected ? 'sidebar__status--online' : 'sidebar__status--offline'}`}>
                    <span className="sidebar__status-dot" />
                    <span className="sidebar__status-text">
                        {isConnected ? 'Online' : 'Offline'}
                    </span>
                </div>
                {sessionId && (
                    <div className="sidebar__session-badge">
                        Live
                    </div>
                )}
            </div>
        </aside>
    );
}
