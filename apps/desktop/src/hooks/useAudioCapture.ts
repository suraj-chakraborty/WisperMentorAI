import { useState, useCallback, useRef, useEffect } from 'react';

export interface AudioCaptureState {
    isCapturing: boolean;
    audioLevel: number;
    error: string | null;
    startCapture: (sourceId?: string) => Promise<void>;
    stopCapture: () => void;
    isMicEnabled: boolean;
    toggleMic: () => void;
    isPaused: boolean;
    togglePause: () => void;
}

interface UseAudioCaptureProps {
    onAudioChunk: (chunk: ArrayBuffer) => void;
}

export function useAudioCapture({ onAudioChunk }: UseAudioCaptureProps): AudioCaptureState {
    const [isCapturing, setIsCapturing] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(false);

    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number>(0);
    const processorRef = useRef<ScriptProcessorNode | null>(null);

    // context overlap (2s @ 16kHz)
    const lastTailRef = useRef<Float32Array>(new Float32Array(0));
    const OVERLAP_SAMPLES = 16000 * 2;

    useEffect(() => () => stopCapture(), []);

    const monitorLevel = useCallback(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        const level = Math.min(100, Math.round(rms));
        setAudioLevel(level);
        animFrameRef.current = requestAnimationFrame(monitorLevel);
    }, []);

    const startCapture = useCallback(async (sourceId?: string) => {
        try {
            setError(null);

            let chromeMediaSourceId = sourceId;

            if (!chromeMediaSourceId) {
                const sources = await (window as any).electronAPI.getDesktopSources();
                const desktopSource = sources.find((s: any) => s.name === 'Entire Screen') || sources[0];
                chromeMediaSourceId = desktopSource.id;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: chromeMediaSourceId,
                    },
                } as any,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: chromeMediaSourceId,
                        maxWidth: 1,
                        maxHeight: 1,
                        maxFrameRate: 1,
                    },
                } as any,
            });

            stream.getVideoTracks().forEach(t => t.stop());
            const audioStream = new MediaStream(stream.getAudioTracks());
            mediaStreamRef.current = audioStream;

            const ctx = new AudioContext();
            audioContextRef.current = ctx;

            // Stereo Pipeline
            const merger = ctx.createChannelMerger(2);

            // 1. System Audio -> Channel 0 (Left)
            const desktopNode = ctx.createMediaStreamSource(audioStream);
            desktopNode.connect(merger, 0, 0);

            // 2. Mic Audio -> Channel 1 (Right)
            // We'll connect this later in toggleMic, but for now prepare the path.
            // Actually, we need to connect "micGain" to "merger" input 1.
            const micGain = ctx.createGain();
            micGain.gain.value = 0; // Start muted
            micGain.connect(merger, 0, 1);
            micGainRef.current = micGain;

            // Visualization (Mix for analyser)
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            merger.connect(analyser); // Analyser will downmix 
            analyserRef.current = analyser;
            animFrameRef.current = requestAnimationFrame(monitorLevel);

            // Processor (Stereo)
            const bufferSize = 4096;
            const processor = ctx.createScriptProcessor(bufferSize, 2, 2);
            processorRef.current = processor;
            merger.connect(processor);

            const sampleRate = ctx.sampleRate;
            let audioChunks: Float32Array[] = [];
            let totalSamples = 0;
            let lastSpeech = Date.now();
            let startTime = Date.now();

            const SILENCE_THRESHOLD = 2;
            const SILENCE_MS = 2000;
            const MAX_MS = 60000;

            processor.onaudioprocess = e => {
                if (isPausedRef.current) {
                    setAudioLevel(0);
                    return;
                }
                // Get Stereo Data
                const left = e.inputBuffer.getChannelData(0);
                const right = e.inputBuffer.getChannelData(1);

                // Interleave for processing/sending
                const interleaved = new Float32Array(left.length * 2);
                let sum = 0;
                for (let i = 0; i < left.length; i++) {
                    interleaved[i * 2] = left[i];
                    interleaved[i * 2 + 1] = right[i];
                    // RMS calculation (mono mix for VAD)
                    const val = (left[i] + right[i]) / 2;
                    sum += val * val;
                }

                audioChunks.push(interleaved);
                totalSamples += left.length; // We count frames, not samples

                const rms = Math.sqrt(sum / left.length);
                const level = Math.min(100, Math.round(rms * 100 * 5)); // Boost level for visibility
                setAudioLevel(level);

                const now = Date.now();
                if (level > SILENCE_THRESHOLD) lastSpeech = now;

                if (now - startTime > MAX_MS || (now - lastSpeech > SILENCE_MS && now - startTime > 1000)) {
                    flush();
                }
            };

            const flush = () => {
                if (!audioChunks.length) return;

                // Merge chunks
                const totalFrames = totalSamples;
                const mergedStream = new Float32Array(totalFrames * 2);
                let offset = 0;
                for (const c of audioChunks) {
                    mergedStream.set(c, offset);
                    offset += c.length;
                }

                // Resample (Stereo Resampling is tricky. We'll restart with strict logic)
                const resampled = downsampleStereo(mergedStream, sampleRate, 16000);
                console.log(`[Audio] Flush: ${mergedStream.length / 2} frames -> ${resampled.length / 2} frames (Stereo)`);

                // We don't do context overlap here for simplification in stereo yet
                // Just send the chunk
                onAudioChunk(encodeWAVStereo(resampled, 16000));

                audioChunks = [];
                totalSamples = 0;
                startTime = Date.now();
                lastSpeech = Date.now();
            };

            const mute = ctx.createGain();
            mute.gain.value = 0;
            processor.connect(mute);
            mute.connect(ctx.destination);

            setIsCapturing(true);
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Audio capture failed');
        }
    }, [monitorLevel, onAudioChunk]);

    const stopCapture = useCallback(() => {
        processorRef.current?.disconnect();
        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        audioContextRef.current?.close();
        cancelAnimationFrame(animFrameRef.current);
        setIsCapturing(false);
        setAudioLevel(0);
        setAudioLevel(0);
        setIsPaused(false);
        isPausedRef.current = false;
    }, []);

    const togglePause = useCallback(() => {
        const newState = !isPaused;
        setIsPaused(newState);
        isPausedRef.current = newState;
    }, [isPaused]);

    const [isMicEnabled, setIsMicEnabled] = useState(false);
    const micStreamRef = useRef<MediaStream | null>(null);
    const micGainRef = useRef<GainNode | null>(null);

    // Helper for toggleMic - now we just attach/detach stream to the existing micGain
    // But micGain is already connected to merger. So we just feed data into micGain.

    // We need to re-implement toggleMic to feed the micGainRef we created in startCapture

    const toggleMic = useCallback(async () => {
        if (!audioContextRef.current || !micGainRef.current) return;

        const newState = !isMicEnabled;
        setIsMicEnabled(newState);

        if (newState) {
            // Enable Mic
            try {
                if (!micStreamRef.current) {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        }
                    });
                    micStreamRef.current = stream;
                    const ctx = audioContextRef.current;
                    const source = ctx.createMediaStreamSource(stream);

                    // 🎙️ Noise Suppression Chain
                    // 1. High-pass filter (Cut rumble < 85Hz)
                    const highPass = ctx.createBiquadFilter();
                    highPass.type = 'highpass';
                    highPass.frequency.value = 85;

                    // 2. Dynamics Compressor (Even out volume / reduce peaks)
                    const compressor = ctx.createDynamicsCompressor();
                    compressor.threshold.value = -20;
                    compressor.knee.value = 30;
                    compressor.ratio.value = 12;
                    compressor.attack.value = 0.003;
                    compressor.release.value = 0.25;

                    // Chain: Source -> HighPass -> Compressor -> Gain -> Merger
                    source.connect(highPass);
                    highPass.connect(compressor);
                    compressor.connect(micGainRef.current);

                    micGainRef.current.gain.value = 1.0;
                } else {
                    micGainRef.current.gain.value = 1.0;
                }
            } catch (e) {
                console.error(e);
                setIsMicEnabled(false);
            }
        } else {
            micGainRef.current.gain.value = 0;
            // Optionally stop tracks to release hardware, but keeping it open for quick toggle is better
        }
    }, [isMicEnabled]);


    return { isCapturing, audioLevel, error, startCapture, stopCapture, isMicEnabled, toggleMic, isPaused, togglePause };
}

