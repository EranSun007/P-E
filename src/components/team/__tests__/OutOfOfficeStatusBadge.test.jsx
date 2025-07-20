/**
 * Tests for OutOfOfficeStatusBadge Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import OutOfOfficeStatusBadge from '../OutOfOfficeStatusBadge';
import OutOfOfficeService from '../../../services/outOfOfficeService';

// Mock the OutOfOfficeService
vi.mock('../../../services/outOfOfficeService');

describe('OutOfOfficeStatusBadge', () => {
  const mockTeamMemberId = 'team-member-1';
  const mockCurrentDate = '2024-03-15';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Status Determination', () => {
    it('should not render when team member is not out of office', async () => {
      OutOfOfficeService.getCurrentStatus.mockResolvedValue(null);

      const { container } = render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        expect(OutOfOfficeService.getCurrentStatus).toHaveBeenCalledWith(
          mockTeamMemberId, 
          mockCurrentDate
        );
      });

      expect(container.firstChild).toBeNull();
    });

    it('should render status badge when team member is out of office', async () => {
      const mockStatus = {
        id: 'ooo-1',
        team_member_id: mockTeamMemberId,
        start_date: '2024-03-14',
        end_date: '2024-03-16',
        reason: 'vacation',
        returnDate: '2024-03-17',
        daysRemaining: 2
      };

      OutOfOfficeService.getCurrentStatus.mockResolvedValue(mockStatus);
      OutOfOfficeService.getReasonType.mockReturnValue({
        name: 'Vacation',
        color: '#3b82f6'
      });

      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Out of Office')).toBeInTheDocument();
      });

      expect(OutOfOfficeService.getCurrentStatus).toHaveBeenCalledWith(
        mockTeamMemberId, 
        mockCurrentDate
      );
    });

    it('should handle service errors gracefully', async () => {
      OutOfOfficeService.getCurrentStatus.mockRejectedValue(
        new Error('Service error')
      );

      const { container } = render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        expect(OutOfOfficeService.getCurrentStatus).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
    });

    it('should not render when teamMemberId is not provided', async () => {
      const { container } = render(
        <OutOfOfficeStatusBadge 
          teamMemberId=""
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });

      expect(OutOfOfficeService.getCurrentStatus).not.toHaveBeenCalled();
    });
  });

  describe('Return Date Display', () => {
    const mockStatus = {
      id: 'ooo-1',
      team_member_id: mockTeamMemberId,
      start_date: '2024-03-14',
      end_date: '2024-03-16',
      reason: 'vacation',
      daysRemaining: 2
    };

    beforeEach(() => {
      OutOfOfficeService.getCurrentStatus.mockResolvedValue(mockStatus);
      OutOfOfficeService.getReasonType.mockReturnValue({
        name: 'Vacation',
        color: '#3b82f6'
      });
    });

    it('should show "Returns today" when return date is today', async () => {
      const today = new Date().toISOString().split('T')[0];
      const statusWithTodayReturn = {
        ...mockStatus,
        returnDate: today
      };

      OutOfOfficeService.getCurrentStatus.mockResolvedValue(statusWithTodayReturn);

      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Returns today')).toBeInTheDocument();
      });
    });

    it('should show "Returns tomorrow" when return date is tomorrow', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      
      const statusWithTomorrowReturn = {
        ...mockStatus,
        returnDate: tomorrowString
      };

      OutOfOfficeService.getCurrentStatus.mockResolvedValue(statusWithTomorrowReturn);

      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Returns tomorrow')).toBeInTheDocument();
      });
    });

    it('should show formatted date for future return dates', async () => {
      const statusWithFutureReturn = {
        ...mockStatus,
        returnDate: '2024-03-20'
      };

      OutOfOfficeService.getCurrentStatus.mockResolvedValue(statusWithFutureReturn);

      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Returns Mar 20')).toBeInTheDocument();
      });
    });

    it('should not show return date when showReturnDate is false', async () => {
      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
          showReturnDate={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Out of Office')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Returns/)).not.toBeInTheDocument();
    });
  });

  describe('Reason Color Coding', () => {
    it('should apply correct background color for vacation reason', async () => {
      const mockStatus = {
        id: 'ooo-1',
        team_member_id: mockTeamMemberId,
        start_date: '2024-03-14',
        end_date: '2024-03-16',
        reason: 'vacation',
        returnDate: '2024-03-17',
        daysRemaining: 2
      };

      OutOfOfficeService.getCurrentStatus.mockResolvedValue(mockStatus);
      OutOfOfficeService.getReasonType.mockReturnValue({
        name: 'Vacation',
        color: '#3b82f6'
      });

      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        const badge = screen.getByText('Out of Office').closest('div');
        expect(badge).toHaveStyle({ backgroundColor: '#3b82f6' });
      });
    });

    it('should apply correct background color for sick day reason', async () => {
      const mockStatus = {
        id: 'ooo-1',
        team_member_id: mockTeamMemberId,
        start_date: '2024-03-14',
        end_date: '2024-03-16',
        reason: 'sick_day',
        returnDate: '2024-03-17',
        daysRemaining: 2
      };

      OutOfOfficeService.getCurrentStatus.mockResolvedValue(mockStatus);
      OutOfOfficeService.getReasonType.mockReturnValue({
        name: 'Sick Day',
        color: '#ef4444'
      });

      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        const badge = screen.getByText('Out of Office').closest('div');
        expect(badge).toHaveStyle({ backgroundColor: '#ef4444' });
      });
    });

    it('should use default color for unknown reason types', async () => {
      const mockStatus = {
        id: 'ooo-1',
        team_member_id: mockTeamMemberId,
        start_date: '2024-03-14',
        end_date: '2024-03-16',
        reason: 'unknown_reason',
        returnDate: '2024-03-17',
        daysRemaining: 2
      };

      OutOfOfficeService.getCurrentStatus.mockResolvedValue(mockStatus);
      OutOfOfficeService.getReasonType.mockReturnValue(null);

      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        const badge = screen.getByText('Out of Office').closest('div');
        expect(badge).toHaveStyle({ backgroundColor: '#6b7280' });
      });
    });
  });

  describe('Reason Display', () => {
    const mockStatus = {
      id: 'ooo-1',
      team_member_id: mockTeamMemberId,
      start_date: '2024-03-14',
      end_date: '2024-03-16',
      reason: 'vacation',
      returnDate: '2024-03-17',
      daysRemaining: 2
    };

    beforeEach(() => {
      OutOfOfficeService.getCurrentStatus.mockResolvedValue(mockStatus);
      OutOfOfficeService.getReasonType.mockReturnValue({
        name: 'Vacation',
        color: '#3b82f6'
      });
    });

    it('should not show reason by default', async () => {
      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Out of Office')).toBeInTheDocument();
      });

      expect(screen.queryByText('• Vacation')).not.toBeInTheDocument();
    });

    it('should show reason when showReason is true', async () => {
      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
          showReason={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Out of Office')).toBeInTheDocument();
        expect(screen.getByText('• Vacation')).toBeInTheDocument();
      });
    });
  });

  describe('Component Props', () => {
    const mockStatus = {
      id: 'ooo-1',
      team_member_id: mockTeamMemberId,
      start_date: '2024-03-14',
      end_date: '2024-03-16',
      reason: 'vacation',
      returnDate: '2024-03-17',
      daysRemaining: 2
    };

    beforeEach(() => {
      OutOfOfficeService.getCurrentStatus.mockResolvedValue(mockStatus);
      OutOfOfficeService.getReasonType.mockReturnValue({
        name: 'Vacation',
        color: '#3b82f6'
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
          className="custom-class"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Out of Office')).toBeInTheDocument();
      });

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should call onStatusChange callback when status is loaded', async () => {
      const onStatusChange = vi.fn();

      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
          onStatusChange={onStatusChange}
        />
      );

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith(mockStatus);
      });
    });

    it('should use current date when currentDate prop is not provided', async () => {
      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
        />
      );

      await waitFor(() => {
        expect(OutOfOfficeService.getCurrentStatus).toHaveBeenCalledWith(
          mockTeamMemberId, 
          undefined
        );
      });
    });
  });

  describe('Size Variants', () => {
    const mockStatus = {
      id: 'ooo-1',
      team_member_id: mockTeamMemberId,
      start_date: '2024-03-14',
      end_date: '2024-03-16',
      reason: 'vacation',
      returnDate: '2024-03-17',
      daysRemaining: 2
    };

    beforeEach(() => {
      OutOfOfficeService.getCurrentStatus.mockResolvedValue(mockStatus);
      OutOfOfficeService.getReasonType.mockReturnValue({
        name: 'Vacation',
        color: '#3b82f6'
      });
    });

    it('should apply small size classes', async () => {
      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
          size="sm"
        />
      );

      await waitFor(() => {
        const badge = screen.getByText('Out of Office').closest('div');
        expect(badge).toHaveClass('text-xs', 'px-2', 'py-0.5');
      });
    });

    it('should apply large size classes', async () => {
      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
          size="lg"
        />
      );

      await waitFor(() => {
        const badge = screen.getByText('Out of Office').closest('div');
        expect(badge).toHaveClass('text-sm', 'px-3', 'py-1');
      });
    });

    it('should apply medium size classes by default', async () => {
      render(
        <OutOfOfficeStatusBadge 
          teamMemberId={mockTeamMemberId}
          currentDate={mockCurrentDate}
        />
      );

      await waitFor(() => {
        const badge = screen.getByText('Out of Office').closest('div');
        expect(badge).toHaveClass('text-xs', 'px-2.5', 'py-0.5');
      });
    });
  });
});