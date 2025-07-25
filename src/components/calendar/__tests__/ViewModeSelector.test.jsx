import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ViewModeSelector from '../ViewModeSelector';
import { ViewModeManager } from '@/services/viewModeManager';

// Mock the ViewModeManager
vi.mock('@/services/viewModeManager', () => ({
  ViewModeManager: {
    VIEW_MODES: {
      MEETINGS: 'meetings',
      OUT_OF_OFFICE: 'out_of_office',
      DUTIES: 'duties',
      BIRTHDAYS: 'birthdays',
      ALL_EVENTS: 'all_events'
    },
    prototype: {
      getAvailableViewModes: () => [
        {
          id: 'meetings',
          label: 'Meetings',
          description: 'View all scheduled meetings and one-on-ones',
          icon: 'calendar'
        },
        {
          id: 'out_of_office',
          label: 'Out of Office',
          description: 'View team member out-of-office periods',
          icon: 'user-x'
        },
        {
          id: 'duties',
          label: 'Duties',
          description: 'View team member duty assignments',
          icon: 'shield'
        },
        {
          id: 'birthdays',
          label: 'Birthdays',
          description: 'View team member birthdays',
          icon: 'cake'
        },
        {
          id: 'all_events',
          label: 'All Events',
          description: 'View all calendar events combined',
          icon: 'calendar-days'
        }
      ]
    }
  }
}));

describe('ViewModeSelector', () => {
  const mockOnViewModeChange = vi.fn();
  
  const defaultProps = {
    currentViewMode: 'all_events',
    onViewModeChange: mockOnViewModeChange,
    eventCounts: {
      meetings: 5,
      out_of_office: 2,
      duties: 1,
      birthdays: 3,
      all_events: 11
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all view mode tabs', () => {
    render(<ViewModeSelector {...defaultProps} />);
    
    expect(screen.getByRole('tab', { name: /meetings/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /out of office/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /duties/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /birthdays/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /all events/i })).toBeInTheDocument();
  });

  it('displays event count badges', () => {
    render(<ViewModeSelector {...defaultProps} />);
    
    expect(screen.getByLabelText('5 meetings')).toBeInTheDocument();
    expect(screen.getByLabelText('2 out of office')).toBeInTheDocument();
    expect(screen.getByLabelText('1 duties')).toBeInTheDocument();
    expect(screen.getByLabelText('3 birthdays')).toBeInTheDocument();
    expect(screen.getByLabelText('11 all events')).toBeInTheDocument();
  });

  it('highlights the active view mode', () => {
    render(<ViewModeSelector {...defaultProps} currentViewMode="meetings" />);
    
    const meetingsTab = screen.getByRole('tab', { name: /meetings/i });
    expect(meetingsTab).toHaveAttribute('aria-selected', 'true');
    
    const allEventsTab = screen.getByRole('tab', { name: /all events/i });
    expect(allEventsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onViewModeChange when a tab is clicked', () => {
    render(<ViewModeSelector {...defaultProps} />);
    
    const meetingsTab = screen.getByRole('tab', { name: /meetings/i });
    fireEvent.click(meetingsTab);
    
    expect(mockOnViewModeChange).toHaveBeenCalledWith('meetings');
  });

  it('supports keyboard navigation with arrow keys', () => {
    render(<ViewModeSelector {...defaultProps} />);
    
    const meetingsTab = screen.getByRole('tab', { name: /meetings/i });
    const outOfOfficeTab = screen.getByRole('tab', { name: /out of office/i });
    
    // Focus first tab
    meetingsTab.focus();
    
    // Press right arrow to move to next tab
    fireEvent.keyDown(meetingsTab, { key: 'ArrowRight' });
    expect(outOfOfficeTab).toHaveFocus();
    
    // Press left arrow to move back
    fireEvent.keyDown(outOfOfficeTab, { key: 'ArrowLeft' });
    expect(meetingsTab).toHaveFocus();
  });

  it('supports keyboard activation with Enter and Space', () => {
    render(<ViewModeSelector {...defaultProps} />);
    
    const meetingsTab = screen.getByRole('tab', { name: /meetings/i });
    meetingsTab.focus();
    
    // Test Enter key
    fireEvent.keyDown(meetingsTab, { key: 'Enter' });
    expect(mockOnViewModeChange).toHaveBeenCalledWith('meetings');
    
    mockOnViewModeChange.mockClear();
    
    // Test Space key
    fireEvent.keyDown(meetingsTab, { key: ' ' });
    expect(mockOnViewModeChange).toHaveBeenCalledWith('meetings');
  });

  it('supports Home and End key navigation', () => {
    render(<ViewModeSelector {...defaultProps} />);
    
    const meetingsTab = screen.getByRole('tab', { name: /meetings/i });
    const allEventsTab = screen.getByRole('tab', { name: /all events/i });
    
    meetingsTab.focus();
    
    // Press End to go to last tab
    fireEvent.keyDown(meetingsTab, { key: 'End' });
    expect(allEventsTab).toHaveFocus();
    
    // Press Home to go to first tab
    fireEvent.keyDown(allEventsTab, { key: 'Home' });
    expect(meetingsTab).toHaveFocus();
  });

  it('handles disabled state correctly', () => {
    render(<ViewModeSelector {...defaultProps} disabled={true} />);
    
    const meetingsTab = screen.getByRole('tab', { name: /meetings/i });
    expect(meetingsTab).toBeDisabled();
    
    fireEvent.click(meetingsTab);
    expect(mockOnViewModeChange).not.toHaveBeenCalled();
  });

  it('handles missing event counts gracefully', () => {
    render(<ViewModeSelector {...defaultProps} eventCounts={{}} />);
    
    // Should not display badges when counts are 0 or missing
    expect(screen.queryByLabelText(/meetings/)).not.toBeInTheDocument();
  });

  it('displays 99+ for counts over 99', () => {
    const propsWithHighCounts = {
      ...defaultProps,
      eventCounts: {
        meetings: 150,
        out_of_office: 2,
        duties: 1,
        birthdays: 3,
        all_events: 156
      }
    };
    
    render(<ViewModeSelector {...propsWithHighCounts} />);
    
    expect(screen.getAllByText('99+')).toHaveLength(2); // meetings and all_events
    expect(screen.getByLabelText('150 meetings')).toHaveTextContent('99+');
    expect(screen.getByLabelText('156 all events')).toHaveTextContent('99+');
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<ViewModeSelector {...defaultProps} />);
    
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Calendar view modes');
    
    const meetingsTab = screen.getByRole('tab', { name: /meetings/i });
    expect(meetingsTab).toHaveAttribute('aria-controls', 'calendar-panel-meetings');
    expect(meetingsTab).toHaveAttribute('title', 'View all scheduled meetings and one-on-ones');
  });
});