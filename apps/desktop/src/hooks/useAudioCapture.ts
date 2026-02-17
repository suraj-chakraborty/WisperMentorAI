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

            // Start level monitoring
            animFrameRef.current = requestAnimationFrame(monitorLevel);

            // Audio Capture & WAV Encoding
            const bufferSize = 4096;
            const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
            const sampleRate = audioContext.sampleRate;

            // Buffer for accumulating audio (2 seconds worth)
            let audioBufferData: Float32Array[] = [];
            let totalSamples = 0;
            const chunkInterval = 2000; // Send every 2s

            processor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                const chunk = new Float32Array(input);
                audioBufferData.push(chunk);
                totalSamples += chunk.length;

                // Check if we have enough data (approx 2s)
                if (totalSamples >= (sampleRate * chunkInterval) / 1000) {
                    flushBuffer();
                }
            };

            const flushBuffer = () => {
                if (audioBufferData.length === 0) return;

                // Flatten buffer
                const flattened = new Float32Array(totalSamples);
                let offset = 0;
                for (const chunk of audioBufferData) {
                    flattened.set(chunk, offset);
                    offset += chunk.length;
                }

                // Create WAV file
                const wavBuffer = encodeWAV(flattened, sampleRate);
                onAudioChunk(wavBuffer);

                // Reset
                audioBufferData = [];
                totalSamples = 0;
            };

            // Helper to encode WAV
            const encodeWAV = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
                const buffer = new ArrayBuffer(44 + samples.length * 2);
                const view = new DataView(buffer);

                // RIFF chunk descriptor
                writeString(view, 0, 'RIFF');
                view.setUint32(4, 36 + samples.length * 2, true);
                writeString(view, 8, 'WAVE');
                // fmt sub-chunk
                writeString(view, 12, 'fmt ');
                view.setUint32(16, 16, true);
                view.setUint16(20, 1, true); // PCM
                view.setUint16(22, 1, true); // Mono
                view.setUint32(24, sampleRate, true);
                view.setUint32(28, sampleRate * 2, true);
                view.setUint16(32, 2, true); // Block align
                view.setUint16(34, 16, true); // Bits per sample
                // data sub-chunk
                writeString(view, 36, 'data');
                view.setUint32(40, samples.length * 2, true);

                // Write samples (float -> int16)
                floatTo16BitPCM(view, 44, samples);

                return buffer;
            };

            const writeString = (view: DataView, offset: number, string: string) => {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            };

            const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
                for (let i = 0; i < input.length; i++, offset += 2) {
                    const s = Math.max(-1, Math.min(1, input[i]));
                    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                }
            };

            const muteGain = audioContext.createGain();
            muteGain.gain.value = 0;
            audioSource.connect(processor);
            processor.connect(muteGain);
            muteGain.connect(audioContext.destination);

            // mediaRecorderRef.current = recorder; // No longer used
            (mediaStreamRef.current as any).processor = processor; // Keep ref to prevent GC


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
        // Stop Processor
        if (mediaStreamRef.current && (mediaStreamRef.current as any).processor) {
            const processor = (mediaStreamRef.current as any).processor;
            processor.disconnect();
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
