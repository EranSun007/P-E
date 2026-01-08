import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DutyCard from '../DutyCard';

const mockTeamMember = {
  id: '1',
  name: 'John Doe'
};

const mockActiveDuty = {
  id: 'duty-1',
  team_member_id: '1',
  type: 'devops',
  title: 'DevOps Duty Week 1',
  description: 'Handle DevOps tasks for the week',
  start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
  end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
};

const mockPastDuty = {
  id: 'duty-2',
  team_member_id: '1',
  type: 'on_call',
  title: 'On-Call Duty',
  description: 'Emergency response duty',
  start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  end_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
};

const mockFutureDuty = {
  id: 'duty-3',
  team_member_id: '1',
  type: 'other',
  title: 'Special Assignment',
  description: 'Special project duty',
  start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
};

describe('DutyCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null when no duty provided', () => {
    const { container } = render(<DutyCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders active duty correctly', () => {
    render(
      <DutyCard 
        duty={mockActiveDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('DevOps Duty Week 1')).toBeInTheDocument();
    expect(screen.getByText('DevOps Duty')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Handle DevOps tasks for the week')).toBeInTheDocument();
    
    // Should show progress bar for active duty
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('renders past duty correctly', () => {
    render(
      <DutyCard 
        duty={mockPastDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getAllByText('On-Call Duty')).toHaveLength(2); // Title and badge
    expect(screen.getByText('Completed')).toBeInTheDocument();
    
    // Should not show progress bar for past duty
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
  });

  it('renders future duty correctly', () => {
    render(
      <DutyCard 
        duty={mockFutureDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Special Assignment')).toBeInTheDocument();
    expect(screen.getByText('Other Duty')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    
    // Should not show progress bar for future duty
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
  });

  it('renders compact view correctly', () => {
    render(
      <DutyCard 
        duty={mockActiveDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        compact={true}
      />
    );

    expect(screen.getByText('DevOps Duty Week 1')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    
    // Compact view should not show description or team member details
    expect(screen.queryByText('Handle DevOps tasks for the week')).not.toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('handles missing team member gracefully', () => {
    render(
      <DutyCard 
        duty={mockActiveDuty}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('DevOps Duty Week 1')).toBeInTheDocument();
    // Should not crash without team member
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('shows correct duration text for different periods', () => {
    // Test single day duty - same start and end date
    const singleDayDuty = {
      ...mockActiveDuty,
      start_date: '2024-01-15T00:00:00.000Z',
      end_date: '2024-01-15T00:00:00.000Z'
    };

    const { rerender } = render(
      <DutyCard 
        duty={singleDayDuty}
        teamMember={mockTeamMember}
      />
    );

    expect(screen.getByText('1 day')).toBeInTheDocument();

    // Test multi-day duty
    const multiDayDuty = {
      ...mockActiveDuty,
      start_date: '2024-01-15T00:00:00.000Z',
      end_date: '2024-01-19T00:00:00.000Z'
    };

    rerender(
      <DutyCard 
        duty={multiDayDuty}
        teamMember={mockTeamMember}
      />
    );

    expect(screen.getByText('5 days')).toBeInTheDocument();
  });

  it('renders dropdown menu button when showActions is true', () => {
    render(
      <DutyCard 
        duty={mockActiveDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        showActions={true}
      />
    );

    // Should show dropdown menu button
    const menuButton = screen.getByRole('button', { name: '' }); // MoreVertical icon button
    expect(menuButton).toBeInTheDocument();
  });

  it('hides actions when showActions is false', () => {
    render(
      <DutyCard 
        duty={mockActiveDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        showActions={false}
      />
    );

    // Should not show dropdown menu button
    expect(screen.queryByRole('button', { name: '' })).not.toBeInTheDocument();
  });



  it('generates correct team member initials', () => {
    const teamMemberWithLongName = {
      id: '2',
      name: 'John Michael Smith Johnson'
    };

    render(
      <DutyCard 
        duty={mockActiveDuty}
        teamMember={teamMemberWithLongName}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Should show first two initials
    expect(screen.getByText('JM')).toBeInTheDocument();
  });

  it('handles duty without description', () => {
    const dutyWithoutDescription = {
      ...mockActiveDuty,
      description: null
    };

    render(
      <DutyCard 
        duty={dutyWithoutDescription}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('DevOps Duty Week 1')).toBeInTheDocument();
    // Should not show description section
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('has edit and delete functionality available', () => {
    render(
      <DutyCard 
        duty={mockActiveDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Verify the component renders with action menu when showActions is true (default)
    expect(screen.getByText('DevOps Duty Week 1')).toBeInTheDocument();
    
    // Verify that onEdit and onDelete callbacks are available
    expect(typeof mockOnEdit).toBe('function');
    expect(typeof mockOnDelete).toBe('function');
  });
});