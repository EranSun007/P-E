import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DutyForm from '../DutyForm';
import { Duty, TeamMember } from '../../../api/entities';

// Mock the entities
vi.mock('../../../api/entities', () => ({
  Duty: {
    create: vi.fn(),
    update: vi.fn(),
    getConflicts: vi.fn(),
    checkForDuplicates: vi.fn()
  },
  TeamMember: {
    findAll: vi.fn()
  }
}));

const mockTeamMembers = [
  { id: 'tm1', name: 'John Doe' },
  { id: 'tm2', name: 'Jane Smith' }
];

describe('DutyForm Comprehensive Validation', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    TeamMember.findAll.mockResolvedValue(mockTeamMembers);
    Duty.getConflicts.mockResolvedValue([]);
    Duty.checkForDuplicates.mockResolvedValue([]);
  });

  describe('Field-level validation with real-time feedback', () => {
    it('should show validation errors for required fields', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Team member is required')).toBeInTheDocument();
        expect(screen.getByText('Duty type is required')).toBeInTheDocument();
        expect(screen.getByText('Title is required')).toBeInTheDocument();
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
        expect(screen.getByText('End date is required')).toBeInTheDocument();
      });
    });

    it('should validate field on blur', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      
      // Focus and blur without entering value
      await user.click(startDateInput);
      await user.tab(); // Move focus away

      await waitFor(() => {
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
      });
    });

    it('should clear field error when valid value is entered', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      
      // First trigger error
      await user.click(startDateInput);
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
      });

      // Then enter valid value
      await user.type(startDateInput, '2024-12-01');
      
      await waitFor(() => {
        expect(screen.queryByText('Start date is required')).not.toBeInTheDocument();
      });
    });

    it('should show field highlighting for validation states', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      
      // Should have error styling when invalid
      await user.click(startDateInput);
      await user.tab();
      
      await waitFor(() => {
        expect(startDateInput).toHaveClass('border-red-500');
      });

      // Should have success styling when valid
      await user.type(startDateInput, '2024-12-01');
      
      await waitFor(() => {
        expect(startDateInput).toHaveClass('border-green-500');
      });
    });
  });

  describe('Cross-field validation for date ranges', () => {
    it('should validate that end date is after start date', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      // Set end date before start date
      await user.type(startDateInput, '2024-12-10');
      await user.type(endDateInput, '2024-12-05');
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
      });
    });

    it('should validate duty period length limits', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      // Set duty period longer than 1 year
      await user.type(startDateInput, '2024-01-01');
      await user.type(endDateInput, '2025-12-31');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Duty period cannot exceed 1 year')).toBeInTheDocument();
      });
    });

    it('should validate minimum duty period', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      // Set same date for start and end
      await user.type(startDateInput, '2024-12-01');
      await user.type(endDateInput, '2024-12-01');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Duty period must be at least 1 day')).toBeInTheDocument();
      });
    });

    it('should validate date range limits', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);

      // Set date too far in the past
      await user.type(startDateInput, '2020-01-01');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Start date cannot be more than 1 year in the past')).toBeInTheDocument();
      });
    });
  });

  describe('Business rule validation', () => {
    it('should show warning for weekend on-call duties', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill form with weekend on-call duty
      await user.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
      await user.selectOptions(screen.getByLabelText(/duty type/i), 'on_call');
      await user.selectOptions(screen.getByLabelText(/title/i), 'DevOps');
      
      // Set start date to a Saturday (2024-12-07 is a Saturday)
      await user.type(screen.getByLabelText(/start date/i), '2024-12-07');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-14');

      // Should show business rule warning
      await waitFor(() => {
        expect(screen.getByText(/on-call duties starting on weekends may require additional approval/i)).toBeInTheDocument();
      });
    });

    it('should validate description length', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      const descriptionInput = screen.getByLabelText(/description/i);
      const longDescription = 'a'.repeat(501); // Exceeds 500 character limit

      await user.type(descriptionInput, longDescription);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Description must be under 500 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Network error handling with user-friendly messages', () => {
    it('should show user-friendly message for network errors', async () => {
      Duty.create.mockRejectedValue(new Error('Network error'));

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill valid form
      await user.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
      await user.selectOptions(screen.getByLabelText(/duty type/i), 'devops');
      await user.selectOptions(screen.getByLabelText(/title/i), 'DevOps');
      await user.type(screen.getByLabelText(/start date/i), '2024-12-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-07');

      await user.click(screen.getByRole('button', { name: /create duty/i }));

      await waitFor(() => {
        expect(screen.getByText(/unable to connect to the server/i)).toBeInTheDocument();
      });
    });

    it('should show user-friendly message for server errors', async () => {
      Duty.create.mockRejectedValue(new Error('500 Internal Server Error'));

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill valid form
      await user.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
      await user.selectOptions(screen.getByLabelText(/duty type/i), 'devops');
      await user.selectOptions(screen.getByLabelText(/title/i), 'DevOps');
      await user.type(screen.getByLabelText(/start date/i), '2024-12-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-07');

      await user.click(screen.getByRole('button', { name: /create duty/i }));

      await waitFor(() => {
        expect(screen.getByText(/a server error occurred/i)).toBeInTheDocument();
      });
    });

    it('should show specific message for duplicate errors', async () => {
      Duty.create.mockRejectedValue(new Error('Duplicate duty detected'));

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill valid form
      await user.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
      await user.selectOptions(screen.getByLabelText(/duty type/i), 'devops');
      await user.selectOptions(screen.getByLabelText(/title/i), 'DevOps');
      await user.type(screen.getByLabelText(/start date/i), '2024-12-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-07');

      await user.click(screen.getByRole('button', { name: /create duty/i }));

      await waitFor(() => {
        expect(screen.getByText(/duplicate entry was detected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Retry mechanisms for failed save operations', () => {
    it('should show retry button for retryable errors', async () => {
      Duty.create.mockRejectedValue(new Error('Network timeout'));

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill valid form
      await user.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
      await user.selectOptions(screen.getByLabelText(/duty type/i), 'devops');
      await user.selectOptions(screen.getByLabelText(/title/i), 'DevOps');
      await user.type(screen.getByLabelText(/start date/i), '2024-12-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-07');

      await user.click(screen.getByRole('button', { name: /create duty/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should not show retry button for non-retryable errors', async () => {
      Duty.create.mockRejectedValue(new Error('Duplicate duty detected'));

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill valid form
      await user.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
      await user.selectOptions(screen.getByLabelText(/duty type/i), 'devops');
      await user.selectOptions(screen.getByLabelText(/title/i), 'DevOps');
      await user.type(screen.getByLabelText(/start date/i), '2024-12-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-07');

      await user.click(screen.getByRole('button', { name: /create duty/i }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
      });
    });

    it('should retry operation when retry button is clicked', async () => {
      let callCount = 0;
      Duty.create.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({ id: 'duty1', title: 'Test Duty' });
      });

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill valid form
      await user.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
      await user.selectOptions(screen.getByLabelText(/duty type/i), 'devops');
      await user.selectOptions(screen.getByLabelText(/title/i), 'DevOps');
      await user.type(screen.getByLabelText(/start date/i), '2024-12-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-07');

      await user.click(screen.getByRole('button', { name: /create duty/i }));

      // Wait for error and retry button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      // Click retry
      await user.click(screen.getByRole('button', { name: /retry/i }));

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText(/duty assignment has been created successfully/i)).toBeInTheDocument();
      });

      expect(Duty.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Form submission prevention', () => {
    it('should prevent double submission', async () => {
      let resolveCreate;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      
      Duty.create.mockReturnValue(createPromise);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill valid form
      await user.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
      await user.selectOptions(screen.getByLabelText(/duty type/i), 'devops');
      await user.selectOptions(screen.getByLabelText(/title/i), 'DevOps');
      await user.type(screen.getByLabelText(/start date/i), '2024-12-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-07');

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      
      // Click submit multiple times rapidly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Button should be disabled after first click
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolveCreate({ id: 'duty1', title: 'Test Duty' });

      // Should only be called once
      await waitFor(() => {
        expect(Duty.create).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable submit button when form has validation errors', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      
      // Submit button should be disabled when form is empty
      expect(submitButton).toBeDisabled();

      // Fill some fields but leave required fields empty
      await user.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
      
      // Button should still be disabled
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when form is valid', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill valid form
      await user.selectOptions(screen.getByLabelText(/team member/i), 'tm1');
      await user.selectOptions(screen.getByLabelText(/duty type/i), 'devops');
      await user.selectOptions(screen.getByLabelText(/title/i), 'DevOps');
      await user.type(screen.getByLabelText(/start date/i), '2024-12-01');
      await user.type(screen.getByLabelText(/end date/i), '2024-12-07');

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      
      // Button should be enabled when form is valid
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});