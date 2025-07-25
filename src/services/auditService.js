/**
 * Audit Service - Handles audit logging for sensitive operations
 */

import AuthService from './authService.js';

const AUDIT_LOG_KEY = 'audit_logs';

/**
 * Get current user from authentication token
 * @returns {string|null} Current username or null if not authenticated
 */
const getCurrentUser = () => {
  try {
    const token = AuthService.getStoredToken();
    return token?.username || null;
  } catch (error) {
    console.warn('Unable to get current user for audit log:', error);
    return null;
  }
};

/**
 * Get audit logs from localStorage
 * @returns {Array} Array of audit log entries
 */
const getAuditLogs = () => {
  try {
    const logs = localStorage.getItem(AUDIT_LOG_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Error reading audit logs:', error);
    return [];
  }
};

/**
 * Save audit logs to localStorage
 * @param {Array} logs - Array of audit log entries
 */
const saveAuditLogs = (logs) => {
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error saving audit logs:', error);
  }
};

/**
 * Create an audit log entry
 * @param {string} action - Action performed (e.g., 'CREATE', 'READ', 'UPDATE', 'DELETE')
 * @param {string} resource - Resource type (e.g., 'PERSONAL_FILE_ITEM', 'AGENDA_ITEM')
 * @param {string} resourceId - ID of the resource
 * @param {Object} metadata - Additional metadata about the action
 */
export const logAuditEvent = (action, resource, resourceId, metadata = {}) => {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    console.warn('Cannot create audit log: no authenticated user');
    return;
  }

  const auditEntry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    user: currentUser,
    action,
    resource,
    resourceId,
    metadata,
    userAgent: navigator.userAgent,
    ipAddress: 'localhost' // In a real app, this would be the actual IP
  };

  const logs = getAuditLogs();
  logs.unshift(auditEntry); // Add to beginning for chronological order
  
  // Keep only the last 1000 entries to prevent localStorage bloat
  if (logs.length > 1000) {
    logs.splice(1000);
  }
  
  saveAuditLogs(logs);
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Audit Log:', auditEntry);
  }
};

/**
 * Get audit logs for a specific resource
 * @param {string} resource - Resource type
 * @param {string} resourceId - Resource ID (optional)
 * @returns {Array} Filtered audit log entries
 */
export const getAuditLogsForResource = (resource, resourceId = null) => {
  const logs = getAuditLogs();
  
  return logs.filter(log => {
    if (log.resource !== resource) return false;
    if (resourceId && log.resourceId !== resourceId) return false;
    return true;
  });
};

/**
 * Get audit logs for a specific user
 * @param {string} username - Username to filter by
 * @returns {Array} Filtered audit log entries
 */
export const getAuditLogsForUser = (username) => {
  const logs = getAuditLogs();
  return logs.filter(log => log.user === username);
};

/**
 * Get all audit logs (admin function)
 * @returns {Array} All audit log entries
 */
export const getAllAuditLogs = () => {
  return getAuditLogs();
};

/**
 * Clear audit logs older than specified days
 * @param {number} days - Number of days to keep logs
 */
export const cleanupAuditLogs = (days = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const logs = getAuditLogs();
  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= cutoffDate;
  });
  
  saveAuditLogs(filteredLogs);
  
  const removedCount = logs.length - filteredLogs.length;
  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} audit log entries older than ${days} days`);
  }
};

// Audit action constants
export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  EXPORT: 'EXPORT',
  PRINT: 'PRINT',
  ACCESS: 'ACCESS'
};

// Audit resource constants
export const AUDIT_RESOURCES = {
  PERSONAL_FILE_ITEM: 'PERSONAL_FILE_ITEM',
  AGENDA_ITEM: 'AGENDA_ITEM',
  TEAM_MEMBER: 'TEAM_MEMBER'
};