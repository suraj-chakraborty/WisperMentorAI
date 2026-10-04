import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Modal } from '../components/Modal';

describe('Modal component', () => {
    it('does not render when isOpen is false', () => {
        const { container } = render(
            <Modal title="Test Modal" isOpen={false} onClose={vi.fn()}>
                <div>Modal Content</div>
            </Modal>
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders title and children when isOpen is true', () => {
        render(
            <Modal title="End Current Session" isOpen={true} onClose={vi.fn()}>
                <p>Are you sure you want to end this session?</p>
            </Modal>
        );

        expect(screen.getByText('End Current Session')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to end this session?')).toBeInTheDocument();
    });

    it('invokes onClose when close button is clicked', () => {
        const onCloseMock = vi.fn();
        render(
            <Modal title="Close Test" isOpen={true} onClose={onCloseMock}>
                <div>Body</div>
            </Modal>
        );

        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);
        expect(onCloseMock).toHaveBeenCalledOnce();
    });
});
