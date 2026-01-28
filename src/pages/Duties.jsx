import { useState, useEffect, useMemo } from 'react';
import {
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
} from 'date-fns';
import { DutySchedule } from '@/api/entities';
import { useAI } from '@/contexts/AIContext';
import { formatDutiesContext } from '@/utils/contextFormatter';
import { logger } from '@/utils/logger';
import {
  getCurrentCycle,
  getCycleById,
  listCycles,
  getNextCycleId,
  getPreviousCycleId,
  formatDateRange,
} from '@/utils/releaseCycles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Shield,
  Wrench,
  UserCog,
  CalendarDays,
  Filter,
} from 'lucide-react';
import DutyScheduleForm from '@/components/duties/DutyScheduleForm';
import DutyScheduleCard from '@/components/duties/DutyScheduleCard';

const TEAMS = ['All', 'Metering', 'Reporting'];

export default function DutiesPage() {
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentCycleId, setCurrentCycleId] = useState(() => getCurrentCycle().id);
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [selectedDutyType, setSelectedDutyType] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingDuty, setEditingDuty] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Load duties for the visible date range (3 cycles)
  useEffect(() => {
    loadDuties();
  }, [currentCycleId, selectedTeam, selectedDutyType]);

  const loadDuties = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get date range for 3 cycles
      const cycles = listCycles(currentCycleId, 3);
      const start = cycles[0].startDate;
      const end = cycles[cycles.length - 1].endDate;

      const filters = {};
      if (selectedTeam !== 'All') {
        filters.team = selectedTeam;
      }
      if (selectedDutyType !== 'All') {
        filters.duty_type = selectedDutyType;
      }

      const data = await DutySchedule.listByDateRange(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd'),
        filters
      );
      setDuties(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('Failed to load duty schedules', { error: String(err) });
      setError('Failed to load duty schedules. Please try again.');
      setDuties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDuty = async (dutyData) => {
    setFormLoading(true);
    try {
      await DutySchedule.create(dutyData);
      await loadDuties();
      setShowForm(false);
    } catch (err) {
      logger.error('Failed to create duty', { error: String(err) });
      setError('Failed to create duty. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateDuty = async (dutyData) => {
    if (!editingDuty) return;
    setFormLoading(true);
    try {
      await DutySchedule.update(editingDuty.id, dutyData);
      await loadDuties();
      setEditingDuty(null);
    } catch (err) {
      logger.error('Failed to update duty', { error: String(err) });
      setError('Failed to update duty. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteDuty = async (dutyId) => {
    try {
      await DutySchedule.delete(dutyId);
      await loadDuties();
    } catch (err) {
      logger.error('Failed to delete duty', { error: String(err) });
      setError('Failed to delete duty. Please try again.');
    }
  };

  const handleEdit = (duty) => {
    setEditingDuty(duty);
  };

  // Group duties by release cycle and sprint
  const dutiesByCycle = useMemo(() => {
    const cycles = listCycles(currentCycleId, 3);

    return cycles.map(cycle => {
      // Find duties that start within this cycle
      const cycleDuties = duties.filter(duty => {
        if (!duty.start_date) return false;
        const dutyStart = startOfDay(parseISO(duty.start_date));
        return isWithinInterval(dutyStart, {
          start: cycle.startDate,
          end: cycle.endDate
        });
      });

      // Group by sprint within cycle
      const sprintGroups = cycle.sprints.map(sprint => {
        const sprintDuties = cycleDuties.filter(duty => {
          const dutyStart = startOfDay(parseISO(duty.start_date));
          return isWithinInterval(dutyStart, {
            start: sprint.startDate,
            end: sprint.endDate
          });
        });

        return {
          ...sprint,
          duties: sprintDuties,
          grouped: {
            devops: sprintDuties.filter(d => d.duty_type === 'devops'),
            dev_on_duty: sprintDuties.filter(d => d.duty_type === 'dev_on_duty'),
            replacement: sprintDuties.filter(d => d.duty_type === 'replacement'),
          }
        };
      });

      return {
        ...cycle,
        duties: cycleDuties,
        sprintGroups,
        label: `Release Cycle ${cycle.id}`,
        dateLabel: formatDateRange(cycle.startDate, cycle.endDate),
      };
    });
  }, [duties, currentCycleId]);

  // Summary counts
  const summary = useMemo(() => {
    const today = new Date();
    const active = duties.filter(duty => {
      const start = parseISO(duty.start_date);
      const end = parseISO(duty.end_date);
      return today >= start && today <= end;
    });

    return {
      total: duties.length,
      active: active.length,
      devops: duties.filter(d => d.duty_type === 'devops').length,
      dev_on_duty: duties.filter(d => d.duty_type === 'dev_on_duty').length,
      replacement: duties.filter(d => d.duty_type === 'replacement').length,
    };
  }, [duties]);

  const handlePrevCycle = () => {
    setCurrentCycleId(getPreviousCycleId(currentCycleId));
  };

  const handleNextCycle = () => {
    setCurrentCycleId(getNextCycleId(currentCycleId));
  };

  const handleToday = () => {
    setCurrentCycleId(getCurrentCycle().id);
  };

  // AI Context Registration
  const { updatePageContext } = useAI();

  // Register duties context for AI
  useEffect(() => {
    const contextSummary = formatDutiesContext([], duties, editingDuty);

    updatePageContext({
      page: '/duties',
      summary: contextSummary,
      selection: editingDuty ? { id: editingDuty.id, type: 'duty_schedule' } : null,
      data: {
        dutyCount: duties.length,
        activeDuties: summary.active,
        currentCycleId,
        selectedTeam,
        selectedDutyType
      }
    });
  }, [duties, editingDuty, summary.active, currentCycleId, selectedTeam, selectedDutyType, updatePageContext]);

  // Listen for context refresh events
  useEffect(() => {
    const handleRefresh = () => {
      const contextSummary = formatDutiesContext([], duties, editingDuty);

      updatePageContext({
        page: '/duties',
        summary: contextSummary,
        selection: editingDuty ? { id: editingDuty.id, type: 'duty_schedule' } : null,
        data: {
          dutyCount: duties.length,
          activeDuties: summary.active,
          currentCycleId,
          selectedTeam,
          selectedDutyType
        }
      });
    };

    window.addEventListener('ai-context-refresh', handleRefresh);
    return () => window.removeEventListener('ai-context-refresh', handleRefresh);
  }, [duties, editingDuty, summary.active, currentCycleId, selectedTeam, selectedDutyType, updatePageContext]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarDays className="h-8 w-8" />
              Duties Schedule
            </h1>
            <p className="text-gray-500 mt-1">
              Manage duty rotation assignments by release cycle
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Duty
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters and Navigation */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Team Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAMS.map(team => (
                  <SelectItem key={team} value={team}>
                    {team === 'All' ? 'All Teams' : team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duty Type Filter */}
          <Select value={selectedDutyType} onValueChange={setSelectedDutyType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="devops">
                <span className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-indigo-600" />
                  DevOps
                </span>
              </SelectItem>
              <SelectItem value="dev_on_duty">
                <span className="flex items-center gap-2">
                  <Wrench className="h-3 w-3 text-teal-600" />
                  Dev On Duty
                </span>
              </SelectItem>
              <SelectItem value="replacement">
                <span className="flex items-center gap-2">
                  <UserCog className="h-3 w-3 text-amber-600" />
                  Replacement
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Cycle Navigation */}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="icon" onClick={handlePrevCycle}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleToday} className="min-w-[80px]">
              {currentCycleId}
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextCycle}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{summary.active}</div>
              <div className="text-sm text-gray-500">Active Now</div>
            </CardContent>
          </Card>
          <Card className="border-indigo-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-8 w-8 text-indigo-500" />
              <div>
                <div className="text-2xl font-bold">{summary.devops}</div>
                <div className="text-sm text-gray-500">DevOps</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-teal-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Wrench className="h-8 w-8 text-teal-500" />
              <div>
                <div className="text-2xl font-bold">{summary.dev_on_duty}</div>
                <div className="text-sm text-gray-500">Dev On Duty</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardContent className="p-4 flex items-center gap-3">
              <UserCog className="h-8 w-8 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">{summary.replacement}</div>
                <div className="text-sm text-gray-500">Replacement</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-600">Loading duty schedules...</p>
          </div>
        ) : duties.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-lg">
            <CalendarDays className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No duties scheduled</h3>
            <p className="text-gray-500 mb-4">
              Start by adding duty assignments for your teams.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Duty
            </Button>
          </div>
        ) : (
          /* Release Cycle Schedule View */
          <div className="space-y-6">
            {dutiesByCycle.map(cycle => (
              <Card key={cycle.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{cycle.label}</span>
                    <span className="text-sm font-normal text-gray-500">
                      ({cycle.dateLabel})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cycle.duties.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">
                      No duties scheduled for this cycle
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {/* Sprint Sections */}
                      {cycle.sprintGroups.map(sprint => (
                        <div key={sprint.id} className="border-l-2 border-gray-200 pl-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-semibold text-gray-700">
                              Sprint {sprint.id}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({formatDateRange(sprint.startDate, sprint.endDate)})
                            </span>
                            {sprint.duties.length > 0 && (
                              <Badge variant="outline" className="ml-auto">
                                {sprint.duties.length} {sprint.duties.length === 1 ? 'duty' : 'duties'}
                              </Badge>
                            )}
                          </div>

                          {sprint.duties.length === 0 ? (
                            <p className="text-gray-400 text-sm py-2">
                              No duties in this sprint
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {/* DevOps */}
                              {sprint.grouped.devops.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Shield className="h-3 w-3 text-indigo-600" />
                                    <span className="text-xs font-medium text-indigo-700">DevOps</span>
                                  </div>
                                  <div className="space-y-1">
                                    {sprint.grouped.devops.map(duty => (
                                      <DutyScheduleCard
                                        key={duty.id}
                                        duty={duty}
                                        onEdit={handleEdit}
                                        onDelete={handleDeleteDuty}
                                        compact
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Dev On Duty */}
                              {sprint.grouped.dev_on_duty.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Wrench className="h-3 w-3 text-teal-600" />
                                    <span className="text-xs font-medium text-teal-700">Dev On Duty</span>
                                  </div>
                                  <div className="space-y-1">
                                    {sprint.grouped.dev_on_duty.map(duty => (
                                      <DutyScheduleCard
                                        key={duty.id}
                                        duty={duty}
                                        onEdit={handleEdit}
                                        onDelete={handleDeleteDuty}
                                        compact
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Replacement */}
                              {sprint.grouped.replacement.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <UserCog className="h-3 w-3 text-amber-600" />
                                    <span className="text-xs font-medium text-amber-700">Replacement</span>
                                  </div>
                                  <div className="space-y-1">
                                    {sprint.grouped.replacement.map(duty => (
                                      <DutyScheduleCard
                                        key={duty.id}
                                        duty={duty}
                                        onEdit={handleEdit}
                                        onDelete={handleDeleteDuty}
                                        compact
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <DutyScheduleForm
          open={showForm}
          onOpenChange={setShowForm}
          onSubmit={handleCreateDuty}
          preselectedTeam={selectedTeam !== 'All' ? selectedTeam : null}
          currentCycleId={currentCycleId}
          isLoading={formLoading}
        />

        {/* Edit Dialog */}
        <DutyScheduleForm
          open={!!editingDuty}
          onOpenChange={(open) => !open && setEditingDuty(null)}
          onSubmit={handleUpdateDuty}
          initialData={editingDuty}
          currentCycleId={currentCycleId}
          isLoading={formLoading}
        />
      </div>
    </div>
  );
}
