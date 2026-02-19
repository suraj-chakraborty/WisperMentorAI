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
    joinSession: (sessionId: string) => void;
    leaveSession: () => void;
    sendQuestion: (text: string) => void;
    sendAudioChunk: (chunk: ArrayBuffer) => void;
    startNewSession: () => void;
}

const BACKEND_URL = 'http://localhost:3001';

export function useSocket(): UseSocketReturn {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState('disconnected');
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [answers, setAnswers] = useState<AnswerEntry[]>([]);

    useEffect(() => {
        const socket = io(BACKEND_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            setSessionStatus('connected');
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            setSessionStatus('disconnected');
        });

        socket.on('connect_error', () => {
            setIsConnected(false);
            setSessionStatus('error');
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
                const idx = prev.findIndex(a => a.questionId === data.questionId) || prev.length - 1;
                // If questionId matches, update. If not found, append (should trigger unexpected behavior but safer).
                // Actually, the `sendQuestion` adds an entry with `questionId`.
                // But the ID generated in `useSocket` (q_123) might differ from backend unless backend echoes it?
                // Backend generates NEW ID: `q_${Date.now()}`.
                // Wait, EventsGateway (Step 2429 line 117): `questionId: q_${Date.now()}`.
                // It does NOT use the client's ID.
                // This breaks the mapping!

                // FIX: modifying `state` to just append is fine if we assume single stream.
                // But `setAnswers` update logic in Step 2452 was:
                // `setAnswers(prev => [...prev, { ...data }])`.
                // It ADDS a new entry.
                // But `sendQuestion` ALREADY added an entry with text=''.
                // So we have TWO entries: one Loading, one Done.
                // The Loading one stays Loading forever!

                // I need to MATCH the response to the request.
                // But Backend generates a NEW ID.
                // Backend should ECHO the client-provided ID or Client should wait for ID?
                // `sendQuestion` (Step 2452) generates `questionId`.
                // It sends `text`. It does NOT send `questionId`.

                // I MUST update Backend to accept `questionId` or Frontend to handle this.
                // Simplest: Just replace the last "Loading" entry?

                // Let's rewrite this logic.
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
    }, []);

    const leaveSession = useCallback(() => {
        if (sessionId) {
            socketRef.current?.emit('session:leave', { sessionId });
            setSessionId(null);
            setTranscripts([]);
            setAnswers([]);
            setSessionStatus('connected');
        }
    }, [sessionId]);

    const sendQuestion = useCallback(
        (text: string) => {
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
            });
        },
        [sessionId],
    );

    const startNewSession = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:3001/sessions', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                joinSession(data.id);
            } else {
                console.error("Failed to create session");
            }
        } catch (e) {
            console.error("Error creating session", e);
            // Fallback (e.g. offline)
            const newId = `session_${Date.now()}`;
            joinSession(newId);
        }
    }, [joinSession]);

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

    return {
        isConnected,
        sessionId,
        sessionStatus,
        transcripts,
        answers,
        joinSession,
        leaveSession,
        sendQuestion,
        sendAudioChunk,
        startNewSession,
    };
}
