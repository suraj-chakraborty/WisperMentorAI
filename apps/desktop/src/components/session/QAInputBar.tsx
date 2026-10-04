import React from 'react';

interface QAInputBarProps {
    inputText: string;
    setInputText: (text: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    isPttListening: boolean;
    pttTranscript: string;
    pttError: string | null;
}

export function QAInputBar({
    inputText,
    setInputText,
    onSubmit,
    isPttListening,
    pttTranscript,
    pttError,
}: QAInputBarProps) {
    return (
        <>
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
                                        <div
                                            className="w-2 h-4 bg-indigo-400 rounded-full animate-bounce"
                                            style={{ animationDelay: '0ms' }}
                                        />
                                        <div
                                            className="w-2 h-6 bg-indigo-400 rounded-full animate-bounce"
                                            style={{ animationDelay: '150ms' }}
                                        />
                                        <div
                                            className="w-2 h-4 bg-indigo-400 rounded-full animate-bounce"
                                            style={{ animationDelay: '300ms' }}
                                        />
                                    </div>
                                    <div className="text-indigo-200 text-sm font-medium">
                                        {pttTranscript ? pttTranscript : 'Listening... (Hold Space)'}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Input Bar */}
            <form className="session__input relative z-20" onSubmit={onSubmit}>
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
        </>
    );
}
