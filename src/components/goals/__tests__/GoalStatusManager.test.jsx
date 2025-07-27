/**
 * GoalStatusManager Component Tests
 * Testing goal status transitions and management functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import GoalStatusManager from '../GoalStatusManager';
import EmployeeGoalsService from '@/services/employeeGoalsService';

// Mock the EmployeeGoalsService
vi.mock('@/services/employeeGoalsService');

// Mock toast notifications
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const mockGoal = {
  id: 'goal-1',
  employeeId: 'emp-1',
  title: 'Lead the CAP/Otel project in the team',
  developmentNeed: 'Project management skills, team leadership, and communication.',
  developmentActivity: '1. Attend a project management training course by 2025-09-30.',
  developmentGoalDescription: '1. Develop a detailed project plan with timelines and deliverables',
  status: 'active',
  createdAt: '2025-07-27T10:00:00Z',
  updatedAt: '2025-07-27T10:00:00Z'
};

describe('GoalStatusManager Component', () => {
  let user;
  const mockOnStatusChange = vi.fn();

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    EmployeeGoalsService.completeGoal.mockResolvedValue({ ...mockGoal, status: 'completed' });
    EmployeeGoalsService.pauseGoal.mockResolvedValue({ ...mockGoal, status: 'paused' });
    EmployeeGoalsService.reactivateGoal.mockResolvedValue({ ...mockGoal, status: 'active' });
    EmployeeGoalsService.updateGoal.mockResolvedValue(mockGoal);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Status Display', () => {
    it('should display current status badge', () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const statusBadge = screen.getByText('Active');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should display completed status correctly', () => {
      const completedGoal = { ...mockGoal, status: 'completed' };
      render(<GoalStatusManager goal={completedGoal} onStatusChange={mockOnStatusChange} />);

      const statusBadge = screen.getByText('Completed');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('should display paused status correctly', () => {
      const pausedGoal = { ...mockGoal, status: 'paused' };
      render(<GoalStatusManager goal={pausedGoal} onStatusChange={mockOnStatusChange} />);

      const statusBadge = screen.getByText('Paused');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  describe('Status Actions - Active Goal', () => {
    it('should show complete and pause actions for active goal', () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      expect(screen.getByText('Mark as Complete')).toBeInTheDocument();
      expect(screen.getByText('Pause Goal')).toBeInTheDocument();
      expect(screen.queryByText('Reactivate Goal')).not.toBeInTheDocument();
    });

    it('should complete goal when mark complete is clicked', async () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const completeButton = screen.getByText('Mark as Complete');
      await user.click(completeButton);

      await waitFor(() => {
        expect(EmployeeGoalsService.completeGoal).toHaveBeenCalledWith('goal-1');
        expect(mockOnStatusChange).toHaveBeenCalledWith({ ...mockGoal, status: 'completed' });
      });
    });

    it('should pause goal when pause is clicked', async () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const pauseButton = screen.getByText('Pause Goal');
      await user.click(pauseButton);

      await waitFor(() => {
        expect(EmployeeGoalsService.pauseGoal).toHaveBeenCalledWith('goal-1');
        expect(mockOnStatusChange).toHaveBeenCalledWith({ ...mockGoal, status: 'paused' });
      });
    });
  });

  describe('Status Actions - Paused Goal', () => {
    const pausedGoal = { ...mockGoal, status: 'paused' };

    it('should show complete and reactivate actions for paused goal', () => {
      render(<GoalStatusManager goal={pausedGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      expect(screen.getByText('Mark as Complete')).toBeInTheDocument();
      expect(screen.getByText('Reactivate Goal')).toBeInTheDocument();
      expect(screen.queryByText('Pause Goal')).not.toBeInTheDocument();
    });

    it('should reactivate goal when reactivate is clicked', async () => {
      render(<GoalStatusManager goal={pausedGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const reactivateButton = screen.getByText('Reactivate Goal');
      await user.click(reactivateButton);

      await waitFor(() => {
        expect(EmployeeGoalsService.reactivateGoal).toHaveBeenCalledWith('goal-1');
        expect(mockOnStatusChange).toHaveBeenCalledWith({ ...mockGoal, status: 'active' });
      });
    });
  });

  describe('Status Actions - Completed Goal', () => {
    const completedGoal = { ...mockGoal, status: 'completed' };

    it('should show reactivate action for completed goal', () => {
      render(<GoalStatusManager goal={completedGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      expect(screen.getByText('Reactivate Goal')).toBeInTheDocument();
      expect(screen.queryByText('Mark as Complete')).not.toBeInTheDocument();
      expect(screen.queryByText('Pause Goal')).not.toBeInTheDocument();
    });

    it('should reactivate completed goal', async () => {
      render(<GoalStatusManager goal={completedGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const reactivateButton = screen.getByText('Reactivate Goal');
      await user.click(reactivateButton);

      await waitFor(() => {
        expect(EmployeeGoalsService.reactivateGoal).toHaveBeenCalledWith('goal-1');
        expect(mockOnStatusChange).toHaveBeenCalledWith({ ...mockGoal, status: 'active' });
      });
    });
  });

  describe('Confirmation Dialogs', () => {
    it('should show confirmation dialog for goal completion', async () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const completeButton = screen.getByText('Mark as Complete');
      await user.click(completeButton);

      expect(screen.getByText('Complete Goal')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to mark this goal as completed?')).toBeInTheDocument();
      expect(screen.getByText('This action will change the goal status to completed.')).toBeInTheDocument();
    });

    it('should show confirmation dialog for pausing goal', async () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const pauseButton = screen.getByText('Pause Goal');
      await user.click(pauseButton);

      expect(screen.getByText('Pause Goal')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to pause this goal?')).toBeInTheDocument();
    });

    it('should cancel status change when cancel is clicked in confirmation', async () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const completeButton = screen.getByText('Mark as Complete');
      await user.click(completeButton);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(EmployeeGoalsService.completeGoal).not.toHaveBeenCalled();
      expect(mockOnStatusChange).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during status update', async () => {
      // Make service call hang
      EmployeeGoalsService.completeGoal.mockImplementation(() => new Promise(() => {}));

      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const completeButton = screen.getByText('Mark as Complete');
      await user.click(completeButton);

      const confirmButton = screen.getByText('Complete Goal', { selector: 'button' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });
    });

    it('should disable actions during loading', () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} isLoading={true} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      expect(actionsButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      EmployeeGoalsService.completeGoal.mockRejectedValue(new Error('Service error'));

      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const completeButton = screen.getByText('Mark as Complete');
      await user.click(completeButton);

      const confirmButton = screen.getByText('Complete Goal', { selector: 'button' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update goal status. Please try again.')).toBeInTheDocument();
      });

      expect(mockOnStatusChange).not.toHaveBeenCalled();
    });

    it('should handle missing onStatusChange prop', async () => {
      render(<GoalStatusManager goal={mockGoal} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const completeButton = screen.getByText('Mark as Complete');
      await user.click(completeButton);

      const confirmButton = screen.getByText('Complete Goal', { selector: 'button' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(EmployeeGoalsService.completeGoal).toHaveBeenCalled();
      });

      // Should not throw error
    });
  });

  describe('Status History', () => {
    it('should display status history when available', () => {
      const goalWithHistory = {
        ...mockGoal,
        completedAt: '2025-07-26T14:30:00Z',
        pausedAt: '2025-07-25T09:15:00Z',
        reactivatedAt: '2025-07-24T11:45:00Z'
      };

      render(<GoalStatusManager goal={goalWithHistory} onStatusChange={mockOnStatusChange} showHistory={true} />);

      expect(screen.getByText('Status History')).toBeInTheDocument();
    });

    it('should format status history dates correctly', () => {
      const goalWithHistory = {
        ...mockGoal,
        status: 'completed',
        completedAt: '2025-07-26T14:30:00Z'
      };

      render(<GoalStatusManager goal={goalWithHistory} onStatusChange={mockOnStatusChange} showHistory={true} />);

      expect(screen.getByText(/Completed on/)).toBeInTheDocument();
      expect(screen.getByText(/Jul 26, 2025/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      expect(actionsButton).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should support keyboard navigation', async () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      
      // Focus and activate with keyboard
      actionsButton.focus();
      expect(actionsButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByText('Mark as Complete')).toBeInTheDocument();
    });

    it('should announce status changes to screen readers', async () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      fireEvent.click(actionsButton);

      const completeButton = screen.getByText('Mark as Complete');
      await user.click(completeButton);

      const confirmButton = screen.getByText('Complete Goal', { selector: 'button' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Goal status updated successfully');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid goal status', () => {
      const invalidGoal = { ...mockGoal, status: 'invalid-status' };
      render(<GoalStatusManager goal={invalidGoal} onStatusChange={mockOnStatusChange} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should handle missing goal prop', () => {
      render(<GoalStatusManager onStatusChange={mockOnStatusChange} />);

      expect(screen.getByText('No goal data')).toBeInTheDocument();
    });

    it('should handle goal without ID', () => {
      const goalWithoutId = { ...mockGoal, id: undefined };
      render(<GoalStatusManager goal={goalWithoutId} onStatusChange={mockOnStatusChange} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      expect(actionsButton).toBeDisabled();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode when specified', () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} compact={true} />);

      const statusBadge = screen.getByText('Active');
      expect(statusBadge).toHaveClass('text-xs', 'px-1', 'py-0.5');
    });

    it('should show minimal actions in compact mode', () => {
      render(<GoalStatusManager goal={mockGoal} onStatusChange={mockOnStatusChange} compact={true} />);

      const actionsButton = screen.getByRole('button', { name: /status actions/i });
      expect(actionsButton).toHaveClass('h-6', 'w-6');
    });
  });
});