import React, { useEffect, useState } from 'react';
import { Monitor, X } from 'lucide-react';

interface SourcePickerProps {
    onSelect: (sourceId: string) => void;
    onClose: () => void;
}

interface Source {
    id: string;
    name: string;
    thumbnail?: string; // We might need to handle thumbnails if we send them from Electron
}

const SourcePicker: React.FC<SourcePickerProps> = ({ onSelect, onClose }) => {
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSources = async () => {
            try {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-[600px] bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-lg font-semibold text-white">Select Audio Source</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {sources.map((source) => (
                                <button
                                    key={source.id}
                                    onClick={() => onSelect(source.id)}
                                    className="group relative flex flex-col items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all text-left"
                                >
                                    <div className="w-full aspect-video bg-black/40 rounded-lg flex items-center justify-center border border-white/5 group-hover:border-indigo-500/30">
                                        <Monitor className="w-8 h-8 text-gray-600 group-hover:text-indigo-400" />
                                    </div>
                                    <div className="w-full">
                                        <p className="text-sm font-medium text-white truncate">{source.name}</p>
                                        <p className="text-xs text-gray-400">ID: {source.id.slice(0, 8)}...</p>
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
