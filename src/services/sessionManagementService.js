// Session Management Service for Duty Creation
// Handles session-based duplicate prevention and cleanup

const SESSION_STORAGE_KEY = 'duty_creation_sessions';
const SESSION_EXPIRY_HOURS = 24; // Sessions expire after 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Run cleanup every hour

class SessionManagementService {
  constructor() {
    this.cleanupInterval = null;
    this.startPeriodicCleanup();
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  startPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    try {
      const sessions = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessions) return {};
      return JSON.parse(sessions);
    } catch (error) {
      console.error('Error reading sessions from localStorage:', error);
      return {};
    }
  }

  /**
   * Save sessions to localStorage
   */
  setActiveSessions(sessions) {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving sessions to localStorage:', error);
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Register a new session for duty creation
   */
  registerSession(sessionId, dutyData) {
    const sessions = this.getActiveSessions();
    sessions[sessionId] = {
      createdAt: new Date().toISOString(),
      dutyData: {
        team_member_id: dutyData.team_member_id,
        type: dutyData.type,
        title: dutyData.title,
        start_date: dutyData.start_date,
        end_date: dutyData.end_date
      },
      status: 'pending',
      attempts: 1
    };
    this.setActiveSessions(sessions);
    return sessions[sessionId];
  }

  /**
   * Mark a session as completed
   */
  markSessionCompleted(sessionId, dutyId) {
    const sessions = this.getActiveSessions();
    if (sessions[sessionId]) {
      sessions[sessionId].status = 'completed';
      sessions[sessionId].dutyId = dutyId;
      sessions[sessionId].completedAt = new Date().toISOString();
      this.setActiveSessions(sessions);
      return true;
    }
    return false;
  }

  /**
   * Mark a session as failed
   */
  markSessionFailed(sessionId, error) {
    const sessions = this.getActiveSessions();
    if (sessions[sessionId]) {
      sessions[sessionId].status = 'failed';
      sessions[sessionId].error = error;
      sessions[sessionId].failedAt = new Date().toISOString();
      sessions[sessionId].attempts = (sessions[sessionId].attempts || 1) + 1;
      this.setActiveSessions(sessions);
      return true;
    }
    return false;
  }

  /**
   * Check if a session is active (not expired and pending)
   */
  isSessionActive(sessionId) {
    const sessions = this.getActiveSessions();
    const session = sessions[sessionId];
    if (!session) return false;
    
    // Check if session has expired
    if (this.isSessionExpired(session)) {
      // Session expired, remove it
      delete sessions[sessionId];
      this.setActiveSessions(sessions);
      return false;
    }
    
    return session.status === 'pending';
  }

  /**
   * Check if a session has expired
   */
  isSessionExpired(session) {
    const createdAt = new Date(session.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff > SESSION_EXPIRY_HOURS;
  }

  /**
   * Find a duty that was created with a specific session
   */
  findDutyBySession(sessionId) {
    const sessions = this.getActiveSessions();
    const session = sessions[sessionId];
    if (!session || session.status !== 'completed') return null;
    
    // Find the duty that was created with this session
    try {
      const duties = JSON.parse(localStorage.getItem('duties') || '[]');
      return duties.find(duty => duty.creation_session_id === sessionId);
    } catch (error) {
      console.error('Error finding duty by session:', error);
      return null;
    }
  }

  /**
   * Clean up expired sessions with performance optimization
   */
  cleanupExpiredSessions() {
    const startTime = performance.now();
    const sessions = this.getActiveSessions();
    const now = new Date();
    let cleanedCount = 0;
    
    // Use more efficient filtering approach
    const validSessions = {};
    
    Object.entries(sessions).forEach(([sessionId, session]) => {
      if (this.isSessionExpired(session)) {
        cleanedCount++;
      } else {
        validSessions[sessionId] = session;
      }
    });
    
    if (cleanedCount > 0) {
      this.setActiveSessions(validSessions);
      const endTime = performance.now();
      console.log(`Cleaned up ${cleanedCount} expired duty creation sessions in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    return cleanedCount;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const sessions = this.getActiveSessions();
    const stats = {
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      expired: 0
    };
    
    Object.values(sessions).forEach(session => {
      stats.total++;
      if (this.isSessionExpired(session)) {
        stats.expired++;
      } else {
        stats[session.status] = (stats[session.status] || 0) + 1;
      }
    });
    
    return stats;
  }

  /**
   * Clear all sessions (for testing or maintenance)
   */
  clearAllSessions() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return true;
  }

  /**
   * Get session details by ID
   */
  getSession(sessionId) {
    const sessions = this.getActiveSessions();
    return sessions[sessionId] || null;
  }

  /**
   * Check for potential duplicate sessions based on duty data
   */
  findSimilarSessions(dutyData, excludeSessionId = null) {
    const sessions = this.getActiveSessions();
    const similarSessions = [];
    
    Object.entries(sessions).forEach(([sessionId, session]) => {
      if (excludeSessionId && sessionId === excludeSessionId) return;
      if (this.isSessionExpired(session)) return;
      
      const sessionDuty = session.dutyData;
      
      // Check for exact match
      if (sessionDuty.team_member_id === dutyData.team_member_id &&
          sessionDuty.type === dutyData.type &&
          sessionDuty.title === dutyData.title &&
          sessionDuty.start_date === dutyData.start_date &&
          sessionDuty.end_date === dutyData.end_date) {
        similarSessions.push({
          sessionId,
          session,
          similarity: 'exact'
        });
      }
      // Check for overlapping dates with same team member and type
      else if (sessionDuty.team_member_id === dutyData.team_member_id &&
               sessionDuty.type === dutyData.type) {
        const sessionStart = new Date(sessionDuty.start_date);
        const sessionEnd = new Date(sessionDuty.end_date);
        const dutyStart = new Date(dutyData.start_date);
        const dutyEnd = new Date(dutyData.end_date);
        
        if (dutyStart <= sessionEnd && dutyEnd >= sessionStart) {
          similarSessions.push({
            sessionId,
            session,
            similarity: 'overlapping'
          });
        }
      }
    });
    
    return similarSessions;
  }
}

// Create singleton instance
const sessionManagementService = new SessionManagementService();

export default sessionManagementService;