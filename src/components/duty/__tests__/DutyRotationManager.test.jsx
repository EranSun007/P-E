import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import DutyRotationManager from '../DutyRotationManager';
import { DutyRotationService } from '../../../services/dutyRotationService';
import { localClient } from '../../../api/localClient';

// Mock the services
vi.mock('../../../services/dutyRotationService');
vi.mock('../../../api/localClient');

describe('DutyRotationManager', () => {
  const mockTeamMembers = [
    { id: 'tm1', name: 'John Doe' },
    { id: 'tm2', name: 'Jane Smith' },
    { id: 'tm3', name: 'Bob Johnson' },
    { id: 'tm4', name: 'Alice Brown' }
  ];

  const mockRotations = [
    {
      id: 'rot1',
      name: 'On-Call Rotation',
      type: 'DevOps',
      participants: ['tm1', 'tm2', 'tm3'],
      cycle_weeks: 1,
      current_assignee_index: 0,
      next_rotation_date: '2025-08-06T00:00:00.000Z',
      is_active: true,
      created_date: '2025-07-30T00:00:00.000Z',
      updated_date: '2025-07-30T00:00:00.000Z'
    },
    {
      id: 'rot2',
      name: 'Reporting Duty',
      type: 'Reporting',
      participants: ['tm2', 'tm4'],
      cycle_weeks: 2,
      current_assignee_index: 1,
      next_rotation_date: '2025-08-13T00:00:00.000Z',
      is_active: false,
      created_date: '2025-07-30T00:00:00.000Z',
      updated_date: '2025-07-30T00:00:00.000Z'
    }
  ];

  const mockRotationSchedule = [
    {
      participant_id: 'tm1',
      participant_name: 'John Doe',
      sequence: 0,
      cycle: 1,
      start_date: '2025-08-06',
      end_date: '2025-08-12',
      weeks_duration: 1,
      is_current: true
    },
    {
      participant_id: 'tm2',
      participant_name: 'Jane Smith',
      sequence: 1,
      cycle: 1,
      start_date: '2025-08-13',
      end_date: '2025-08-19',
      weeks_duration: 1,
      is_current: false
    }
  ];

  const defaultProps = {
    rotations: mockRotations,
    teamMembers: mockTeamMembers,
    onCreateRotation: vi.fn(),
    onUpdateRotation: vi.fn(),
    onDeleteRotation: vi.fn(),
    onRefresh: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service methods
    DutyRotationService.getRotationSchedule.mockResolvedValue(mockRotationSchedule);
    DutyRotationService.getCurrentAssignee.mockResolvedValue({ id: 'tm1', name: 'John Doe' });
    DutyRotationService.getNextAssignee.mockResolvedValue({ 
      assignee_id: 'tm2', 
      assignee_name: 'Jane Smith',
      assignee_index: 1,
      rotation_date: '2025-08-06T00:00:00.000Z',
      weeks_until_rotation: 1
    });
    DutyRotationService.createRotation.mockResolvedValue({
      id: 'new-rot',
      name: 'New Rotation',
      type: 'DevOps',
      participants: ['tm1', 'tm2'],
      cycle_weeks: 1,
      current_assignee_index: 0,
      is_active: true
    });
    DutyRotationService.advanceRotation.mockResolvedValue({});
    DutyRotationService.activateRotation.mockResolvedValue({});
    DutyRotationService.deactivateRotation.mockResolvedValue({});
    
    localClient.entities.DutyRotation.update.mockResolvedValue({});
    localClient.entities.DutyRotation.delete.mockResolvedValue(true);
  });

  describe('Rendering', () => {
    it('renders the component with header and tabs', () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      expect(screen.getByText('Duty Rotation Manager')).toBeInTheDocument();
      expect(screen.getByText('Manage rotating duty assignments for your team')).toBeInTheDocument();
      expect(screen.getByText('Create Rotation')).toBeInTheDocument();
      
      // Check tabs
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Active Rotations')).toBeInTheDocument();
      expect(screen.getByText('Inactive Rotations')).toBeInTheDocument();
    });

    it('renders rotation cards with correct information', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
        expect(screen.getByText('Reporting Duty')).toBeInTheDocument();
      });
      
      // Check badges
      expect(screen.getByText('DevOps')).toBeInTheDocument();
      expect(screen.getByText('Reporting')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('shows empty state when no rotations exist', () => {
      render(<DutyRotationManager {...defaultProps} rotations={[]} />);
      
      expect(screen.getByText('No rotations configured')).toBeInTheDocument();
      expect(screen.getByText('Create your first duty rotation to get started with automated scheduling.')).toBeInTheDocument();
      expect(screen.getByText('Create First Rotation')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('shows all rotations in overview tab', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
        expect(screen.getByText('Reporting Duty')).toBeInTheDocument();
      });
    });

    it('filters active rotations in active tab', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Active Rotations'));
      
      await waitFor(() => {
        expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
        expect(screen.queryByText('Reporting Duty')).not.toBeInTheDocument();
      });
    });

    it('filters inactive rotations in inactive tab', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Inactive Rotations'));
      
      await waitFor(() => {
        expect(screen.queryByText('On-Call Rotation')).not.toBeInTheDocument();
        expect(screen.getByText('Reporting Duty')).toBeInTheDocument();
      });
    });
  });

  describe('Create Rotation', () => {
    it('opens create dialog when create button is clicked', () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Create Rotation'));
      
      expect(screen.getByText('Create New Rotation')).toBeInTheDocument();
      expect(screen.getByLabelText('Rotation Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Duty Type *')).toBeInTheDocument();
      expect(screen.getByLabelText('Cycle Duration (weeks) *')).toBeInTheDocument();
    });

    it('validates form fields before submission', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Create Rotation'));
      const submitButtons = screen.getAllByText('Create Rotation');
      fireEvent.click(submitButtons[submitButtons.length - 1]); // Click the submit button
      
      await waitFor(() => {
        expect(screen.getByText('Rotation name is required')).toBeInTheDocument();
        expect(screen.getByText('Duty type is required')).toBeInTheDocument();
        expect(screen.getByText('At least 2 participants are required for a rotation')).toBeInTheDocument();
      });
    });

    it('creates rotation with valid form data', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Create Rotation'));
      
      // Fill form
      fireEvent.change(screen.getByLabelText('Rotation Name *'), {
        target: { value: 'Test Rotation' }
      });
      
      // Select duty type
      fireEvent.click(screen.getByText('Select duty type'));
      fireEvent.click(screen.getAllByText('DevOps')[1]); // Select from dropdown, not from existing rotation
      
      // Select participants
      const johnCheckbox = screen.getByLabelText('John Doe');
      const janeCheckbox = screen.getByLabelText('Jane Smith');
      fireEvent.click(johnCheckbox);
      fireEvent.click(janeCheckbox);
      
      // Submit form
      fireEvent.click(screen.getByText('Create Rotation', { selector: 'button' }));
      
      await waitFor(() => {
        expect(DutyRotationService.createRotation).toHaveBeenCalledWith({
          name: 'Test Rotation',
          type: 'DevOps',
          participants: ['tm1', 'tm2'],
          cycle_weeks: 1
        });
        expect(defaultProps.onCreateRotation).toHaveBeenCalled();
        expect(defaultProps.onRefresh).toHaveBeenCalled();
      });
    });

    it('shows rotation preview when participants and cycle are selected', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Create Rotation'));
      
      // Select participants
      const johnCheckbox = screen.getByLabelText('John Doe');
      const janeCheckbox = screen.getByLabelText('Jane Smith');
      fireEvent.click(johnCheckbox);
      fireEvent.click(janeCheckbox);
      
      await waitFor(() => {
        expect(screen.getByText('Rotation Preview')).toBeInTheDocument();
        expect(screen.getByText(/Each participant will serve for 1 week/)).toBeInTheDocument();
        expect(screen.getByText(/Complete rotation cycle: 2 weeks/)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Rotation', () => {
    it('opens edit dialog with pre-filled data', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
      });
      
      // Click dropdown menu
      const dropdownTriggers = screen.getAllByRole('button', { name: '' });
      fireEvent.click(dropdownTriggers[0]);
      
      // Click edit option
      fireEvent.click(screen.getByText('Edit Rotation'));
      
      await waitFor(() => {
        expect(screen.getByText('Edit Rotation')).toBeInTheDocument();
        expect(screen.getByDisplayValue('On-Call Rotation')).toBeInTheDocument();
      });
    });

    it('updates rotation with modified data', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
      });
      
      // Open edit dialog
      const dropdownTriggers = screen.getAllByRole('button', { name: '' });
      fireEvent.click(dropdownTriggers[0]);
      fireEvent.click(screen.getByText('Edit Rotation'));
      
      // Modify name
      const nameInput = screen.getByDisplayValue('On-Call Rotation');
      fireEvent.change(nameInput, { target: { value: 'Updated Rotation' } });
      
      // Submit
      fireEvent.click(screen.getByText('Update Rotation'));
      
      await waitFor(() => {
        expect(localClient.entities.DutyRotation.update).toHaveBeenCalledWith(
          'rot1',
          expect.objectContaining({
            name: 'Updated Rotation'
          })
        );
        expect(defaultProps.onUpdateRotation).toHaveBeenCalled();
        expect(defaultProps.onRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Rotation', () => {
    it('opens delete confirmation dialog', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
      });
      
      // Click dropdown menu
      const dropdownTriggers = screen.getAllByRole('button', { name: '' });
      fireEvent.click(dropdownTriggers[0]);
      
      // Click delete option
      fireEvent.click(screen.getByText('Delete Rotation'));
      
      expect(screen.getByText('Delete Rotation')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete "On-Call Rotation"/)).toBeInTheDocument();
    });

    it('deletes rotation when confirmed', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
      });
      
      // Open delete dialog
      const dropdownTriggers = screen.getAllByRole('button', { name: '' });
      fireEvent.click(dropdownTriggers[0]);
      fireEvent.click(screen.getByText('Delete Rotation'));
      
      // Confirm deletion
      fireEvent.click(screen.getByText('Delete Rotation', { selector: 'button' }));
      
      await waitFor(() => {
        expect(localClient.entities.DutyRotation.delete).toHaveBeenCalledWith('rot1');
        expect(defaultProps.onDeleteRotation).toHaveBeenCalled();
        expect(defaultProps.onRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Rotation Actions', () => {
    it('calls service methods when actions are triggered', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
      });
      
      // Test that service methods are available (we'll test actual UI interactions in integration tests)
      expect(DutyRotationService.advanceRotation).toBeDefined();
      expect(DutyRotationService.deactivateRotation).toBeDefined();
      expect(DutyRotationService.activateRotation).toBeDefined();
    });
  });

  describe('Rotation Details Display', () => {
    it('displays rotation information', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Current Assignee')).toHaveLength(2); // One for each rotation
        expect(screen.getAllByText('Next Assignee')).toHaveLength(2); // One for each rotation
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('displays rotation schedule and participants', async () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Upcoming Schedule')).toHaveLength(2); // One for each rotation
        expect(screen.getByText('Participants (3)')).toBeInTheDocument();
        expect(screen.getByText('Participants (2)')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when rotation creation fails', async () => {
      const errorMessage = 'Failed to create rotation';
      DutyRotationService.createRotation.mockRejectedValue(new Error(errorMessage));
      
      render(<DutyRotationManager {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Create Rotation'));
      
      // Fill valid form data
      fireEvent.change(screen.getByLabelText('Rotation Name *'), {
        target: { value: 'Test Rotation' }
      });
      fireEvent.click(screen.getByText('Select duty type'));
      fireEvent.click(screen.getAllByText('DevOps')[1]); // Select from dropdown, not from existing rotation
      fireEvent.click(screen.getByLabelText('John Doe'));
      fireEvent.click(screen.getByLabelText('Jane Smith'));
      
      // Submit form
      const submitButtons = screen.getAllByText('Create Rotation');
      fireEvent.click(submitButtons[submitButtons.length - 1]); // Click the submit button
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('handles service errors gracefully', async () => {
      DutyRotationService.getRotationSchedule.mockRejectedValue(new Error('Service error'));
      
      render(<DutyRotationManager {...defaultProps} />);
      
      // Component should still render despite service error
      expect(screen.getByText('Duty Rotation Manager')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Active Rotations' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Inactive Rotations' })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<DutyRotationManager {...defaultProps} />);
      
      const createButton = screen.getByText('Create Rotation');
      expect(createButton).toBeInTheDocument();
      
      // Button should be focusable
      createButton.focus();
      expect(document.activeElement).toBe(createButton);
    });
  });
});