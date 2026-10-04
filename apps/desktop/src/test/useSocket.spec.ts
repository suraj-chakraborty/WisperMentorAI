import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../hooks/useSocket';
import { io } from 'socket.io-client';
import { WsEvent } from '@whispermentor/shared';
import { WS_BASE_URL } from '../config/api';

vi.mock('socket.io-client', () => {
    return {
        io: vi.fn(),
    };
});

describe('useSocket Hook (H3/B2 Stale Token Closure & Lifecycle)', () => {
    let mockSocket: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSocket = {
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
        };
        vi.mocked(io).mockReturnValue(mockSocket);
    });

    it('does not initiate socket connection when token is empty or null', () => {
        const { result } = renderHook(() => useSocket(''));

        expect(io).not.toHaveBeenCalled();
        expect(result.current.isConnected).toBe(false);
        expect(result.current.sessionStatus).toBe('disconnected');
    });

    it('connects to backend with authorization token when token is provided', () => {
        renderHook(() => useSocket('initial.jwt.token'));

        expect(io).toHaveBeenCalledWith(
            WS_BASE_URL,
            expect.objectContaining({
                auth: { token: 'initial.jwt.token' },
                transports: ['websocket'],
            })
        );
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('disconnects old socket and reconnects with updated token when token prop changes', () => {
        const { rerender } = renderHook(({ token }) => useSocket(token), {
            initialProps: { token: 'token-v1' },
        });

        expect(io).toHaveBeenCalledTimes(1);
        expect(io).toHaveBeenCalledWith(
            WS_BASE_URL,
            expect.objectContaining({ auth: { token: 'token-v1' } })
        );

        // Update token (e.g. login or refresh)
        rerender({ token: 'token-v2' });

        expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
        expect(io).toHaveBeenCalledTimes(2);
        expect(io).toHaveBeenLastCalledWith(
            WS_BASE_URL,
            expect.objectContaining({ auth: { token: 'token-v2' } })
        );
    });

    it('disconnects socket on component unmount', () => {
        const { unmount } = renderHook(() => useSocket('token-to-unmount'));

        expect(mockSocket.disconnect).not.toHaveBeenCalled();
        unmount();
        expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    });

    it('subscribes to answer:chunk and updates answers incrementally in real-time', () => {
        const listeners: Record<string, Function> = {};
        mockSocket.on.mockImplementation((event: string, cb: Function) => {
            listeners[event] = cb;
        });

        const { result } = renderHook(() => useSocket('valid.token'));

        expect(mockSocket.on).toHaveBeenCalledWith(WsEvent.ANSWER_CHUNK, expect.any(Function));

        // Join session and send question
        act(() => {
            result.current.joinSession('sess-100');
        });
        act(() => {
            result.current.sendQuestion('What is CQRS?');
        });

        expect(result.current.answers).toHaveLength(1);
        expect(result.current.answers[0].text).toBe('');

        // Simulate streaming token chunks
        act(() => {
            listeners[WsEvent.ANSWER_CHUNK]({ questionId: 'q-100', chunk: 'CQRS ' });
        });
        expect(result.current.answers[0].text).toBe('CQRS ');

        act(() => {
            listeners[WsEvent.ANSWER_CHUNK]({ questionId: 'q-100', chunk: 'stands for Command Query' });
        });
        expect(result.current.answers[0].text).toBe('CQRS stands for Command Query');

        // Simulate final answer response
        act(() => {
            listeners[WsEvent.ANSWER_RESPONSE]({
                questionId: 'q-100',
                text: 'CQRS stands for Command Query Responsibility Segregation.',
                confidence: 0.95,
            });
        });
        expect(result.current.answers[0].text).toBe('CQRS stands for Command Query Responsibility Segregation.');
        expect(result.current.answers[0].confidence).toBe(0.95);
    });
});
