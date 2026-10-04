import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SourcePicker from '../components/SourcePicker';

describe('SourcePicker component', () => {
    const mockSources = [
        { id: 'screen:0:0', name: 'Entire Screen 1' },
        { id: 'window:1234:0', name: 'Google Meet - Team Sync' },
    ];

    beforeEach(() => {
        window.electronAPI = {
            getDesktopSources: vi.fn().mockResolvedValue(mockSources),
        } as any;
    });

    it('fetches and displays available desktop sources', async () => {
        render(<SourcePicker onSelect={vi.fn()} onClose={vi.fn()} />);

        expect(screen.getByText('Loading sources...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Entire Screen 1')).toBeInTheDocument();
            expect(screen.getByText('Google Meet - Team Sync')).toBeInTheDocument();
        });
    });

    it('invokes onSelect with chosen source id when a source card is clicked', async () => {
        const onSelectMock = vi.fn();
        render(<SourcePicker onSelect={onSelectMock} onClose={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Google Meet - Team Sync')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Google Meet - Team Sync'));
        expect(onSelectMock).toHaveBeenCalledWith('window:1234:0');
    });

    it('invokes onClose when close button is clicked', async () => {
        const onCloseMock = vi.fn();
        render(<SourcePicker onSelect={vi.fn()} onClose={onCloseMock} />);

        await waitFor(() => {
            expect(screen.queryByText('Loading sources...')).not.toBeInTheDocument();
        });

        const closeBtn = screen.getByRole('button', { name: 'Close' });
        fireEvent.click(closeBtn);
        expect(onCloseMock).toHaveBeenCalledOnce();
    });
});
