import React, { useState, useRef, useEffect } from 'react';
import { TranscriptEntry, AnswerEntry } from '../hooks/useSocket';
import { usePushToTalk } from '../hooks/usePushToTalk';

interface OverlayViewProps {
    transcripts: TranscriptEntry[];
    answers: AnswerEntry[];
    onSendQuestion: (text: string) => void;
    onToggleOverlay: () => void;
    audioLevel: number;
}

export function OverlayView({ transcripts, answers, onSendQuestion, onToggleOverlay, audioLevel }: OverlayViewProps) {
    const [viewMode, setViewMode] = useState<'mini' | 'transcript' | 'qa'>('mini');
    const [inputText, setInputText] = useState('');
    const feedEndRef = useRef<HTMLDivElement>(null);
    const siriVideoRef = useRef<HTMLVideoElement>(null);
    const waveVideoRef = useRef<HTMLVideoElement>(null);

    // Push-to-Talk for voice questions
    const { isListening: isPttListening, transcript: pttTranscript, error: pttError } = usePushToTalk({
        onComplete: (text) => {
            onSendQuestion(text);
            // Auto-switch to Q&A view to show the answer
            if (viewMode !== 'qa') setViewMode('qa');
        },
        activationKey: 'Space'
    });

    // Auto-scroll
    useEffect(() => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts, answers, viewMode]);

    // Video Playback Control
    useEffect(() => {
        const isSpeaking = audioLevel > 5;

        // Control base orb animation
        if (siriVideoRef.current) {
            if (isSpeaking) {
                siriVideoRef.current.play().catch(() => { });
            } else {
                siriVideoRef.current.pause();
            }
        }

        // Control wave animation
        if (waveVideoRef.current) {
            if (isSpeaking) {
                waveVideoRef.current.play().catch(() => { });
            } else {
                waveVideoRef.current.pause();
                waveVideoRef.current.currentTime = 0; // Reset wave to start for clean entry
            }
        }
    }, [audioLevel, viewMode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            onSendQuestion(inputText.trim());
            setInputText('');
        }
    };

    const lastTranscript = transcripts.length > 0 ? transcripts[transcripts.length - 1] : null;

    // Siri Orb Scale based on audioLevel (0-100)
    // Map 0-100 to 1.0 - 1.5
    const scale = 1 + (audioLevel / 200);

    // ── Mini Mode (Siri Animation) ──
    if (viewMode === 'mini') {
        return (
            <div className="overlay overlay--mini">
                <div className="overlay__header-mini" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
                    <button className="overlay__close" onClick={onToggleOverlay} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>×</button>
                </div>

                {/* 2-Line Preview */}
                <div className="overlay__preview">
                    {lastTranscript ? (
                        <>
                            <div className="overlay__preview-speaker">
                                {lastTranscript.speaker === 'You' ? 'You' : 'Mentor'}
                            </div>
                            <div className="overlay__preview-text">
                                {lastTranscript.text.slice(-80)}
                            </div>
                        </>
                    ) : (
                        <div className="overlay__preview-text" style={{ opacity: 0.5 }}>Listening...</div>
                    )}
                </div>

                {/* Video Animation Container */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
                    {/* Base Siri Orb (Always Looping) */}
                    <video
                        ref={siriVideoRef}
                        src="siri-orb.webm"
                        loop
                        muted
                        playsInline
                        style={{
                            position: 'absolute',
                            width: '40vh',
                            height: '40vh',
                            minWidth: '200px',
                            minHeight: '200px',
                            objectFit: 'contain',
                            opacity: 0.9,
                            pointerEvents: 'none',
                            zIndex: 1
                        }}
                    />

                    {/* Voice Wave (Full Width) */}
                    <video
                        ref={waveVideoRef}
                        src="voice-wave.webm"
                        loop
                        muted
                        playsInline
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            mixBlendMode: 'screen',
                            pointerEvents: 'none',
                            opacity: audioLevel > 5 ? 1 : 0,
                            transition: 'opacity 0.2s ease',
                            zIndex: 2
                        }}
                    />
                </div>

                {/* Controls */}
                <div className="overlay__controls">
                    <button
                        className="overlay__btn"
                        onClick={() => setViewMode('transcript')}
                        title="View Transcript"
                    >
                        <span className="overlay__btn-icon">📝</span>
                        <span>Transcript</span>
                    </button>
                    <button
                        className="overlay__btn"
                        onClick={() => setViewMode('qa')}
                        title="Ask Question"
                    >
                        <span className="overlay__btn-icon">💬</span>
                        <span>Q&A</span>
                    </button>
                </div>
            </div>
        );
    }

    // ── Transcript Mode ──
    if (viewMode === 'transcript') {
        return (
            <div className="overlay">
                <div className="overlay__header" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            className="overlay__icon-btn"
                            onClick={() => setViewMode('mini')}
                            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                        >
                            ←
                        </button>
                        <span className="overlay__title">Transcript</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="overlay__icon-btn"
                            onClick={onToggleOverlay}
                            title="Expand to Main Window"
                            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                        >
                            ⤢
                        </button>
                    </div>
                </div>
                <div className="overlay__feed">
                    {transcripts.length === 0 && (
                        <div className="overlay__empty">
                            No transcript yet. Start speaking to see text appear here.
                        </div>
                    )}
                    {transcripts.map((t, i) => (
                        <div key={`t-${i}`} className="overlay__line">
                            <span className={`overlay__speaker ${t.speaker === 'You' ? 'overlay__speaker--you' : 'overlay__speaker--ai'}`}>
                                {t.speaker}:
                            </span>
                            <span className="overlay__text">{t.text}</span>
                        </div>
                    ))}
                    <div ref={feedEndRef} />
                </div>
            </div>
        );
    }

    // ── Q&A Mode ──
    return (
        <div className="overlay">
            <div className="overlay__header" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        className="overlay__icon-btn"
                        onClick={() => setViewMode('mini')}
                        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    >
                        ←
                    </button>
                    <span className="overlay__title">Q&A</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="overlay__icon-btn"
                        onClick={onToggleOverlay}
                        title="Expand to Main Window"
                        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    >
                        ⤢
                    </button>
                </div>
            </div>
            <div className="overlay__feed">
                {answers.length === 0 && (
                    <div className="overlay__empty">
                        Hold <strong>Spacebar</strong> to ask by voice,<br />or type below.
                    </div>
                )}
                {answers.map((a, i) => (
                    <div key={`q-${i}`} className="overlay__qa-item">
                        <div className="overlay__q">Q: {a.question}</div>
                        <div className="overlay__a">A: {a.text}</div>
                    </div>
                ))}
                <div ref={feedEndRef} />
            </div>
            {/* PTT Indicator */}
            {isPttListening && (
                <div className="overlay__ptt-bar">
                    <span className="overlay__ptt-dot" />
                    <span>{pttTranscript || 'Listening… release Spacebar to send'}</span>
                </div>
            )}
            {pttError && (
                <div className="overlay__ptt-bar overlay__ptt-bar--error">
                    <span>⚠ {pttError}</span>
                </div>
            )}
            <form className="overlay__input" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="overlay__input-field"
                    placeholder={isPttListening ? '🎤 Listening...' : 'Ask Mentor… (or hold Spacebar)'}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    autoFocus
                />
                <button type="submit" className="overlay__send" disabled={!inputText.trim()}>
                    →
                </button>
            </form>
        </div>
    );
}
