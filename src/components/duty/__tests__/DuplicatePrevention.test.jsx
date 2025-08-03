import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Duty } from '../../../api/entities';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Duty Duplicate Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue('[]');
  });

  it('should detect exact duplicates', async () => {
    // Mock existing duties
    const existingDuties = [
      {
        id: 'duty1',
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      }
    ];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingDuties));

    const newDutyData = {
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-01-15',
      end_date: '2025-01-22'
    };

    const warnings = await Duty.checkForDuplicates(newDutyData);
    
    expect(warnings).toHaveLength(2); // Exact duplicate + same type overlap
    expect(warnings.some(w => w.type === 'exact_duplicate')).toBe(true);
    expect(warnings.some(w => w.type === 'same_type_overlap')).toBe(true);
    expect(warnings.every(w => w.severity === 'high')).toBe(true);
  });

  it('should detect same type overlaps', async () => {
    // Mock existing duties
    const existingDuties = [
      {
        id: 'duty1',
        team_member_id: 'tm1',
        type: 'devops',
        title: 'Reporting',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      }
    ];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingDuties));

    const newDutyData = {
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-01-20',
      end_date: '2025-01-27'
    };

    const warnings = await Duty.checkForDuplicates(newDutyData);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('same_type_overlap');
    expect(warnings[0].severity).toBe('high');
  });

  it('should detect general overlaps with different types', async () => {
    // Mock existing duties
    const existingDuties = [
      {
        id: 'duty1',
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      }
    ];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingDuties));

    const newDutyData = {
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-01-20',
      end_date: '2025-01-27'
    };

    const warnings = await Duty.checkForDuplicates(newDutyData);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('overlapping_dates');
    expect(warnings[0].severity).toBe('medium');
  });

  it('should detect session duplicates', async () => {
    // Mock existing duties
    const sessionId = 'session_123_abc';
    const existingDuties = [
      {
        id: 'duty1',
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-15',
        end_date: '2025-01-22',
        creation_session_id: sessionId
      }
    ];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingDuties));

    const newDutyData = {
      team_member_id: 'tm2',
      type: 'on_call',
      title: 'Reporting',
      start_date: '2025-02-01',
      end_date: '2025-02-08',
      creation_session_id: sessionId
    };

    const warnings = await Duty.checkForDuplicates(newDutyData);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('session_duplicate');
    expect(warnings[0].severity).toBe('high');
  });

  it('should not detect duplicates for different team members', async () => {
    // Mock existing duties
    const existingDuties = [
      {
        id: 'duty1',
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      }
    ];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingDuties));

    const newDutyData = {
      team_member_id: 'tm2', // Different team member
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-01-15',
      end_date: '2025-01-22'
    };

    const warnings = await Duty.checkForDuplicates(newDutyData);
    
    expect(warnings).toHaveLength(0);
  });

  it('should exclude specified duty ID from duplicate check', async () => {
    // Mock existing duties
    const existingDuties = [
      {
        id: 'duty1',
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      }
    ];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingDuties));

    const newDutyData = {
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-01-15',
      end_date: '2025-01-22'
    };

    // Should not detect duplicate when excluding the same duty ID
    const warnings = await Duty.checkForDuplicates(newDutyData, 'duty1');
    
    expect(warnings).toHaveLength(0);
  });
});