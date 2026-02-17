import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface TranscriptEntry {
    id: string;
    speaker: string;
    text: string;
    timestamp: Date;
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

        socket.on('transcript:update', (data: { id: string; speaker: string; text: string }) => {
            setTranscripts((prev) => [
                ...prev,
                {
                    ...data,
                    timestamp: new Date(),
                },
            ]);
        });

        socket.on('answer:response', (data: { questionId: string; text: string; confidence: number }) => {
            setAnswers((prev) => [
                ...prev,
                {
                    ...data,
                    question: '',
                    timestamp: new Date(),
                },
            ]);
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

    const startNewSession = useCallback(() => {
        const newId = `session_${Date.now()}`;
        joinSession(newId);
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
