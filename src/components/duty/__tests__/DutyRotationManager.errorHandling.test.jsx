import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DutyRotationManager from '../DutyRotationManager';
import { DutyRotationService } from '../../../services/dutyRotationService';
import { localClient } from '../../../api/localClient';

// Mock the services
vi.mock('../../../services/dutyRotationService', () => ({
  DutyRotationService: {
    createRotation: vi.fn(),
    advanceRotation: vi.fn(),
    activateRotation: vi.fn(),
    deactivateRotation: vi.fn(),
    getRotationSchedule: vi.fn(),
    getCurrentAssignee: vi.fn(),
    getNextAssignee: vi.fn()
  }
}));

vi.mock('../../../api/localClient', () => ({
  localClient: {
    entities: {
      DutyRotation: {
        update: vi.fn(),
        delete: vi.fn()
      }
    }
  }
}));

const mockTeamMembers = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' },
  { id: '3', name: 'Bob Wilson' }
];

const mockRotation = {
  id: 'rotation-1',
  name: 'On-Call Rotation',
  type: 'DevOps',
  participants: ['1', '2', '3'],
  cycle_weeks: 1,
  current_assignee_index: 0,
  next_rotation_date: '2024-01-08T00:00:00Z',
  is_active: true
};

describe('DutyRotationManager Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DutyRotationService.getRotationSchedule.mockResolvedValue([]);
    DutyRotationService.getCurrentAssignee.mockResolvedValue({ id: '1', name: 'John Doe' });
    DutyRotationService.getNextAssignee.mockResolvedValue({ id: '2', name: 'Jane Smith' });
  });

  it('displays user-friendly error for invalid participants during creation', async () => {
    const user = userEvent.setup();
    const mockOnCreateRotation = vi.fn();
    
    DutyRotationService.createRotation.mockRejectedValue(
      new Error('participants must be an array')
    );

    render(
      <DutyRotationManager 
        rotations={[]}
        teamMembers={mockTeamMembers}
        onCreateRotation={mockOnCreateRotation}
      />
    );

    // Open create dialog
    await user.click(screen.getByText('Create Rotation'));

    // Fill out form with invalid data
    await user.type(screen.getByLabelText(/rotation name/i), 'Test Rotation');
    await user.selectOptions(screen.getByRole('combobox'), 'DevOps');
    await user.type(screen.getByLabelText(/cycle duration/i), '1');

    // Submit without selecting participants
    await user.click(screen.getByText('Create Rotation'));

    await waitFor(() => {
      expect(screen.getByText('Configuration Error')).toBeInTheDocument();
      expect(screen.getByText(/Invalid participants selected/)).toBeInTheDocument();
    });
  });

  it('shows confirmation dialog for rotation deletion with detailed information', async () => {
    const user = userEvent.setup();
    const mockOnDeleteRotation = vi.fn();

    render(
      <DutyRotationManager 
        rotations={[mockRotation]}
        teamMembers={mockTeamMembers}
        onDeleteRotation={mockOnDeleteRotation}
      />
    );

    // Open dropdown menu and click delete
    await user.click(screen.getAllByRole('button', { name: '' })[0]); // More options button
    await user.click(screen.getByText('Delete Rotation'));

    // Check confirmation dialog content
    expect(screen.getByText('Delete Rotation')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "On-Call Rotation"/)).toBeInTheDocument();
    expect(screen.getByText('Warning: This rotation is currently active')).toBeInTheDocument();
    
    // Check detailed information
    expect(screen.getByText('This will:')).toBeInTheDocument();
    expect(screen.getByText('Permanently remove the rotation configuration')).toBeInTheDocument();
    expect(screen.getByText('Stop automatic duty scheduling for this rotation')).toBeInTheDocument();
    expect(screen.getByText('Preserve existing individual duties')).toBeInTheDocument();
  });

  it('shows confirmation dialog for advancing rotation', async () => {
    const user = userEvent.setup();

    render(
      <DutyRotationManager 
        rotations={[mockRotation]}
        teamMembers={mockTeamMembers}
      />
    );

    // Open dropdown menu and click advance
    await user.click(screen.getAllByRole('button', { name: '' })[0]); // More options button
    await user.click(screen.getByText('Advance Rotation'));

    // Check confirmation dialog content
    expect(screen.getByText('Advance Rotation')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to advance "On-Call Rotation"/)).toBeInTheDocument();
    
    // Check detailed information
    expect(screen.getByText('This will:')).toBeInTheDocument();
    expect(screen.getByText('End the current participant\'s duty period')).toBeInTheDocument();
    expect(screen.getByText('Start the next participant\'s duty period immediately')).toBeInTheDocument();
    expect(screen.getByText('Manual advancement is usually only needed for exceptional circumstances')).toBeInTheDocument();
  });

  it('shows confirmation dialog for toggling rotation status', async () => {
    const user = userEvent.setup();

    render(
      <DutyRotationManager 
        rotations={[mockRotation]}
        teamMembers={mockTeamMembers}
      />
    );

    // Open dropdown menu and click deactivate
    await user.click(screen.getAllByRole('button', { name: '' })[0]); // More options button
    await user.click(screen.getByText('Deactivate'));

    // Check confirmation dialog content
    expect(screen.getByText('Deactivate Rotation')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to deactivate "On-Call Rotation"/)).toBeInTheDocument();
    
    // Check deactivation information
    expect(screen.getByText('Deactivating will:')).toBeInTheDocument();
    expect(screen.getByText('Stop automatic rotation scheduling')).toBeInTheDocument();
    expect(screen.getByText('Preserve current active duties until they naturally end')).toBeInTheDocument();
  });

  it('displays loading states during operations', async () => {
    const user = userEvent.setup();
    
    // Mock slow deletion
    let resolveDelete;
    const deletePromise = new Promise(resolve => {
      resolveDelete = resolve;
    });
    localClient.entities.DutyRotation.delete.mockReturnValue(deletePromise);

    render(
      <DutyRotationManager 
        rotations={[mockRotation]}
        teamMembers={mockTeamMembers}
      />
    );

    // Open dropdown and delete
    await user.click(screen.getAllByRole('button', { name: '' })[0]);
    await user.click(screen.getByText('Delete Rotation'));
    
    // Confirm deletion
    await user.click(screen.getByText('Delete Rotation'));

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    // Button should be disabled
    expect(screen.getByText('Deleting...')).toBeDisabled();

    // Resolve the operation
    resolveDelete();
  });

  it('handles advance rotation errors gracefully', async () => {
    const user = userEvent.setup();
    
    DutyRotationService.advanceRotation.mockRejectedValue(
      new Error('Cannot advance rotation: No active duties found')
    );

    render(
      <DutyRotationManager 
        rotations={[mockRotation]}
        teamMembers={mockTeamMembers}
      />
    );

    // Open dropdown and advance
    await user.click(screen.getAllByRole('button', { name: '' })[0]);
    await user.click(screen.getByText('Advance Rotation'));
    
    // Confirm advance
    await user.click(screen.getByText('Advance Rotation'));

    // Should show user-friendly error
    await waitFor(() => {
      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
      expect(screen.getByText(/Cannot advance rotation: No active duties found/)).toBeInTheDocument();
    });

    // Should have dismiss button
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('handles toggle status errors with context-specific messages', async () => {
    const user = userEvent.setup();
    
    DutyRotationService.deactivateRotation.mockRejectedValue(
      new Error('Cannot deactivate rotation with active duties')
    );

    render(
      <DutyRotationManager 
        rotations={[mockRotation]}
        teamMembers={mockTeamMembers}
      />
    );

    // Open dropdown and deactivate
    await user.click(screen.getAllByRole('button', { name: '' })[0]);
    await user.click(screen.getByText('Deactivate'));
    
    // Confirm deactivation
    await user.click(screen.getByText('Deactivate Rotation'));

    // Should show user-friendly error
    await waitFor(() => {
      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
      expect(screen.getByText(/Cannot deactivate rotation with active duties/)).toBeInTheDocument();
    });
  });

  it('shows operation in progress indicators', async () => {
    const user = userEvent.setup();
    const mockOnCreateRotation = vi.fn();
    
    // Mock slow creation
    let resolveCreate;
    const createPromise = new Promise(resolve => {
      resolveCreate = resolve;
    });
    DutyRotationService.createRotation.mockReturnValue(createPromise);

    render(
      <DutyRotationManager 
        rotations={[]}
        teamMembers={mockTeamMembers}
        onCreateRotation={mockOnCreateRotation}
      />
    );

    // Open create dialog
    await user.click(screen.getByText('Create Rotation'));

    // Fill out form
    await user.type(screen.getByLabelText(/rotation name/i), 'Test Rotation');
    await user.selectOptions(screen.getByRole('combobox'), 'DevOps');
    
    // Select participants
    await user.click(screen.getByLabelText(/John Doe/));
    await user.click(screen.getByLabelText(/Jane Smith/));

    // Submit form
    await user.click(screen.getByText('Create Rotation'));

    // Should show operation in progress
    await waitFor(() => {
      expect(screen.getByText('Creating rotation...')).toBeInTheDocument();
    });

    // Button should show loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument();

    // Resolve the operation
    resolveCreate({ id: 'new-rotation' });
  });

  it('dismisses global errors when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    
    DutyRotationService.advanceRotation.mockRejectedValue(
      new Error('Test error')
    );

    render(
      <DutyRotationManager 
        rotations={[mockRotation]}
        teamMembers={mockTeamMembers}
      />
    );

    // Trigger an error
    await user.click(screen.getAllByRole('button', { name: '' })[0]);
    await user.click(screen.getByText('Advance Rotation'));
    await user.click(screen.getByText('Advance Rotation'));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
    });

    // Dismiss the error
    await user.click(screen.getByText('Dismiss'));

    // Error should be gone
    expect(screen.queryByText('Operation Failed')).not.toBeInTheDocument();
  });
});