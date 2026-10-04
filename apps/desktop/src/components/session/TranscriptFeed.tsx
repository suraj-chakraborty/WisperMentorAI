import React from 'react';
import type { TranscriptEntry } from '../../hooks/useSocket';
import { TypewriterText } from '../TypewriterText';

interface TranscriptFeedProps {
    transcripts: TranscriptEntry[];
    translationData: Record<number, { text: string; warning?: string }>;
    isTranslationEnabled: boolean;
    isCapturing: boolean;
    selectedSourceId?: string;
    error: string | null;
    mountedTranscriptCount: number;
    endRef: React.RefObject<HTMLDivElement>;
}

export function TranscriptFeed({
    transcripts,
    translationData,
    isTranslationEnabled,
    isCapturing,
    selectedSourceId,
    error,
    mountedTranscriptCount,
    endRef,
}: TranscriptFeedProps) {
    const sourceName = selectedSourceId ? 'Selected Window' : 'Entire Screen';

    return (
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
                        System audio from <strong>{sourceName}</strong> will be transcribed.
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
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {i >= mountedTranscriptCount ? (
                                <TypewriterText className="transcript-msg__text" text={t.text} speed={10} />
                            ) : (
                                <span className="transcript-msg__text">{t.text}</span>
                            )}
                            {isTranslationEnabled &&
                                translationData[i] &&
                                translationData[i].text.replace(/[^\w]/g, '').toLowerCase() !==
                                    t.text.replace(/[^\w]/g, '').toLowerCase() && (
                                    <div className="transcript-msg__translation mt-2 text-indigo-300 text-sm italic border-l-2 border-indigo-500 pl-2">
                                        {i >= mountedTranscriptCount ? (
                                            <TypewriterText text={translationData[i].text} speed={10} />
                                        ) : (
                                            translationData[i].text
                                        )}
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
            <div ref={endRef} />
        </div>
    );
}
