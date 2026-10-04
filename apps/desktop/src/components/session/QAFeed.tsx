import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { AnswerEntry } from '../../hooks/useSocket';

interface QAFeedProps {
    answers: AnswerEntry[];
    endRef: React.RefObject<HTMLDivElement>;
}

export function QAFeed({ answers, endRef }: QAFeedProps) {
    return (
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
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
            <div ref={endRef} />
        </div>
    );
}
