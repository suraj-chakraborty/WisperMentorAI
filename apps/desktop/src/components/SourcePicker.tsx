import React, { useEffect, useState } from 'react';

interface SourcePickerProps {
    onSelect: (sourceId: string) => void;
    onClose: () => void;
}

interface Source {
    id: string;
    name: string;
    thumbnail?: string;
}

const SourcePicker: React.FC<SourcePickerProps> = ({ onSelect, onClose }) => {
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSources = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const available: Source[] = await window.electronAPI.getDesktopSources();
                setSources(available);
            } catch (e) {
                console.error('Failed to get sources', e);
            } finally {
                setLoading(false);
            }
        };
        fetchSources();
    }, []);

    return (
        <div className="source-picker-overlay">
            <div className="source-picker-modal">
                <div className="source-picker-header">
                    <div className="source-picker-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="source-picker-icon-main" aria-hidden="true">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <h2>Select Audio Source</h2>
                    </div>
                    <button onClick={onClose} className="source-picker-close-btn" aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="source-picker-body">
                    {loading ? (
                        <div className="source-picker-loading">
                            Loading sources...
                        </div>
                    ) : (
                        <div className="source-picker-grid">
                            {sources.map((source) => (
                                <button
                                    key={source.id}
                                    onClick={() => onSelect(source.id)}
                                    className="source-card"
                                >
                                    <div className="source-card__visual">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="source-card__icon" aria-hidden="true">
                                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                            <line x1="8" y1="21" x2="16" y2="21"></line>
                                            <line x1="12" y1="17" x2="12" y2="21"></line>
                                        </svg>
                                    </div>
                                    <div className="source-card__info">
                                        <p className="source-card__name">{source.name}</p>
                                        <p className="source-card__id">ID: {source.id.slice(0, 8)}...</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SourcePicker;
