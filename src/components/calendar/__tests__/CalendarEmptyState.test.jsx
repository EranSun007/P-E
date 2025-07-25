import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { 
  CalendarEmptyState, 
  CalendarViewEmptyState, 
  CalendarDateEmptyState,
  CalendarLoadingEmptyState 
} from '../CalendarEmptyState';
import { ViewModeManager } from '@/services/viewModeManager';

describe('CalendarEmptyState', () => {
  const mockOnCreateTask = vi.fn();
  const mockOnAddTeamMember = vi.fn();
  const mockOnManageDuties = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CalendarEmptyState', () => {
    it('renders meetings empty state correctly', () => {
      render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.MEETINGS}
          onCreateTask={mockOnCreateTask}
          context="calendar"
        />
      );

      expect(screen.getByText('No meetings scheduled')).toBeInTheDocument();
      expect(screen.getByText(/You don't have any meetings or one-on-ones scheduled/)).toBeInTheDocument();
      expect(screen.getByText('Create Meeting Task')).toBeInTheDocument();
      expect(screen.getByText('Schedule a one-on-one with a team member')).toBeInTheDocument();
    });

    it('renders out-of-office empty state correctly', () => {
      render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.OUT_OF_OFFICE}
          onAddTeamMember={mockOnAddTeamMember}
          context="calendar"
        />
      );

      expect(screen.getByText('No out-of-office periods')).toBeInTheDocument();
      expect(screen.getByText(/No team members have scheduled out-of-office periods/)).toBeInTheDocument();
      expect(screen.getByText('Manage Team')).toBeInTheDocument();
      expect(screen.getByText('Add team members to track their availability')).toBeInTheDocument();
    });

    it('renders duties empty state correctly', () => {
      render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.DUTIES}
          onManageDuties={mockOnManageDuties}
          context="calendar"
        />
      );

      expect(screen.getByText('No duty assignments')).toBeInTheDocument();
      expect(screen.getByText(/No team member duties are currently assigned/)).toBeInTheDocument();
      expect(screen.getByText('Manage Duties')).toBeInTheDocument();
      expect(screen.getByText('Set up DevOps duty rotations')).toBeInTheDocument();
    });

    it('renders birthdays empty state correctly', () => {
      render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.BIRTHDAYS}
          onAddTeamMember={mockOnAddTeamMember}
          context="calendar"
        />
      );

      expect(screen.getByText('No birthdays this month')).toBeInTheDocument();
      expect(screen.getByText(/No team member birthdays are scheduled/)).toBeInTheDocument();
      expect(screen.getByText('Add Team Members')).toBeInTheDocument();
      expect(screen.getByText('Add team member birthday information')).toBeInTheDocument();
    });

    it('renders all events empty state correctly', () => {
      render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.ALL_EVENTS}
          onCreateTask={mockOnCreateTask}
          context="calendar"
        />
      );

      expect(screen.getByText('Your calendar is empty')).toBeInTheDocument();
      expect(screen.getByText(/You don't have any events, meetings, or tasks scheduled/)).toBeInTheDocument();
      expect(screen.getByText('Create Task')).toBeInTheDocument();
      expect(screen.getByText('Schedule your first meeting')).toBeInTheDocument();
    });

    it('renders sidebar context with compact layout', () => {
      render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.MEETINGS}
          onCreateTask={mockOnCreateTask}
          context="sidebar"
        />
      );

      expect(screen.getByText('No meetings today')).toBeInTheDocument();
      expect(screen.getByText(/No meetings are scheduled for this date/)).toBeInTheDocument();
      
      // Should have compact styling for sidebar
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-xs');
    });

    it('calls action handlers when buttons are clicked', () => {
      render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.MEETINGS}
          onCreateTask={mockOnCreateTask}
          context="calendar"
        />
      );

      const button = screen.getByText('Create Meeting Task');
      fireEvent.click(button);
      
      expect(mockOnCreateTask).toHaveBeenCalledTimes(1);
    });

    it('does not render action button when no handler provided', () => {
      render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.MEETINGS}
          context="calendar"
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('CalendarViewEmptyState', () => {
    it('renders with proper styling for main calendar view', () => {
      render(
        <CalendarViewEmptyState
          viewMode={ViewModeManager.VIEW_MODES.MEETINGS}
          onCreateTask={mockOnCreateTask}
        />
      );

      expect(screen.getByText('No meetings scheduled')).toBeInTheDocument();
      
      // Should have main calendar styling
      const container = screen.getByText('No meetings scheduled').closest('div').parentElement.parentElement;
      expect(container).toHaveClass('min-h-[400px]');
      expect(container).toHaveClass('border-dashed');
    });

    it('passes all handlers to CalendarEmptyState', () => {
      render(
        <CalendarViewEmptyState
          viewMode={ViewModeManager.VIEW_MODES.DUTIES}
          onCreateTask={mockOnCreateTask}
          onAddTeamMember={mockOnAddTeamMember}
          onManageDuties={mockOnManageDuties}
        />
      );

      const button = screen.getByText('Manage Duties');
      fireEvent.click(button);
      
      expect(mockOnManageDuties).toHaveBeenCalledTimes(1);
    });
  });

  describe('CalendarDateEmptyState', () => {
    it('renders with sidebar context', () => {
      render(
        <CalendarDateEmptyState
          viewMode={ViewModeManager.VIEW_MODES.MEETINGS}
          onCreateTask={mockOnCreateTask}
        />
      );

      expect(screen.getByText('No meetings today')).toBeInTheDocument();
      
      // Should use sidebar context (compact layout)
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-xs');
    });
  });

  describe('CalendarLoadingEmptyState', () => {
    it('renders loading state correctly', () => {
      render(<CalendarLoadingEmptyState />);

      expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we load your events and tasks.')).toBeInTheDocument();
      
      // Should have loading styling - check the direct container
      const container = screen.getByText('Loading calendar...').closest('div').parentElement;
      expect(container).toHaveClass('min-h-[400px]');
      expect(container).toHaveClass('border-dashed');
    });

    it('shows animated loading icon', () => {
      render(<CalendarLoadingEmptyState />);
      
      // Clock icon should have pulse animation
      const icon = screen.getByText('Loading calendar...').parentElement.querySelector('svg');
      expect(icon).toHaveClass('animate-pulse');
    });
  });

  describe('View Mode Specific Content', () => {
    it('shows different suggestions for each view mode', () => {
      const { rerender } = render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.MEETINGS}
          context="calendar"
        />
      );
      expect(screen.getByText('Schedule a one-on-one with a team member')).toBeInTheDocument();

      rerender(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.DUTIES}
          context="calendar"
        />
      );
      expect(screen.getByText('Set up DevOps duty rotations')).toBeInTheDocument();

      rerender(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.BIRTHDAYS}
          context="calendar"
        />
      );
      expect(screen.getByText('Add team member birthday information')).toBeInTheDocument();
    });

    it('shows appropriate icons for each view mode', () => {
      const { rerender } = render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.MEETINGS}
          context="calendar"
        />
      );
      
      // Check that different view modes render different icons
      // We can't easily test the specific icon, but we can test that the component renders
      expect(screen.getByText('No meetings scheduled')).toBeInTheDocument();

      rerender(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.OUT_OF_OFFICE}
          context="calendar"
        />
      );
      expect(screen.getByText('No out-of-office periods')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('renders with proper semantic structure', () => {
      render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.MEETINGS}
          onCreateTask={mockOnCreateTask}
          context="calendar"
        />
      );

      // Should have proper heading structure
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('provides accessible button labels', () => {
      render(
        <CalendarEmptyState
          viewMode={ViewModeManager.VIEW_MODES.MEETINGS}
          onCreateTask={mockOnCreateTask}
          context="calendar"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAccessibleName('Create Meeting Task');
    });
  });
});