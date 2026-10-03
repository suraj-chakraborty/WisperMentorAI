import React, { useState } from 'react';
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
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
            <div>
                <button
                    className="sidebar__toggle"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? '▶' : '◀'}
                </button>
                <div className="sidebar__nav">
                    <button
                        className={`sidebar__item ${activePage === 'dashboard' ? 'sidebar__item--active' : ''}`}
                        onClick={() => onNavigate('dashboard')}
                        title="Dashboard"
                    >
                        <span className="sidebar__icon">⌂</span>
                        <span className="sidebar__label">Dashboard</span>
                    </button>
                    <button
                        className={`sidebar__item ${activePage === 'session' ? 'sidebar__item--active' : ''}`}
                        onClick={() => onNavigate('session')}
                        title="Active Session"
                    >
                        <span className="sidebar__icon">◉</span>
                        <span className="sidebar__label">Active Session</span>
                    </button>
                    <button
                        className={`sidebar__item ${activePage === 'glossary' ? 'sidebar__item--active' : ''}`}
                        onClick={() => onNavigate('glossary')}
                        title="Glossary"
                    >
                        <span className="sidebar__icon">📚</span>
                        <span className="sidebar__label">Glossary</span>
                    </button>
                    <button
                        className={`sidebar__item ${activePage === 'graph' ? 'sidebar__item--active' : ''}`}
                        onClick={() => onNavigate('graph')}
                        title="Knowledge Graph"
                    >
                        <span className="sidebar__icon">🕸️</span>
                        <span className="sidebar__label">Knowledge Graph</span>
                    </button>
                    <button
                        className={`sidebar__item ${activePage === 'settings' ? 'sidebar__item--active' : ''}`}
                        onClick={() => onNavigate('settings')}
                        title="Settings"
                    >
                        <span className="sidebar__icon">⚙</span>
                        <span className="sidebar__label">Settings</span>
                    </button>
                </div>
            </div>

            <div>
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
            </div>
        </aside>
    );
}