// 🔊 Utils 

function downsample(buffer: Float32Array, inRate: number, outRate: number) {
    if (outRate === inRate) return buffer;
    const ratio = inRate / outRate;
    const newLen = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
        const pos = i * ratio;
        const idx = Math.floor(pos);
        const frac = pos - idx;
        result[i] = buffer[idx] * (1 - frac) + (buffer[idx + 1] || 0) * frac;
    }
    return result;
}

function downsampleStereo(buffer: Float32Array, inRate: number, outRate: number) {
    if (outRate === inRate) return buffer;
    const ratio = inRate / outRate;
    const newLen = Math.round(buffer.length / ratio);
    // Ensure even length for stereo
    const safeLen = newLen % 2 === 0 ? newLen : newLen - 1;

    const result = new Float32Array(safeLen);

    for (let i = 0; i < safeLen; i += 2) {
        // Frame index in input
        const pos = (i / 2) * ratio;
        const idx = Math.floor(pos) * 2; // Index in interleaved buffer

        // Nearest neighbor for speed (or linear interp)
        // Simple decimation is safer for stereo phasing
        result[i] = buffer[idx];     // Left
        result[i + 1] = buffer[idx + 1]; // Right
    }
    return result;
}

function encodeWAV(samples: Float32Array, rate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const write = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));

    write(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    write(8, 'WAVEfmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

function encodeWAVStereo(samples: Float32Array, rate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const write = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));

    write(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    write(8, 'WAVEfmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 2, true); // Channels = 2 (Stereo)
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 4, true); // ByteRate = rate * channels * bytesPerSample
    view.setUint16(32, 4, true);        // BlockAlign = channels * bytesPerSample
    view.setUint16(34, 16, true);       // BitsPerSample
    write(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}
