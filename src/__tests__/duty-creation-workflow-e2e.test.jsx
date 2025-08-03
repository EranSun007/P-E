import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DutyForm from '../components/duty/DutyForm';
import { Duty, TeamMember } from '../api/entities';

// Mock the entities and services
vi.mock('../api/entities', () => ({
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

vi.mock('../services/dutyRefreshService', () => ({
  default: {
    createDutyWithRefresh: vi.fn(),
    updateDutyWithRefresh: vi.fn()
  }
}));

vi.mock('../services/sessionManagementService', () => ({
  default: {
    generateSessionId: vi.fn(() => 'session_123_abc')
  }
}));

const mockTeamMembers = [
  { id: 'tm1', name: 'John Doe' },
  { id: 'tm2', name: 'Jane Smith' },
  { id: 'tm3', name: 'Bob Wilson' }
];

describe('Duty Creation Workflow - End-to-End Tests', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    TeamMember.findAll.mockResolvedValue(mockTeamMembers);
    Duty.getConflicts.mockResolvedValue([]);
    Duty.checkForDuplicates.mockResolvedValue([]);
  });

  const fillCompleteForm = async (overrides = {}) => {
    const formData = {
      teamMemberId: 'tm1',
      teamMemberName: 'John Doe',
      dutyType: 'devops',
      dutyTypeLabel: 'DevOps Duty',
      title: 'DevOps',
      titleLabel: 'DevOps',
      description: 'Test duty description',
      startDate: '2025-01-15',
      endDate: '2025-01-22',
      ...overrides
    };

    // Team Member Selection
    const teamMemberSelect = screen.getByRole('combobox', { name: /team member/i });
    await user.click(teamMemberSelect);
    await waitFor(() => {
      const option = screen.getByText(formData.teamMemberName);
      return user.click(option);
    });

    // Duty Type Selection
    const typeSelect = screen.getByRole('combobox', { name: /duty type/i });
    await user.click(typeSelect);
    await waitFor(() => {
      const option = screen.getByText(formData.dutyTypeLabel);
      return user.click(option);
    });

    // Title Selection
    const titleSelect = screen.getByRole('combobox', { name: /title/i });
    await user.click(titleSelect);
    await waitFor(() => {
      const option = screen.getByText(formData.titleLabel);
      return user.click(option);
    });

    // Description
    if (formData.description) {
      const descriptionField = screen.getByLabelText(/description/i);
      await user.clear(descriptionField);
      await user.type(descriptionField, formData.description);
    }

    // Dates
    const startDateField = screen.getByLabelText(/start date/i);
    await user.clear(startDateField);
    await user.type(startDateField, formData.startDate);

    const endDateField = screen.getByLabelText(/end date/i);
    await user.clear(endDateField);
    await user.type(endDateField, formData.endDate);

    return formData;
  };

  describe('Complete Duty Creation Flow', () => {
    it('should successfully create a new duty with all validations', async () => {
      const mockDuty = {
        id: 'duty1',
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        description: 'Test duty description',
        start_date: '2025-01-15T00:00:00.000Z',
        end_date: '2025-01-22T00:00:00.000Z'
      };

      Duty.create.mockResolvedValue(mockDuty);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill out the complete form
      await fillCompleteForm();

      // Should show validation success
      await waitFor(() => {
        expect(screen.getByText(/validation successful/i)).toBeInTheDocument();
      });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/creating/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      // Should check for duplicates
      await waitFor(() => {
        expect(Duty.checkForDuplicates).toHaveBeenCalledWith(
          expect.objectContaining({
            team_member_id: 'tm1',
            type: 'devops',
            title: 'DevOps',
            description: 'Test duty description',
            start_date: '2025-01-15T00:00:00.000Z',
            end_date: '2025-01-22T00:00:00.000Z',
            creation_session_id: 'session_123_abc'
          }),
          undefined
        );
      });

      // Should create the duty
      await waitFor(() => {
        expect(Duty.create).toHaveBeenCalledWith(
          expect.objectContaining({
            team_member_id: 'tm1',
            type: 'devops',
            title: 'DevOps',
            description: 'Test duty description',
            start_date: '2025-01-15T00:00:00.000Z',
            end_date: '2025-01-22T00:00:00.000Z',
            creation_session_id: 'session_123_abc'
          })
        );
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
        expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
      });

      // Should call onSave after delay
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(mockDuty);
      }, { timeout: 2000 });
    });

    it('should successfully update an existing duty', async () => {
      const existingDuty = {
        id: 'duty1',
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        description: 'Original description',
        start_date: '2025-01-15T00:00:00.000Z',
        end_date: '2025-01-22T00:00:00.000Z'
      };

      const updatedDuty = {
        ...existingDuty,
        description: 'Updated description'
      };

      Duty.update.mockResolvedValue(updatedDuty);

      render(
        <DutyForm
          duty={existingDuty}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Form should be pre-filled
      await waitFor(() => {
        expect(screen.getByDisplayValue('Original description')).toBeInTheDocument();
      });

      // Update description
      const descriptionField = screen.getByLabelText(/description/i);
      await user.clear(descriptionField);
      await user.type(descriptionField, 'Updated description');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /update duty/i });
      await user.click(submitButton);

      // Should check for duplicates with excludeId
      await waitFor(() => {
        expect(Duty.checkForDuplicates).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Updated description'
          }),
          'duty1' // excludeId for existing duty
        );
      });

      // Should update the duty
      await waitFor(() => {
        expect(Duty.update).toHaveBeenCalledWith(
          'duty1',
          expect.objectContaining({
            description: 'Updated description'
          })
        );
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Duplicate Prevention Workflow', () => {
    it('should handle exact duplicate warning and allow user to proceed', async () => {
      const duplicateWarnings = [
        {
          type: 'exact_duplicate',
          severity: 'high',
          message: 'An identical duty assignment already exists',
          conflictingDuties: [
            {
              id: 'existing1',
              type: 'devops',
              title: 'DevOps',
              start_date: '2025-01-15',
              end_date: '2025-01-22'
            }
          ],
          details: 'Exact match found: devops - DevOps for the same dates'
        }
      ];

      const mockDuty = {
        id: 'duty1',
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps'
      };

      Duty.checkForDuplicates.mockResolvedValue(duplicateWarnings);
      Duty.create.mockResolvedValue(mockDuty);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillCompleteForm();

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show duplicate warning dialog
      await waitFor(() => {
        expect(screen.getByText('Duplicate Duty Warning')).toBeInTheDocument();
        expect(screen.getByText('Exact Duplicate Detected')).toBeInTheDocument();
      });

      // Should not have created duty yet
      expect(Duty.create).not.toHaveBeenCalled();

      // User confirms creation
      const confirmButton = screen.getByText('Create Anyway');
      await user.click(confirmButton);

      // Should proceed with creation
      await waitFor(() => {
        expect(Duty.create).toHaveBeenCalled();
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle duplicate warning cancellation', async () => {
      const duplicateWarnings = [
        {
          type: 'overlapping_dates',
          severity: 'medium',
          message: 'Overlapping duty periods detected',
          conflictingDuties: [],
          details: 'Date ranges overlap with existing duties'
        }
      ];

      Duty.checkForDuplicates.mockResolvedValue(duplicateWarnings);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillCompleteForm();

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show duplicate warning dialog
      await waitFor(() => {
        expect(screen.getByText('Duplicate Duty Warning')).toBeInTheDocument();
      });

      // User cancels creation
      const cancelButton = screen.getByText('Cancel & Review');
      await user.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Duplicate Duty Warning')).not.toBeInTheDocument();
      });

      // Should not have created duty
      expect(Duty.create).not.toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();

      // Form should still be available for editing
      expect(screen.getByRole('button', { name: /create duty/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle validation errors gracefully', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/team member.*required/i)).toBeInTheDocument();
      });

      // Button should remain enabled for retry
      expect(submitButton).not.toBeDisabled();
    });

    it('should handle network errors with retry capability', async () => {
      const networkError = new Error('Network connection failed');
      Duty.checkForDuplicates.mockRejectedValue(networkError);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillCompleteForm();

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show network error
      await waitFor(() => {
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Clear the error for retry
      Duty.checkForDuplicates.mockResolvedValue([]);
      Duty.create.mockResolvedValue({ id: 'duty1' });

      // Click retry
      await user.click(retryButton);

      // Should retry the operation
      await waitFor(() => {
        expect(Duty.checkForDuplicates).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle conflicts and prevent submission', async () => {
      const conflictingDuties = [
        {
          id: 'conflict1',
          type: 'devops',
          title: 'DevOps',
          start_date: '2025-01-16T00:00:00.000Z',
          end_date: '2025-01-20T00:00:00.000Z'
        }
      ];

      Duty.getConflicts.mockResolvedValue(conflictingDuties);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillCompleteForm();

      // Should show conflict warning
      await waitFor(() => {
        expect(screen.getByText(/duty conflicts detected/i)).toBeInTheDocument();
      });

      // Submit button should be disabled
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      expect(submitButton).toBeDisabled();

      // Should not attempt to create duty
      await user.click(submitButton);
      expect(Duty.create).not.toHaveBeenCalled();
    });
  });

  describe('Form State Management', () => {
    it('should prevent double submission', async () => {
      // Mock slow API response
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

      await fillCompleteForm();

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Button should be disabled
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Try to click again - should be ignored
      await user.click(submitButton);

      // Should only have one call to create
      expect(Duty.create).toHaveBeenCalledTimes(1);

      // Resolve the promise
      resolveCreate({ id: 'duty1' });

      await waitFor(() => {
        expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
      });
    });

    it('should reset form when cancelled', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill out some form data
      const descriptionField = screen.getByLabelText(/description/i);
      await user.type(descriptionField, 'Test description');

      // Cancel the form
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should call onCancel
      expect(mockOnCancel).toHaveBeenCalled();

      // Form should be reset (description should be empty)
      expect(descriptionField).toHaveValue('');
    });

    it('should preserve form data on validation errors', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill out partial form
      const descriptionField = screen.getByLabelText(/description/i);
      await user.type(descriptionField, 'Test description');

      // Try to submit (will fail validation)
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Form data should be preserved
      expect(descriptionField).toHaveValue('Test description');
    });
  });

  describe('Real-time Validation', () => {
    it('should show validation success when form is complete', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillCompleteForm();

      // Should show validation success
      await waitFor(() => {
        expect(screen.getByText(/validation successful/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should check for conflicts in real-time', async () => {
      const conflictingDuties = [
        {
          id: 'conflict1',
          type: 'devops',
          title: 'DevOps',
          start_date: '2025-01-16T00:00:00.000Z',
          end_date: '2025-01-20T00:00:00.000Z'
        }
      ];

      // Initially no conflicts
      Duty.getConflicts.mockResolvedValue([]);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillCompleteForm();

      // Change mock to return conflicts
      Duty.getConflicts.mockResolvedValue(conflictingDuties);

      // Change a date to trigger conflict check
      const endDateField = screen.getByLabelText(/end date/i);
      await user.clear(endDateField);
      await user.type(endDateField, '2025-01-25');

      // Should show conflict warning
      await waitFor(() => {
        expect(screen.getByText(/duty conflicts detected/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Session Management', () => {
    it('should include session ID in all API calls', async () => {
      const mockDuty = { id: 'duty1' };
      Duty.create.mockResolvedValue(mockDuty);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should include session ID in duplicate check
      await waitFor(() => {
        expect(Duty.checkForDuplicates).toHaveBeenCalledWith(
          expect.objectContaining({
            creation_session_id: 'session_123_abc'
          }),
          undefined
        );
      });

      // Should include session ID in create call
      await waitFor(() => {
        expect(Duty.create).toHaveBeenCalledWith(
          expect.objectContaining({
            creation_session_id: 'session_123_abc'
          })
        );
      });
    });
  });
});