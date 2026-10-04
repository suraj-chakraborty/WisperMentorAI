import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioCapture } from '../hooks/useAudioCapture';

describe('useAudioCapture Hook (B5 onAudioChunk Ref & Lifecycle)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with default non-capturing state', () => {
        const onAudioChunk = vi.fn();
        const { result } = renderHook(() => useAudioCapture({ onAudioChunk }));

        expect(result.current.isCapturing).toBe(false);
        expect(result.current.audioLevel).toBe(0);
        expect(result.current.isPaused).toBe(false);
        expect(result.current.isMicEnabled).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('toggles pause state cleanly', () => {
        const onAudioChunk = vi.fn();
        const { result } = renderHook(() => useAudioCapture({ onAudioChunk }));

        expect(result.current.isPaused).toBe(false);

        act(() => {
            result.current.togglePause();
        });
        expect(result.current.isPaused).toBe(true);

        act(() => {
            result.current.togglePause();
        });
        expect(result.current.isPaused).toBe(false);
    });

    it('resets state on stopCapture', () => {
        const onAudioChunk = vi.fn();
        const { result } = renderHook(() => useAudioCapture({ onAudioChunk }));

        act(() => {
            result.current.stopCapture();
        });

        expect(result.current.isCapturing).toBe(false);
        expect(result.current.audioLevel).toBe(0);
        expect(result.current.isPaused).toBe(false);
    });

    it('accepts updated onAudioChunk without restarting hook or losing handlers', () => {
        const firstHandler = vi.fn();
        const secondHandler = vi.fn();

        const { rerender, result } = renderHook(
            ({ handler }) => useAudioCapture({ onAudioChunk: handler }),
            { initialProps: { handler: firstHandler } }
        );

        const initialStart = result.current.startCapture;

        // Rerender with new handler function
        rerender({ handler: secondHandler });

        // startCapture identity remains stable and unaffected by callback changes
        expect(result.current.startCapture).toBe(initialStart);
    });
});
