// src/contexts/TeamStatusContext.jsx
// Context for managing Team Status page state

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/api/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentCycle, getSprintById, listSprints, getPreviousCycleId } from '@/utils/releaseCycles';

export const TEAM_DEPARTMENTS = [
  { id: 'all', label: 'All Teams' },
  { id: 'metering', label: 'Metering' },
];

const TeamStatusContext = createContext(null);

export function TeamStatusProvider({ children }) {
  const [summaries, setSummaries] = useState([]);
  const [currentTeam, setCurrentTeam] = useState('metering'); // Default to Metering
  const [currentWeek, setCurrentWeek] = useState(null); // Sprint ID like '2601a'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  // Initialize to current sprint
  useEffect(() => {
    if (!currentWeek) {
      const cycle = getCurrentCycle();
      setCurrentWeek(cycle.currentSprint.id);
    }
  }, [currentWeek]);

  // Get available sprints (4 weeks = 2 cycles)
  const availableSprints = useMemo(() => {
    const current = getCurrentCycle();
    const prevCycleId = getPreviousCycleId(current.id);
    return listSprints(prevCycleId, 2); // 2 cycles = 4 sprints
  }, []);

  // Fetch summaries for current team and week
  const refresh = useCallback(async () => {
    if (!isAuthenticated || !currentWeek) {
      setSummaries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const sprint = getSprintById(currentWeek);

      if (!sprint) {
        setSummaries([]);
        return;
      }

      const result = await apiClient.knowledge.searchInsights({
        teamDepartment: currentTeam === 'all' ? undefined : currentTeam,
        startDate: sprint.startDate.toISOString().split('T')[0],
        endDate: sprint.endDate.toISOString().split('T')[0],
        category: 'team_summary'
      });

      setSummaries(result.summaries || []);
    } catch (err) {
      console.error('Failed to fetch team summaries:', err);
      setError(err.message);
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentTeam, currentWeek]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = {
    summaries,
    currentTeam,
    setCurrentTeam,
    currentWeek,
    setCurrentWeek,
    availableSprints,
    loading,
    error,
    refresh
  };

  return (
    <TeamStatusContext.Provider value={value}>
      {children}
    </TeamStatusContext.Provider>
  );
}

export function useTeamStatus() {
  const context = useContext(TeamStatusContext);
  if (!context) {
    throw new Error('useTeamStatus must be used within a TeamStatusProvider');
  }
  return context;
}
