import React, { useState, useRef, useEffect } from 'react';
import type { TranscriptEntry, AnswerEntry } from '../hooks/useSocket';

interface OverlayViewProps {
    transcripts: TranscriptEntry[];
    answers: AnswerEntry[];
    onSendQuestion: (text: string) => void;
    onToggleOverlay: () => void;
}

export function OverlayView({ transcripts, answers, onSendQuestion, onToggleOverlay }: OverlayViewProps) {
    const [inputText, setInputText] = useState('');
    const feedEndRef = useRef<HTMLDivElement>(null);

    const recentTranscripts = transcripts.slice(-5);
    const recentAnswers = answers.slice(-3);

    useEffect(() => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts, answers]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            onSendQuestion(inputText.trim());
            setInputText('');
        }
    };

    return (
        <div className="overlay">
            {/* Drag handle + controls */}
            <div className="overlay__header" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
                <span className="overlay__title">WhisperMentor</span>
                <button
                    className="overlay__expand-btn"
                    onClick={onToggleOverlay}
                    title="Exit overlay"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    ⤢
                </button>
            </div>

            {/* Live Feed */}
            <div className="overlay__feed">
                {recentTranscripts.length === 0 && recentAnswers.length === 0 ? (
                    <div className="overlay__empty">
                        <p>Listening…</p>
                    </div>
                ) : (
                    <>
                        {recentTranscripts.map((t, i) => (
                            <div key={`t-${i}`} className="overlay__line overlay__line--transcript">
                                <strong>{t.speaker}:</strong> {t.text}
                            </div>
                        ))}
                        {recentAnswers.map((a, i) => (
                            <div key={`a-${i}`} className="overlay__line overlay__line--answer">
                                {a.question && <div className="overlay__q">Q: {a.question}</div>}
                                {a.text && <div className="overlay__a">A: {a.text}</div>}
                            </div>
                        ))}
                    </>
                )}
                <div ref={feedEndRef} />
            </div>

            {/* Quick Input */}
            <form className="overlay__input" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="overlay__input-field"
                    placeholder="Ask…"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit" className="overlay__send" disabled={!inputText.trim()}>
                    →
                </button>
            </form>
        </div>
    );
}
