import React from 'react';
import SourcePicker from '../SourcePicker';
import { Modal } from '../Modal';

interface SessionModalsProps {
    showSourcePicker: boolean;
    onSelectSource: (id: string) => void;
    onCloseSourcePicker: () => void;
    showEndConfirm: boolean;
    onCloseEndConfirm: () => void;
    onConfirmEndSession: () => void;
    isEndingSession: boolean;
}

export function SessionModals({
    showSourcePicker,
    onSelectSource,
    onCloseSourcePicker,
    showEndConfirm,
    onCloseEndConfirm,
    onConfirmEndSession,
    isEndingSession,
}: SessionModalsProps) {
    return (
        <>
            {showSourcePicker && (
                <SourcePicker
                    onSelect={onSelectSource}
                    onClose={onCloseSourcePicker}
                />
            )}

            {showEndConfirm && (
                <Modal
                    title="End Current Session"
                    isOpen={showEndConfirm}
                    onClose={() => !isEndingSession && onCloseEndConfirm()}
                    size="small"
                >
                    <div style={{ padding: '1.5rem', color: '#f8fafc' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                            Are you sure you want to end this session? Recording will stop and WhisperMentor will generate an AI executive summary and extract key takeaways.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn--secondary btn--sm"
                                onClick={onCloseEndConfirm}
                                disabled={isEndingSession}
                            >
                                Keep Session Open
                            </button>
                            <button
                                className="btn btn--primary btn--sm"
                                onClick={onConfirmEndSession}
                                disabled={isEndingSession}
                                style={{ backgroundColor: '#ef4444', borderColor: '#dc2626' }}
                            >
                                {isEndingSession ? 'Generating Summary...' : 'Yes, End Session'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
