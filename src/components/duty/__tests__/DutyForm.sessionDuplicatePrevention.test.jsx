import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DutyForm from '../DutyForm';
import { Duty, TeamMember } from '../../../api/entities';
import sessionManagementService from '../../../services/sessionManagementService';

// Mock the entities
vi.mock('../../../api/entities', () => ({
  Duty: {
    create: vi.fn(),
    checkForDuplicates: vi.fn(),
    getConflicts: vi.fn()
  },
  TeamMember: {
    findAll: vi.fn()
  }
}));

// Mock the session management service
vi.mock('../../../services/sessionManagementService', () => ({
  default: {
    generateSessionId: vi.fn(),
    registerSession: vi.fn(),
    markSessionCompleted: vi.fn(),
    isSessionActive: vi.fn(),
    findDutyBySession: vi.fn(),
    cleanupExpiredSessions: vi.fn()
  }
}));

// Mock DutyRefreshService
vi.mock('../../../services/dutyRefreshService', () => ({
  default: {
    createDutyWithRefresh: vi.fn(),
    updateDutyWithRefresh: vi.fn()
  }
}));

// Mock the validation hooks
vi.mock('../../../hooks/useDutyFormValidation', () => ({
  useDutyFormValidation: () => ({
    formData: {
      team_member_id: 'member1',
      type: 'devops',
      title: 'DevOps',
      description: '',
      start_date: '2025-08-01',
      end_date: '2025-08-07'
    },
    errors: {},
    isValidating: false,
    validationStatus: 'success',
    hasErrors: false,
    isFormValid: true,
    handleFieldChange: vi.fn(),
    handleFieldBlur: vi.fn(),
    getFieldError: vi.fn(() => null),
    getFieldValidationState: vi.fn(() => 'success'),
    validateFormData: vi.fn(() => ({
      isValid: true,
      errors: {},
      sanitizedData: {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        description: '',
        start_date: '2025-08-01',
        end_date: '2025-08-07'
      }
    })),
    resetForm: vi.fn(),
    handleApiError: vi.fn(),
    categorizeErrors: vi.fn()
  }),
  useDutyFormSubmission: () => ({
    isSubmitting: false,
    submitError: null,
    submitSuccess: false,
    canSubmit: true,
    handleSubmit: vi.fn((callback) => callback()),
    clearSubmissionState: vi.fn(),
    retrySubmission: vi.fn()
  })
}));

describe('DutyForm Session-based Duplicate Prevention', () => {
  const mockTeamMembers = [
    { id: 'member1', name: 'John Doe' },
    { id: 'member2', name: 'Jane Smith' }
  ];

  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    TeamMember.findAll.mockResolvedValue(mockTeamMembers);
    Duty.getConflicts.mockResolvedValue([]);
    Duty.checkForDuplicates.mockResolvedValue([]);
    sessionManagementService.generateSessionId.mockReturnValue('session_123456');
    sessionManagementService.isSessionActive.mockReturnValue(false);
    sessionManagementService.findDutyBySession.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate a unique session ID for each form instance', () => {
    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    expect(sessionManagementService.generateSessionId).toHaveBeenCalledTimes(1);
  });

  it('should prevent duplicate submission when session already completed a duty', async () => {
    const existingDuty = {
      id: 'duty123',
      team_member_id: 'member1',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-08-01',
      end_date: '2025-08-07',
      creation_session_id: 'session_123456'
    };

    // Mock that session already completed
    sessionManagementService.findDutyBySession.mockReturnValue(existingDuty);
    Duty.checkForDuplicates.mockResolvedValue([
      {
        type: 'session_duplicate',
        severity: 'high',
        message: 'Duplicate submission detected',
        conflictingDuties: [existingDuty]
      }
    ]);

    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create duty/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(Duty.create).not.toHaveBeenCalled();
      expect(mockOnSave).toHaveBeenCalledWith(existingDuty);
    });
  });

  it('should handle session-based duplicate warnings', async () => {
    const duplicateWarnings = [
      {
        type: 'session_duplicate',
        severity: 'high',
        message: 'This duty may have already been created in this session',
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

    const submitButton = screen.getByRole('button', { name: /create duty/i });
    await userEvent.click(submitButton);

    // Should show duplicate warning dialog
    await waitFor(() => {
      expect(screen.getByText(/duplicate.*detected/i)).toBeInTheDocument();
    });
  });

  it('should include session ID in duty creation data', async () => {
    const mockCreatedDuty = {
      id: 'duty123',
      team_member_id: 'member1',
      type: 'devops',
      title: 'DevOps',
      creation_session_id: 'session_123456'
    };

    Duty.create = vi.fn().mockResolvedValue(mockCreatedDuty);

    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create duty/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(Duty.create).toHaveBeenCalledWith(
        expect.objectContaining({
          creation_session_id: 'session_123456'
        })
      );
    });
  });

  it('should handle session cleanup on form unmount', () => {
    const { unmount } = render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    unmount();

    // Session cleanup should be handled by the service's periodic cleanup
    // This test verifies the form doesn't interfere with session management
    expect(sessionManagementService.generateSessionId).toHaveBeenCalledTimes(1);
  });

  it('should handle network errors during session-based duplicate check', async () => {
    const networkError = new Error('Network connection failed');
    Duty.checkForDuplicates.mockRejectedValue(networkError);

    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create duty/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/save failed/i)).toBeInTheDocument();
      expect(screen.getByText(/network connection failed/i)).toBeInTheDocument();
    });
  });

  it('should maintain session ID consistency across form interactions', async () => {
    const user = userEvent.setup();

    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    // Interact with form fields
    const teamMemberSelect = screen.getByRole('combobox', { name: /team member/i });
    await user.click(teamMemberSelect);

    const typeSelect = screen.getByRole('combobox', { name: /duty type/i });
    await user.click(typeSelect);

    // Session ID should remain the same throughout form interactions
    expect(sessionManagementService.generateSessionId).toHaveBeenCalledTimes(1);
  });

  it('should handle concurrent session management operations', async () => {
    // Simulate concurrent session operations
    sessionManagementService.isSessionActive.mockReturnValue(true);
    
    const duplicateWarnings = [
      {
        type: 'session_duplicate',
        severity: 'high',
        message: 'Another request is in progress for this session',
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

    const submitButton = screen.getByRole('button', { name: /create duty/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/duplicate.*detected/i)).toBeInTheDocument();
    });
  });
});