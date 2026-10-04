import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';

const FaultyComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test crash in child component');
  }
  return <div>Normal Content</div>;
};

describe('ErrorBoundary component', () => {
  // Suppress console.error in tests to avoid noisy output for intentional errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Hello Safe World</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Hello Safe World')).toBeInTheDocument();
  });

  it('renders default error UI and displays error message when a child throws', () => {
    render(
      <ErrorBoundary>
        <FaultyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test crash in child component')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Application')).toBeInTheDocument();
  });

  it('renders custom fallback if provided when a child throws', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error Screen</div>}>
        <FaultyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error Screen')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('recovers and clears error when Try Again is clicked and child no longer throws', () => {
    const ResettableParent = () => {
      const [hasError, setHasError] = useState(true);

      return (
        <div>
          <button onClick={() => setHasError(false)}>Fix Error</button>
          <ErrorBoundary>
            {hasError ? <FaultyComponent /> : <div>Recovered Content</div>}
          </ErrorBoundary>
        </div>
      );
    };

    render(<ResettableParent />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // First fix the underlying issue
    fireEvent.click(screen.getByText('Fix Error'));
    // Then click Try Again on ErrorBoundary
    fireEvent.click(screen.getByText('Try Again'));

    expect(screen.getByText('Recovered Content')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});
