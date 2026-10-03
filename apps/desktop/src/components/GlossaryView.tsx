import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Concept {
    name: string;
    name_translated?: string;
    definition: string;
    definition_translated?: string;
}

interface GlossaryViewProps {
    sessionId: string | null;
}

export const GlossaryView: React.FC<GlossaryViewProps> = ({ sessionId }) => {
    const { token } = useAuth();
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchGlossary = async () => {
            setLoading(true);
            try {
                const url = sessionId
                    ? `http://localhost:3001/sessions/${sessionId}/glossary`
                    : `http://localhost:3001/sessions/global/glossary`; // Backend might need global endpoint if desired, but for now we focus on session

                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setConcepts(data);
                }
            } catch (e) {
                console.error("Failed to fetch glossary", e);
            } finally {
                setLoading(false);
            }
        };

        fetchGlossary();
    }, [sessionId]);

    const filtered = concepts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.name_translated?.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-6 h-full flex flex-col bg-slate-950 text-slate-100">
            <header className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">📚 Session Glossary</h2>
                <p className="text-slate-400">Technical concepts and translations extracted from your sessions.</p>
            </header>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search concepts..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                        <p className="text-slate-500">No concepts found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map((concept, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition-colors group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                                            {concept.name}
                                        </h3>
                                        {concept.name_translated && (
                                            <span className="text-xs font-medium px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">
                                                {concept.name_translated}
                                            </span>
                                        )}
                                    </div>
                                    <button className="text-slate-500 hover:text-white">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                    </button>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {concept.definition}
                                </p>
                                {concept.definition_translated && (
                                    <div className="mt-3 pt-3 border-t border-slate-800">
                                        <p className="text-sm text-indigo-300 italic">
                                            {concept.definition_translated}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
