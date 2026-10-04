import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StatusBar } from '../components/StatusBar';

describe('StatusBar component', () => {
    it('renders connected state correctly', () => {
        render(
            <StatusBar
                isConnected={true}
                sessionId={null}
                isOverlay={false}
                onToggleOverlay={vi.fn()}
                elapsed={0}
            />
        );

        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.queryByText('Offline')).not.toBeInTheDocument();
        expect(screen.getByText('⤡ Overlay')).toBeInTheDocument();
    });

    it('renders offline state correctly', () => {
        render(
            <StatusBar
                isConnected={false}
                sessionId={null}
                isOverlay={false}
                onToggleOverlay={vi.fn()}
                elapsed={0}
            />
        );

        expect(screen.getByText('Offline')).toBeInTheDocument();
        expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });

    it('renders elapsed timer when session is active', () => {
        render(
            <StatusBar
                isConnected={true}
                sessionId="sess-1"
                isOverlay={false}
                onToggleOverlay={vi.fn()}
                elapsed={125} // 2 minutes 5 seconds -> "02:05"
            />
        );

        expect(screen.getByText('02:05')).toBeInTheDocument();
    });

    it('handles overlay toggle button click', () => {
        const toggleMock = vi.fn();
        const { rerender } = render(
            <StatusBar
                isConnected={true}
                sessionId="sess-1"
                isOverlay={false}
                onToggleOverlay={toggleMock}
                elapsed={60}
            />
        );

        const overlayButton = screen.getByText('⤡ Overlay');
        fireEvent.click(overlayButton);
        expect(toggleMock).toHaveBeenCalledOnce();

        rerender(
            <StatusBar
                isConnected={true}
                sessionId="sess-1"
                isOverlay={true}
                onToggleOverlay={toggleMock}
                elapsed={60}
            />
        );
        expect(screen.getByText('⤢ Expand')).toBeInTheDocument();
    });
});
