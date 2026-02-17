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

    const startCapture = useCallback(async () => {
        try {
            setError(null);

            const sources = await (window as any).electronAPI.getDesktopSources();
            const desktopSource = sources.find((s: any) => s.name === 'Entire Screen') || sources[0];

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: desktopSource.id,
                    },
                } as any,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: desktopSource.id,
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

            const source = ctx.createMediaStreamSource(audioStream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;
            animFrameRef.current = requestAnimationFrame(monitorLevel);

            const bufferSize = 4096;
            const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
            processorRef.current = processor;

            const sampleRate = ctx.sampleRate;
            let audioChunks: Float32Array[] = [];
            let totalSamples = 0;
            let lastSpeech = Date.now();
            let startTime = Date.now();

            const SILENCE_THRESHOLD = 2;
            const SILENCE_MS = 2000;
            const MAX_MS = 60000;

            processor.onaudioprocess = e => {
                const input = e.inputBuffer.getChannelData(0);
                const chunk = new Float32Array(input);
                audioChunks.push(chunk);
                totalSamples += chunk.length;

                let sum = 0;
                for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
                const rms = Math.sqrt(sum / chunk.length);
                const level = Math.min(100, Math.round(rms * 100));
                setAudioLevel(level);

                const now = Date.now();
                if (level > SILENCE_THRESHOLD) lastSpeech = now;

                if (now - startTime > MAX_MS || (now - lastSpeech > SILENCE_MS && now - startTime > 1000)) {
                    flush();
                }
            };

            const flush = () => {
                if (!audioChunks.length) return;

                const merged = new Float32Array(totalSamples);
                let offset = 0;
                for (const c of audioChunks) {
                    merged.set(c, offset);
                    offset += c.length;
                }

                const resampled = downsample(merged, sampleRate, 16000);
                console.log(`[Audio] Flush: ${merged.length} samples -> ${resampled.length} samples`);

                const withContext = new Float32Array(lastTailRef.current.length + resampled.length);
                withContext.set(lastTailRef.current);
                withContext.set(resampled, lastTailRef.current.length);

                onAudioChunk(encodeWAV(withContext, 16000));

                lastTailRef.current = resampled.slice(Math.max(0, resampled.length - OVERLAP_SAMPLES));
                audioChunks = [];
                totalSamples = 0;
                startTime = Date.now();
                lastSpeech = Date.now();
            };

            source.connect(processor);
            const mute = ctx.createGain();
            mute.gain.value = 0;
            processor.connect(mute);
            mute.connect(ctx.destination);

            setIsCapturing(true);
        } catch (e: any) {
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
    }, []);

    return { isCapturing, audioLevel, error, startCapture, stopCapture };
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
