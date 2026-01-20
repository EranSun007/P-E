import React from 'react';
import { Project, Task, Stakeholder, TeamMember, OneOnOne } from '@/api/entities';
import { logger } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext.jsx';

export const AppContext = React.createContext(null);

export function AppProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [projects, setProjects] = React.useState([]);
  const [tasks, setTasks] = React.useState([]);
  const [stakeholders, setStakeholders] = React.useState([]);
  const [teamMembers, setTeamMembers] = React.useState([]);
  const [oneOnOnes, setOneOnOnes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [dataLoaded, setDataLoaded] = React.useState(false);

  const refreshProjects = React.useCallback(async () => {
    try {
      const data = await Project.list('-created_date');
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('Failed to load projects (context)', { error: String(err) });
      setError('Failed to load projects');
    }
  }, []);

  const refreshTasks = React.useCallback(async () => {
    try {
      const data = await Task.list('-created_date');
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('Failed to load tasks (context)', { error: String(err) });
      setError('Failed to load tasks');
    }
  }, []);

  const refreshStakeholders = React.useCallback(async () => {
    try {
      const data = await Stakeholder.list();
      setStakeholders(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('Failed to load stakeholders (context)', { error: String(err) });
      setError('Failed to load stakeholders');
    }
  }, []);

  const refreshTeamMembers = React.useCallback(async () => {
    try {
      const data = await TeamMember.list();
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('Failed to load team members (context)', { error: String(err) });
      setError('Failed to load team members');
    }
  }, []);

  const refreshOneOnOnes = React.useCallback(async () => {
    try {
      const data = await OneOnOne.list();
      setOneOnOnes(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('Failed to load one-on-ones (context)', { error: String(err) });
      setError('Failed to load one-on-ones');
    }
  }, []);

  const refreshAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        refreshProjects(),
        refreshTasks(),
        refreshStakeholders(),
        refreshTeamMembers(),
        refreshOneOnOnes()
      ]);
    } finally {
      setLoading(false);
    }
  }, [refreshProjects, refreshTasks, refreshStakeholders, refreshTeamMembers, refreshOneOnOnes]);

  // Only load data when user is authenticated
  // Reset dataLoaded when auth state changes
  React.useEffect(() => {
    if (!authLoading && isAuthenticated && !dataLoaded) {
      setDataLoaded(true);
      refreshAll();
    } else if (!isAuthenticated) {
      // Reset state when user logs out
      setDataLoaded(false);
      setProjects([]);
      setTasks([]);
      setStakeholders([]);
      setTeamMembers([]);
      setOneOnOnes([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const value = React.useMemo(() => ({
    projects,
    tasks,
    stakeholders,
    teamMembers,
    oneOnOnes,
    loading,
    error,
    refreshProjects,
    refreshTasks,
    refreshStakeholders,
    refreshTeamMembers,
    refreshOneOnOnes,
    refreshAll
  }), [projects, tasks, stakeholders, teamMembers, oneOnOnes, loading, error, refreshProjects, refreshTasks, refreshStakeholders, refreshTeamMembers, refreshOneOnOnes, refreshAll]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}


