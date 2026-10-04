import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TitleBar } from '../components/TitleBar';

describe('TitleBar component', () => {
  it('renders branding elements when not in overlay mode', () => {
    render(<TitleBar isOverlay={false} />);
    expect(screen.getByText('WhisperMentor AI')).toBeInTheDocument();
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
  });

  it('renders nothing when in overlay mode', () => {
    const { container } = render(<TitleBar isOverlay={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('triggers window control methods on button click', () => {
    const mockMinimize = vi.fn();
    const mockMaximize = vi.fn();
    const mockClose = vi.fn();

    window.electronAPI = {
      minimizeWindow: mockMinimize,
      maximizeWindow: mockMaximize,
      closeWindow: mockClose,
    } as any;

    render(<TitleBar isOverlay={false} />);

    fireEvent.click(screen.getByTitle('Minimize'));
    expect(mockMinimize).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTitle('Maximize'));
    expect(mockMaximize).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTitle('Close'));
    expect(mockClose).toHaveBeenCalledOnce();
  });
});
