// src/contexts/SyncContext.jsx
// Context for managing TeamSync state and actions

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SyncItem } from '@/api/entities';
import { useAuth } from '@/contexts/AuthContext';

// Constants exported for use across components
export const TEAM_DEPARTMENTS = [
  { id: 'all', label: 'All Teams' },
  { id: 'metering', label: 'Metering' },
  { id: 'reporting', label: 'Reporting' },
];

export const CATEGORIES = [
  { id: 'goal', label: 'Goals' },
  { id: 'blocker', label: 'Blockers' },
  { id: 'dependency', label: 'Dependencies' },
  { id: 'emphasis', label: 'Emphasis' },
];

export const SYNC_STATUSES = [
  { id: 'not_started', label: 'Not Started' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
];

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const [items, setItems] = useState([]);
  const [currentTeam, setCurrentTeamState] = useState('all');
  const [archivedItems, setArchivedItems] = useState([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Track if initial data has been loaded to prevent re-fetch on navigation
  const dataLoadedRef = useRef(false);
  const previousTeamRef = useRef(currentTeam);

  // Computed grouping of items by category
  const itemsByCategory = useMemo(() => {
    const grouped = {
      goal: [],
      blocker: [],
      dependency: [],
      emphasis: [],
    };

    (items || []).forEach(item => {
      if (item.category && grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });

    return grouped;
  }, [items]);

  // Fetch sync items and archived count
  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setArchivedCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Build filters based on current team
      const filters = { archived: false };
      if (currentTeam !== 'all') {
        filters.teamDepartment = currentTeam;
      }

      // Fetch items and archived count in parallel
      const [itemList, countResult] = await Promise.all([
        SyncItem.list(filters),
        SyncItem.getArchivedCount(),
      ]);

      setItems(itemList || []);
      setArchivedCount(countResult.count || 0);
    } catch (error) {
      console.error('Failed to fetch sync items:', error);
      setItems([]);
      setArchivedCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentTeam]);

  // Initial fetch on mount and when auth changes
  // Only re-fetch when team actually changes, not on every navigation
  useEffect(() => {
    // Reset loaded state when user logs out
    if (!isAuthenticated) {
      dataLoadedRef.current = false;
      previousTeamRef.current = 'all';
      return;
    }

    // Check if team changed
    const teamChanged = previousTeamRef.current !== currentTeam;
    previousTeamRef.current = currentTeam;

    // Skip if already loaded and team hasn't changed
    if (dataLoadedRef.current && !teamChanged) {
      return;
    }

    dataLoadedRef.current = true;
    refresh();
  }, [isAuthenticated, currentTeam, refresh]);

  // Create a new sync item
  const createItem = useCallback(async (data) => {
    try {
      const newItem = await SyncItem.create(data);
      await refresh();
      return newItem;
    } catch (error) {
      console.error('Failed to create sync item:', error);
      throw error;
    }
  }, [refresh]);

  // Update a sync item (optimistic update with auto-archive detection)
  const updateItem = useCallback(async (id, updates) => {
    // Find current item to check for status transition
    const currentItem = items.find(item => item.id === id);

    // Check if this is a status transition to "done" (auto-archive trigger)
    const shouldAutoArchive =
      updates.sync_status === 'done' &&
      currentItem?.sync_status !== 'done';

    // If auto-archiving, add archived flag to updates
    if (shouldAutoArchive) {
      updates = { ...updates, archived: true };
    }

    // Optimistic update
    if (shouldAutoArchive) {
      // Remove from active items (archiving)
      setItems(prev => prev.filter(item => item.id !== id));
      setArchivedCount(prev => prev + 1);
    } else {
      // Regular update (keep in list)
      setItems(prev =>
        prev.map(item => item.id === id ? { ...item, ...updates } : item)
      );
    }

    try {
      const updatedItem = await SyncItem.update(id, updates);
      return updatedItem;
    } catch (error) {
      console.error('Failed to update sync item:', error);
      // Refresh on failure to restore correct state
      await refresh();
      throw error;
    }
  }, [items, refresh]);

  // Delete a sync item (optimistic update)
  const deleteItem = useCallback(async (id) => {
    // Optimistic update
    setItems(prev => prev.filter(item => item.id !== id));

    try {
      await SyncItem.delete(id);
    } catch (error) {
      console.error('Failed to delete sync item:', error);
      // Refresh on failure to restore correct state
      await refresh();
      throw error;
    }
  }, [refresh]);

  // Archive a sync item
  const archiveItem = useCallback(async (id) => {
    try {
      await SyncItem.update(id, { archived: true });
      await refresh();
    } catch (error) {
      console.error('Failed to archive sync item:', error);
      throw error;
    }
  }, [refresh]);

  // Restore an archived sync item
  const restoreItem = useCallback(async (id) => {
    try {
      await SyncItem.restore(id);

      // Remove from archived items if loaded
      setArchivedItems(prev => prev.filter(item => item.id !== id));

      // Refresh main items list
      await refresh();
    } catch (error) {
      console.error('Failed to restore sync item:', error);
      throw error;
    }
  }, [refresh]);

  // Set current team filter
  const setCurrentTeam = useCallback((team) => {
    setCurrentTeamState(team);
    // refresh will be triggered by useEffect dependency on currentTeam
  }, []);

  // Lazy-load archived items
  const loadArchivedItems = useCallback(async (filters = {}) => {
    try {
      const archived = await SyncItem.getArchived(filters);
      setArchivedItems(archived || []);
      return archived;
    } catch (error) {
      console.error('Failed to load archived items:', error);
      setArchivedItems([]);
      throw error;
    }
  }, []);

  const value = {
    items,
    itemsByCategory,
    currentTeam,
    archivedItems,
    archivedCount,
    loading,
    refresh,
    createItem,
    updateItem,
    deleteItem,
    archiveItem,
    restoreItem,
    setCurrentTeam,
    loadArchivedItems,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
