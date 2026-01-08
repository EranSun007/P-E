import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionStatusIndicator } from '../ConnectionStatusIndicator';
import { realTimeUpdateService } from '../../../services/realTimeUpdateService';

// Mock the real-time update service
vi.mock('../../../services/realTimeUpdateService', () => ({
  realTimeUpdateService: {
    getConnectionStatus: vi.fn(),
    onUpdate: vi.fn(),
    forceRefresh: vi.fn()
  }
}));

describe('ConnectionStatusIndicator', () => {
  let mockUnsubscribe;

  beforeEach(() => {
    mockUnsubscribe = vi.fn();
    realTimeUpdateService.onUpdate.mockReturnValue(mockUnsubscribe);
    realTimeUpdateService.getConnectionStatus.mockReturnValue({
      status: 'connected',
      isPolling: true,
      retryCount: 0,
      pollInterval: 30000
    });
    realTimeUpdateService.forceRefresh.mockResolvedValue({
      success: true,
      message: 'Refresh completed successfully'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render connection status indicator', () => {
      render(<ConnectionStatusIndicator />);
      
      // Should show connected icon
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show label when showLabel is true', () => {
      render(<ConnectionStatusIndicator showLabel={true} />);
      
      expect(screen.getByText('Live updates active')).toBeInTheDocument();
    });

    it('should not show label by default', () => {
      render(<ConnectionStatusIndicator />);
      
      expect(screen.queryByText('Live updates active')).not.toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should show connected status', () => {
      realTimeUpdateService.getConnectionStatus.mockReturnValue({
        status: 'connected',
        isPolling: true,
        retryCount: 0,
        pollInterval: 30000
      });

      render(<ConnectionStatusIndicator showLabel={true} />);
      
      expect(screen.getByText('Live updates active')).toBeInTheDocument();
    });

    it('should show retrying status', () => {
      realTimeUpdateService.getConnectionStatus.mockReturnValue({
        status: 'retrying',
        isPolling: true,
        retryCount: 2,
        pollInterval: 30000
      });

      render(<ConnectionStatusIndicator showLabel={true} />);
      
      expect(screen.getByText('Reconnecting... (2/3)')).toBeInTheDocument();
    });

    it('should show error status', () => {
      realTimeUpdateService.getConnectionStatus.mockReturnValue({
        status: 'error',
        isPolling: false,
        retryCount: 3,
        pollInterval: 30000
      });

      render(<ConnectionStatusIndicator showLabel={true} />);
      
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('should show connected but not polling status', () => {
      realTimeUpdateService.getConnectionStatus.mockReturnValue({
        status: 'connected',
        isPolling: false,
        retryCount: 0,
        pollInterval: 30000
      });

      render(<ConnectionStatusIndicator showLabel={true} />);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('Manual Refresh', () => {
    it('should call forceRefresh when refresh button is clicked', async () => {
      render(<ConnectionStatusIndicator />);
      
      const refreshButton = screen.getByRole('button');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(realTimeUpdateService.forceRefresh).toHaveBeenCalledOnce();
      });
    });

    it('should call onRefresh callback when provided', async () => {
      const mockOnRefresh = vi.fn();
      render(<ConnectionStatusIndicator onRefresh={mockOnRefresh} />);
      
      const refreshButton = screen.getByRole('button');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalledWith({
          success: true,
          message: 'Refresh completed successfully'
        });
      });
    });

    it('should handle refresh errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      realTimeUpdateService.forceRefresh.mockRejectedValue(new Error('Refresh failed'));
      
      render(<ConnectionStatusIndicator />);
      
      const refreshButton = screen.getByRole('button');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Manual refresh failed:', expect.any(Error));
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('should disable refresh button while refreshing', async () => {
      // Make forceRefresh return a promise that we can control
      let resolveRefresh;
      const refreshPromise = new Promise(resolve => {
        resolveRefresh = resolve;
      });
      realTimeUpdateService.forceRefresh.mockReturnValue(refreshPromise);
      
      render(<ConnectionStatusIndicator />);
      
      const refreshButton = screen.getByRole('button');
      fireEvent.click(refreshButton);
      
      // Button should be disabled while refreshing
      expect(refreshButton).toBeDisabled();
      
      // Resolve the refresh
      resolveRefresh({ success: true });
      
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });

  describe('Status Updates', () => {
    it('should subscribe to status updates on mount', () => {
      render(<ConnectionStatusIndicator />);
      
      expect(realTimeUpdateService.onUpdate).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should unsubscribe on unmount', () => {
      const { unmount } = render(<ConnectionStatusIndicator />);
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should update status when connection status changes', async () => {
      let statusUpdateCallback;
      realTimeUpdateService.onUpdate.mockImplementation((callback) => {
        statusUpdateCallback = callback;
        return mockUnsubscribe;
      });

      render(<ConnectionStatusIndicator showLabel={true} />);
      
      // Initially shows connected
      expect(screen.getByText('Live updates active')).toBeInTheDocument();
      
      // Mock status change to error
      realTimeUpdateService.getConnectionStatus.mockReturnValue({
        status: 'error',
        isPolling: false,
        retryCount: 3,
        pollInterval: 30000
      });
      
      // Trigger status update
      const updates = new Map();
      updates.set('connection_status', { status: 'error' });
      statusUpdateCallback(updates);
      
      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });
    });

    it('should ignore non-connection status updates', async () => {
      let statusUpdateCallback;
      realTimeUpdateService.onUpdate.mockImplementation((callback) => {
        statusUpdateCallback = callback;
        return mockUnsubscribe;
      });

      const getStatusSpy = vi.spyOn(realTimeUpdateService, 'getConnectionStatus');
      
      render(<ConnectionStatusIndicator />);
      
      // Clear initial calls
      getStatusSpy.mockClear();
      
      // Trigger non-connection update
      const updates = new Map();
      updates.set('meetings', { data: [] });
      statusUpdateCallback(updates);
      
      // Should not call getConnectionStatus for non-connection updates
      expect(getStatusSpy).not.toHaveBeenCalled();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<ConnectionStatusIndicator className="custom-class" />);
      
      const container = screen.getByRole('button').closest('div');
      expect(container).toHaveClass('custom-class');
    });
  });
});