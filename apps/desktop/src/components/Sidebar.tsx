import React from 'react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    activePage: string;
    onNavigate: (page: string) => void;
    isConnected: boolean;
    sessionId: string | null;
    isOverlay: boolean;
}

const navItems = [
    { id: 'dashboard', icon: '⌂', label: 'Dashboard' },
    { id: 'session', icon: '◉', label: 'Session' },
    { id: 'glossary', icon: '📚', label: 'Glossary' },
    { id: 'graph', icon: '🕸️', label: 'Knowledge Graph' },
    { id: 'settings', icon: '⚙', label: 'Settings' },
];

export function Sidebar({ activePage, onNavigate, isConnected, sessionId, isOverlay }: SidebarProps) {
    const { logout } = useAuth();
    if (isOverlay) return null;

    return (
        <aside className="sidebar">
            <div className="sidebar__nav">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar__item ${activePage === item.id ? 'sidebar__item--active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                        title={item.label}
                    >
                        <span className="sidebar__icon">{item.icon}</span>
                        <span className="sidebar__label">{item.label}</span>
                    </button>
                ))}
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
        </aside >
    );
}
