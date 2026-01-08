/**
 * OutOfOfficeCounter Component Tests
 * Tests for counter calculations, display, and real-time updates
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OutOfOfficeCounter from '../OutOfOfficeCounter';
import OutOfOfficeService from '../../../services/outOfOfficeService';

// Mock the OutOfOfficeService
vi.mock('../../../services/outOfOfficeService');

// Mock UI components
vi.mock('../../ui/card', () => ({
  Card: ({ children, className }) => <div className={`card ${className || ''}`}>{children}</div>,
  CardContent: ({ children }) => <div className="card-content">{children}</div>,
  CardHeader: ({ children, className }) => <div className={`card-header ${className || ''}`}>{children}</div>,
  CardTitle: ({ children, className }) => <div className={`card-title ${className || ''}`}>{children}</div>
}));

vi.mock('../../ui/badge', () => ({
  Badge: ({ children, variant, className }) => (
    <span className={`badge badge-${variant} ${className || ''}`}>{children}</span>
  )
}));

vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, variant, size, className }) => (
    <button 
      onClick={onClick} 
      className={`button button-${variant} button-${size} ${className || ''}`}
    >
      {children}
    </button>
  )
}));

vi.mock('../../ui/select', () => ({
  Select: ({ children, value, onValueChange }) => (
    <div className="select" data-value={value} data-testid="year-select">
      <div onClick={() => onValueChange && onValueChange('2023')}>{children}</div>
    </div>
  ),
  SelectContent: ({ children }) => <div className="select-content">{children}</div>,
  SelectItem: ({ children, value }) => (
    <div className="select-item" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, className }) => (
    <div className={`select-trigger ${className || ''}`}>{children}</div>
  ),
  SelectValue: () => <div className="select-value">2024</div>
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon">📅</div>,
  Clock: () => <div data-testid="clock-icon">🕐</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">📈</div>
}));

describe('OutOfOfficeCounter', () => {
  const mockTeamMemberId = 'team-member-1';
  const currentYear = new Date().getFullYear();

  const mockStatsWithData = {
    teamMemberId: mockTeamMemberId,
    year: currentYear,
    totalDays: 15,
    reasonBreakdown: {
      vacation: 10,
      sick_day: 3,
      day_off: 2
    },
    periods: []
  };

  const mockStatsEmpty = {
    teamMemberId: mockTeamMemberId,
    year: currentYear,
    totalDays: 0,
    reasonBreakdown: {},
    periods: []
  };

  const mockReasonTypes = [
    { value: 'vacation', name: 'Vacation', color: '#3b82f6' },
    { value: 'sick_day', name: 'Sick Day', color: '#ef4444' },
    { value: 'day_off', name: 'Day Off', color: '#10b981' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service methods
    OutOfOfficeService.getYearlyStats = vi.fn();
    OutOfOfficeService.getReasonType = vi.fn((value) => 
      mockReasonTypes.find(type => type.value === value)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render loading state initially', () => {
      OutOfOfficeService.getYearlyStats.mockImplementation(() => new Promise(() => {}));
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} />);
      
      expect(screen.getByText('Out of Office Days')).toBeInTheDocument();
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should render counter with total days', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} />);
      
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText(`days in ${currentYear}`)).toBeInTheDocument();
      });
    });

    it('should render singular "day" for count of 1', async () => {
      const singleDayStats = { ...mockStatsWithData, totalDays: 1 };
      OutOfOfficeService.getYearlyStats.mockResolvedValue(singleDayStats);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} />);
      
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText(`day in ${currentYear}`)).toBeInTheDocument();
      });
    });

    it('should show current year badge for current year', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Current')).toBeInTheDocument();
      });
    });

    it('should not show current year badge for past years', async () => {
      const pastYearStats = { ...mockStatsWithData, year: currentYear - 1 };
      OutOfOfficeService.getYearlyStats.mockResolvedValue(pastYearStats);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} year={currentYear - 1} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Current')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show no data message when totalDays is 0', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsEmpty);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} />);
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText(`No out of office periods in ${currentYear}`)).toBeInTheDocument();
      });
    });

    it('should handle missing teamMemberId gracefully', async () => {
      render(<OutOfOfficeCounter teamMemberId="" />);
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
      
      expect(OutOfOfficeService.getYearlyStats).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when service fails', async () => {
      const errorMessage = 'Failed to load stats';
      OutOfOfficeService.getYearlyStats.mockRejectedValue(new Error(errorMessage));
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load stats')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading stats when retry button is clicked', async () => {
      OutOfOfficeService.getYearlyStats
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
      });
      
      expect(OutOfOfficeService.getYearlyStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('Breakdown Display', () => {
    it('should show breakdown when showBreakdown is true', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} showBreakdown={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Vacation')).toBeInTheDocument();
        expect(screen.getByText('10 days')).toBeInTheDocument();
        expect(screen.getByText('Sick Day')).toBeInTheDocument();
        expect(screen.getByText('3 days')).toBeInTheDocument();
        expect(screen.getByText('Day Off')).toBeInTheDocument();
        expect(screen.getByText('2 days')).toBeInTheDocument();
      });
    });

    it('should not show breakdown when showBreakdown is false', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} showBreakdown={false} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Breakdown')).not.toBeInTheDocument();
      });
    });

    it('should sort breakdown by days descending', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} showBreakdown={true} />);
      
      await waitFor(() => {
        const breakdownItems = screen.getAllByText(/\d+ days?$/);
        expect(breakdownItems[0]).toHaveTextContent('10 days'); // Vacation
        expect(breakdownItems[1]).toHaveTextContent('3 days');  // Sick Day
        expect(breakdownItems[2]).toHaveTextContent('2 days');  // Day Off
      });
    });

    it('should handle singular "day" in breakdown', async () => {
      const singleDayBreakdown = {
        ...mockStatsWithData,
        totalDays: 1,
        reasonBreakdown: { vacation: 1 }
      };
      OutOfOfficeService.getYearlyStats.mockResolvedValue(singleDayBreakdown);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} showBreakdown={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('1 day')).toBeInTheDocument();
      });
    });
  });

  describe('Year Selection', () => {
    it('should show year selector when showYearSelector is true', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} showYearSelector={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('year-select')).toBeInTheDocument();
      });
    });

    it('should not show year selector when showYearSelector is false', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} showYearSelector={false} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('year-select')).not.toBeInTheDocument();
      });
    });

    it('should load stats for selected year', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} year={2023} />);
      
      await waitFor(() => {
        expect(OutOfOfficeService.getYearlyStats).toHaveBeenCalledWith(mockTeamMemberId, 2023);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should call onStatsChange callback when stats are loaded', async () => {
      const onStatsChange = vi.fn();
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(
        <OutOfOfficeCounter 
          teamMemberId={mockTeamMemberId} 
          onStatsChange={onStatsChange} 
        />
      );
      
      await waitFor(() => {
        expect(onStatsChange).toHaveBeenCalledWith(mockStatsWithData);
      });
    });

    it('should reload stats when teamMemberId changes', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      const { rerender } = render(
        <OutOfOfficeCounter teamMemberId="member-1" />
      );
      
      await waitFor(() => {
        expect(OutOfOfficeService.getYearlyStats).toHaveBeenCalledWith('member-1', currentYear);
      });
      
      rerender(<OutOfOfficeCounter teamMemberId="member-2" />);
      
      await waitFor(() => {
        expect(OutOfOfficeService.getYearlyStats).toHaveBeenCalledWith('member-2', currentYear);
      });
    });
  });

  describe('Service Integration', () => {
    it('should call getYearlyStats with correct parameters', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} year={2023} />);
      
      await waitFor(() => {
        expect(OutOfOfficeService.getYearlyStats).toHaveBeenCalledWith(mockTeamMemberId, 2023);
      });
    });

    it('should use current year as default', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} />);
      
      await waitFor(() => {
        expect(OutOfOfficeService.getYearlyStats).toHaveBeenCalledWith(mockTeamMemberId, currentYear);
      });
    });

    it('should call getReasonType for breakdown display', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} showBreakdown={true} />);
      
      await waitFor(() => {
        expect(OutOfOfficeService.getReasonType).toHaveBeenCalledWith('vacation');
        expect(OutOfOfficeService.getReasonType).toHaveBeenCalledWith('sick_day');
        expect(OutOfOfficeService.getReasonType).toHaveBeenCalledWith('day_off');
      });
    });
  });

  describe('Styling and Classes', () => {
    it('should apply custom className', async () => {
      OutOfOfficeService.getYearlyStats.mockResolvedValue(mockStatsWithData);
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} className="custom-class" />);
      
      await waitFor(() => {
        expect(document.querySelector('.card.custom-class')).toBeInTheDocument();
      });
    });

    it('should apply loading animation class during loading', () => {
      OutOfOfficeService.getYearlyStats.mockImplementation(() => new Promise(() => {}));
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} />);
      
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should apply error styling in error state', async () => {
      OutOfOfficeService.getYearlyStats.mockRejectedValue(new Error('Test error'));
      
      render(<OutOfOfficeCounter teamMemberId={mockTeamMemberId} />);
      
      await waitFor(() => {
        expect(document.querySelector('.border-red-200')).toBeInTheDocument();
      });
    });
  });
});