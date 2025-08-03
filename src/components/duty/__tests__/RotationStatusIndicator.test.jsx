import React from 'react';
import { render, screen } from '@testing-library/react';
import RotationStatusIndicator from '../RotationStatusIndicator';

describe('RotationStatusIndicator', () => {
  const mockRotation = {
    id: 'rotation-1',
    name: 'On-Call Rotation',
    type: 'DevOps',
    is_active: true
  };

  const mockCurrentAssignee = {
    assignee_id: 'team-member-1',
    assignee_name: 'John Doe',
    assignee_index: 0
  };

  const mockNextAssignee = {
    assignee_id: 'team-member-2',
    assignee_name: 'Jane Smith',
    assignee_index: 1,
    weeks_until_rotation: 2
  };

  it('renders rotation name badge', () => {
    render(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={mockNextAssignee}
      />
    );

    expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
  });

  it('shows current assignee when showDetails is true', () => {
    render(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={mockNextAssignee}
        showDetails={true}
      />
    );

    expect(screen.getByText('Current: John Doe')).toBeInTheDocument();
  });

  it('shows next assignee when showDetails is true', () => {
    render(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={mockNextAssignee}
        showDetails={true}
      />
    );

    expect(screen.getByText('Next: Jane Smith in 2 weeks')).toBeInTheDocument();
  });

  it('hides details when showDetails is false', () => {
    render(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={mockNextAssignee}
        showDetails={false}
      />
    );

    expect(screen.queryByText('Current: John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Next: Jane Smith in 2 weeks')).not.toBeInTheDocument();
  });

  it('handles inactive rotation styling', () => {
    const inactiveRotation = {
      ...mockRotation,
      is_active: false
    };

    render(
      <RotationStatusIndicator 
        rotation={inactiveRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={mockNextAssignee}
      />
    );

    const badge = screen.getByText('On-Call Rotation').closest('.bg-gray-100');
    expect(badge).toBeInTheDocument();
  });

  it('handles active rotation styling', () => {
    render(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={mockNextAssignee}
      />
    );

    const badge = screen.getByText('On-Call Rotation').closest('.bg-purple-100');
    expect(badge).toBeInTheDocument();
  });

  it('formats weeks correctly for different values', () => {
    // Test 0 weeks
    const nextAssigneeThisWeek = { ...mockNextAssignee, weeks_until_rotation: 0 };
    const { rerender } = render(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={nextAssigneeThisWeek}
        showDetails={true}
      />
    );

    expect(screen.getByText('Next: Jane Smith in This week')).toBeInTheDocument();

    // Test 1 week
    const nextAssigneeOneWeek = { ...mockNextAssignee, weeks_until_rotation: 1 };
    rerender(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={nextAssigneeOneWeek}
        showDetails={true}
      />
    );

    expect(screen.getByText('Next: Jane Smith in 1 week')).toBeInTheDocument();

    // Test multiple weeks
    const nextAssigneeMultipleWeeks = { ...mockNextAssignee, weeks_until_rotation: 3 };
    rerender(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={nextAssigneeMultipleWeeks}
        showDetails={true}
      />
    );

    expect(screen.getByText('Next: Jane Smith in 3 weeks')).toBeInTheDocument();
  });

  it('renders with small size', () => {
    render(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={mockNextAssignee}
        size="sm"
        showDetails={true}
      />
    );

    // Check that the component renders with small size (just verify it renders)
    expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
    expect(screen.getByText('Current: John Doe')).toBeInTheDocument();
  });

  it('renders with default size', () => {
    render(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={mockNextAssignee}
        showDetails={true}
      />
    );

    // Check that the component renders with default size (just verify it renders)
    expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
    expect(screen.getByText('Current: John Doe')).toBeInTheDocument();
  });

  it('returns null when no rotation is provided', () => {
    const { container } = render(
      <RotationStatusIndicator 
        rotation={null}
        currentAssignee={mockCurrentAssignee}
        nextAssignee={mockNextAssignee}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('handles missing assignee data gracefully', () => {
    render(
      <RotationStatusIndicator 
        rotation={mockRotation}
        currentAssignee={null}
        nextAssignee={null}
        showDetails={true}
      />
    );

    expect(screen.getByText('On-Call Rotation')).toBeInTheDocument();
    expect(screen.queryByText('Current:')).not.toBeInTheDocument();
    expect(screen.queryByText('Next:')).not.toBeInTheDocument();
  });
});