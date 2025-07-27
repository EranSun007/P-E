/**
 * GoalsList Component Tests
 * Comprehensive testing for goals list display, filtering, and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import GoalsList from '../GoalsList';
import EmployeeGoalsService from '@/services/employeeGoalsService';

// Mock the EmployeeGoalsService
vi.mock('@/services/employeeGoalsService');

// Mock toast notifications
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Sample test data
const mockTeamMembers = [
  { id: 'emp-1', name: 'John Doe' },
  { id: 'emp-2', name: 'Jane Smith' }
];

const mockGoals = [
  {
    id: 'goal-1',
    employeeId: 'emp-1',
    title: 'Lead the CAP/Otel project in the team',
    developmentNeed: 'Project management skills, team leadership, and communication.',
    developmentActivity: '1. Attend a project management training course by 2025-09-30.',
    developmentGoalDescription: '1. Develop a detailed project plan with timelines and deliverables',
    status: 'active',
    createdAt: '2025-07-27T10:00:00Z',
    updatedAt: '2025-07-27T10:00:00Z'
  },
  {
    id: 'goal-2',
    employeeId: 'emp-1',
    title: 'Lead AI Tools and Improve Development Excellence',
    developmentNeed: 'Enhanced understanding and application of AI tools for process improvement.',
    developmentActivity: 'Engage in targeted training and practical application of AI tools.',
    developmentGoalDescription: '1. Research and identify 3 key AI tools relevant to development excellence',
    status: 'completed',
    createdAt: '2025-07-27T10:00:00Z',
    updatedAt: '2025-07-27T10:00:00Z'
  },
  {
    id: 'goal-3',
    employeeId: 'emp-2',
    title: 'Lead the Security Domain in the Team',
    developmentNeed: 'Enhance leadership skills and security knowledge.',
    developmentActivity: '',
    developmentGoalDescription: '1. Schedule a meeting with team members to discuss current security challenges.',
    status: 'paused',
    createdAt: '2025-07-27T10:00:00Z',
    updatedAt: '2025-07-27T10:00:00Z'
  }
];

describe('GoalsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    EmployeeGoalsService.getAllGoals.mockResolvedValue(mockGoals);
    EmployeeGoalsService.getGoalsByEmployee.mockResolvedValue(mockGoals.filter(g => g.employeeId === 'emp-1'));
    EmployeeGoalsService.deleteGoal.mockResolvedValue(true);
    EmployeeGoalsService.updateGoal.mockResolvedValue(mockGoals[0]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering and Data Loading', () => {
    it('should render goals list correctly', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      expect(screen.getByText('Employee Goals')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search goals...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);
      expect(screen.getByText('Loading goals...')).toBeInTheDocument();
    });

    it('should display empty state when no goals exist', async () => {
      EmployeeGoalsService.getAllGoals.mockResolvedValue([]);
      
      render(<GoalsList teamMembers={mockTeamMembers} />);
      
      await waitFor(() => {
        expect(screen.getByText('No goals found')).toBeInTheDocument();
      });
    });

    it('should handle service errors gracefully', async () => {
      EmployeeGoalsService.getAllGoals.mockRejectedValue(new Error('Service error'));
      
      render(<GoalsList teamMembers={mockTeamMembers} />);
      
      await waitFor(() => {
        expect(screen.getByText('Error loading goals')).toBeInTheDocument();
      });
    });
  });

  describe('Goal Status Indicators', () => {
    it('should display correct status badges for different goal states', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Paused')).toBeInTheDocument();
      });
    });

    it('should apply correct styling to status badges', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        const activeBadge = screen.getByText('Active');
        const completedBadge = screen.getByText('Completed');
        const pausedBadge = screen.getByText('Paused');

        expect(activeBadge).toHaveClass('bg-green-100', 'text-green-800');
        expect(completedBadge).toHaveClass('bg-blue-100', 'text-blue-800');
        expect(pausedBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter goals by status', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });

      // Filter by active status
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      fireEvent.click(statusFilter);
      fireEvent.click(screen.getByText('Active'));

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
        expect(screen.queryByText('Lead AI Tools and Improve Development Excellence')).not.toBeInTheDocument();
      });
    });

    it('should filter goals by employee', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });

      // Filter by employee
      const employeeFilter = screen.getByRole('combobox', { name: /employee/i });
      fireEvent.click(employeeFilter);
      fireEvent.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(EmployeeGoalsService.getGoalsByEmployee).toHaveBeenCalledWith('emp-1');
      });
    });

    it('should search goals by text', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search goals...');
      fireEvent.change(searchInput, { target: { value: 'CAP/Otel' } });

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
        expect(screen.queryByText('Lead AI Tools and Improve Development Excellence')).not.toBeInTheDocument();
      });
    });

    it('should clear filters when clear button is clicked', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });

      // Apply a filter
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      fireEvent.click(statusFilter);
      fireEvent.click(screen.getByText('Active'));

      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
        expect(screen.getByText('Lead AI Tools and Improve Development Excellence')).toBeInTheDocument();
      });
    });
  });

  describe('Goal Actions', () => {
    it('should open edit dialog when edit button is clicked', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Goal')).toBeInTheDocument();
    });

    it('should show delete confirmation dialog', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Delete Goal')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this goal?')).toBeInTheDocument();
    });

    it('should delete goal when confirmed', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete', { selector: 'button' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(EmployeeGoalsService.deleteGoal).toHaveBeenCalledWith('goal-1');
      });
    });

    it('should update goal status when status action is clicked', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      });

      // Find and click complete button
      const completeButton = screen.getByText('Mark Complete');
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(EmployeeGoalsService.updateGoal).toHaveBeenCalledWith('goal-1', { status: 'completed' });
      });
    });
  });

  describe('Employee Integration', () => {
    it('should display employee names correctly', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should handle goals for employees not in team members list', async () => {
      const goalsWithUnknownEmployee = [
        ...mockGoals,
        {
          id: 'goal-4',
          employeeId: 'unknown-emp',
          title: 'Unknown Employee Goal',
          developmentNeed: 'Test need',
          developmentActivity: 'Test activity',
          developmentGoalDescription: 'Test description',
          status: 'active',
          createdAt: '2025-07-27T10:00:00Z',
          updatedAt: '2025-07-27T10:00:00Z'
        }
      ];

      EmployeeGoalsService.getAllGoals.mockResolvedValue(goalsWithUnknownEmployee);

      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Unknown Employee Goal')).toBeInTheDocument();
        expect(screen.getByText('Unknown Employee')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and Usability', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });
    });

    it('should be keyboard navigable', async () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search goals...');
        searchInput.focus();
        expect(searchInput).toHaveFocus();
      });
    });

    it('should show appropriate loading indicators', () => {
      render(<GoalsList teamMembers={mockTeamMembers} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty team members array', async () => {
      render(<GoalsList teamMembers={[]} />);

      await waitFor(() => {
        expect(screen.getByText('Employee Goals')).toBeInTheDocument();
      });
    });

    it('should handle goals with missing or null fields', async () => {
      const incompleteGoals = [
        {
          id: 'goal-incomplete',
          employeeId: 'emp-1',
          title: 'Incomplete Goal',
          developmentNeed: null,
          developmentActivity: '',
          developmentGoalDescription: undefined,
          status: 'active',
          createdAt: '2025-07-27T10:00:00Z',
          updatedAt: '2025-07-27T10:00:00Z'
        }
      ];

      EmployeeGoalsService.getAllGoals.mockResolvedValue(incompleteGoals);

      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText('Incomplete Goal')).toBeInTheDocument();
        expect(screen.getByText('No development need specified')).toBeInTheDocument();
      });
    });

    it('should handle very long goal titles and descriptions', async () => {
      const longGoals = [
        {
          id: 'goal-long',
          employeeId: 'emp-1',
          title: 'This is a very long goal title that should be properly truncated or wrapped to maintain good UI layout and readability',
          developmentNeed: 'A very long development need description that goes on and on and should be handled gracefully by the component without breaking the layout or causing display issues',
          developmentActivity: 'Extended activity description that is quite lengthy',
          developmentGoalDescription: 'Extremely detailed goal description that contains multiple sentences and should be displayed properly',
          status: 'active',
          createdAt: '2025-07-27T10:00:00Z',
          updatedAt: '2025-07-27T10:00:00Z'
        }
      ];

      EmployeeGoalsService.getAllGoals.mockResolvedValue(longGoals);

      render(<GoalsList teamMembers={mockTeamMembers} />);

      await waitFor(() => {
        expect(screen.getByText(/This is a very long goal title/)).toBeInTheDocument();
      });
    });
  });
});