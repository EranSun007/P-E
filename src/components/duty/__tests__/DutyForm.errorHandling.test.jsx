import React from 'react';
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
    getConflicts: vi.fn()
  },
  TeamMember: {
    findAll: vi.fn()
  }
}));

const mockTeamMembers = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' }
];

const mockFormData = {
  team_member_id: '1',
  type: 'devops',
  title: 'DevOps',
  description: 'Test duty',
  start_date: '2024-01-01',
  end_date: '2024-01-07'
};

// Helper function to fill out the form
const fillOutForm = async (user) => {
  // Team member selection
  const teamMemberSelect = screen.getByText('Select team member').closest('button');
  await user.click(teamMemberSelect);
  await user.click(screen.getByText('John Doe'));
  
  // Duty type selection
  const dutyTypeSelect = screen.getByText('Select duty type').closest('button');
  await user.click(dutyTypeSelect);
  await user.click(screen.getByText('DevOps Duty'));
  
  // Title selection
  const titleSelect = screen.getByText('Select duty title').closest('button');
  await user.click(titleSelect);
  await user.click(screen.getByText('DevOps'));
  
  // Date inputs
  await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
  await user.type(screen.getByLabelText(/end date/i), '2024-01-07');
};

describe('DutyForm Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TeamMember.findAll.mockResolvedValue(mockTeamMembers);
    Duty.getConflicts.mockResolvedValue([]);
  });

  it('displays enhanced duplicate error message', async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();
    
    // Mock duplicate error
    Duty.create.mockRejectedValue(
      new Error('Duplicate duty detected: A duty with the same type "devops", title "DevOps", and date range already exists for this team member')
    );

    render(
      <DutyForm 
        onSave={mockOnSave}
        teamMembers={mockTeamMembers}
      />
    );

    // Fill out the form
    await fillOutForm(user);

    // Submit the form
    await user.click(screen.getByRole('button', { name: /create duty/i }));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Duplicate Duty Detected')).toBeInTheDocument();
    });

    // Check for helpful suggestions
    expect(screen.getByText('What you can do:')).toBeInTheDocument();
    expect(screen.getByText('Change the duty title to make it unique')).toBeInTheDocument();
    expect(screen.getByText('Adjust the start or end dates')).toBeInTheDocument();
  });

  it('displays enhanced conflict warning with detailed information', async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();
    
    const conflictingDuty = {
      id: '2',
      title: 'Existing DevOps Duty',
      type: 'devops',
      start_date: '2024-01-03T00:00:00Z',
      end_date: '2024-01-10T00:00:00Z'
    };

    Duty.getConflicts.mockResolvedValue([conflictingDuty]);

    render(
      <DutyForm 
        onSave={mockOnSave}
        teamMembers={mockTeamMembers}
      />
    );

    // Fill out the form to trigger conflict check
    await fillOutForm(user);

    // Wait for conflict validation
    await waitFor(() => {
      expect(screen.getByText('Duty Conflicts Detected')).toBeInTheDocument();
    });

    // Check for detailed conflict information
    expect(screen.getByText('Existing DevOps Duty')).toBeInTheDocument();
    expect(screen.getByText('Resolution required:')).toBeInTheDocument();
    expect(screen.getByText('Adjust the start or end dates to avoid overlap')).toBeInTheDocument();

    // Submit button should be disabled
    expect(screen.getByRole('button', { name: /create duty/i })).toBeDisabled();
  });

  it('shows loading states during validation', async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();
    
    // Mock slow conflict check
    let resolveConflicts;
    const conflictPromise = new Promise(resolve => {
      resolveConflicts = resolve;
    });
    Duty.getConflicts.mockReturnValue(conflictPromise);

    render(
      <DutyForm 
        onSave={mockOnSave}
        teamMembers={mockTeamMembers}
      />
    );

    // Fill out the form to trigger validation
    await fillOutForm(user);

    // Should show validating state
    await waitFor(() => {
      expect(screen.getByText('Validating duty assignment...')).toBeInTheDocument();
    });

    // Button should show validating state
    expect(screen.getByText('Validating...')).toBeInTheDocument();

    // Resolve the validation
    resolveConflicts([]);

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText('Validation successful!')).toBeInTheDocument();
    });
  });

  it('displays rotation configuration errors', async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();
    
    // Mock rotation error
    Duty.create.mockRejectedValue(
      new Error('rotation_participants must be a number >= 2 when is_rotation is true')
    );

    render(
      <DutyForm 
        onSave={mockOnSave}
        teamMembers={mockTeamMembers}
      />
    );

    // Fill out the form
    await fillOutForm(user);

    // Submit the form
    await user.click(screen.getByRole('button', { name: /create duty/i }));

    // Wait for rotation error to appear
    await waitFor(() => {
      expect(screen.getByText('Rotation Configuration Error')).toBeInTheDocument();
    });

    expect(screen.getByText(/rotation_participants must be a number/)).toBeInTheDocument();
  });

  it('shows success validation state when no conflicts', async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();
    
    Duty.getConflicts.mockResolvedValue([]);

    render(
      <DutyForm 
        onSave={mockOnSave}
        teamMembers={mockTeamMembers}
      />
    );

    // Fill out the form
    await fillOutForm(user);

    // Wait for validation success
    await waitFor(() => {
      expect(screen.getByText('Validation successful!')).toBeInTheDocument();
    });

    // Button should show success styling
    const submitButton = screen.getByRole('button', { name: /create duty/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('handles validation errors gracefully', async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();
    
    // Mock validation failure
    Duty.getConflicts.mockRejectedValue(new Error('Network error'));

    render(
      <DutyForm 
        onSave={mockOnSave}
        teamMembers={mockTeamMembers}
      />
    );

    // Fill out the form to trigger validation
    await fillOutForm(user);

    // Wait for validation error
    await waitFor(() => {
      expect(screen.getByText('Failed to validate duty conflicts. Please try again.')).toBeInTheDocument();
    });
  });
});