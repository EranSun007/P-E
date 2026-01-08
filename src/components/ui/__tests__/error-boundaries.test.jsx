import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { 
  ChunkLoadErrorBoundary, 
  ComponentChunkErrorBoundary, 
  retryImport 
} from '../error-boundaries';

// Mock component that throws an error
const ThrowError = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Component loaded successfully</div>;
};

describe('Error Boundaries', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.error = originalError;
  });

  describe('ChunkLoadErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ChunkLoadErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ChunkLoadErrorBoundary>
      );
      
      expect(screen.getByText('Component loaded successfully')).toBeInTheDocument();
    });

    it('should render error UI when error occurs', () => {
      render(
        <ChunkLoadErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ChunkLoadErrorBoundary>
      );
      
      expect(screen.getByText('Failed to load content')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should show retry button and handle retry', () => {
      render(
        <ChunkLoadErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ChunkLoadErrorBoundary>
      );
      
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(retryButton).toBeDisabled();
    });
  });

  describe('ComponentChunkErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ComponentChunkErrorBoundary componentName="Test Component">
          <ThrowError shouldThrow={false} />
        </ComponentChunkErrorBoundary>
      );
      
      expect(screen.getByText('Component loaded successfully')).toBeInTheDocument();
    });

    it('should render error UI with component name when error occurs', () => {
      render(
        <ComponentChunkErrorBoundary componentName="Test Component">
          <ThrowError shouldThrow={true} />
        </ComponentChunkErrorBoundary>
      );
      
      expect(screen.getByText('Failed to load Test Component')).toBeInTheDocument();
    });

    it('should render inline error UI when inline prop is true', () => {
      render(
        <ComponentChunkErrorBoundary componentName="Test Component" inline>
          <ThrowError shouldThrow={true} />
        </ComponentChunkErrorBoundary>
      );
      
      expect(screen.getByText('Failed to load Test Component')).toBeInTheDocument();
      // Should have inline styling classes
      const errorContainer = screen.getByText('Failed to load Test Component').closest('div').parentElement;
      expect(errorContainer).toHaveClass('p-4', 'border', 'border-red-200');
    });
  });

  describe('retryImport', () => {
    it('should resolve successfully on first try', async () => {
      const mockImport = vi.fn().mockResolvedValue({ default: 'success' });
      
      const result = await retryImport(mockImport);
      
      expect(result).toEqual({ default: 'success' });
      expect(mockImport).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockImport = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue({ default: 'success' });
      
      const result = await retryImport(mockImport, 3, 10); // Short delay for testing
      
      expect(result).toEqual({ default: 'success' });
      expect(mockImport).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockImport = vi.fn().mockRejectedValue(new Error('Persistent failure'));
      
      await expect(retryImport(mockImport, 2, 10)).rejects.toThrow('Persistent failure');
      expect(mockImport).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});