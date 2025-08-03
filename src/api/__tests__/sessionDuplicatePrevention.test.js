import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { localClient } from '../localClient';
import sessionManagementService from '../../services/sessionManagementService';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock the session management service
vi.mock('../../services/sessionManagementService', () => ({
  default: {
    generateSessionId: vi.fn(),
    registerSession: vi.fn(),
    markSessionCompleted: vi.fn(),
    isSessionActive: vi.fn(),
    findDutyBySession: vi.fn(),
    cleanupExpiredSessions: vi.fn(),
    getActiveSessions: vi.fn(),
    setActiveSessions: vi.fn()
  }
}));

// Mock audit service
vi.mock('../../services/auditService', () => ({
  logAuditEvent: vi.fn(),
  AUDIT_ACTIONS: { CREATE: 'create' },
  AUDIT_RESOURCES: { DUTY: 'duty' }
}));

// Mock auth service
vi.mock('../../services/authService', () => ({
  default: {
    getStoredToken: vi.fn(() => ({ username: 'testuser' }))
  }
}));

describe('Session-based Duplicate Prevention in localClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default localStorage responses
    localStorageMock.getItem.mockImplementation((key) => {
      switch (key) {
        case 'duties':
          return JSON.stringify([]);
        case 'team_members':
          return JSON.stringify([
            { id: 'member1', name: 'John Doe' }
          ]);
        case 'calendar_events':
          return JSON.stringify([]);
        default:
          return null;
      }
    });
    
    // Setup session management service defaults
    sessionManagementService.cleanupExpiredSessions.mockReturnValue(0);
    sessionManagementService.findDutyBySession.mockReturnValue(null);
    sessionManagementService.isSessionActive.mockReturnValue(false);
    sessionManagementService.getActiveSessions.mockReturnValue({});
    sessionManagementService.setActiveSessions.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Duty Creation with Session ID', () => {
    it('should create duty with session ID and mark session as completed', async () => {
      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        description: 'Test duty',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_123456'
      };

      // Mock successful calendar event creation
      const mockCalendarEvent = { id: 'cal_event_123' };
      localClient.entities.CalendarEvent.createDutyEvent = vi.fn().mockResolvedValue(mockCalendarEvent);

      const result = await localClient.entities.Duty.create(dutyData);

      expect(result).toEqual(expect.objectContaining({
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        creation_session_id: 'session_123456'
      }));

      expect(sessionManagementService.markSessionCompleted).toHaveBeenCalledWith(
        'session_123456',
        result.id
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'duties',
        expect.stringContaining('session_123456')
      );
    });

    it('should return existing duty for completed session (idempotency)', async () => {
      const existingDuty = {
        id: 'duty_existing',
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        creation_session_id: 'session_123456'
      };

      sessionManagementService.findDutyBySession.mockReturnValue(existingDuty);

      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_123456'
      };

      const result = await localClient.entities.Duty.create(dutyData);

      expect(result).toBe(existingDuty);
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith('duties', expect.anything());
    });

    it('should handle session registration for active sessions', async () => {
      sessionManagementService.isSessionActive.mockReturnValue(true);

      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_active'
      };

      // Mock successful creation
      localClient.entities.CalendarEvent.createDutyEvent = vi.fn().mockResolvedValue({ id: 'cal_123' });

      await localClient.entities.Duty.create(dutyData);

      expect(sessionManagementService.registerSession).toHaveBeenCalledWith(
        'session_active',
        expect.objectContaining({
          team_member_id: 'member1',
          type: 'devops',
          title: 'DevOps'
        })
      );
    });

    it('should clean up expired sessions before processing', async () => {
      sessionManagementService.cleanupExpiredSessions.mockReturnValue(3);

      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_new'
      };

      localClient.entities.CalendarEvent.createDutyEvent = vi.fn().mockResolvedValue({ id: 'cal_123' });

      await localClient.entities.Duty.create(dutyData);

      expect(sessionManagementService.cleanupExpiredSessions).toHaveBeenCalledTimes(1);
    });
  });

  describe('Atomic Transaction Rollback', () => {
    it('should rollback duty creation if calendar event creation fails', async () => {
      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_rollback'
      };

      // Mock calendar event creation failure
      localClient.entities.CalendarEvent.createDutyEvent = vi.fn().mockRejectedValue(
        new Error('Calendar service unavailable')
      );

      await expect(localClient.entities.Duty.create(dutyData)).rejects.toThrow(
        'Failed to create duty: Calendar event creation failed - Calendar service unavailable'
      );

      // Verify rollback occurred - duty should be removed from storage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'duties',
        JSON.stringify([]) // Empty array after rollback
      );
    });

    it('should clean up session on rollback', async () => {
      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_cleanup'
      };

      // Mock calendar event creation failure
      localClient.entities.CalendarEvent.createDutyEvent = vi.fn().mockRejectedValue(
        new Error('Calendar service unavailable')
      );

      // Mock session cleanup - return the session when getActiveSessions is called
      sessionManagementService.getActiveSessions.mockReturnValue({ 'session_cleanup': { status: 'pending' } });

      await expect(localClient.entities.Duty.create(dutyData)).rejects.toThrow();

      // Verify session was cleaned up through the session service
      expect(sessionManagementService.getActiveSessions).toHaveBeenCalled();
      expect(sessionManagementService.setActiveSessions).toHaveBeenCalled();
    });
  });

  describe('Session-based Duplicate Detection', () => {
    it('should detect session duplicates in checkForDuplicates', async () => {
      const existingDuties = [
        {
          id: 'duty1',
          team_member_id: 'member1',
          type: 'devops',
          title: 'DevOps',
          creation_session_id: 'session_duplicate'
        }
      ];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'duties') {
          return JSON.stringify(existingDuties);
        }
        return JSON.stringify([]);
      });

      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_duplicate'
      };

      const warnings = await localClient.entities.Duty.checkForDuplicates(dutyData);

      expect(warnings).toContainEqual(
        expect.objectContaining({
          type: 'session_duplicate',
          severity: 'high',
          message: 'Duplicate submission detected'
        })
      );
    });

    it('should handle session duplicates with high severity', async () => {
      const existingDuties = [
        {
          id: 'duty1',
          team_member_id: 'member1',
          type: 'devops',
          title: 'DevOps',
          creation_session_id: 'session_high_severity'
        }
      ];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'duties') {
          return JSON.stringify(existingDuties);
        }
        return JSON.stringify([]);
      });

      // Mock that session already has a completed duty
      sessionManagementService.findDutyBySession.mockReturnValue(existingDuties[0]);

      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_high_severity'
      };

      const result = await localClient.entities.Duty.create(dutyData);

      // Should return existing duty instead of creating new one
      expect(result).toBe(existingDuties[0]);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors without affecting session state', async () => {
      const dutyData = {
        team_member_id: '', // Invalid - empty team member
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_validation_error'
      };

      await expect(localClient.entities.Duty.create(dutyData)).rejects.toThrow(
        /Validation failed/
      );

      // Session should not be marked as completed for validation errors
      expect(sessionManagementService.markSessionCompleted).not.toHaveBeenCalled();
    });

    it('should handle business rule violations without affecting session state', async () => {
      // Mock team member doesn't exist
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'team_members') {
          return JSON.stringify([]); // No team members
        }
        return JSON.stringify([]);
      });

      const dutyData = {
        team_member_id: 'nonexistent_member',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_business_rule_error'
      };

      await expect(localClient.entities.Duty.create(dutyData)).rejects.toThrow(
        /Team member does not exist/
      );

      // Session should not be marked as completed for business rule errors
      expect(sessionManagementService.markSessionCompleted).not.toHaveBeenCalled();
    });
  });

  describe('Session Cleanup Integration', () => {
    it('should call cleanup before processing any duty creation', async () => {
      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07',
        creation_session_id: 'session_cleanup_test'
      };

      localClient.entities.CalendarEvent.createDutyEvent = vi.fn().mockResolvedValue({ id: 'cal_123' });

      await localClient.entities.Duty.create(dutyData);

      // Cleanup should be called first
      expect(sessionManagementService.cleanupExpiredSessions).toHaveBeenCalledBefore(
        sessionManagementService.markSessionCompleted
      );
    });
  });
});