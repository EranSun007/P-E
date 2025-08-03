import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import DutyCard from '../DutyCard';

const mockTeamMember = {
  id: 'tm1',
  name: 'John Doe',
  role: 'Developer'
};

const mockDuty = {
  id: 'duty1',
  team_member_id: 'tm1',
  type: 'devops',
  title: 'DevOps',
  description: 'Handle DevOps tasks',
  start_date: '2025-01-15T00:00:00.000Z',
  end_date: '2025-01-21T23:59:59.000Z'
};

describe('DutyCard UI Improvements', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show delete button in dropdown menu when showActions is true', async () => {
    render(
      <DutyCard 
        duty={mockDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        showActions={true}
        compact={true}
      />
    );

    // Click the dropdown trigger
    const dropdownTrigger = screen.getByRole('button');
    fireEvent.click(dropdownTrigger);

    // Wait for dropdown to open and check that delete option is available
    await waitFor(() => {
      expect(screen.getByText('Delete Duty')).toBeInTheDocument();
    });
    expect(screen.getByText('Edit Duty')).toBeInTheDocument();
  });

  it('should hide actions when showActions is false', () => {
    render(
      <DutyCard 
        duty={mockDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        showActions={false}
        compact={true}
      />
    );

    // Should not show dropdown trigger when showActions is false
    const dropdownTriggers = screen.queryAllByRole('button');
    expect(dropdownTriggers).toHaveLength(0);
  });

  it('should call onDelete when delete is clicked', async () => {
    render(
      <DutyCard 
        duty={mockDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        showActions={true}
        compact={true}
      />
    );

    // Click the dropdown trigger
    const dropdownTrigger = screen.getByRole('button');
    fireEvent.click(dropdownTrigger);

    // Wait for dropdown to open and click delete option
    await waitFor(() => {
      expect(screen.getByText('Delete Duty')).toBeInTheDocument();
    });
    
    const deleteButton = screen.getByText('Delete Duty');
    fireEvent.click(deleteButton);

    // Should show delete confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Delete Duty Assignment')).toBeInTheDocument();
    });
    expect(screen.getByText('Are you sure you want to delete "DevOps"?')).toBeInTheDocument();
  });

  it('should render with proper styling for compact view', () => {
    const { container } = render(
      <DutyCard 
        duty={mockDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        showActions={true}
        compact={true}
      />
    );

    // Check that compact view has proper styling
    const compactContainer = container.querySelector('.flex.items-center.justify-between.p-3.border.rounded-lg');
    expect(compactContainer).toBeInTheDocument();
  });

  it('should show duty title and date range in compact view', () => {
    render(
      <DutyCard 
        duty={mockDuty}
        teamMember={mockTeamMember}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        showActions={true}
        compact={true}
      />
    );

    expect(screen.getByText('DevOps')).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2025 - Jan 22, 2025/)).toBeInTheDocument();
  });
});