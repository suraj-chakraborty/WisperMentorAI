import React, { useState, useRef, useEffect } from 'react';
import type { TranscriptEntry, AnswerEntry } from '../hooks/useSocket';
import ReactMarkdown from 'react-markdown';
import SourcePicker from './SourcePicker';
import { Modal } from './Modal';
import { GlossaryView } from './GlossaryView';
import { KnowledgeGraphView } from './KnowledgeGraphView';
import { usePushToTalk } from '../hooks/usePushToTalk';
import { ttsService } from '../utils/TextToSpeechService';
import { generateMarkdown, generateText, downloadFile } from '../utils/exportUtils';

interface SessionViewProps {
    sessionId: string | null;
    transcripts: TranscriptEntry[];
    answers: AnswerEntry[];
    onSendQuestion: (text: string, language?: string) => void;
    onLeaveSession: () => void;
    onStartSession: () => void;
    isConnected: boolean;
    isCapturing: boolean;
    audioLevel: number;
    error: string | null;
    onToggleCapture: () => void;
    isMicEnabled: boolean;
    toggleMic: () => void;
    onToggleOverlay: () => void;
    onToggleTranslation: (enabled: boolean) => void;
    isTranslationEnabled: boolean;
    isPaused: boolean;
    togglePause: () => void;
    token: string;
}

