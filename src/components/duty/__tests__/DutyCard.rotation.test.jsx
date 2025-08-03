import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import DutyCard from '../DutyCard';
import DutyRotationService from '../../../services/dutyRotationService';

// Mock the DutyRotationService
vi.mock('../../../services/dutyRotationService', () => ({
  default: {
    getCurrentAssignee: vi.fn(),
    getNextAssignee: vi.fn(),
  }
}));

// Mock AgendaContextActions
vi.mock('../../agenda/AgendaContextActions', () => ({
  default: ({ sourceItem }) => <div data-testid="agenda-actions">{sourceItem.title}</div>
}));

describe('DutyCard Rotation Features', () => {
  const mockTeamMember = {
    id: 'tm1',
    name: 'John Doe'
  };

  const mockRotationDuty = {
    id: 'duty1',
    team_member_id: 'tm1',
    type: 'devops',
    title: 'DevOps',
    description: 'DevOps rotation duty',
    start_date: '2025-01-01',
    end_date: '2025-01-07',
    is_rotation: true,
    rotation_id: 'rotation1',
    rotation_participants: 5,
    rotation_sequence: 0,
    rotation_cycle_weeks: 1
  };

  const mockNonRotationDuty = {
    id: 'duty2',
    team_member_id: 'tm1',
    type: 'devops',
    title: 'DevOps',
    description: 'Regular duty',
    start_date: '2025-01-01',
    end_date: '2025-01-07',
    is_rotation: false
  };

  const mockCurrentAssignee = {
    assignee_id: 'tm1',
    assignee_name: 'John Doe',
    assignee_index: 0
  };

  const mockNextAssignee = {
    assignee_id: 'tm2',
    assignee_name: 'Jane Smith',
    assignee_index: 1,
    rotation_date: '2025-01-08T00:00:00.000Z',
    weeks_until_rotation: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
    DutyRotationService.getCurrentAssignee.mockResolvedValue(mockCurrentAssignee);
    DutyRotationService.getNextAssignee.mockResolvedValue(mockNextAssignee);
  });

  describe('Rotation Badge Display', () => {
    it('should display rotation badge for rotating duties', async () => {
      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      expect(screen.getByText('Rotation')).toBeInTheDocument();
      expect(document.querySelector('.lucide-rotate-ccw')).toBeInTheDocument();
    });

    it('should not display rotation badge for non-rotating duties', () => {
      render(
        <DutyCard 
          duty={mockNonRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      expect(screen.queryByText('Rotation')).not.toBeInTheDocument();
    });
  });

  describe('Rotation Information Display', () => {
    it('should display rotation details section for rotating duties', async () => {
      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Rotation Details')).toBeInTheDocument();
      });

      expect(screen.getByText('5 team members')).toBeInTheDocument();
      expect(screen.getByText('1 week')).toBeInTheDocument();
    });

    it('should display next assignee information', async () => {
      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Next Assignment')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('1 week')).toBeInTheDocument();
    });

    it('should handle multiple weeks correctly', async () => {
      const multiWeekNextAssignee = {
        ...mockNextAssignee,
        weeks_until_rotation: 3
      };
      DutyRotationService.getNextAssignee.mockResolvedValue(multiWeekNextAssignee);

      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('3 weeks')).toBeInTheDocument();
      });
    });

    it('should handle this week assignment', async () => {
      const thisWeekAssignee = {
        ...mockNextAssignee,
        weeks_until_rotation: 0
      };
      DutyRotationService.getNextAssignee.mockResolvedValue(thisWeekAssignee);

      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('This week')).toBeInTheDocument();
      });
    });

    it('should not display rotation details for non-rotating duties', () => {
      render(
        <DutyCard 
          duty={mockNonRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      expect(screen.queryByText('Rotation Details')).not.toBeInTheDocument();
    });
  });

  describe('Rotation Management Actions', () => {
    it('should display manage rotation action for rotating duties', async () => {
      const mockOnManageRotation = vi.fn();
      
      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
          onManageRotation={mockOnManageRotation}
        />
      );

      // Open dropdown menu
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(button => button.querySelector('svg'));
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Manage Rotation')).toBeInTheDocument();
      });

      // Click manage rotation
      fireEvent.click(screen.getByText('Manage Rotation'));
      expect(mockOnManageRotation).toHaveBeenCalledWith('rotation1');
    });

    it('should not display manage rotation action for non-rotating duties', () => {
      const mockOnManageRotation = vi.fn();
      
      render(
        <DutyCard 
          duty={mockNonRotationDuty} 
          teamMember={mockTeamMember}
          onManageRotation={mockOnManageRotation}
        />
      );

      // Open dropdown menu
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(button => button.querySelector('svg'));
      fireEvent.click(menuButton);

      expect(screen.queryByText('Manage Rotation')).not.toBeInTheDocument();
    });

    it('should not display manage rotation action when callback not provided', async () => {
      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      // Open dropdown menu
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(button => button.querySelector('svg'));
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.queryByText('Manage Rotation')).not.toBeInTheDocument();
      });
    });
  });

  describe('Compact View Rotation Features', () => {
    it('should display rotation badge in compact view', () => {
      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
          compact={true}
        />
      );

      expect(screen.getByText('Rotation')).toBeInTheDocument();
    });

    it('should display next assignee info in compact view', async () => {
      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
          compact={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Next: Jane Smith in 1 week')).toBeInTheDocument();
      });
    });

    it('should include manage rotation action in compact view dropdown', async () => {
      const mockOnManageRotation = vi.fn();
      
      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
          onManageRotation={mockOnManageRotation}
          compact={true}
        />
      );

      // Open dropdown menu
      const menuButtons = screen.getAllByRole('button');
      const menuButton = menuButtons.find(button => button.querySelector('svg'));
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Manage Rotation')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Indicator for Rotations', () => {
    it('should show rotation-specific progress styling for active rotation duties', () => {
      // Mock current date to make duty active
      const mockDate = new Date('2025-01-03'); // Middle of duty period
      vi.setSystemTime(mockDate);

      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      expect(screen.getByText('Rotation Progress')).toBeInTheDocument();
      expect(screen.getByText('Current rotation period for John Doe')).toBeInTheDocument();
      
      // Check for purple progress bar (rotation-specific styling)
      const progressBar = document.querySelector('.bg-purple-500');
      expect(progressBar).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('should show regular progress styling for non-rotation duties', () => {
      // Mock current date to make duty active
      const mockDate = new Date('2025-01-03');
      vi.setSystemTime(mockDate);

      render(
        <DutyCard 
          duty={mockNonRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.queryByText('Current rotation period')).not.toBeInTheDocument();
      
      // Check for green progress bar (regular styling)
      const progressBar = document.querySelector('.bg-green-500');
      expect(progressBar).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle rotation service errors gracefully', async () => {
      DutyRotationService.getCurrentAssignee.mockRejectedValue(new Error('Service error'));
      DutyRotationService.getNextAssignee.mockRejectedValue(new Error('Service error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load rotation info:', expect.any(Error));
      });

      // Should still render the basic rotation details
      expect(screen.getByText('Rotation Details')).toBeInTheDocument();
      expect(screen.getByText('5 team members')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should show loading state while fetching rotation info', () => {
      // Make the service calls hang
      DutyRotationService.getCurrentAssignee.mockImplementation(() => new Promise(() => {}));
      DutyRotationService.getNextAssignee.mockImplementation(() => new Promise(() => {}));

      render(
        <DutyCard 
          duty={mockRotationDuty} 
          teamMember={mockTeamMember}
        />
      );

      expect(screen.getByText('Loading rotation info...')).toBeInTheDocument();
    });
  });
});