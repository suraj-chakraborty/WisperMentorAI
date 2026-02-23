import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { loadTranscripts, saveTranscripts, appendTranscript } from './useTranscriptCache';

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
    startMeetingSession: (meetingTitle: string) => void;
    toggleTranslation: (enabled: boolean) => void;
}

export function useSocket(token: string): UseSocketReturn {
    const socketRef = useRef<Socket | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState<string>('idle');
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const transcriptsRef = useRef<TranscriptEntry[]>([]);
    // Keep ref in sync with state so leaveSession (memoized) can read the latest
    useEffect(() => { transcriptsRef.current = transcripts; }, [transcripts]);
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
            const entry: TranscriptEntry = { ...data, timestamp: new Date() };
            setTranscripts((prev) => {
                const next = [...prev, entry];
                return next;
            });
            // Persist to localStorage (uses sessionId from closure via ref)
            if (sessionIdRef.current) {
                appendTranscript(sessionIdRef.current, entry);
            }
        });

        socket.on('session:history', (data: { sessionId: string; transcripts: any[] }) => {
            console.log("Received history:", data.transcripts.length);
            const mapped = data.transcripts.map(t => ({
                id: t.id,
                speaker: t.speaker,
                text: t.text,
                language: t.language,
                timestamp: new Date(t.timestamp),
            }));
            setTranscripts(mapped);
            // Update localStorage cache with authoritative backend data
            saveTranscripts(data.sessionId, mapped);
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
        // Immediately load cached transcripts for instant display
        const cached = loadTranscripts(id);
        if (cached && cached.length > 0) {
            console.log(`⚡ Loaded ${cached.length} cached transcripts for session ${id}`);
            setTranscripts(cached);
        }
        sessionIdRef.current = id;
        socketRef.current?.emit('session:join', { sessionId: id });
        setSessionId(id);
        setServerError(null);
    }, []);

    const leaveSession = useCallback(() => {
        if (sessionId) {
            // Save final transcript state to localStorage before clearing
            const currentTranscripts = transcriptsRef.current;
            if (currentTranscripts.length > 0) {
                saveTranscripts(sessionId, currentTranscripts);
            }
            socketRef.current?.emit('session:leave', { sessionId });
            setSessionId(null);
            sessionIdRef.current = null;
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

    const startMeetingSession = useCallback(async (meetingTitle: string) => {
        try {
            const res = await fetch('http://127.0.0.1:3001/sessions/meeting', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ meetingTitle })
            });
            if (res.ok) {
                const data = await res.json();
                joinSession(data.id);
            } else {
                console.error('Failed to create meeting session:', await res.text());
                // Fallback to normal session
                startNewSession();
            }
        } catch (e) {
            console.error('Error creating meeting session', e);
            startNewSession();
        }
    }, [joinSession, token, startNewSession]);

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
        startMeetingSession,
        toggleTranslation,
    };
}
