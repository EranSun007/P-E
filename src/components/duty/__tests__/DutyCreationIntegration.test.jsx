import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DutyForm from '../DutyForm';
import { Duty, TeamMember } from '../../../api/entities';
import DutyRefreshService from '../../../services/dutyRefreshService';
import sessionManagementService from '../../../services/sessionManagementService';

// Mock all dependencies
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

vi.mock('../../../services/dutyRefreshService', () => ({
  default: {
    createDutyWithRefresh: vi.fn(),
    updateDutyWithRefresh: vi.fn()
  }
}));

vi.mock('../../../services/sessionManagementService', () => ({
  default: {
    generateSessionId: vi.fn(() => 'session_test_123'),
    isValidSession: vi.fn(() => true),
    cleanupExpiredSessions: vi.fn()
  }
}));

const mockTeamMembers = [
  { id: 'tm1', name: 'John Doe' },
  { id: 'tm2', name: 'Jane Smith' }
];

describe('Duty Creation Integration Tests', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    TeamMember.findAll.mockResolvedValue(mockTeamMembers);
    Duty.getConflicts.mockResolvedValue([]);
    Duty.checkForDuplicates.mockResolvedValue([]);
    DutyRefreshService.createDutyWithRefresh.mockImplementation((data) => 
      Promise.resolve({ ...data, id: 'duty1' })
    );
    DutyRefreshService.updateDutyWithRefresh.mockImplementation((id, data) => 
      Promise.resolve({ ...data, id })
    );
  });

  const fillBasicForm = async () => {
    // Fill required fields only for faster testing
    const startDateField = screen.getByLabelText(/start date/i);
    await user.clear(startDateField);
    await user.type(startDateField, '2025-01-15');

    const endDateField = screen.getByLabelText(/end date/i);
    await user.clear(endDateField);
    await user.type(endDateField, '2025-01-22');
  };

  describe('Duplicate Prevention Integration', () => {
    it('should integrate duplicate checking with form submission', async () => {
      const duplicateWarnings = [
        {
          type: 'exact_duplicate',
          severity: 'high',
          message: 'Identical duty exists',
          conflictingDuties: [
            {
              id: 'existing1',
              type: 'devops',
              title: 'DevOps',
              start_date: '2025-01-15',
              end_date: '2025-01-22'
            }
          ]
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

      await fillBasicForm();

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should call duplicate check with correct data
      await waitFor(() => {
        expect(Duty.checkForDuplicates).toHaveBeenCalledWith(
          expect.objectContaining({
            start_date: '2025-01-15T00:00:00.000Z',
            end_date: '2025-01-22T00:00:00.000Z',
            creation_session_id: 'session_test_123'
          }),
          undefined
        );
      });

      // Should show duplicate warning dialog
      await waitFor(() => {
        expect(screen.getByText('Duplicate Duty Warning')).toBeInTheDocument();
      });

      // Should not proceed with creation until confirmed
      expect(DutyRefreshService.createDutyWithRefresh).not.toHaveBeenCalled();
    });

    it('should handle multiple duplicate warnings with different severities', async () => {
      const duplicateWarnings = [
        {
          type: 'exact_duplicate',
          severity: 'high',
          message: 'Identical duty exists',
          conflictingDuties: []
        },
        {
          type: 'overlapping_dates',
          severity: 'medium',
          message: 'Date overlap detected',
          conflictingDuties: []
        },
        {
          type: 'similar_title',
          severity: 'low',
          message: 'Similar title found',
          conflictingDuties: []
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

      await fillBasicForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show all warnings in dialog
      await waitFor(() => {
        expect(screen.getByText('Duplicate Duty Warning')).toBeInTheDocument();
        expect(screen.getByText(/identical duty exists/i)).toBeInTheDocument();
        expect(screen.getByText(/date overlap detected/i)).toBeInTheDocument();
        expect(screen.getByText(/similar title found/i)).toBeInTheDocument();
      });

      // Should show appropriate action button for highest severity
      expect(screen.getByText('Create Anyway')).toBeInTheDocument();
    });

    it('should proceed with creation after duplicate confirmation', async () => {
      const duplicateWarnings = [
        {
          type: 'overlapping_dates',
          severity: 'medium',
          message: 'Date overlap detected',
          conflictingDuties: []
        }
      ];

      const mockCreatedDuty = {
        id: 'duty1',
        team_member_id: '',
        type: '',
        title: '',
        start_date: '2025-01-15T00:00:00.000Z',
        end_date: '2025-01-22T00:00:00.000Z'
      };

      Duty.checkForDuplicates.mockResolvedValue(duplicateWarnings);
      DutyRefreshService.createDutyWithRefresh.mockResolvedValue(mockCreatedDuty);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillBasicForm();

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Wait for duplicate dialog
      await waitFor(() => {
        expect(screen.getByText('Duplicate Duty Warning')).toBeInTheDocument();
      });

      // Confirm creation
      const confirmButton = screen.getByText('Create Duty');
      await user.click(confirmButton);

      // Should proceed with creation using refresh service
      await waitFor(() => {
        expect(DutyRefreshService.createDutyWithRefresh).toHaveBeenCalledWith(
          expect.objectContaining({
            start_date: '2025-01-15T00:00:00.000Z',
            end_date: '2025-01-22T00:00:00.000Z',
            creation_session_id: 'session_test_123'
          }),
          expect.objectContaining({
            showOptimistic: true,
            highlightNew: true,
            refreshViews: true
          })
        );
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
      });

      // Should call onSave after delay
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(mockCreatedDuty);
      }, { timeout: 2000 });
    });

    it('should handle duplicate check failures gracefully', async () => {
      const duplicateCheckError = new Error('Duplicate check service unavailable');
      Duty.checkForDuplicates.mockRejectedValue(duplicateCheckError);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillBasicForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/duplicate check service unavailable/i)).toBeInTheDocument();
      });

      // Should not proceed with creation
      expect(DutyRefreshService.createDutyWithRefresh).not.toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();

      // Should show retry option if error is retryable
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Refresh Service Integration', () => {
    it('should use refresh service for new duty creation', async () => {
      const mockCreatedDuty = {
        id: 'duty1',
        team_member_id: '',
        type: '',
        title: '',
        description: '',
        start_date: '2025-01-15T00:00:00.000Z',
        end_date: '2025-01-22T00:00:00.000Z'
      };

      DutyRefreshService.createDutyWithRefresh.mockResolvedValue(mockCreatedDuty);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillBasicForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(DutyRefreshService.createDutyWithRefresh).toHaveBeenCalledWith(
          expect.objectContaining({
            start_date: '2025-01-15T00:00:00.000Z',
            end_date: '2025-01-22T00:00:00.000Z',
            creation_session_id: 'session_test_123'
          }),
          expect.objectContaining({
            showOptimistic: true,
            highlightNew: true,
            refreshViews: true
          })
        );
      });
    });

    it('should use refresh service for duty updates', async () => {
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

      DutyRefreshService.updateDutyWithRefresh.mockResolvedValue(updatedDuty);

      render(
        <DutyForm
          duty={existingDuty}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Update description
      const descriptionField = screen.getByLabelText(/description/i);
      await user.clear(descriptionField);
      await user.type(descriptionField, 'Updated description');

      const submitButton = screen.getByRole('button', { name: /update duty/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(DutyRefreshService.updateDutyWithRefresh).toHaveBeenCalledWith(
          'duty1',
          expect.objectContaining({
            description: 'Updated description'
          }),
          expect.objectContaining({
            showOptimistic: true,
            highlightUpdated: true,
            refreshViews: true
          })
        );
      });
    });

    it('should handle refresh service failures', async () => {
      const refreshError = new Error('Failed to refresh calendar views');
      DutyRefreshService.createDutyWithRefresh.mockRejectedValue(refreshError);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillBasicForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to refresh calendar views/i)).toBeInTheDocument();
      });

      // Should not call onSave
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Session Management Integration', () => {
    it('should generate and use session ID consistently', async () => {
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillBasicForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should use same session ID for duplicate check and creation
      await waitFor(() => {
        expect(Duty.checkForDuplicates).toHaveBeenCalledWith(
          expect.objectContaining({
            creation_session_id: 'session_test_123'
          }),
          undefined
        );
      });

      await waitFor(() => {
        expect(DutyRefreshService.createDutyWithRefresh).toHaveBeenCalledWith(
          expect.objectContaining({
            creation_session_id: 'session_test_123'
          }),
          expect.any(Object)
        );
      });
    });

    it('should handle session validation', async () => {
      // Mock invalid session
      sessionManagementService.isValidSession.mockReturnValue(false);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillBasicForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should still proceed but may show warning
      // (Implementation depends on session validation strategy)
      await waitFor(() => {
        expect(Duty.checkForDuplicates).toHaveBeenCalled();
      });
    });
  });

  describe('Conflict Detection Integration', () => {
    it('should integrate conflict checking with form validation', async () => {
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

      await fillBasicForm();

      // Should show conflict warning
      await waitFor(() => {
        expect(screen.getByText(/duty conflicts detected/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Submit button should be disabled
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      expect(submitButton).toBeDisabled();

      // Should not proceed with submission
      await user.click(submitButton);
      expect(Duty.checkForDuplicates).not.toHaveBeenCalled();
      expect(DutyRefreshService.createDutyWithRefresh).not.toHaveBeenCalled();
    });

    it('should handle conflict resolution', async () => {
      // Initially has conflicts
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

      await fillBasicForm();

      // Should show conflicts
      await waitFor(() => {
        expect(screen.getByText(/duty conflicts detected/i)).toBeInTheDocument();
      });

      // Resolve conflicts by changing dates
      Duty.getConflicts.mockResolvedValue([]);

      const endDateField = screen.getByLabelText(/end date/i);
      await user.clear(endDateField);
      await user.type(endDateField, '2025-01-14'); // Before conflict

      // Should clear conflicts
      await waitFor(() => {
        expect(screen.queryByText(/duty conflicts detected/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Submit button should be enabled
      const submitButton = screen.getByRole('button', { name: /create duty/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle cascading failures gracefully', async () => {
      // First duplicate check fails
      Duty.checkForDuplicates.mockRejectedValueOnce(new Error('Network error'));
      
      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      await fillBasicForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Fix the error for retry
      Duty.checkForDuplicates.mockResolvedValue([]);
      DutyRefreshService.createDutyWithRefresh.mockResolvedValue({ id: 'duty1' });

      // Retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
      });
    });

    it('should maintain form state during error recovery', async () => {
      const networkError = new Error('Connection timeout');
      Duty.checkForDuplicates.mockRejectedValue(networkError);

      render(
        <DutyForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          teamMembers={mockTeamMembers}
        />
      );

      // Fill form with description
      const descriptionField = screen.getByLabelText(/description/i);
      await user.type(descriptionField, 'Important duty description');

      await fillBasicForm();

      const submitButton = screen.getByRole('button', { name: /create duty/i });
      await user.click(submitButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/connection timeout/i)).toBeInTheDocument();
      });

      // Form data should be preserved
      expect(descriptionField).toHaveValue('Important duty description');
      expect(screen.getByLabelText(/start date/i)).toHaveValue('2025-01-15');
      expect(screen.getByLabelText(/end date/i)).toHaveValue('2025-01-22');
    });
  });
});