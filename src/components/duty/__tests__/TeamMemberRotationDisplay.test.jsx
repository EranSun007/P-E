import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TeamMemberRotationDisplay from '../TeamMemberRotationDisplay';
import DutyRotationService from '../../../services/dutyRotationService';
import { Duty } from '../../../api/entities';

// Mock the services
vi.mock('../../../services/dutyRotationService');
vi.mock('../../../api/entities');

// Mock the dialog components
vi.mock('../../ui/dialog', () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children }) => <div data-testid="dialog-trigger">{children}</div>
}));

describe('TeamMemberRotationDisplay', () => {
  const mockTeamMemberId = 'team-member-1';
  const mockTeamMemberName = 'John Doe';

  const mockRotation = {
    id: 'rotation-1',
    name: 'On-Call Rotation',
    type: 'DevOps',
    participants: ['team-member-1', 'team-member-2', 'team-member-3'],
    cycle_weeks: 1,
    is_active: true
  };

  const mockCurrentAssignee = {
    assignee_id: 'team-member-2',
    assignee_name: 'Jane Smith',
    assignee_index: 1
  };

  const mockNextAssignee = {
    assignee_id: 'team-member-1',
    assignee_name: 'John Doe',
    weeks_until_rotation: 2
  };

  const mockDuty = {
    id: 'duty-1',
    team_member_id: 'team-member-1',
    type: 'devops',
    title: 'DevOps',
    description: 'On-Call Rotation - Cycle 1',
    start_date: '2024-01-15',
    end_date: '2024-01-21',
    is_rotation: true,
    rotation_id: 'rotation-1',
    rotation_participants: 3,
    rotation_sequence: 0,
    rotation_cycle_weeks: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Duty.getByTeamMember
    Duty.getByTeamMember.mockResolvedValue([mockDuty]);
    
    // Mock DutyRotationService methods
    DutyRotationService.getActiveRotations.mockResolvedValue([mockRotation]);
    DutyRotationService.getCurrentAssignee.mockResolvedValue(mockCurrentAssignee);
    DutyRotationService.getNextAssignee.mockResolvedValue(mockNextAssignee);
    DutyRotationService.getRotationSchedule.mockResolvedValue([
      {
        participant_id: 'team-member-1',
        participant_name: 'John Doe',
        sequence: 0,
        cycle: 1,
        start_date: '2024-01-15',
        end_date: '2024-01-21',
        weeks_duration: 1,
        is_current: false
      },
      {
        participant_id: 'team-member-2',
        participant_name: 'Jane Smith',
        sequence: 1,
        cycle: 1,
        start_date: '2024-01-22',
        end_date: '2024-01-28',
        weeks_duration: 1,
        is_current: true
      }
    ]);
  });

  it('renders loading state initially', () => {
    render(
      <TeamMemberRotationDisplay 
        teamMemberId={mockTeamMemberId}
        teamMemberName={mockTeamMemberName}
      />
    );

    expect(screen.getByText('Loading rotation information...')).toBeInTheDocument();
  });

  it('renders rotation information when data is loaded', async () => {
    render(
      <TeamMemberRotationDisplay 
        teamMemberId={mockTeamMemberId}
        teamMemberName={mockTeamMemberName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Duty Rotations')).toBeInTheDocument();
    });

    expect(screen.getAllByText('On-Call Rotation')).toHaveLength(2); // Title and badge
    expect(screen.getByText('DevOps')).toBeInTheDocument();
    expect(screen.getByText('1 week')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument(); // Status badge
  });

  it('shows current assignee and next assignee information', async () => {
    render(
      <TeamMemberRotationDisplay 
        teamMemberId={mockTeamMemberId}
        teamMemberName={mockTeamMemberName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Current: Jane Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('Next: John Doe in 2 weeks')).toBeInTheDocument();
  });

  it('displays upcoming assignments section', async () => {
    render(
      <TeamMemberRotationDisplay 
        teamMemberId={mockTeamMemberId}
        teamMemberName={mockTeamMemberName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Upcoming Assignments')).toBeInTheDocument();
    });

    // The section should be present even if no assignments are shown
    expect(screen.getByText('Upcoming Assignments')).toBeInTheDocument();
  });

  it('opens schedule dialog when schedule button is clicked', async () => {
    render(
      <TeamMemberRotationDisplay 
        teamMemberId={mockTeamMemberId}
        teamMemberName={mockTeamMemberName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Duty Rotations')).toBeInTheDocument();
    });

    const scheduleButton = screen.getByText('Schedule');
    fireEvent.click(scheduleButton);

    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    expect(screen.getByText('Rotation Schedule')).toBeInTheDocument();
    expect(DutyRotationService.getRotationSchedule).toHaveBeenCalledWith('rotation-1', 3);
  });

  it('calls onManageRotation when manage button is clicked', async () => {
    const mockOnManageRotation = vi.fn();
    
    render(
      <TeamMemberRotationDisplay 
        teamMemberId={mockTeamMemberId}
        teamMemberName={mockTeamMemberName}
        onManageRotation={mockOnManageRotation}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Duty Rotations')).toBeInTheDocument();
    });

    const manageButton = screen.getByText('Manage');
    fireEvent.click(manageButton);

    expect(mockOnManageRotation).toHaveBeenCalledWith('rotation-1');
  });

  it('renders empty state when no rotations are found', async () => {
    Duty.getByTeamMember.mockResolvedValue([]);
    
    render(
      <TeamMemberRotationDisplay 
        teamMemberId={mockTeamMemberId}
        teamMemberName={mockTeamMemberName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No rotation assignments found')).toBeInTheDocument();
    });

    expect(screen.getByText('This team member is not currently part of any duty rotations')).toBeInTheDocument();
  });

  it('handles errors gracefully', async () => {
    Duty.getByTeamMember.mockRejectedValue(new Error('Failed to load duties'));
    
    render(
      <TeamMemberRotationDisplay 
        teamMemberId={mockTeamMemberId}
        teamMemberName={mockTeamMemberName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No rotation assignments found')).toBeInTheDocument();
    });
  });

  it('shows correct status badge for current assignee', async () => {
    // Mock the team member as current assignee
    const mockCurrentAssigneeRotation = {
      ...mockCurrentAssignee,
      assignee_id: mockTeamMemberId,
      assignee_name: mockTeamMemberName
    };
    
    DutyRotationService.getCurrentAssignee.mockResolvedValue(mockCurrentAssigneeRotation);
    
    render(
      <TeamMemberRotationDisplay 
        teamMemberId={mockTeamMemberId}
        teamMemberName={mockTeamMemberName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Duty Rotations')).toBeInTheDocument();
    });

    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('shows correct status badge for participant', async () => {
    // Mock different assignees so team member is just a participant
    const mockDifferentNextAssignee = {
      ...mockNextAssignee,
      assignee_id: 'team-member-3',
      assignee_name: 'Bob Wilson'
    };
    
    DutyRotationService.getNextAssignee.mockResolvedValue(mockDifferentNextAssignee);
    
    render(
      <TeamMemberRotationDisplay 
        teamMemberId={mockTeamMemberId}
        teamMemberName={mockTeamMemberName}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Duty Rotations')).toBeInTheDocument();
    });

    expect(screen.getByText('Participant')).toBeInTheDocument();
  });
});