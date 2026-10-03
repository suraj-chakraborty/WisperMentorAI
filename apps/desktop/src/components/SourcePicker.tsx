import React, { useEffect, useState } from 'react';
import { Monitor, X } from 'lucide-react';

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
                        <Monitor className="source-picker-icon-main" />
                        <h2>Select Audio Source</h2>
                    </div>
                    <button onClick={onClose} className="source-picker-close-btn">
                        X
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
                                        <Monitor className="source-card__icon" />
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
