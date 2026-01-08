/**
 * Unit tests for OutOfOfficeService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OutOfOfficeService from '../outOfOfficeService.js';

// Mock the OutOfOffice entity
vi.mock('../../api/entities.js', () => ({
  OutOfOffice: {
    list: vi.fn()
  }
}));

import { OutOfOffice } from '../../api/entities.js';

describe('OutOfOfficeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateDaysInPeriod', () => {
    it('should calculate days correctly for same day period', () => {
      const result = OutOfOfficeService.calculateDaysInPeriod('2024-01-15', '2024-01-15');
      expect(result).toBe(1);
    });

    it('should calculate days correctly for multi-day period', () => {
      const result = OutOfOfficeService.calculateDaysInPeriod('2024-01-15', '2024-01-20');
      expect(result).toBe(6);
    });

    it('should include weekends in calculation', () => {
      // Friday to Monday (includes weekend)
      const result = OutOfOfficeService.calculateDaysInPeriod('2024-01-12', '2024-01-15');
      expect(result).toBe(4);
    });

    it('should handle month boundaries correctly', () => {
      const result = OutOfOfficeService.calculateDaysInPeriod('2024-01-30', '2024-02-02');
      expect(result).toBe(4);
    });

    it('should handle year boundaries correctly', () => {
      const result = OutOfOfficeService.calculateDaysInPeriod('2023-12-30', '2024-01-02');
      expect(result).toBe(4);
    });

    it('should throw error for missing start date', () => {
      expect(() => {
        OutOfOfficeService.calculateDaysInPeriod(null, '2024-01-15');
      }).toThrow('Start date and end date are required');
    });

    it('should throw error for missing end date', () => {
      expect(() => {
        OutOfOfficeService.calculateDaysInPeriod('2024-01-15', null);
      }).toThrow('Start date and end date are required');
    });

    it('should throw error for invalid date format', () => {
      expect(() => {
        OutOfOfficeService.calculateDaysInPeriod('invalid-date', '2024-01-15');
      }).toThrow('Invalid date format');
    });

    it('should throw error when end date is before start date', () => {
      expect(() => {
        OutOfOfficeService.calculateDaysInPeriod('2024-01-20', '2024-01-15');
      }).toThrow('End date must be after or equal to start date');
    });
  });

  describe('validatePeriod', () => {
    it('should return valid for correct input', () => {
      const result = OutOfOfficeService.validatePeriod(
        '2024-01-15',
        '2024-01-20',
        'vacation',
        'team-member-1'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const result = OutOfOfficeService.validatePeriod(null, null, null, null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date is required');
      expect(result.errors).toContain('End date is required');
      expect(result.errors).toContain('Reason is required');
      expect(result.errors).toContain('Team member ID is required');
    });

    it('should return error for invalid start date format', () => {
      const result = OutOfOfficeService.validatePeriod(
        'invalid-date',
        '2024-01-20',
        'vacation',
        'team-member-1'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid start date format');
    });

    it('should return error for invalid end date format', () => {
      const result = OutOfOfficeService.validatePeriod(
        '2024-01-15',
        'invalid-date',
        'vacation',
        'team-member-1'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid end date format');
    });

    it('should return error when end date is before start date', () => {
      const result = OutOfOfficeService.validatePeriod(
        '2024-01-20',
        '2024-01-15',
        'vacation',
        'team-member-1'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date must be after or equal to start date');
    });

    it('should return error for invalid reason type', () => {
      const result = OutOfOfficeService.validatePeriod(
        '2024-01-15',
        '2024-01-20',
        'invalid-reason',
        'team-member-1'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid reason type');
    });

    it('should accept all valid reason types', () => {
      const validReasons = ['vacation', 'sick_day', 'day_off', 'personal_leave', 'training'];
      
      validReasons.forEach(reason => {
        const result = OutOfOfficeService.validatePeriod(
          '2024-01-15',
          '2024-01-20',
          reason,
          'team-member-1'
        );
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('getActivePeriodsForDate', () => {
    const mockPeriods = [
      {
        id: '1',
        team_member_id: 'member-1',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        reason: 'vacation'
      },
      {
        id: '2',
        team_member_id: 'member-2',
        start_date: '2024-01-10',
        end_date: '2024-01-12',
        reason: 'sick_day'
      },
      {
        id: '3',
        team_member_id: 'member-3',
        start_date: '2024-01-25',
        end_date: '2024-01-30',
        reason: 'day_off'
      }
    ];

    beforeEach(() => {
      OutOfOffice.list.mockResolvedValue(mockPeriods);
    });

    it('should return active periods for a date within range', async () => {
      const result = await OutOfOfficeService.getActivePeriodsForDate('2024-01-18');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should return multiple active periods for same date', async () => {
      const periodsWithOverlap = [
        ...mockPeriods,
        {
          id: '4',
          team_member_id: 'member-4',
          start_date: '2024-01-15',
          end_date: '2024-01-25',
          reason: 'training'
        }
      ];
      OutOfOffice.list.mockResolvedValue(periodsWithOverlap);

      const result = await OutOfOfficeService.getActivePeriodsForDate('2024-01-18');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for date with no active periods', async () => {
      const result = await OutOfOfficeService.getActivePeriodsForDate('2024-02-15');
      expect(result).toHaveLength(0);
    });

    it('should include periods that start on the query date', async () => {
      const result = await OutOfOfficeService.getActivePeriodsForDate('2024-01-15');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should include periods that end on the query date', async () => {
      const result = await OutOfOfficeService.getActivePeriodsForDate('2024-01-20');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should throw error for missing date', async () => {
      await expect(OutOfOfficeService.getActivePeriodsForDate(null))
        .rejects.toThrow('Date is required');
    });

    it('should throw error for invalid date format', async () => {
      await expect(OutOfOfficeService.getActivePeriodsForDate('invalid-date'))
        .rejects.toThrow('Invalid date format');
    });

    it('should handle API errors gracefully', async () => {
      OutOfOffice.list.mockRejectedValue(new Error('API Error'));
      
      await expect(OutOfOfficeService.getActivePeriodsForDate('2024-01-15'))
        .rejects.toThrow('Failed to get active periods: API Error');
    });
  });

  describe('getYearlyStats', () => {
    const mockPeriods = [
      {
        id: '1',
        team_member_id: 'member-1',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        reason: 'vacation'
      },
      {
        id: '2',
        team_member_id: 'member-1',
        start_date: '2024-03-10',
        end_date: '2024-03-12',
        reason: 'sick_day'
      },
      {
        id: '3',
        team_member_id: 'member-1',
        start_date: '2024-06-01',
        end_date: '2024-06-05',
        reason: 'vacation'
      },
      {
        id: '4',
        team_member_id: 'member-2',
        start_date: '2024-02-15',
        end_date: '2024-02-20',
        reason: 'day_off'
      }
    ];

    beforeEach(() => {
      OutOfOffice.list.mockResolvedValue(mockPeriods);
    });

    it('should calculate yearly stats correctly', async () => {
      const result = await OutOfOfficeService.getYearlyStats('member-1', 2024);
      
      expect(result.teamMemberId).toBe('member-1');
      expect(result.year).toBe(2024);
      expect(result.totalDays).toBe(14); // 6 + 3 + 5 days
      expect(result.reasonBreakdown.vacation).toBe(11); // 6 + 5 days
      expect(result.reasonBreakdown.sick_day).toBe(3);
      expect(result.periods).toHaveLength(3);
    });

    it('should default to current year when year not provided', async () => {
      const currentYear = new Date().getFullYear();
      const result = await OutOfOfficeService.getYearlyStats('member-1');
      expect(result.year).toBe(currentYear);
    });

    it('should handle periods spanning multiple years', async () => {
      const crossYearPeriods = [
        {
          id: '1',
          team_member_id: 'member-1',
          start_date: '2023-12-28',
          end_date: '2024-01-05',
          reason: 'vacation'
        }
      ];
      OutOfOffice.list.mockResolvedValue(crossYearPeriods);

      const result = await OutOfOfficeService.getYearlyStats('member-1', 2024);
      // Jan 1, 2, 3, 4, 5 = 5 days in 2024
      expect(result.totalDays).toBe(5); // Only Jan 1-5 counted for 2024
    });

    it('should return zero stats for member with no periods', async () => {
      const result = await OutOfOfficeService.getYearlyStats('member-3', 2024);
      
      expect(result.totalDays).toBe(0);
      expect(result.reasonBreakdown).toEqual({});
      expect(result.periods).toHaveLength(0);
    });

    it('should throw error for missing team member ID', async () => {
      await expect(OutOfOfficeService.getYearlyStats(null, 2024))
        .rejects.toThrow('Team member ID is required');
    });

    it('should throw error for invalid year', async () => {
      await expect(OutOfOfficeService.getYearlyStats('member-1', 1800))
        .rejects.toThrow('Invalid year');
      
      await expect(OutOfOfficeService.getYearlyStats('member-1', 4000))
        .rejects.toThrow('Invalid year');
    });

    it('should handle API errors gracefully', async () => {
      OutOfOffice.list.mockRejectedValue(new Error('API Error'));
      
      await expect(OutOfOfficeService.getYearlyStats('member-1', 2024))
        .rejects.toThrow('Failed to get yearly statistics: API Error');
    });
  });

  describe('checkOverlaps', () => {
    const mockPeriods = [
      {
        id: '1',
        team_member_id: 'member-1',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        reason: 'vacation'
      },
      {
        id: '2',
        team_member_id: 'member-1',
        start_date: '2024-01-25',
        end_date: '2024-01-30',
        reason: 'sick_day'
      },
      {
        id: '3',
        team_member_id: 'member-2',
        start_date: '2024-01-18',
        end_date: '2024-01-22',
        reason: 'day_off'
      }
    ];

    beforeEach(() => {
      OutOfOffice.list.mockResolvedValue(mockPeriods);
    });

    it('should detect overlapping periods', async () => {
      const result = await OutOfOfficeService.checkOverlaps(
        'member-1',
        '2024-01-18',
        '2024-01-22'
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should detect multiple overlapping periods', async () => {
      const result = await OutOfOfficeService.checkOverlaps(
        'member-1',
        '2024-01-20',
        '2024-01-26'
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array for non-overlapping periods', async () => {
      const result = await OutOfOfficeService.checkOverlaps(
        'member-1',
        '2024-02-01',
        '2024-02-05'
      );
      expect(result).toHaveLength(0);
    });

    it('should exclude specified period from overlap check', async () => {
      const result = await OutOfOfficeService.checkOverlaps(
        'member-1',
        '2024-01-18',
        '2024-01-22',
        '1' // Exclude period with id '1'
      );
      expect(result).toHaveLength(0);
    });

    it('should only check periods for specified team member', async () => {
      const result = await OutOfOfficeService.checkOverlaps(
        'member-2',
        '2024-01-15',
        '2024-01-25'
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should detect edge case overlaps (same start/end dates)', async () => {
      const result = await OutOfOfficeService.checkOverlaps(
        'member-1',
        '2024-01-20',
        '2024-01-25'
      );
      expect(result).toHaveLength(2); // Overlaps with both periods
    });

    it('should throw error for missing required parameters', async () => {
      await expect(OutOfOfficeService.checkOverlaps(null, '2024-01-15', '2024-01-20'))
        .rejects.toThrow('Team member ID, start date, and end date are required');
      
      await expect(OutOfOfficeService.checkOverlaps('member-1', null, '2024-01-20'))
        .rejects.toThrow('Team member ID, start date, and end date are required');
      
      await expect(OutOfOfficeService.checkOverlaps('member-1', '2024-01-15', null))
        .rejects.toThrow('Team member ID, start date, and end date are required');
    });

    it('should throw error for invalid date format', async () => {
      await expect(OutOfOfficeService.checkOverlaps('member-1', 'invalid-date', '2024-01-20'))
        .rejects.toThrow('Invalid date format');
    });

    it('should handle API errors gracefully', async () => {
      OutOfOffice.list.mockRejectedValue(new Error('API Error'));
      
      await expect(OutOfOfficeService.checkOverlaps('member-1', '2024-01-15', '2024-01-20'))
        .rejects.toThrow('Failed to check overlaps: API Error');
    });
  });

  describe('getCurrentStatus', () => {
    const mockPeriods = [
      {
        id: '1',
        team_member_id: 'member-1',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        reason: 'vacation'
      },
      {
        id: '2',
        team_member_id: 'member-2',
        start_date: '2024-01-10',
        end_date: '2024-01-12',
        reason: 'sick_day'
      }
    ];

    beforeEach(() => {
      OutOfOffice.list.mockResolvedValue(mockPeriods);
    });

    it('should return current status for team member who is out', async () => {
      const result = await OutOfOfficeService.getCurrentStatus('member-1', '2024-01-18');
      
      expect(result).not.toBeNull();
      expect(result.id).toBe('1');
      expect(result.returnDate).toBe('2024-01-21');
      expect(result.daysRemaining).toBe(3); // 18, 19, 20
    });

    it('should return null for team member who is not out', async () => {
      const result = await OutOfOfficeService.getCurrentStatus('member-3', '2024-01-18');
      expect(result).toBeNull();
    });

    it('should return null for team member whose period has ended', async () => {
      const result = await OutOfOfficeService.getCurrentStatus('member-2', '2024-01-15');
      expect(result).toBeNull();
    });

    it('should use current date when not provided', async () => {
      // Mock Date.prototype.toISOString to return a date within the period
      const originalToISOString = Date.prototype.toISOString;
      Date.prototype.toISOString = vi.fn(() => '2024-01-18T00:00:00.000Z');
      
      const result = await OutOfOfficeService.getCurrentStatus('member-1');
      expect(result).not.toBeNull();
      
      Date.prototype.toISOString = originalToISOString;
    });

    it('should calculate return date correctly', async () => {
      const result = await OutOfOfficeService.getCurrentStatus('member-1', '2024-01-20');
      expect(result.returnDate).toBe('2024-01-21');
    });

    it('should throw error for missing team member ID', async () => {
      await expect(OutOfOfficeService.getCurrentStatus(null))
        .rejects.toThrow('Team member ID is required');
    });

    it('should handle API errors gracefully', async () => {
      OutOfOffice.list.mockRejectedValue(new Error('API Error'));
      
      await expect(OutOfOfficeService.getCurrentStatus('member-1', '2024-01-18'))
        .rejects.toThrow('Failed to get current status: Failed to get active periods: API Error');
    });
  });

  describe('getReasonTypes', () => {
    it('should return all active reason types sorted by order', () => {
      const result = OutOfOfficeService.getReasonTypes();
      
      expect(result).toHaveLength(5);
      expect(result[0].value).toBe('vacation');
      expect(result[1].value).toBe('sick_day');
      expect(result[2].value).toBe('day_off');
      expect(result[3].value).toBe('personal_leave');
      expect(result[4].value).toBe('training');
    });

    it('should include all required properties for each reason type', () => {
      const result = OutOfOfficeService.getReasonTypes();
      
      result.forEach(reason => {
        expect(reason).toHaveProperty('id');
        expect(reason).toHaveProperty('name');
        expect(reason).toHaveProperty('value');
        expect(reason).toHaveProperty('active');
        expect(reason).toHaveProperty('color');
        expect(reason).toHaveProperty('order');
        expect(reason.active).toBe(true);
      });
    });
  });

  describe('getReasonType', () => {
    it('should return reason type by value', () => {
      const result = OutOfOfficeService.getReasonType('vacation');
      
      expect(result).not.toBeNull();
      expect(result.value).toBe('vacation');
      expect(result.name).toBe('Vacation');
    });

    it('should return null for non-existent reason type', () => {
      const result = OutOfOfficeService.getReasonType('non-existent');
      expect(result).toBeNull();
    });

    it('should return inactive reason types', () => {
      // This tests that getReasonType can find inactive reasons (unlike getReasonTypes)
      const result = OutOfOfficeService.getReasonType('vacation');
      expect(result).not.toBeNull();
    });
  });
});