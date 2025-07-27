import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction
} from '../toast';

describe('Toast Components', () => {
  describe('Toast', () => {
    it('should render without warnings when onOpenChange prop is provided', () => {
      const onOpenChange = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ToastProvider>
          <Toast onOpenChange={onOpenChange} open={true}>
            <ToastTitle>Test Title</ToastTitle>
            <ToastDescription>Test Description</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );
      
      // Check that no React warnings were logged
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Unknown event handler property')
      );
      
      consoleSpy.mockRestore();
    });

    it('should render toast content correctly', () => {
      render(
        <ToastProvider>
          <Toast open={true}>
            <ToastTitle>Test Title</ToastTitle>
            <ToastDescription>Test Description</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('should handle onOpenChange callback', () => {
      const onOpenChange = vi.fn();
      
      render(
        <ToastProvider>
          <Toast onOpenChange={onOpenChange} open={true}>
            <ToastTitle>Test Title</ToastTitle>
            <ToastClose />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );
      
      // The onOpenChange should be properly handled by Radix UI
      expect(onOpenChange).not.toHaveBeenCalled(); // Should only be called on state changes
    });

    it('should render ToastAction without warnings', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ToastProvider>
          <Toast open={true}>
            <ToastTitle>Test Title</ToastTitle>
            <ToastAction altText="Undo">Undo</ToastAction>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Unknown event handler property')
      );
      
      consoleSpy.mockRestore();
    });

    it('should apply variant classes correctly', () => {
      render(
        <ToastProvider>
          <Toast variant="destructive" open={true}>
            <ToastTitle>Error Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );
      
      // Check that the destructive variant class is applied
      const toast = screen.getByText('Error Title').closest('[role="status"]');
      expect(toast).toHaveClass('destructive');
    });
  });

  describe('ToastProvider and ToastViewport', () => {
    it('should render provider and viewport without errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ToastProvider>
          <ToastViewport />
        </ToastProvider>
      );
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});