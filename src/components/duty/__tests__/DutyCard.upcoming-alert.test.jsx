import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import DutyCard from '../DutyCard';

// Mock the services
vi.mock('../../../services/dutyRotationService', () => ({
  default: {
    getCurrentAssignee: vi.fn().mockResolvedValue(null),
    getNextAssignee: vi.fn().mockResolvedValue(null)
  }
}));

const mockTeamMember = {
  id: 'tm1',
  name: 'John Doe',
  role: 'Developer'
};

describe('DutyCard Upcoming Alert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show upcoming alert for duties starting within 7 days', () => {
    const upcomingDuty = {
      id: 'duty1',
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      description: 'Handle DevOps tasks',
      start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      is_rotation: false
    };

    render(
      <DutyCard 
        duty={upcomingDuty}
        teamMember={mockTeamMember}
      />
    );

    expect(screen.getByText('Upcoming Duty Assignment')).toBeInTheDocument();
    expect(screen.getByText(/This duty starts in 3 days for John Doe/)).toBeInTheDocument();
  });

  it('should not show upcoming alert for duties starting more than 7 days away', () => {
    const futureDuty = {
      id: 'duty1',
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      description: 'Handle DevOps tasks',
      start_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      end_date: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(), // 17 days from now
      is_rotation: false
    };

    render(
      <DutyCard 
        duty={futureDuty}
        teamMember={mockTeamMember}
      />
    );

    expect(screen.queryByText('Upcoming Duty Assignment')).not.toBeInTheDocument();
  });

  it('should not show upcoming alert for active duties', () => {
    const activeDuty = {
      id: 'duty1',
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      description: 'Handle DevOps tasks',
      start_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      end_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days from now
      is_rotation: false
    };

    render(
      <DutyCard 
        duty={activeDuty}
        teamMember={mockTeamMember}
      />
    );

    expect(screen.queryByText('Upcoming Duty Assignment')).not.toBeInTheDocument();
  });

  it('should show upcoming alert in compact view with proper styling', () => {
    const upcomingDuty = {
      id: 'duty1',
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      description: 'Handle DevOps tasks',
      start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 days from now
      is_rotation: false
    };

    const { container } = render(
      <DutyCard 
        duty={upcomingDuty}
        teamMember={mockTeamMember}
        compact={true}
      />
    );

    // Check that compact view has upcoming styling
    const compactContainer = container.querySelector('.border-orange-200.bg-orange-50');
    expect(compactContainer).toBeInTheDocument();
    
    // Check for upcoming indicator
    expect(screen.getByText('2d')).toBeInTheDocument();
  });

  it('should handle singular day correctly', () => {
    const upcomingDuty = {
      id: 'duty1',
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      description: 'Handle DevOps tasks',
      start_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
      end_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days from now
      is_rotation: false
    };

    render(
      <DutyCard 
        duty={upcomingDuty}
        teamMember={mockTeamMember}
      />
    );

    expect(screen.getByText(/This duty starts in 1 day for John Doe/)).toBeInTheDocument();
  });
});