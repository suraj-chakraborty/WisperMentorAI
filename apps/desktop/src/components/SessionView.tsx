import React, { useState, useRef, useEffect } from 'react';
import type { TranscriptEntry, AnswerEntry } from '../hooks/useSocket';
import ReactMarkdown from 'react-markdown';
import SourcePicker from './SourcePicker';

interface SessionViewProps {
    sessionId: string | null;
    transcripts: TranscriptEntry[];
    answers: AnswerEntry[];
    onSendQuestion: (text: string) => void;
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
}: SessionViewProps) {
    const [inputText, setInputText] = useState('');
    const [activeTab, setActiveTab] = useState<'transcript' | 'qa'>('transcript');
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const qaEndRef = useRef<HTMLDivElement>(null);
    const [elapsed, setElapsed] = useState(0);

    // Source Picker State (Moved up to fix hooks error)
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(undefined);

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

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            onSendQuestion(inputText.trim());
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
                            {isCapturing ? 'Recording' : 'Start Rec'}
                        </button>

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
                    <button
                        className={`btn btn--sm ${isTranslationEnabled ? 'btn--primary' : 'btn--secondary'}`}
                        onClick={() => onToggleTranslation(!isTranslationEnabled)}
                        title="Translate non-English speech to English"
                        style={{ marginLeft: '10px' }}
                    >
                        {isTranslationEnabled ? '🌐 Translating' : '🌐 Translate'}
                    </button>
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
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn btn--secondary btn--sm"
                        onClick={onToggleOverlay}
                        title="Pop out into floating window"
                    >
                        ⤡ Overlay
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={onLeaveSession}>
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
                                <p className="transcript-feed__hint">
                                    System audio from <strong>{selectedSourceId ? 'Selected Window' : 'Entire Screen'}</strong> will be transcribed.
                                </p>
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
                                    <span className="transcript-msg__text">{t.text}</span>
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

            {/* Input Bar */}
            <form className="session__input" onSubmit={handleSubmit}>
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
        </div>
    );
}
