import { useState, useEffect, useMemo } from 'react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isWithinInterval,
  startOfDay,
  endOfDay,
  eachWeekOfInterval,
  getWeek,
} from 'date-fns';
import { DutySchedule } from '@/api/entities';
import { logger } from '@/utils/logger';
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
import DutyScheduleCard, { DUTY_TYPE_CONFIG } from '@/components/duties/DutyScheduleCard';

const TEAMS = ['All', 'Metering', 'Reporting'];
const DUTY_TYPES = ['All', 'devops', 'dev_on_duty', 'replacement'];

export default function DutiesPage() {
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [selectedDutyType, setSelectedDutyType] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingDuty, setEditingDuty] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Load duties for the visible date range (current month + 2 months)
  useEffect(() => {
    loadDuties();
  }, [currentMonth, selectedTeam, selectedDutyType]);

  const loadDuties = async () => {
    setLoading(true);
    setError(null);
    try {
      const start = startOfMonth(subMonths(currentMonth, 1));
      const end = endOfMonth(addMonths(currentMonth, 2));

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

  // Group duties by month
  const dutiesByMonth = useMemo(() => {
    const months = [];
    for (let i = 0; i < 3; i++) {
      const monthDate = addMonths(currentMonth, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthDuties = duties.filter(duty => {
        if (!duty.start_date || !duty.end_date) return false;
        const dutyStart = startOfDay(parseISO(duty.start_date));
        const dutyEnd = endOfDay(parseISO(duty.end_date));

        // Duty overlaps with this month
        return (
          isWithinInterval(monthStart, { start: dutyStart, end: dutyEnd }) ||
          isWithinInterval(monthEnd, { start: dutyStart, end: dutyEnd }) ||
          isWithinInterval(dutyStart, { start: monthStart, end: monthEnd })
        );
      });

      // Group by duty type within each month
      const grouped = {
        devops: monthDuties.filter(d => d.duty_type === 'devops'),
        dev_on_duty: monthDuties.filter(d => d.duty_type === 'dev_on_duty'),
        replacement: monthDuties.filter(d => d.duty_type === 'replacement'),
      };

      months.push({
        date: monthDate,
        label: format(monthDate, 'MMMM yyyy'),
        duties: monthDuties,
        grouped,
      });
    }
    return months;
  }, [duties, currentMonth]);

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
              Manage duty rotation assignments for your teams
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

          {/* Month Navigation */}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
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
          /* Monthly Schedule View */
          <div className="space-y-6">
            {dutiesByMonth.map(month => (
              <Card key={month.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{month.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {month.duties.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">
                      No duties scheduled for this month
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* DevOps Section */}
                      {month.grouped.devops.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm font-medium text-indigo-800">DevOps (2 weeks)</span>
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
                              {month.grouped.devops.length}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {month.grouped.devops.map(duty => (
                              <DutyScheduleCard
                                key={duty.id}
                                duty={duty}
                                onEdit={handleEdit}
                                onDelete={handleDeleteDuty}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dev On Duty Section */}
                      {month.grouped.dev_on_duty.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Wrench className="h-4 w-4 text-teal-600" />
                            <span className="text-sm font-medium text-teal-800">Dev On Duty (1 week)</span>
                            <Badge variant="outline" className="bg-teal-50 text-teal-700">
                              {month.grouped.dev_on_duty.length}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {month.grouped.dev_on_duty.map(duty => (
                              <DutyScheduleCard
                                key={duty.id}
                                duty={duty}
                                onEdit={handleEdit}
                                onDelete={handleDeleteDuty}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Replacement Section */}
                      {month.grouped.replacement.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <UserCog className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-800">Replacement (SM Cover)</span>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700">
                              {month.grouped.replacement.length}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {month.grouped.replacement.map(duty => (
                              <DutyScheduleCard
                                key={duty.id}
                                duty={duty}
                                onEdit={handleEdit}
                                onDelete={handleDeleteDuty}
                              />
                            ))}
                          </div>
                        </div>
                      )}
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
          isLoading={formLoading}
        />

        {/* Edit Dialog */}
        <DutyScheduleForm
          open={!!editingDuty}
          onOpenChange={(open) => !open && setEditingDuty(null)}
          onSubmit={handleUpdateDuty}
          initialData={editingDuty}
          isLoading={formLoading}
        />
      </div>
    </div>
  );
}
