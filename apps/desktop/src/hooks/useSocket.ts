import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface TranscriptEntry {
    id: string;
    speaker: string;
    text: string;
    timestamp: Date;
    language?: string;
}

export interface AnswerEntry {
    questionId: string;
    question: string;
    text: string;
    confidence: number;
    timestamp: Date;
}

interface UseSocketReturn {
    isConnected: boolean;
    sessionId: string | null;
    sessionStatus: string;
    transcripts: TranscriptEntry[];
    answers: AnswerEntry[];
    serverError: string | null;
    joinSession: (sessionId: string) => void;
    leaveSession: () => void;
    sendQuestion: (text: string, language?: string) => void;
    sendAudioChunk: (chunk: ArrayBuffer) => void;
    startNewSession: () => void;
    toggleTranslation: (enabled: boolean) => void;
}

export function useSocket(token: string): UseSocketReturn {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState<string>('idle');
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [answers, setAnswers] = useState<AnswerEntry[]>([]);
    const [serverError, setServerError] = useState<string | null>(null);

    useEffect(() => {
        // Connect to Backend
        const socket = io('http://127.0.0.1:3001', {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            setSessionStatus('connected');
            setServerError(null);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            setSessionStatus('disconnected');
        });

        socket.on('connect_error', () => {
            setIsConnected(false);
            setSessionStatus('error');
        });

        socket.on('session:warning', (data: { message: string }) => {
            setServerError(data.message);
        });

        socket.on('session:warning:clear', () => {
            setServerError(null);
        });

        socket.on('session:status', (data: { status: string; sessionId?: string; message?: string }) => {
            setSessionStatus(data.status);
            if (data.sessionId) {
                setSessionId(data.sessionId);
            }
        });

        socket.on('transcript:update', (data: { id: string; speaker: string; text: string; language?: string }) => {
            setTranscripts((prev) => [
                ...prev,
                {
                    ...data,
                    timestamp: new Date(),
                },
            ]);
        });

        socket.on('session:history', (data: { sessionId: string; transcripts: any[] }) => {
            console.log("Received history:", data.transcripts.length);
            setTranscripts(data.transcripts.map(t => ({
                id: t.id,
                speaker: t.speaker,
                text: t.text,
                language: t.language,
                timestamp: new Date(t.timestamp),
            })));
        });

        socket.on('answer:response', (data: { questionId: string; text: string; confidence: number }) => {
            setAnswers((prev) => {
                const newAnswers = [...prev];
                const lastIdx = newAnswers.length - 1;
                if (lastIdx >= 0 && !newAnswers[lastIdx].text) {
                    newAnswers[lastIdx] = { ...newAnswers[lastIdx], text: data.text, confidence: data.confidence };
                } else {
                    newAnswers.push({ ...data, question: '', timestamp: new Date(), questionId: data.questionId });
                }
                return newAnswers;
            });
        });

        socket.on('answer:error', (data: { message: string }) => {
            setAnswers((prev) => {
                const newAnswers = [...prev];
                const lastIdx = newAnswers.length - 1;
                if (lastIdx >= 0 && !newAnswers[lastIdx].text) {
                    newAnswers[lastIdx] = { ...newAnswers[lastIdx], text: `❌ ${data.message}` };
                }
                return newAnswers;
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const joinSession = useCallback((id: string) => {
        socketRef.current?.emit('session:join', { sessionId: id });
        setSessionId(id);
        setServerError(null);
    }, []);

    const leaveSession = useCallback(() => {
        if (sessionId) {
            socketRef.current?.emit('session:leave', { sessionId });
            setSessionId(null);
            setTranscripts([]);
            setAnswers([]);
            setSessionStatus('connected');
            setServerError(null);
        }
    }, [sessionId]);

    const sendQuestion = useCallback(
        (text: string, language?: string) => {
            if (!sessionId || !text.trim()) return;
            const questionId = `q_${Date.now()}`;

            // Add question to answers list immediately
            setAnswers((prev) => [
                ...prev,
                {
                    questionId,
                    question: text,
                    text: '',
                    confidence: 0,
                    timestamp: new Date(),
                },
            ]);

            socketRef.current?.emit('question:ask', {
                sessionId,
                text,
                language,
            });
        },
        [sessionId],
    );

    const startNewSession = useCallback(async () => {
        try {
            const res = await fetch('http://127.0.0.1:3001/sessions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                joinSession(data.id);
            } else {
                console.error("Failed to create session:", await res.text());
            }
        } catch (e) {
            console.error("Error creating session", e);
            // Fallback (e.g. offline)
            const newId = `session_${Date.now()}`;
            joinSession(newId);
        }
    }, [joinSession, token]);

    const sendAudioChunk = useCallback(
        (chunk: ArrayBuffer) => {
            if (!sessionId) return;
            socketRef.current?.emit('audio:chunk', {
                sessionId,
                chunk,
                timestamp: Date.now(),
            });
        },
        [sessionId],
    );

    const toggleTranslation = useCallback((enabled: boolean) => {
        if (!sessionId) return;
        socketRef.current?.emit('session:config', { sessionId, translate: enabled });
    }, [sessionId]);

    return {
        isConnected,
        sessionId,
        sessionStatus,
        transcripts,
        answers,
        serverError,
        joinSession,
        leaveSession,
        sendQuestion,
        sendAudioChunk,
        startNewSession,
        toggleTranslation,
    };
}
