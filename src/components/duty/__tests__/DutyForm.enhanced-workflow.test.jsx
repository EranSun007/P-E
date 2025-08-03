import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import DutyForm from '../DutyForm';
import { Duty, TeamMember } from '../../../api/entities';

// Mock the entities
vi.mock('../../../api/entities', () => ({
  Duty: {
    create: vi.fn(),
    update: vi.fn(),
    getConflicts: vi.fn()
  },
  TeamMember: {
    findAll: vi.fn()
  }
}));

const mockTeamMembers = [
  { id: 'tm1', name: 'John Doe' },
  { id: 'tm2', name: 'Jane Smith' }
];

describe('DutyForm Enhanced Workflow', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TeamMember.findAll.mockResolvedValue(mockTeamMembers);
    Duty.getConflicts.mockResolvedValue([]);
  });

  it('should prevent double submission and show proper feedback', async () => {
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

    // Fill out the form
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'tm1' } });
    
    const teamMemberSelect = screen.getByRole('combobox', { name: /team member/i });
    fireEvent.click(teamMemberSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('John Doe'));
    });

    const typeSelect = screen.getByRole('combobox', { name: /duty type/i });
    fireEvent.click(typeSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('DevOps Duty'));
    });

    const titleSelect = screen.getByRole('combobox', { name: /title/i });
    fireEvent.click(titleSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('DevOps'));
    });

    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2025-01-15' }
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2025-01-22' }
    });

    // Click submit button
    const submitButton = screen.getByRole('button', { name: /create duty/i });
    fireEvent.click(submitButton);

    // Button should be disabled and show loading state
    await waitFor(() => {
      expect(screen.getByText(/creating/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    // Try to click submit again - should be ignored
    fireEvent.click(submitButton);
    
    // Should still only have one call to create
    expect(Duty.create).toHaveBeenCalledTimes(1);

    // Resolve the promise to simulate successful creation
    const mockDuty = {
      id: 'duty1',
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-01-15',
      end_date: '2025-01-22'
    };
    resolveCreate(mockDuty);

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

  it('should include session ID in duty creation data', async () => {
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

    // Fill out minimal form data
    const teamMemberSelect = screen.getByRole('combobox', { name: /team member/i });
    fireEvent.click(teamMemberSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('John Doe'));
    });

    const typeSelect = screen.getByRole('combobox', { name: /duty type/i });
    fireEvent.click(typeSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('DevOps Duty'));
    });

    const titleSelect = screen.getByRole('combobox', { name: /title/i });
    fireEvent.click(titleSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('DevOps'));
    });

    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2025-01-15' }
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2025-01-22' }
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create duty/i }));

    await waitFor(() => {
      expect(Duty.create).toHaveBeenCalledWith(
        expect.objectContaining({
          creation_session_id: expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
        })
      );
    });
  });

  it('should reset form when cancel is clicked', async () => {
    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    // Fill out some form data
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2025-01-15' }
    });

    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Should call onCancel
    expect(mockOnCancel).toHaveBeenCalled();

    // Form should be reset (start date should be empty)
    expect(screen.getByLabelText(/start date/i)).toHaveValue('');
  });

  it('should handle creation errors gracefully', async () => {
    const errorMessage = 'Duplicate duty detected';
    Duty.create.mockRejectedValue(new Error(errorMessage));

    render(
      <DutyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        teamMembers={mockTeamMembers}
      />
    );

    // Fill out form
    const teamMemberSelect = screen.getByRole('combobox', { name: /team member/i });
    fireEvent.click(teamMemberSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('John Doe'));
    });

    const typeSelect = screen.getByRole('combobox', { name: /duty type/i });
    fireEvent.click(typeSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('DevOps Duty'));
    });

    const titleSelect = screen.getByRole('combobox', { name: /title/i });
    fireEvent.click(titleSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('DevOps'));
    });

    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2025-01-15' }
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2025-01-22' }
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create duty/i }));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/duplicate duty detected/i)).toBeInTheDocument();
    });

    // Should not call onSave
    expect(mockOnSave).not.toHaveBeenCalled();

    // Button should be enabled again for retry
    expect(screen.getByRole('button', { name: /create duty/i })).not.toBeDisabled();
  });

  it('should show validation success before submission', async () => {
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

    // Fill out form completely
    const teamMemberSelect = screen.getByRole('combobox', { name: /team member/i });
    fireEvent.click(teamMemberSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('John Doe'));
    });

    const typeSelect = screen.getByRole('combobox', { name: /duty type/i });
    fireEvent.click(typeSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('DevOps Duty'));
    });

    const titleSelect = screen.getByRole('combobox', { name: /title/i });
    fireEvent.click(titleSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('DevOps'));
    });

    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2025-01-15' }
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2025-01-22' }
    });

    // Should show validation success after all fields are filled
    await waitFor(() => {
      expect(screen.getByText(/validation successful/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});