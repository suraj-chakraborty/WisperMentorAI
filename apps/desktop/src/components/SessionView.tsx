import React, { useState, useRef, useEffect } from 'react';
import type { TranscriptEntry, AnswerEntry } from '../hooks/useSocket';

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
}: SessionViewProps) {
    const [inputText, setInputText] = useState('');
    const [activeTab, setActiveTab] = useState<'transcript' | 'qa'>('transcript');
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const qaEndRef = useRef<HTMLDivElement>(null);
    const [elapsed, setElapsed] = useState(0);

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

    return (
        <div className="session">
            {/* Session Header */}
            <div className="session__header">
                <div className="session__info">
                    <button
                        className={`session__rec-btn ${isCapturing ? 'session__rec-btn--active' : ''}`}
                        onClick={onToggleCapture}
                        title={isCapturing ? 'Stop Recording' : 'Start Recording'}
                    >
                        <span className="session__rec-dot" />
                        {isCapturing ? 'Recording' : 'Start Rec'}
                    </button>
                    {isCapturing && (
                        <div className="session__level-meter">
                            <div
                                className="session__level-bar"
                                style={{ width: `${audioLevel}%` }}
                            />
                        </div>
                    )}
                    <span className="session__timer">{formatTime(elapsed)}</span>
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
                <button className="btn btn--ghost btn--sm" onClick={onLeaveSession}>
                    End Session
                </button>
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
                                    System audio will be transcribed here in real-time.
                                </p>
                            </div>
                        ) : (
                            transcripts.map((t, i) => (
                                <div key={i} className="transcript-msg">
                                    <span className="transcript-msg__speaker">{t.speaker}</span>
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
                                            <p>{a.text}</p>
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
