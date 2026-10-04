import React, { useState, useRef, useEffect } from 'react';
import type { TranscriptEntry, AnswerEntry } from '../hooks/useSocket';
import { usePushToTalk } from '../hooks/usePushToTalk';
import { ttsService } from '../utils/TextToSpeechService';
import { generateMarkdown, generateText, downloadFile } from '../utils/exportUtils';
import { apiEndpoint } from '../config/api';
import {
    SessionHeader,
    TranscriptFeed,
    QAFeed,
    QAInputBar,
    SessionModals,
} from './session';

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

    // Source Picker & Modal states
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(undefined);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [isEndingSession, setIsEndingSession] = useState(false);

    // Translation State
    const [translationData, setTranslationData] = useState<Record<number, { text: string; warning?: string }>>({});
    const [targetLang, setTargetLang] = useState('es');
    const translatingRef = useRef<Set<number>>(new Set());

    // Mounted transcript count to skip animation for historical transcripts
    const mountedTranscriptCountRef = useRef<number | null>(null);
    useEffect(() => {
        if (mountedTranscriptCountRef.current === null && transcripts.length > 0) {
            mountedTranscriptCountRef.current = transcripts.length;
        }
    }, [transcripts]);
    useEffect(() => {
        if (mountedTranscriptCountRef.current === null) {
            mountedTranscriptCountRef.current = 0;
        }
    }, []);

    // Auto-scroll effects
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

    // Clear translation cache when target language changes
    const prevLangRef = useRef(targetLang);
    useEffect(() => {
        if (prevLangRef.current !== targetLang) {
            prevLangRef.current = targetLang;
            setTranslationData({});
            translatingRef.current.clear();
        }
    }, [targetLang]);

    // Batch translation effect (BTN-2)
    useEffect(() => {
        if (!isTranslationEnabled || !sessionId) {
            if (!isTranslationEnabled) {
                setTranslationData({});
                translatingRef.current.clear();
            }
            return;
        }

        const translateNew = async () => {
            if (!token) return;

            const toTranslate = transcripts
                .map((t, i) => ({ t, i }))
                .filter(({ t, i }) => !translationData[i] && !translatingRef.current.has(i) && t.text.trim());

            if (toTranslate.length === 0) return;

            toTranslate.forEach(({ i }) => translatingRef.current.add(i));

            try {
                if (toTranslate.length === 1) {
                    const { t, i } = toTranslate[0];
                    const response = await fetch(apiEndpoint('/translation/translate'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({ text: t.text, targetLang }),
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setTranslationData(prev => ({
                            ...prev,
                            [i]: { text: data.translation, warning: data.warning },
                        }));
                    }
                } else {
                    const response = await fetch(apiEndpoint('/translation/batch-translate'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            texts: toTranslate.map(({ t }) => t.text),
                            targetLang,
                        }),
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (Array.isArray(data.translations)) {
                            setTranslationData(prev => {
                                const updated = { ...prev };
                                data.translations.forEach((item: any, idx: number) => {
                                    const origIdx = toTranslate[idx]?.i;
                                    if (origIdx !== undefined) {
                                        updated[origIdx] = {
                                            text: item.translation,
                                            warning: item.warning,
                                        };
                                    }
                                });
                                return updated;
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Translation error:', error);
            } finally {
                toTranslate.forEach(({ i }) => translatingRef.current.delete(i));
            }
        };

        translateNew();
    }, [transcripts, isTranslationEnabled, targetLang, sessionId, token]);

    // Fetch User Settings for Default Language
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch(apiEndpoint('/settings'), {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.lingo?.preferredLanguage) {
                        setTargetLang(data.lingo.preferredLanguage);
                    }
                }
            } catch (e) {
                console.error('Failed to load settings in SessionView', e);
            }
        };
        loadSettings();
    }, [token]);

    // TTS Effect: Trigger speech when a new complete answer arrives
    const lastSpokenIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (answers.length > 0) {
            const latestAnswer = answers[answers.length - 1];
            if (latestAnswer.text && latestAnswer.questionId !== lastSpokenIdRef.current) {
                if (!latestAnswer.text.includes('❌') && voiceEnabled) {
                    console.log(`🔊 SessionView: Triggering TTS for answer ${latestAnswer.questionId} in ${targetLang}`);
                    ttsService.speak(latestAnswer.text, targetLang);
                }
                lastSpokenIdRef.current = latestAnswer.questionId;
            }
        }
    }, [answers, targetLang, voiceEnabled]);

    // Push-to-Talk (Web Speech Dictation)
    const { isListening: isPttListening, transcript: pttTranscript, error: pttError } = usePushToTalk({
        onComplete: (text) => {
            const lang = isTranslationEnabled ? targetLang : undefined;
            onSendQuestion(text, lang);
        },
        activationKey: 'Space',
    });

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            const lang = isTranslationEnabled ? targetLang : undefined;
            onSendQuestion(inputText.trim(), lang);
            setInputText('');
        }
    };

    const handleConfirmEndSession = async () => {
        setIsEndingSession(true);
        try {
            if (isCapturing) {
                (onToggleCapture as any)();
            }
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            try {
                await fetch(apiEndpoint(`/sessions/${sessionId}/summarize`), {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal,
                });
            } catch (e) {
                console.warn('Auto-summarize completed or timed out:', e);
            } finally {
                clearTimeout(timeoutId);
            }
        } finally {
            setIsEndingSession(false);
            setShowEndConfirm(false);
            onLeaveSession();
        }
    };

    const handleSourceSelect = (id: string) => {
        setSelectedSourceId(id);
        setShowSourcePicker(false);
        (onToggleCapture as any)(id);
    };

    const handleExport = (type: 'markdown' | 'text') => {
        if (!sessionId) return;
        const filename = `session-${new Date().toISOString().slice(0, 10)}.${type === 'markdown' ? 'md' : 'txt'}`;
        const content = type === 'markdown'
            ? generateMarkdown(sessionId, transcripts, answers, translationData)
            : generateText(sessionId, transcripts, answers, translationData);
        downloadFile(filename, content, type);
        setShowExportMenu(false);
    };

    // No active session fallback
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
            <SessionModals
                showSourcePicker={showSourcePicker}
                onSelectSource={handleSourceSelect}
                onCloseSourcePicker={() => setShowSourcePicker(false)}
                showEndConfirm={showEndConfirm}
                onCloseEndConfirm={() => setShowEndConfirm(false)}
                onConfirmEndSession={handleConfirmEndSession}
                isEndingSession={isEndingSession}
            />

            <SessionHeader
                isCapturing={isCapturing}
                isPaused={isPaused}
                audioLevel={audioLevel}
                elapsed={elapsed}
                formatTime={formatTime}
                onToggleCapture={() => (onToggleCapture as any)()}
                togglePause={togglePause}
                onOpenSourcePicker={() => setShowSourcePicker(true)}
                isMicEnabled={isMicEnabled}
                toggleMic={toggleMic}
                isTranslationEnabled={isTranslationEnabled}
                targetLang={targetLang}
                onSelectTargetLang={(lang) => {
                    setTargetLang(lang);
                    setTranslationData({});
                }}
                onToggleTranslation={onToggleTranslation}
                voiceEnabled={voiceEnabled}
                onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                answersCount={answers.length}
                onToggleOverlay={onToggleOverlay}
                showExportMenu={showExportMenu}
                setShowExportMenu={setShowExportMenu}
                onExport={handleExport}
                onOpenEndConfirm={() => setShowEndConfirm(true)}
                isEndingSession={isEndingSession}
            />

            <div className="session__content">
                {activeTab === 'transcript' ? (
                    <TranscriptFeed
                        transcripts={transcripts}
                        translationData={translationData}
                        isTranslationEnabled={isTranslationEnabled}
                        isCapturing={isCapturing}
                        selectedSourceId={selectedSourceId}
                        error={error}
                        mountedTranscriptCount={mountedTranscriptCountRef.current ?? transcripts.length}
                        endRef={transcriptEndRef}
                    />
                ) : (
                    <QAFeed
                        answers={answers}
                        endRef={qaEndRef}
                    />
                )}
            </div>

            <QAInputBar
                inputText={inputText}
                setInputText={setInputText}
                onSubmit={handleSubmit}
                isPttListening={isPttListening}
                pttTranscript={pttTranscript}
                pttError={pttError}
            />
        </div>
    );
}
