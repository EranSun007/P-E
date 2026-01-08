/**
 * Tests for OutOfOffice entity CRUD operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutOfOffice } from '../entities.js';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('OutOfOffice Entity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('[]');
  });

  describe('list()', () => {
    it('should return empty array when no data exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = await OutOfOffice.list();
      
      expect(result).toEqual([]);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('out_of_office');
    });

    it('should return parsed data from localStorage', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2024-01-01',
          end_date: '2024-01-05',
          reason: 'vacation',
          notes: 'Holiday trip'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.list();
      
      expect(result).toEqual(mockData);
    });
  });

  describe('get()', () => {
    it('should return specific out of office period by id', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2024-01-01',
          end_date: '2024-01-05',
          reason: 'vacation'
        },
        {
          id: '2',
          team_member_id: 'tm2',
          start_date: '2024-02-01',
          end_date: '2024-02-02',
          reason: 'sick_day'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.get('1');
      
      expect(result).toEqual(mockData[0]);
    });

    it('should return null when id not found', async () => {
      mockLocalStorage.getItem.mockReturnValue('[]');
      
      const result = await OutOfOffice.get('nonexistent');
      
      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    it('should create new out of office period with generated id and timestamps', async () => {
      const mockData = [];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const newOutOfOffice = {
        team_member_id: 'tm1',
        start_date: '2024-01-01',
        end_date: '2024-01-05',
        reason: 'vacation',
        notes: 'Holiday trip'
      };
      
      const result = await OutOfOffice.create(newOutOfOffice);
      
      expect(result).toMatchObject({
        ...newOutOfOffice,
        id: expect.any(String),
        created_date: expect.any(String),
        updated_date: expect.any(String)
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'out_of_office',
        expect.stringContaining('"team_member_id":"tm1"')
      );
    });

    it('should set notes to null when not provided', async () => {
      mockLocalStorage.getItem.mockReturnValue('[]');
      
      const newOutOfOffice = {
        team_member_id: 'tm1',
        start_date: '2024-01-01',
        end_date: '2024-01-05',
        reason: 'vacation'
      };
      
      const result = await OutOfOffice.create(newOutOfOffice);
      
      expect(result.notes).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update existing out of office period', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2024-01-01',
          end_date: '2024-01-05',
          reason: 'vacation',
          notes: 'Holiday trip',
          created_date: '2024-01-01T00:00:00.000Z',
          updated_date: '2024-01-01T00:00:00.000Z'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const updates = {
        end_date: '2024-01-07',
        notes: 'Extended holiday'
      };
      
      const result = await OutOfOffice.update('1', updates);
      
      expect(result).toMatchObject({
        ...mockData[0],
        ...updates,
        updated_date: expect.any(String)
      });
      expect(result.updated_date).not.toBe(mockData[0].updated_date);
    });

    it('should throw error when id not found', async () => {
      mockLocalStorage.getItem.mockReturnValue('[]');
      
      await expect(OutOfOffice.update('nonexistent', {})).rejects.toThrow('OutOfOffice not found');
    });
  });

  describe('delete()', () => {
    it('should remove out of office period from storage', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2024-01-01',
          end_date: '2024-01-05',
          reason: 'vacation'
        },
        {
          id: '2',
          team_member_id: 'tm2',
          start_date: '2024-02-01',
          end_date: '2024-02-02',
          reason: 'sick_day'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.delete('1');
      
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'out_of_office',
        JSON.stringify([mockData[1]])
      );
    });

    it('should return true even when id not found', async () => {
      mockLocalStorage.getItem.mockReturnValue('[]');
      
      const result = await OutOfOffice.delete('nonexistent');
      
      expect(result).toBe(true);
    });
  });

  describe('getByTeamMember()', () => {
    it('should return all out of office periods for specific team member', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2024-01-01',
          end_date: '2024-01-05',
          reason: 'vacation'
        },
        {
          id: '2',
          team_member_id: 'tm2',
          start_date: '2024-02-01',
          end_date: '2024-02-02',
          reason: 'sick_day'
        },
        {
          id: '3',
          team_member_id: 'tm1',
          start_date: '2024-03-01',
          end_date: '2024-03-01',
          reason: 'day_off'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.getByTeamMember('tm1');
      
      expect(result).toEqual([mockData[0], mockData[2]]);
    });

    it('should return empty array when team member has no periods', async () => {
      mockLocalStorage.getItem.mockReturnValue('[]');
      
      const result = await OutOfOffice.getByTeamMember('tm1');
      
      expect(result).toEqual([]);
    });
  });

  describe('getActiveForDate()', () => {
    it('should return periods active on specific date', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2024-01-01',
          end_date: '2024-01-05',
          reason: 'vacation'
        },
        {
          id: '2',
          team_member_id: 'tm2',
          start_date: '2024-01-03',
          end_date: '2024-01-07',
          reason: 'sick_day'
        },
        {
          id: '3',
          team_member_id: 'tm3',
          start_date: '2024-01-10',
          end_date: '2024-01-15',
          reason: 'vacation'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.getActiveForDate('2024-01-03');
      
      expect(result).toEqual([mockData[0], mockData[1]]);
    });

    it('should return empty array when no periods are active', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2024-01-01',
          end_date: '2024-01-05',
          reason: 'vacation'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.getActiveForDate('2024-01-10');
      
      expect(result).toEqual([]);
    });

    it('should handle single day periods correctly', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2024-01-03',
          end_date: '2024-01-03',
          reason: 'day_off'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.getActiveForDate('2024-01-03');
      
      expect(result).toEqual([mockData[0]]);
    });
  });

  describe('getCountForYear()', () => {
    it('should calculate total days for team member in specific year', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2024-01-01',
          end_date: '2024-01-05', // 5 days
          reason: 'vacation'
        },
        {
          id: '2',
          team_member_id: 'tm1',
          start_date: '2024-06-01',
          end_date: '2024-06-03', // 3 days
          reason: 'sick_day'
        },
        {
          id: '3',
          team_member_id: 'tm2',
          start_date: '2024-01-01',
          end_date: '2024-01-02', // Should not be counted
          reason: 'vacation'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.getCountForYear('tm1', 2024);
      
      expect(result).toBe(8); // 5 + 3 days
    });

    it('should handle periods spanning multiple years correctly', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2023-12-30',
          end_date: '2024-01-02', // Only Jan 1-2 should count for 2024
          reason: 'vacation'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.getCountForYear('tm1', 2024);
      
      expect(result).toBe(2); // Jan 1-2 only
    });

    it('should return 0 when team member has no periods in year', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2023-01-01',
          end_date: '2023-01-05',
          reason: 'vacation'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.getCountForYear('tm1', 2024);
      
      expect(result).toBe(0);
    });

    it('should handle single day periods correctly', async () => {
      const mockData = [
        {
          id: '1',
          team_member_id: 'tm1',
          start_date: '2024-01-15',
          end_date: '2024-01-15', // 1 day
          reason: 'day_off'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const result = await OutOfOffice.getCountForYear('tm1', 2024);
      
      expect(result).toBe(1);
    });
  });
});