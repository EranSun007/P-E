// src/contexts/NotificationContext.jsx
// Context for managing notification state and actions

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Notification } from '@/api/entities';
import { useAuth } from '@/contexts/AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Track if initial data has been loaded to prevent re-fetch on navigation
  const dataLoadedRef = useRef(false);

  // Fetch notifications and unread count
  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [notificationList, countResult] = await Promise.all([
        Notification.list(),
        Notification.getUnreadCount(),
      ]);
      setNotifications(notificationList);
      setUnreadCount(countResult.count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch on mount and auth change
  // Only fetch once per authentication session to prevent re-fetch on navigation
  useEffect(() => {
    // Reset loaded state when user logs out
    if (!isAuthenticated) {
      dataLoadedRef.current = false;
      return;
    }

    // Skip if already loaded
    if (dataLoadedRef.current) {
      return;
    }

    dataLoadedRef.current = true;
    refresh();
  }, [isAuthenticated, refresh]);

  // Mark a single notification as read (optimistic update)
  const markAsRead = useCallback(async (notificationId) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await Notification.markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Rollback on failure
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const previousNotifications = notifications;
    const previousCount = unreadCount;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await Notification.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      // Rollback on failure
      setNotifications(previousNotifications);
      setUnreadCount(previousCount);
    }
  }, [notifications, unreadCount]);

  const value = {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
