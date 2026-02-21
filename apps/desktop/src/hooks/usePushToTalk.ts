import { useState, useEffect, useRef, useCallback } from 'react';

// Extend Window to include webkitSpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface UsePushToTalkProps {
    onComplete: (text: string) => void;
    activationKey?: string; // e.g. "ControlLeft", "Space"
}

export function usePushToTalk({ onComplete, activationKey = 'Space' }: UsePushToTalkProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const isKeyPressed = useRef(false);

    // Check if the user is typing in an input field so we don't steal Spacebar
    const isTyping = () => {
        const activeEl = document.activeElement;
        return activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    };

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // We could make this dynamic if needed

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(finalTranscript || interimTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'network') {
                setError('Network error: Cannot reach speech servers. Try again later.');
            } else if (event.error === 'not-allowed') {
                setError('Microphone access denied. Please allow microphone permissions.');
            } else {
                setError(`Speech recognition failed (${event.error})`);
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            // If key is still pressed, it means recognition stopped unexpectedly, we might need to restart it
            // For simplicity, we just set listening to false and handle sending text on keyup
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (isTyping()) return;
        if (e.code === activationKey && !isKeyPressed.current && !e.repeat) {
            e.preventDefault();
            isKeyPressed.current = true;
            setTranscript('');
            setError(null);
            try {
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (err) {
                // Ignore if already started
            }
        }
    }, [activationKey]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        if (isTyping()) return;
        if (e.code === activationKey && isKeyPressed.current) {
            e.preventDefault();
            isKeyPressed.current = false;
            recognitionRef.current?.stop();
            setIsListening(false);

            // Allow a tiny delay for final results to process before sending
            setTimeout(() => {
                setTranscript((current) => {
                    const finalized = current.trim();
                    if (finalized.length > 0) {
                        onComplete(finalized);
                    }
                    return ''; // Reset after sending
                });
            }, 300);
        }
    }, [activationKey, onComplete]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    return {
        isListening,
        transcript,
        error
    };
}
