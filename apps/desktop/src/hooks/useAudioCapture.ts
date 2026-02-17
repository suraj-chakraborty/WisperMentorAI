import { useState, useCallback, useRef, useEffect } from 'react';

export interface AudioCaptureState {
    isCapturing: boolean;
    audioLevel: number;
    error: string | null;
    startCapture: () => Promise<void>;
    stopCapture: () => void;
}



interface UseAudioCaptureProps {
    onAudioChunk: (chunk: ArrayBuffer) => void;
}

export function useAudioCapture({ onAudioChunk }: UseAudioCaptureProps): AudioCaptureState {
    const [isCapturing, setIsCapturing] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaStreamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number>(0);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCapture();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Monitor audio levels
    const monitorLevel = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS level (0-100)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(100, Math.round((rms / 128) * 100));

        setAudioLevel(level);
        animFrameRef.current = requestAnimationFrame(monitorLevel);
    }, []);

    const startCapture = useCallback(async () => {
        try {
            setError(null);


            // Fetch available sources via IPC
            const sources = (await (window as any).electronAPI.getDesktopSources()) as {
                id: string;
                name: string;
            }[];
            if (!sources || sources.length === 0) {
                throw new Error('No desktop sources found');
            }

            // Prefer "Entire Screen" or just take the first source
            // In a real app, we'd show a source picker modal
            const desktopSource = sources.find((s) => s.name === 'Entire Screen') || sources[0];

            // Use Electron's desktopCapturer via the special constraint
            // This captures system audio (what comes out of speakers)
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    // @ts-expect-error Electron-specific constraint
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: desktopSource.id,
                    },
                },
                video: {
                    // @ts-expect-error Electron-specific constraint
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: desktopSource.id,
                        maxWidth: 1,
                        maxHeight: 1,
                        maxFrameRate: 1,
                    },
                },
            });

            // We only need the audio tracks, remove video tracks
            stream.getVideoTracks().forEach((track) => track.stop());

            // Create audio-only stream
            const audioStream = new MediaStream(stream.getAudioTracks());
            mediaStreamRef.current = audioStream;

            // Set up AudioContext for level monitoring
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;

            const audioSource = audioContext.createMediaStreamSource(audioStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            audioSource.connect(analyser);
            analyserRef.current = analyser;

            // Start level monitoring
            animFrameRef.current = requestAnimationFrame(monitorLevel);

            // Set up MediaRecorder to chunk audio
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const recorder = new MediaRecorder(audioStream, {
                mimeType,
                audioBitsPerSecond: 128000,
            });

            recorder.ondataavailable = async (event: BlobEvent) => {
                if (event.data.size > 0) {
                    const buffer = await event.data.arrayBuffer();
                    onAudioChunk(buffer);
                }
            };

            recorder.onerror = () => {
                setError('Recording failed. Please try again.');
                stopCapture();
            };

            // Chunk every 2 seconds
            recorder.start(2000);
            mediaRecorderRef.current = recorder;

            setIsCapturing(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to capture system audio';

            if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
                setError('Audio capture permission denied. Please allow screen recording access.');
            } else if (message.includes('NotFoundError')) {
                setError('No audio source found. Make sure audio is playing on your system.');
            } else {
                setError(message);
            }

            setIsCapturing(false);
        }
    }, [onAudioChunk, monitorLevel]);

    const stopCapture = useCallback(() => {
        // Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;

        // Stop all tracks
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        mediaStreamRef.current = null;

        // Close AudioContext
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        audioContextRef.current = null;
        analyserRef.current = null;

        // Stop animation frame
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = 0;
        }

        setIsCapturing(false);
        setAudioLevel(0);
    }, []);

    return {
        isCapturing,
        audioLevel,
        error,
        startCapture,
        stopCapture,
    };
}
