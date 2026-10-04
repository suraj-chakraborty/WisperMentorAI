import React from 'react';

interface SessionHeaderProps {
    isCapturing: boolean;
    isPaused: boolean;
    audioLevel: number;
    elapsed: number;
    formatTime: (s: number) => string;
    onToggleCapture: () => void;
    togglePause: () => void;
    onOpenSourcePicker: () => void;
    isMicEnabled: boolean;
    toggleMic: () => void;
    isTranslationEnabled: boolean;
    targetLang: string;
    onSelectTargetLang: (lang: string) => void;
    onToggleTranslation: (enabled: boolean) => void;
    voiceEnabled: boolean;
    onToggleVoice: () => void;
    activeTab: 'transcript' | 'qa';
    onTabChange: (tab: 'transcript' | 'qa') => void;
    answersCount: number;
    onToggleOverlay: () => void;
    showExportMenu: boolean;
    setShowExportMenu: React.Dispatch<React.SetStateAction<boolean>>;
    onExport: (type: 'markdown' | 'text') => void;
    onOpenEndConfirm: () => void;
    isEndingSession: boolean;
}

export function SessionHeader({
    isCapturing,
    isPaused,
    audioLevel,
    elapsed,
    formatTime,
    onToggleCapture,
    togglePause,
    onOpenSourcePicker,
    isMicEnabled,
    toggleMic,
    isTranslationEnabled,
    targetLang,
    onSelectTargetLang,
    onToggleTranslation,
    voiceEnabled,
    onToggleVoice,
    activeTab,
    onTabChange,
    answersCount,
    onToggleOverlay,
    showExportMenu,
    setShowExportMenu,
    onExport,
    onOpenEndConfirm,
    isEndingSession,
}: SessionHeaderProps) {
    return (
        <div className="session__header">
            <div className="session__info">
                <div className="flex items-center gap-2">
                    <button
                        className={`session__rec-btn ${isCapturing ? 'session__rec-btn--active' : ''}`}
                        onClick={onToggleCapture}
                        title={isCapturing ? 'Stop Recording' : 'Start Recording'}
                    >
                        <span className="session__rec-dot" />
                        {isCapturing ? (isPaused ? 'Resume' : 'Recording') : 'Start Rec'}
                    </button>

                    {isCapturing && (
                        <button
                            className={`btn btn--sm ${isPaused ? 'btn--primary' : 'btn--secondary'}`}
                            onClick={togglePause}
                            title={isPaused ? 'Resume Recording' : 'Pause Recording'}
                        >
                            {isPaused ? '▶' : '⏸'}
                        </button>
                    )}

                    {!isCapturing && (
                        <button
                            className="btn btn--secondary btn--sm"
                            onClick={onOpenSourcePicker}
                            title="Select Audio Source (Screen/Window)"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                        </button>
                    )}
                </div>

                {isCapturing && (
                    <button
                        onClick={toggleMic}
                        className={`btn btn--sm ${isMicEnabled ? 'btn--primary' : 'btn--secondary'}`}
                        title={isMicEnabled ? 'Mute Mic' : 'Unmute Mic'}
                    >
                        <span>{isMicEnabled ? '🎤' : '🔇'}</span>
                        {isMicEnabled ? 'Mic ON' : 'Mic OFF'}
                    </button>
                )}
                {isCapturing && (
                    <div className="session__level-meter">
                        <div
                            className="session__level-bar"
                            style={{ width: `${audioLevel}%` }}
                        />
                    </div>
                )}
                <span className="session__timer">{formatTime(elapsed)}</span>

                <div className="flex items-center gap-2 ml-2">
                    {isTranslationEnabled && (
                        <select
                            value={targetLang}
                            onChange={(e) => onSelectTargetLang(e.target.value)}
                            className="bg-slate-800 text-white text-xs rounded border border-slate-600 px-2 py-1 outline-none"
                        >
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="zh">Chinese</option>
                            <option value="ja">Japanese</option>
                            <option value="pt">Portuguese</option>
                            <option value="it">Italian</option>
                            <option value="ru">Russian</option>
                            <option value="hi">Hindi</option>
                            <option value="ko">Korean</option>
                            <option value="nl">Dutch</option>
                            <option value="tr">Turkish</option>
                            <option value="pl">Polish</option>
                            <option value="sv">Swedish</option>
                        </select>
                    )}
                    <button
                        className={`btn btn--sm ${isTranslationEnabled ? 'btn--primary' : 'btn--secondary'}`}
                        onClick={() => onToggleTranslation(!isTranslationEnabled)}
                        title="Translate non-English speech"
                    >
                        {isTranslationEnabled ? '🌐 On' : '🌐 Translate'}
                    </button>
                    <button
                        className={`btn btn--sm ${voiceEnabled ? 'btn--primary' : 'btn--secondary'}`}
                        onClick={onToggleVoice}
                        title={voiceEnabled ? 'Disable Voice Output' : 'Enable Voice Output'}
                    >
                        {voiceEnabled ? '🔊 Voice' : '🔇 Muted'}
                    </button>
                </div>
            </div>

            <div className="session__tabs">
                <button
                    className={`session__tab ${activeTab === 'transcript' ? 'session__tab--active' : ''}`}
                    onClick={() => onTabChange('transcript')}
                >
                    Transcript
                </button>
                <button
                    className={`session__tab ${activeTab === 'qa' ? 'session__tab--active' : ''}`}
                    onClick={() => onTabChange('qa')}
                >
                    Q&A ({answersCount})
                </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    className="btn btn--secondary btn--sm"
                    onClick={onToggleOverlay}
                    title="Pop out into floating window"
                >
                    ⤡ Overlay
                </button>

                <div className="relative" style={{ position: 'relative' }}>
                    <button
                        className="btn btn--secondary btn--sm"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        title="Export Session"
                    >
                        📥 Export
                    </button>
                    {showExportMenu && (
                        <div
                            className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden"
                            style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', marginTop: '4px' }}
                        >
                            <button
                                className="px-4 py-2 text-left text-sm hover:bg-slate-700 text-white w-full"
                                onClick={() => onExport('markdown')}
                                style={{ padding: '8px 16px', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', color: 'white', display: 'block', width: '100%' }}
                                onMouseOver={(e) => (e.currentTarget.style.background = '#334155')}
                                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                Markdown (.md)
                            </button>
                            <button
                                className="px-4 py-2 text-left text-sm hover:bg-slate-700 text-white w-full border-t border-slate-700"
                                onClick={() => onExport('text')}
                                style={{ padding: '8px 16px', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', color: 'white', display: 'block', width: '100%', borderTop: '1px solid #334155' }}
                                onMouseOver={(e) => (e.currentTarget.style.background = '#334155')}
                                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                Text (.txt)
                            </button>
                        </div>
                    )}
                </div>
                <button
                    className="btn btn--ghost btn--sm"
                    onClick={onOpenEndConfirm}
                    disabled={isEndingSession}
                    title="End this session and generate AI summary"
                >
                    {isEndingSession ? 'Ending...' : 'End Session'}
                </button>
            </div>
        </div>
    );
}
