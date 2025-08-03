import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sessionManagementService from '../sessionManagementService';

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

describe('SessionManagementService', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Stop periodic cleanup for tests
    sessionManagementService.stopPeriodicCleanup();
  });

  afterEach(() => {
    // Restart periodic cleanup after tests
    sessionManagementService.startPeriodicCleanup();
  });

  describe('Session Generation', () => {
    it('should generate unique session IDs', () => {
      const sessionId1 = sessionManagementService.generateSessionId();
      const sessionId2 = sessionManagementService.generateSessionId();
      
      expect(sessionId1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(sessionId2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('Session Registration', () => {
    it('should register a new session', () => {
      const sessionId = 'test_session_123';
      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07'
      };

      localStorageMock.getItem.mockReturnValue('{}');

      const session = sessionManagementService.registerSession(sessionId, dutyData);

      expect(session).toEqual({
        createdAt: expect.any(String),
        dutyData: dutyData,
        status: 'pending',
        attempts: 1
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'duty_creation_sessions',
        expect.stringContaining(sessionId)
      );
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const sessionId = 'test_session_123';
      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07'
      };

      // Should not throw error
      expect(() => {
        sessionManagementService.registerSession(sessionId, dutyData);
      }).not.toThrow();
    });
  });

  describe('Session Status Management', () => {
    beforeEach(() => {
      const sessions = {
        'session1': {
          createdAt: new Date().toISOString(),
          status: 'pending',
          dutyData: { team_member_id: 'member1' }
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));
    });

    it('should mark session as completed', () => {
      const result = sessionManagementService.markSessionCompleted('session1', 'duty123');
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should mark session as failed', () => {
      const error = 'Validation failed';
      const result = sessionManagementService.markSessionFailed('session1', error);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should return false for non-existent session', () => {
      const result = sessionManagementService.markSessionCompleted('nonexistent', 'duty123');
      expect(result).toBe(false);
    });
  });

  describe('Session Expiration', () => {
    it('should identify expired sessions', () => {
      const expiredSession = {
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        status: 'pending'
      };

      const activeSession = {
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      expect(sessionManagementService.isSessionExpired(expiredSession)).toBe(true);
      expect(sessionManagementService.isSessionExpired(activeSession)).toBe(false);
    });

    it('should clean up expired sessions', () => {
      const sessions = {
        'expired1': {
          createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        },
        'expired2': {
          createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
          status: 'completed'
        },
        'active1': {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      const cleanedCount = sessionManagementService.cleanupExpiredSessions();

      expect(cleanedCount).toBe(2);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'duty_creation_sessions',
        expect.not.stringContaining('expired1')
      );
    });
  });

  describe('Session Activity Check', () => {
    it('should return true for active sessions', () => {
      const sessions = {
        'active_session': {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      const isActive = sessionManagementService.isSessionActive('active_session');
      expect(isActive).toBe(true);
    });

    it('should return false for expired sessions', () => {
      const sessions = {
        'expired_session': {
          createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      const isActive = sessionManagementService.isSessionActive('expired_session');
      expect(isActive).toBe(false);
    });

    it('should return false for completed sessions', () => {
      const sessions = {
        'completed_session': {
          createdAt: new Date().toISOString(),
          status: 'completed'
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      const isActive = sessionManagementService.isSessionActive('completed_session');
      expect(isActive).toBe(false);
    });

    it('should return false for non-existent sessions', () => {
      localStorageMock.getItem.mockReturnValue('{}');

      const isActive = sessionManagementService.isSessionActive('nonexistent');
      expect(isActive).toBe(false);
    });
  });

  describe('Duty Lookup by Session', () => {
    it('should find duty by session ID', () => {
      const sessions = {
        'session123': {
          status: 'completed',
          dutyId: 'duty456'
        }
      };
      const duties = [
        { id: 'duty456', creation_session_id: 'session123', title: 'Test Duty' },
        { id: 'duty789', creation_session_id: 'session456', title: 'Other Duty' }
      ];

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(sessions))
        .mockReturnValueOnce(JSON.stringify(duties));

      const duty = sessionManagementService.findDutyBySession('session123');
      expect(duty).toEqual({
        id: 'duty456',
        creation_session_id: 'session123',
        title: 'Test Duty'
      });
    });

    it('should return null for pending sessions', () => {
      const sessions = {
        'session123': {
          status: 'pending'
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      const duty = sessionManagementService.findDutyBySession('session123');
      expect(duty).toBeNull();
    });
  });

  describe('Similar Session Detection', () => {
    beforeEach(() => {
      const sessions = {
        'session1': {
          createdAt: new Date().toISOString(),
          status: 'pending',
          dutyData: {
            team_member_id: 'member1',
            type: 'devops',
            title: 'DevOps',
            start_date: '2025-08-01',
            end_date: '2025-08-07'
          }
        },
        'session2': {
          createdAt: new Date().toISOString(),
          status: 'pending',
          dutyData: {
            team_member_id: 'member1',
            type: 'devops',
            title: 'DevOps',
            start_date: '2025-08-05',
            end_date: '2025-08-12'
          }
        },
        'session3': {
          createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // Expired
          status: 'pending',
          dutyData: {
            team_member_id: 'member1',
            type: 'devops',
            title: 'DevOps',
            start_date: '2025-08-01',
            end_date: '2025-08-07'
          }
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));
    });

    it('should find exact duplicate sessions', () => {
      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07'
      };

      const similarSessions = sessionManagementService.findSimilarSessions(dutyData);
      
      // Should find both exact match (session1) and overlapping match (session2)
      expect(similarSessions).toHaveLength(2);
      
      const exactMatch = similarSessions.find(s => s.similarity === 'exact');
      expect(exactMatch).toBeDefined();
      expect(exactMatch.sessionId).toBe('session1');
      
      const overlappingMatch = similarSessions.find(s => s.similarity === 'overlapping');
      expect(overlappingMatch).toBeDefined();
      expect(overlappingMatch.sessionId).toBe('session2');
    });

    it('should find overlapping sessions', () => {
      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'Different Title',
        start_date: '2025-08-03',
        end_date: '2025-08-10'
      };

      const similarSessions = sessionManagementService.findSimilarSessions(dutyData);
      
      expect(similarSessions).toHaveLength(2);
      expect(similarSessions.map(s => s.similarity)).toContain('overlapping');
    });

    it('should exclude expired sessions', () => {
      const dutyData = {
        team_member_id: 'member1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-01',
        end_date: '2025-08-07'
      };

      const similarSessions = sessionManagementService.findSimilarSessions(dutyData);
      
      // Should not include session3 (expired)
      expect(similarSessions.map(s => s.sessionId)).not.toContain('session3');
    });
  });

  describe('Session Statistics', () => {
    it('should calculate session statistics correctly', () => {
      const sessions = {
        'pending1': {
          createdAt: new Date().toISOString(),
          status: 'pending'
        },
        'completed1': {
          createdAt: new Date().toISOString(),
          status: 'completed'
        },
        'failed1': {
          createdAt: new Date().toISOString(),
          status: 'failed'
        },
        'expired1': {
          createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessions));

      const stats = sessionManagementService.getSessionStats();

      expect(stats).toEqual({
        total: 4,
        pending: 1,
        completed: 1,
        failed: 1,
        expired: 1
      });
    });
  });

  describe('Session Cleanup', () => {
    it('should clear all sessions', () => {
      const result = sessionManagementService.clearAllSessions();
      
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('duty_creation_sessions');
    });
  });
});