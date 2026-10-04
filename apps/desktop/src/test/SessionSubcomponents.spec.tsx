import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-markdown', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="markdown">{children}</div>,
}));
import { SessionHeader, TranscriptFeed, QAFeed } from '../components/session';
import type { TranscriptEntry, AnswerEntry } from '../hooks/useSocket';

describe('Session Subcomponents', () => {
    describe('SessionHeader', () => {
        const defaultProps = {
            isCapturing: false,
            isPaused: false,
            audioLevel: 45,
            elapsed: 65,
            formatTime: (s: number) => '01:05',
            onToggleCapture: vi.fn(),
            togglePause: vi.fn(),
            onOpenSourcePicker: vi.fn(),
            isMicEnabled: true,
            toggleMic: vi.fn(),
            isTranslationEnabled: false,
            targetLang: 'es',
            onSelectTargetLang: vi.fn(),
            onToggleTranslation: vi.fn(),
            voiceEnabled: true,
            onToggleVoice: vi.fn(),
            activeTab: 'transcript' as const,
            onTabChange: vi.fn(),
            answersCount: 2,
            onToggleOverlay: vi.fn(),
            showExportMenu: false,
            setShowExportMenu: vi.fn(),
            onExport: vi.fn(),
            onOpenEndConfirm: vi.fn(),
            isEndingSession: false,
        };

        it('renders timer and tab buttons', () => {
            render(<SessionHeader {...defaultProps} />);
            expect(screen.getByText('01:05')).toBeInTheDocument();
            expect(screen.getByText('Transcript')).toBeInTheDocument();
            expect(screen.getByText('Q&A (2)')).toBeInTheDocument();
            expect(screen.getByText('Start Rec')).toBeInTheDocument();
        });

        it('triggers recording toggle when start rec is clicked', () => {
            const onToggleCapture = vi.fn();
            render(<SessionHeader {...defaultProps} onToggleCapture={onToggleCapture} />);
            fireEvent.click(screen.getByText('Start Rec'));
            expect(onToggleCapture).toHaveBeenCalledOnce();
        });

        it('triggers tab change when Q&A tab is clicked', () => {
            const onTabChange = vi.fn();
            render(<SessionHeader {...defaultProps} onTabChange={onTabChange} />);
            fireEvent.click(screen.getByText('Q&A (2)'));
            expect(onTabChange).toHaveBeenCalledWith('qa');
        });
    });

    describe('TranscriptFeed', () => {
        const endRef = { current: null };

        it('renders empty prompt when transcripts array is empty', () => {
            render(
                <TranscriptFeed
                    transcripts={[]}
                    translationData={{}}
                    isTranslationEnabled={false}
                    isCapturing={false}
                    error={null}
                    mountedTranscriptCount={0}
                    endRef={endRef}
                />
            );
            expect(screen.getByText(/Click "Start Rec" to begin capturing audio/)).toBeInTheDocument();
        });

        it('renders transcript list with speaker and text', () => {
            const transcripts: TranscriptEntry[] = [
                {
                    id: 't-1',
                    speaker: 'User 1',
                    text: 'Welcome everyone to the architecture review.',
                    timestamp: new Date('2026-10-04T12:00:00Z'),
                },
            ];

            render(
                <TranscriptFeed
                    transcripts={transcripts}
                    translationData={{}}
                    isTranslationEnabled={false}
                    isCapturing={true}
                    error={null}
                    mountedTranscriptCount={1}
                    endRef={endRef}
                />
            );

            expect(screen.getByText('User 1')).toBeInTheDocument();
            expect(screen.getByText('Welcome everyone to the architecture review.')).toBeInTheDocument();
        });
    });

    describe('QAFeed', () => {
        const endRef = { current: null };

        it('renders empty state when no questions exist', () => {
            render(<QAFeed answers={[]} endRef={endRef} />);
            expect(screen.getByText('Ask a question below')).toBeInTheDocument();
        });

        it('renders question and answer markdown text', () => {
            const answers: AnswerEntry[] = [
                {
                    questionId: 'q-1',
                    question: 'What is the circuit breaker pattern?',
                    text: 'The **circuit breaker** prevents cascading failures.',
                    confidence: 0.95,
                    timestamp: new Date(),
                },
            ];

            render(<QAFeed answers={answers} endRef={endRef} />);
            expect(screen.getByText(/What is the circuit breaker pattern\?/)).toBeInTheDocument();
            expect(screen.getByTestId('markdown')).toHaveTextContent(/prevents cascading failures/);
        });
    });
});
