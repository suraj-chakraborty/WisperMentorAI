import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePushToTalkProps {
    onComplete: (text: string) => void;
    activationKey?: string; // e.g. "ControlLeft", "Space"
}

/**
 * Push-to-talk hook that records audio via MediaRecorder
 * and sends it to the local Whisper AI service for transcription.
 * This avoids the Chrome Web Speech API which doesn't work in Electron.
 */
export function usePushToTalk({ onComplete, activationKey = 'Space' }: UsePushToTalkProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const isKeyPressed = useRef(false);

    // Check if the user is typing in an input field so we don't steal Spacebar
    const isTyping = () => {
        const activeEl = document.activeElement;
        return activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    };

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setTranscript('');
            chunksRef.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm'
            });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach(t => t.stop());
                streamRef.current = null;

                if (chunksRef.current.length === 0) {
                    setTranscript('');
                    return;
                }

                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                chunksRef.current = [];

                // Send to local Whisper AI service
                try {
                    setTranscript('Transcribing...');
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'recording.webm');

                    const response = await fetch('http://127.0.0.1:8000/transcribe', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error(`Transcription failed: ${response.statusText}`);
                    }

                    const data = await response.json();
                    const text = data.text?.trim() || '';
                    setTranscript(text);

                    if (text.length > 0) {
                        onComplete(text);
                    }
                } catch (err: any) {
                    console.error('Transcription error:', err);
                    setError(`Transcription failed: ${err.message}`);
                    setTranscript('');
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(250); // Collect chunks every 250ms
            setIsListening(true);
        } catch (err: any) {
            console.error('Failed to start recording:', err);
            setError(`Microphone error: ${err.message}`);
        }
    }, [onComplete]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        setIsListening(false);
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (isTyping()) return;
        if (e.code === activationKey && !isKeyPressed.current && !e.repeat) {
            e.preventDefault();
            isKeyPressed.current = true;
            startRecording();
        }
    }, [activationKey, startRecording]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        if (isTyping()) return;
        if (e.code === activationKey && isKeyPressed.current) {
            e.preventDefault();
            isKeyPressed.current = false;
            stopRecording();
        }
    }, [activationKey, stopRecording]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    return {
        isListening,
        transcript,
        error
    };
}