export function SessionView({
    sessionId,
    transcripts,
    answers,
    onSendQuestion,
    onLeaveSession,
    onStartSession,
    isConnected,
    isCapturing,
    audioLevel,
    error,
    onToggleCapture,
    isMicEnabled,
    toggleMic,
    onToggleOverlay,
    onToggleTranslation,
    isTranslationEnabled,
    isPaused,
    togglePause,
    token,
}: SessionViewProps) {
    const [inputText, setInputText] = useState('');
    const [activeTab, setActiveTab] = useState<'transcript' | 'qa'>('transcript');
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const qaEndRef = useRef<HTMLDivElement>(null);
    const [elapsed, setElapsed] = useState(0);

    // Source Picker State (Moved up to fix hooks error)
    // Source Picker State
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [showGlossary, setShowGlossary] = useState(false);
    const [showGraph, setShowGraph] = useState(false);
    const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(undefined);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Translation State
    const [translationData, setTranslationData] = useState<Record<number, { text: string; warning?: string }>>({});
    const [targetLang, setTargetLang] = useState('es');
    const translatingRef = useRef<Set<number>>(new Set());

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    useEffect(() => {
        qaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [answers]);

    // Session timer
    useEffect(() => {
        if (!sessionId) return;
        const start = Date.now();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionId]);

    // Translation Effect
    useEffect(() => {
        if (!isTranslationEnabled || !sessionId) {
            // Clear cache when disabled so it re-scans everything fresh when re-enabled
            if (!isTranslationEnabled) {
                setTranslationData({});
                translatingRef.current.clear();
            }
            return;
        }

        const translateNew = async () => {
            // Identify untranslated items. 
            // We clone transcripts to avoid closure stale issues if needed, but transcripts is fresh from deps.
            const toTranslate = transcripts.map((t, i) => ({ t, i }))
                .filter(({ t, i }) => !translationData[i] && !translatingRef.current.has(i) && t.text.trim());

            // Reverse so we translate newest first for better UX
            for (const { t, i } of [...toTranslate].reverse()) {
                translatingRef.current.add(i);
                try {
                    const response = await fetch('http://127.0.0.1:3001/translation/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: t.text, targetLang })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setTranslationData(prev => ({
                            ...prev,
                            [i]: { text: data.translation, warning: data.warning }
                        }));
                    }
                } catch (error) {
                    console.error('Translation error:', error);
                } finally {
                    translatingRef.current.delete(i);
                }
            }
        };

        translateNew();
    }, [transcripts, isTranslationEnabled, targetLang, sessionId]);

    // Fetch User Settings for Default Language
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('http://127.0.0.1:3001/settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.lingo?.preferredLanguage) {
                        setTargetLang(data.lingo.preferredLanguage);
                    }
                }
            } catch (e) {
                console.error("Failed to load settings in SessionView", e);
            }
        };
        loadSettings();
    }, [token]);

    // Clear Translations when Target Language Changes so the UI re-translates instantly
    useEffect(() => {
        setTranslationData({});
        translatingRef.current.clear();
    }, [targetLang]);

    // Track spoken answers to prevent repetitive speaking
    const lastSpokenIdRef = useRef<string | null>(null);

    // TTS Effect: Trigger speech when a new complete answer arrives
    useEffect(() => {
        if (answers.length > 0) {
            const latestAnswer = answers[answers.length - 1];
            if (latestAnswer.text && latestAnswer.questionId !== lastSpokenIdRef.current) {
                if (!latestAnswer.text.includes("❌")) {
                    ttsService.speak(latestAnswer.text, targetLang);
                }
                lastSpokenIdRef.current = latestAnswer.questionId;
            }
        }
    }, [answers, targetLang]);

    // Push-to-Talk (Web Speech Dictation)
    const { isListening: isPttListening, transcript: pttTranscript, error: pttError } = usePushToTalk({
        onComplete: (text) => {
            const lang = isTranslationEnabled ? targetLang : undefined;
            onSendQuestion(text, lang);
        },
        activationKey: 'Space'
    });

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            // Pass targetLang if translation is enabled
            // Pass targetLang if translation is enabled
            const lang = isTranslationEnabled ? targetLang : undefined;
            onSendQuestion(inputText.trim(), lang);
            setInputText('');
        }
    };

    // No active session
    if (!sessionId) {
        return (
            <div className="session-empty">
                <div className="session-empty__content">
                    <span className="session-empty__icon">◉</span>
                    <h2>No Active Session</h2>
                    <p>Start a new session to begin capturing live audio and building knowledge.</p>
                    <button className="btn btn--primary" onClick={onStartSession} disabled={!isConnected}>
                        Start New Session
                    </button>
                    {!isConnected && (
                        <p className="session-empty__warning">Backend is offline. Start the NestJS server first.</p>
                    )}
                </div>
            </div>
        );
    }

    // ─── Source Picker Logic ───


    // This is passed from App.tsx as `onToggleCapture(sourceId?)`
    // We intercept to handle source selection flow?
    // Actually, SessionView receives `onToggleCapture`.
    // We can't change the prop signature easily without changing App.tsx passing it.
    // But in App.tsx we updated it to accept `sourceId`.
    // So here we can call `onToggleCapture(sourceId)`.

    const handleSourceSelect = (id: string) => {
        setSelectedSourceId(id);
        setShowSourcePicker(false);
        // Start capture with this ID
        // We need to cast because props interface might be loose or we updated it?
        // Let's assume onToggleCapture accepts it.
        (onToggleCapture as any)(id);
    };

    const handleExport = (type: 'markdown' | 'text') => {
        if (!sessionId) return;
        const filename = `session-${new Date().toISOString().slice(0, 10)}.${type === 'markdown' ? 'md' : 'txt'}`;
        let content = '';
        if (type === 'markdown') {
            content = generateMarkdown(sessionId, transcripts, answers, translationData);
        } else {
            content = generateText(sessionId, transcripts, answers, translationData);
        }
        downloadFile(filename, content, type);
        setShowExportMenu(false);
    };

    return (
        <div className="session">
            {showSourcePicker && (
                <SourcePicker
                    onSelect={handleSourceSelect}
                    onClose={() => setShowSourcePicker(false)}
                />
            )}

            {/* Session Header */}
            <div className="session__header">
                <div className="session__info">
                    <div className="flex items-center gap-2">
                        <button
                            className={`session__rec-btn ${isCapturing ? 'session__rec-btn--active' : ''}`}
                            onClick={() => (onToggleCapture as any)()} // Toggle default
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
                                style={{
                                    marginLeft: '8px',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    padding: 0,
                                    marginRight: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {isPaused ? '▶' : '⏸'}
                            </button>
                        )}

                        {!isCapturing && (
                            <button
                                className="btn btn--secondary btn--icon-only"
                                onClick={() => setShowSourcePicker(true)}
                                title="Select Audio Source (Screen/Window)"
                                style={{ padding: '8px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                            className={`session__mic-btn ${isMicEnabled ? 'session__mic-btn--on' : ''}`}
                            title={isMicEnabled ? 'Mute Mic' : 'Unmute Mic'}
                            style={{
                                marginLeft: '10px',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: 'none',
                                background: isMicEnabled ? '#10b981' : '#374151',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 600,
                                fontSize: '14px'
                            }}
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
                                onChange={(e) => {
                                    setTargetLang(e.target.value);
                                    setTranslationData({}); // Clear cache on lang change
                                }}
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
                    </div>
                </div>

                <div className="session__tabs">
                    <button
                        className={`session__tab ${activeTab === 'transcript' ? 'session__tab--active' : ''}`}
                        onClick={() => setActiveTab('transcript')}
                    >
                        Transcript
                    </button>
                    <button
                        className={`session__tab ${activeTab === 'qa' ? 'session__tab--active' : ''}`}
                        onClick={() => setActiveTab('qa')}
                    >
                        Q&A ({answers.length})
                    </button>
                    <div style={{ width: '1px', background: '#334155', margin: '8px 4px' }} />
                    <button
                        className="session__tab"
                        onClick={() => setShowGlossary(true)}
                        title="View session glossary"
                    >
                        📚 Glossary
                    </button>
                    <button
                        className="session__tab"
                        onClick={() => setShowGraph(true)}
                        title="View knowledge graph"
                    >
                        🕸️ Graph
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
                            <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', marginTop: '4px' }}>
                                <button
                                    className="px-4 py-2 text-left text-sm hover:bg-slate-700 text-white w-full"
                                    onClick={() => handleExport('markdown')}
                                    style={{ padding: '8px 16px', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', color: 'white', display: 'block', width: '100%' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    Markdown (.md)
                                </button>
                                <button
                                    className="px-4 py-2 text-left text-sm hover:bg-slate-700 text-white w-full border-t border-slate-700"
                                    onClick={() => handleExport('text')}
                                    style={{ padding: '8px 16px', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', color: 'white', display: 'block', width: '100%', borderTop: '1px solid #334155' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    Text (.txt)
                                </button>
                            </div>
                        )}
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={() => {
                        // Automatically trigger summarization in the background
                        fetch(`http://127.0.0.1:3001/sessions/${sessionId}/summarize`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        }).catch(e => console.error("Auto-summarize failed:", e));
                        onLeaveSession();
                    }}>
                        End Session
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="session__content">
                {activeTab === 'transcript' ? (
                    <div className="transcript-feed">
                        {error && (
                            <div className="transcript-feed__error">
                                ⚠️ {error}
                            </div>
                        )}
                        {transcripts.length === 0 ? (
                            <div className="transcript-feed__empty">
                                <p>
                                    {isCapturing
                                        ? 'Listening for speech...'
                                        : 'Click "Start Rec" to begin capturing audio.'}
                                </p>
                                {(() => {
                                    const sourceName = selectedSourceId ? 'Selected Window' : 'Entire Screen';
                                    return (
                                        <p className="transcript-feed__hint">
                                            System audio from <strong>{sourceName}</strong> will be transcribed.
                                        </p>
                                    );
                                })()}
                            </div>
                        ) : (
                            transcripts.map((t, i) => (
                                <div key={i} className="transcript-msg">
                                    <span className="transcript-msg__speaker">
                                        {t.speaker}
                                        {t.language && t.language !== 'en' && (
                                            <span style={{ fontSize: '0.7em', marginLeft: '4px', opacity: 0.7 }}>
                                                [{t.language}]
                                            </span>
                                        )}
                                    </span>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <span className="transcript-msg__text">{t.text}</span>
                                        {isTranslationEnabled && translationData[i] &&
                                            translationData[i].text.replace(/[^\w]/g, '').toLowerCase() !== t.text.replace(/[^\w]/g, '').toLowerCase() && (
                                                <div className="transcript-msg__translation mt-2 text-indigo-300 text-sm italic border-l-2 border-indigo-500 pl-2">
                                                    {translationData[i].text}
                                                    {translationData[i].warning && (
                                                        <div className="text-[10px] text-orange-400 mt-1 not-italic">
                                                            ⚠️ {translationData[i].warning}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                    <span className="transcript-msg__time">
                                        {t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                ) : (
                    <div className="qa-feed">
                        {answers.length === 0 ? (
                            <div className="qa-feed__empty">
                                <p>Ask a question below</p>
                                <p className="qa-feed__hint">
                                    Your questions are private — no one else can see them.
                                </p>
                            </div>
                        ) : (
                            answers.map((a, i) => (
                                <div key={i} className="qa-msg">
                                    {a.question && (
                                        <div className="qa-msg__question">
                                            <span className="qa-msg__label">You</span>
                                            <p>{a.question}</p>
                                        </div>
                                    )}
                                    {a.text && (
                                        <div className="qa-msg__answer">
                                            <span className="qa-msg__label">AI Mentor</span>
                                            <div className="markdown-body">
                                                <ReactMarkdown>{a.text}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                    {!a.text && (
                                        <div className="qa-msg__answer qa-msg__answer--loading">
                                            <span className="qa-msg__label">AI Mentor</span>
                                            <div className="typing-indicator">
                                                <span /><span /><span />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        <div ref={qaEndRef} />
                    </div>
                )}
            </div>

            {/* AI Input Status Overlay */}
            {(isPttListening || pttTranscript || pttError) && (
                <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none z-10 px-4 transition-opacity duration-200">
                    <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-4 flex flex-col gap-3 max-w-2xl w-full pointer-events-auto mt-2">
                        {/* Voice Dictation Preview */}
                        <div className="flex items-center gap-3 bg-indigo-900/40 p-3 rounded-lg border border-indigo-500/50">
                            {pttError ? (
                                <div className="text-red-400 text-sm font-medium">⚠️ {pttError}</div>
                            ) : (
                                <>
                                    <div className="flex gap-1 animate-pulse">
                                        <div className="w-2 h-4 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-6 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-4 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <div className="text-indigo-200 text-sm font-medium">
                                        {pttTranscript ? pttTranscript : "Listening... (Hold Space)"}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Input Bar */}
            <form className="session__input relative z-20" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="session__input-field"
                    placeholder="Ask a question privately…"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit" className="btn btn--primary btn--sm" disabled={!inputText.trim()}>
                    Send
                </button>
            </form>

            {/* Modals */}
            <Modal
                isOpen={showGlossary}
                onClose={() => setShowGlossary(false)}
                title="📚 Session Glossary"
                size="large"
            >
                <GlossaryView sessionId={sessionId} />
            </Modal>

            <Modal
                isOpen={showGraph}
                onClose={() => setShowGraph(false)}
                title="🕸️ Knowledge Graph"
                size="large"
            >
                <KnowledgeGraphView sessionId={sessionId} />
            </Modal>
        </div>
    );
}
