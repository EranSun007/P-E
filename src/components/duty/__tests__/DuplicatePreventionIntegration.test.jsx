import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('Duty Form Duplicate Prevention Integration', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TeamMember.findAll.mockResolvedValue(mockTeamMembers);
    Duty.getConflicts.mockResolvedValue([]);
  });

  const fillFormData = async () => {
    // Fill out the form with valid data
    // Note: We can't easily test the Select components in jsdom due to Radix UI limitations
    // So we'll directly set the form data through the component's internal state
    // This is a limitation of the test environment, not the actual functionality
    
    // For now, just fill the date fields which we can test
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2025-01-15' }
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2025-01-22' }
    });
    
    // The form will still show validation errors for required fields,
    // but the duplicate prevention logic should still be testable
  };

  it('should show duplicate warning dialog when duplicates are detected', async () => {
    // Mock duplicate detection
    const duplicateWarnings = [
      {
        type: 'exact_duplicate',
        severity: 'high',
        message: 'An identical duty assignment already exists',
        conflictingDuties: [
          {
            id: 'duty1',
            type: 'devops',
            title: 'DevOps',
            start_date: '2025-01-15',
            end_date: '2025-01-22'
          }
        ],
        details: 'Exact match found: devops - DevOps for the same dates'
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

    await fillFormData();

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create duty/i }));

    // Should show duplicate warning dialog
    await waitFor(() => {
      expect(screen.getByText('Duplicate Duty Warning')).toBeInTheDocument();
      expect(screen.getByText('Exact Duplicate Detected')).toBeInTheDocument();
    });

    // Should not have called create yet
    expect(Duty.create).not.toHaveBeenCalled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should proceed with creation when user confirms duplicate warning', async () => {
    // Mock duplicate detection
    const duplicateWarnings = [
      {
        type: 'overlapping_dates',
        severity: 'medium',
        message: 'Overlapping duty periods detected',
        conflictingDuties: [],
        details: 'Test warning'
      }
    ];

    Duty.checkForDuplicates.mockResolvedValue(duplicateWarnings);
    Duty.create.mockResolvedValue({
      id: 'duty1',
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps'
    });

    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    await fillFormData();

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create duty/i }));

    // Wait for duplicate warning dialog
    await waitFor(() => {
      expect(screen.getByText('Duplicate Duty Warning')).toBeInTheDocument();
    });

    // Confirm creation
    fireEvent.click(screen.getByText('Create Duty'));

    // Should proceed with creation
    await waitFor(() => {
      expect(Duty.create).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: '2025-01-15T00:00:00.000Z',
          end_date: '2025-01-22T00:00:00.000Z',
          creation_session_id: expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
        })
      );
    });
  });

  it('should cancel creation when user cancels duplicate warning', async () => {
    // Mock duplicate detection
    const duplicateWarnings = [
      {
        type: 'exact_duplicate',
        severity: 'high',
        message: 'An identical duty assignment already exists',
        conflictingDuties: [],
        details: 'Test warning'
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

    await fillFormData();

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create duty/i }));

    // Wait for duplicate warning dialog
    await waitFor(() => {
      expect(screen.getByText('Duplicate Duty Warning')).toBeInTheDocument();
    });

    // Cancel creation
    fireEvent.click(screen.getByText('Cancel & Review'));

    // Should not proceed with creation
    await waitFor(() => {
      expect(screen.queryByText('Duplicate Duty Warning')).not.toBeInTheDocument();
    });

    expect(Duty.create).not.toHaveBeenCalled();
    expect(mockOnSave).not.toHaveBeenCalled();

    // Form should still be available for editing
    expect(screen.getByRole('button', { name: /create duty/i })).toBeInTheDocument();
  });

  it('should proceed directly when no duplicates are detected', async () => {
    // Mock no duplicates
    Duty.checkForDuplicates.mockResolvedValue([]);
    Duty.create.mockResolvedValue({
      id: 'duty1',
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps'
    });

    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    await fillFormData();

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create duty/i }));

    // Should proceed directly without showing duplicate dialog
    await waitFor(() => {
      expect(Duty.create).toHaveBeenCalled();
    });

    expect(screen.queryByText('Duplicate Duty Warning')).not.toBeInTheDocument();
  });

  it('should include session ID in duplicate check and creation', async () => {
    Duty.checkForDuplicates.mockResolvedValue([]);
    Duty.create.mockResolvedValue({
      id: 'duty1',
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps'
    });

    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    await fillFormData();

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create duty/i }));

    await waitFor(() => {
      expect(Duty.checkForDuplicates).toHaveBeenCalledWith(
        expect.objectContaining({
          creation_session_id: expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
        }),
        undefined // excludeId for new duty
      );
    });

    await waitFor(() => {
      expect(Duty.create).toHaveBeenCalledWith(
        expect.objectContaining({
          creation_session_id: expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
        })
      );
    });
  });

  it('should handle duplicate check errors gracefully', async () => {
    // Mock duplicate check failure
    Duty.checkForDuplicates.mockRejectedValue(new Error('Network error'));

    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    await fillFormData();

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create duty/i }));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    // Should not proceed with creation
    expect(Duty.create).not.toHaveBeenCalled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should prevent double submission during duplicate check', async () => {
    // Mock slow duplicate check
    let resolveDuplicateCheck;
    const duplicateCheckPromise = new Promise((resolve) => {
      resolveDuplicateCheck = resolve;
    });
    Duty.checkForDuplicates.mockReturnValue(duplicateCheckPromise);

    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    await fillFormData();

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create duty/i });
    fireEvent.click(submitButton);

    // Button should be disabled
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Try to click again - should be ignored
    fireEvent.click(submitButton);

    // Should only have one call to checkForDuplicates
    expect(Duty.checkForDuplicates).toHaveBeenCalledTimes(1);

    // Resolve the duplicate check
    resolveDuplicateCheck([]);

    await waitFor(() => {
      expect(Duty.create).toHaveBeenCalledTimes(1);
    });
  });

  it('should show different button text for high severity warnings', async () => {
    // Mock high severity duplicate
    const duplicateWarnings = [
      {
        type: 'exact_duplicate',
        severity: 'high',
        message: 'An identical duty assignment already exists',
        conflictingDuties: [],
        details: 'High severity warning'
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

    await fillFormData();

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create duty/i }));

    // Should show "Create Anyway" for high severity
    await waitFor(() => {
      expect(screen.getByText('Create Anyway')).toBeInTheDocument();
    });
  });
});