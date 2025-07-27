/**
 * GoalForm Component Tests
 * Comprehensive testing for goal creation and editing form
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import GoalForm from '../GoalForm';
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

const mockGoalData = {
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

describe('GoalForm Component', () => {
  let user;
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    EmployeeGoalsService.createGoal.mockResolvedValue(mockGoalData);
    EmployeeGoalsService.updateGoal.mockResolvedValue(mockGoalData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render create form correctly', () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Create New Goal')).toBeInTheDocument();
      expect(screen.getByLabelText('Employee')).toBeInTheDocument();
      expect(screen.getByLabelText('Goal Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Development Need')).toBeInTheDocument();
      expect(screen.getByLabelText('Development Activity')).toBeInTheDocument();
      expect(screen.getByLabelText('Goal Description')).toBeInTheDocument();
      expect(screen.getByText('Create Goal')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render edit form with initial data', () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          initialData={mockGoalData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit Goal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Lead the CAP/Otel project in the team')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Project management skills, team leadership, and communication.')).toBeInTheDocument();
      expect(screen.getByText('Update Goal')).toBeInTheDocument();
    });

    it('should show loading state when isLoading prop is true', () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByLabelText('Goal Title')).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByText('Create Goal');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Employee is required')).toBeInTheDocument();
        expect(screen.getByText('Goal title is required')).toBeInTheDocument();
        expect(screen.getByText('Development need is required')).toBeInTheDocument();
        expect(screen.getByText('Goal description is required')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate minimum length for title', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const titleInput = screen.getByLabelText('Goal Title');
      await user.type(titleInput, 'Ab');

      const submitButton = screen.getByText('Create Goal');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Title must be at least 5 characters')).toBeInTheDocument();
      });
    });

    it('should validate maximum length for fields', async () => {
      const longText = 'a'.repeat(501);

      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const titleInput = screen.getByLabelText('Goal Title');
      await user.type(titleInput, longText);

      const submitButton = screen.getByText('Create Goal');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Title must be less than 500 characters')).toBeInTheDocument();
      });
    });

    it('should allow development activity to be optional', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill required fields but leave development activity empty
      const employeeSelect = screen.getByLabelText('Employee');
      await user.click(employeeSelect);
      await user.click(screen.getByText('John Doe'));

      const titleInput = screen.getByLabelText('Goal Title');
      await user.type(titleInput, 'Test Goal Title');

      const needInput = screen.getByLabelText('Development Need');
      await user.type(needInput, 'Test development need');

      const descriptionInput = screen.getByLabelText('Goal Description');
      await user.type(descriptionInput, 'Test goal description');

      const submitButton = screen.getByText('Create Goal');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should handle employee selection', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const employeeSelect = screen.getByLabelText('Employee');
      await user.click(employeeSelect);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();

      await user.click(screen.getByText('John Doe'));

      expect(employeeSelect).toHaveDisplayValue('John Doe');
    });

    it('should handle text input changes', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const titleInput = screen.getByLabelText('Goal Title');
      await user.type(titleInput, 'New Goal Title');

      expect(titleInput).toHaveValue('New Goal Title');
    });

    it('should handle textarea input changes', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const descriptionTextarea = screen.getByLabelText('Goal Description');
      await user.type(descriptionTextarea, 'Detailed goal description with multiple lines\nSecond line here');

      expect(descriptionTextarea).toHaveValue('Detailed goal description with multiple lines\nSecond line here');
    });

    it('should clear field errors when user starts typing', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Submit to show validation errors
      const submitButton = screen.getByText('Create Goal');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Goal title is required')).toBeInTheDocument();
      });

      // Start typing in title field
      const titleInput = screen.getByLabelText('Goal Title');
      await user.type(titleInput, 'New title');

      await waitFor(() => {
        expect(screen.queryByText('Goal title is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit create form with valid data', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill out the form
      const employeeSelect = screen.getByLabelText('Employee');
      await user.click(employeeSelect);
      await user.click(screen.getByText('John Doe'));

      const titleInput = screen.getByLabelText('Goal Title');
      await user.type(titleInput, 'New Goal Title');

      const needInput = screen.getByLabelText('Development Need');
      await user.type(needInput, 'Skills improvement needed');

      const activityInput = screen.getByLabelText('Development Activity');
      await user.type(activityInput, 'Training and practice activities');

      const descriptionInput = screen.getByLabelText('Goal Description');
      await user.type(descriptionInput, 'Detailed goal description and objectives');

      const submitButton = screen.getByText('Create Goal');
      await user.click(submitButton);

      await waitFor(() => {
        expect(EmployeeGoalsService.createGoal).toHaveBeenCalledWith({
          employeeId: 'emp-1',
          title: 'New Goal Title',
          developmentNeed: 'Skills improvement needed',
          developmentActivity: 'Training and practice activities',
          developmentGoalDescription: 'Detailed goal description and objectives',
          status: 'active'
        });
        expect(mockOnSubmit).toHaveBeenCalledWith(mockGoalData);
      });
    });

    it('should submit update form with modified data', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          initialData={mockGoalData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const titleInput = screen.getByDisplayValue('Lead the CAP/Otel project in the team');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Goal Title');

      const submitButton = screen.getByText('Update Goal');
      await user.click(submitButton);

      await waitFor(() => {
        expect(EmployeeGoalsService.updateGoal).toHaveBeenCalledWith('goal-1', {
          employeeId: 'emp-1',
          title: 'Updated Goal Title',
          developmentNeed: 'Project management skills, team leadership, and communication.',
          developmentActivity: '1. Attend a project management training course by 2025-09-30.',
          developmentGoalDescription: '1. Develop a detailed project plan with timelines and deliverables',
          status: 'active'
        });
        expect(mockOnSubmit).toHaveBeenCalledWith(mockGoalData);
      });
    });

    it('should handle service errors during submission', async () => {
      EmployeeGoalsService.createGoal.mockRejectedValue(new Error('Service error'));

      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill out the form
      const employeeSelect = screen.getByLabelText('Employee');
      await user.click(employeeSelect);
      await user.click(screen.getByText('John Doe'));

      const titleInput = screen.getByLabelText('Goal Title');
      await user.type(titleInput, 'New Goal Title');

      const needInput = screen.getByLabelText('Development Need');
      await user.type(needInput, 'Skills improvement needed');

      const descriptionInput = screen.getByLabelText('Goal Description');
      await user.type(descriptionInput, 'Detailed goal description');

      const submitButton = screen.getByText('Create Goal');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save goal. Please try again.')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show loading state during submission', async () => {
      // Make service call hang to test loading state
      EmployeeGoalsService.createGoal.mockImplementation(() => new Promise(() => {}));

      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill minimal required fields
      const employeeSelect = screen.getByLabelText('Employee');
      await user.click(employeeSelect);
      await user.click(screen.getByText('John Doe'));

      const titleInput = screen.getByLabelText('Goal Title');
      await user.type(titleInput, 'New Goal Title');

      const needInput = screen.getByLabelText('Development Need');
      await user.type(needInput, 'Skills improvement needed');

      const descriptionInput = screen.getByLabelText('Goal Description');
      await user.type(descriptionInput, 'Detailed goal description');

      const submitButton = screen.getByText('Create Goal');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
        expect(screen.getByLabelText('Goal Title')).toBeDisabled();
      });
    });
  });

  describe('Form Actions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable form during submission', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByLabelText('Goal Title')).toBeDisabled();
      expect(screen.getByLabelText('Development Need')).toBeDisabled();
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  describe('Employee Data Handling', () => {
    it('should handle empty team members array', () => {
      render(
        <GoalForm 
          teamMembers={[]}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('Employee')).toBeInTheDocument();
      expect(screen.getByText('No team members available')).toBeInTheDocument();
    });

    it('should preserve selected employee in edit mode', () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          initialData={mockGoalData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const employeeSelect = screen.getByLabelText('Employee');
      expect(employeeSelect).toHaveDisplayValue('John Doe');
    });

    it('should handle invalid employee ID in initial data', () => {
      const invalidGoalData = {
        ...mockGoalData,
        employeeId: 'invalid-emp-id'
      };

      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          initialData={invalidGoalData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const employeeSelect = screen.getByLabelText('Employee');
      expect(employeeSelect).toHaveDisplayValue('Unknown Employee');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and form associations', () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('Employee')).toBeInTheDocument();
      expect(screen.getByLabelText('Goal Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Development Need')).toBeInTheDocument();
      expect(screen.getByLabelText('Development Activity (Optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Goal Description')).toBeInTheDocument();
    });

    it('should associate error messages with form fields', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByText('Create Goal');
      await user.click(submitButton);

      await waitFor(() => {
        const titleInput = screen.getByLabelText('Goal Title');
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
        expect(titleInput).toHaveAttribute('aria-describedby');
      });
    });

    it('should be keyboard navigable', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText('Employee')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Goal Title')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Development Need')).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle form submission without onSubmit prop', async () => {
      render(
        <GoalForm 
          teamMembers={mockTeamMembers}
          onCancel={mockOnCancel}
        />
      );

      // Fill required fields
      const employeeSelect = screen.getByLabelText('Employee');
      await user.click(employeeSelect);
      await user.click(screen.getByText('John Doe'));

      const titleInput = screen.getByLabelText('Goal Title');
      await user.type(titleInput, 'Test Title');

      const needInput = screen.getByLabelText('Development Need');
      await user.type(needInput, 'Test Need');

      const descriptionInput = screen.getByLabelText('Goal Description');
      await user.type(descriptionInput, 'Test Description');

      const submitButton = screen.getByText('Create Goal');
      await user.click(submitButton);

      // Should not throw error
      expect(screen.getByText('Create Goal')).toBeInTheDocument();
    });

    it('should handle form with very long team member names', () => {
      const longNameMembers = [
        { 
          id: 'emp-1', 
          name: 'John Doe with a Very Long Name That Should Be Handled Gracefully' 
        }
      ];

      render(
        <GoalForm 
          teamMembers={longNameMembers}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const employeeSelect = screen.getByLabelText('Employee');
      expect(employeeSelect).toBeInTheDocument();
    });
  });
});