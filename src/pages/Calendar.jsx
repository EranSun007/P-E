
import React, { useState, useEffect, useContext } from "react";
import { Task, DevOpsDuty, Meeting, DutySchedule, TimeOff } from "@/api/entities";
import { AppContext } from "@/contexts/AppContext.jsx";
import { useDisplayMode } from "@/contexts/DisplayModeContext.jsx";
import { useAI } from "@/contexts/AIContext";
import { formatCalendarContext } from "@/utils/contextFormatter";
import { logger } from "@/utils/logger";
import { anonymizeName } from "@/utils/anonymize";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, CheckSquare, Plane, Shield, Users, Wrench, UserCog, CalendarDays, Palmtree, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import TaskCreationForm from "../components/task/TaskCreationForm";
import TimeOffForm from "@/components/timeoff/TimeOffForm";
import TimeOffCard from "@/components/timeoff/TimeOffCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { tasks: ctxTasks, teamMembers: ctxMembers, meetings: ctxMeetings, refreshAll } = useContext(AppContext);
  const { isPresentationMode } = useDisplayMode();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [devOpsDuties, setDevOpsDuties] = useState([]);
  const [dutySchedules, setDutySchedules] = useState([]);
  const [timeOffs, setTimeOffs] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingDate, setViewingDate] = useState(new Date()); // The date shown in TODAY section
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskCreation, setShowTaskCreation] = useState(false);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState(null);
  const [timeOffLoading, setTimeOffLoading] = useState(false);
  const [monthCollapsed, setMonthCollapsed] = useState(() => {
    // Persist collapse state in localStorage
    const saved = localStorage.getItem('calendar-month-collapsed');
    return saved === 'true';
  });

  // Event type filters
  const [filters, setFilters] = useState({
    tasks: true,
    leave: true,
    timeOff: true,
    duties: true,
    dutySchedule: true,
    meetings: true,
  });

  // Persist month collapse state
  useEffect(() => {
    localStorage.setItem('calendar-month-collapsed', String(monthCollapsed));
  }, [monthCollapsed]);

  useEffect(() => {
    setTasks(Array.isArray(ctxTasks) ? ctxTasks : []);
  }, [ctxTasks]);

  useEffect(() => {
    setTeamMembers(Array.isArray(ctxMembers) ? ctxMembers : []);
  }, [ctxMembers]);

  useEffect(() => {
    setMeetings(Array.isArray(ctxMeetings) ? ctxMeetings : []);
  }, [ctxMeetings]);

  // Load DevOps duties (historical tracking)
  useEffect(() => {
    const loadDevOpsDuties = async () => {
      try {
        const duties = await DevOpsDuty.list();
        setDevOpsDuties(Array.isArray(duties) ? duties : []);
      } catch (err) {
        logger.error("Failed to load DevOps duties", { error: String(err) });
        setDevOpsDuties([]);
      }
    };
    loadDevOpsDuties();
  }, []);

  // Load duty schedules (rotation planning)
  useEffect(() => {
    const loadDutySchedules = async () => {
      try {
        const start = startOfMonth(subMonths(currentMonth, 1));
        const end = endOfMonth(addMonths(currentMonth, 1));
        const schedules = await DutySchedule.listByDateRange(
          format(start, 'yyyy-MM-dd'),
          format(end, 'yyyy-MM-dd')
        );
        setDutySchedules(Array.isArray(schedules) ? schedules : []);
      } catch (err) {
        logger.error("Failed to load duty schedules", { error: String(err) });
        setDutySchedules([]);
      }
    };
    loadDutySchedules();
  }, [currentMonth]);

  // Load time off entries
  useEffect(() => {
    const loadTimeOffs = async () => {
      try {
        const start = startOfMonth(subMonths(currentMonth, 1));
        const end = endOfMonth(addMonths(currentMonth, 1));
        const entries = await TimeOff.listByDateRange(
          format(start, 'yyyy-MM-dd'),
          format(end, 'yyyy-MM-dd')
        );
        setTimeOffs(Array.isArray(entries) ? entries : []);
      } catch (err) {
        logger.error("Failed to load time off entries", { error: String(err) });
        setTimeOffs([]);
      }
    };
    loadTimeOffs();
  }, [currentMonth]);

  // Toggle filter
  const toggleFilter = (filterKey) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  const loadTasks = async () => {
    try {
      await refreshAll();
    } catch (err) {
      logger.error("Failed to refresh tasks (calendar)", { error: String(err) });
    }
  };

  // Reload time off entries
  const reloadTimeOffs = async () => {
    try {
      const start = startOfMonth(subMonths(currentMonth, 1));
      const end = endOfMonth(addMonths(currentMonth, 1));
      const entries = await TimeOff.listByDateRange(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );
      setTimeOffs(Array.isArray(entries) ? entries : []);
    } catch (err) {
      logger.error("Failed to reload time off entries", { error: String(err) });
    }
  };

  // Handle time off form submission
  const handleTimeOffSubmit = async (data) => {
    setTimeOffLoading(true);
    try {
      if (editingTimeOff) {
        await TimeOff.update(editingTimeOff.id, data);
      } else {
        await TimeOff.create(data);
      }
      await reloadTimeOffs();
      setShowTimeOffForm(false);
      setEditingTimeOff(null);
    } catch (err) {
      logger.error("Failed to save time off", { error: String(err) });
    } finally {
      setTimeOffLoading(false);
    }
  };

  // Handle time off deletion
  const handleDeleteTimeOff = async (id) => {
    try {
      await TimeOff.delete(id);
      await reloadTimeOffs();
    } catch (err) {
      logger.error("Failed to delete time off", { error: String(err) });
    }
  };

  const handleCreateTask = async (taskData) => {
    if (!taskData) {
      setShowTaskCreation(false);
      return;
    }

    try {
      await Task.create({
        ...taskData,
        due_date: taskData.due_date || viewingDate.toISOString()
      });
      await loadTasks();
      setShowTaskCreation(false);
    } catch (err) {
      logger.error("Failed to create task (calendar)", { error: String(err) });
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleWeekDayClick = (date) => {
    setViewingDate(date);
  };

  const handleMonthDateClick = (date) => {
    setViewingDate(date);
    // Also update currentMonth if clicking a different month
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
  };

  const handleGoToToday = () => {
    const today = new Date();
    setViewingDate(today);
    setCurrentMonth(today);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  // Helper to get events for a specific date
  const getEventsForDate = (date) => {
    const tasksForDay = filters.tasks
      ? tasks.filter(task => task.due_date && isSameDay(parseISO(task.due_date), date))
      : [];

    const leavesForDay = filters.leave
      ? teamMembers.filter(member => {
          if (!member?.leave_from || !member?.leave_to) return false;
          try {
            const start = startOfDay(parseISO(member.leave_from));
            const end = endOfDay(parseISO(member.leave_to));
            return isWithinInterval(date, { start, end });
          } catch (_) {
            return false;
          }
        })
      : [];

    const dutiesForDay = filters.duties
      ? devOpsDuties.filter(duty => {
          if (!duty.start_date) return false;
          try {
            const start = startOfDay(parseISO(duty.start_date));
            const end = duty.end_date ? endOfDay(parseISO(duty.end_date)) : endOfDay(start);
            return isWithinInterval(date, { start, end });
          } catch (_) {
            return false;
          }
        })
      : [];

    const meetingsForDay = filters.meetings
      ? meetings.filter(meeting =>
          meeting.scheduled_date && isSameDay(parseISO(meeting.scheduled_date), date)
        )
      : [];

    const dutySchedulesForDay = filters.dutySchedule
      ? dutySchedules.filter(duty => {
          if (!duty.start_date || !duty.end_date) return false;
          try {
            const start = startOfDay(parseISO(duty.start_date));
            const end = endOfDay(parseISO(duty.end_date));
            return isWithinInterval(date, { start, end });
          } catch (_) {
            return false;
          }
        })
      : [];

    const timeOffsForDay = filters.timeOff
      ? timeOffs.filter(timeOff => {
          if (!timeOff.start_date || !timeOff.end_date) return false;
          try {
            const start = startOfDay(parseISO(timeOff.start_date));
            const end = endOfDay(parseISO(timeOff.end_date));
            return isWithinInterval(date, { start, end });
          } catch (_) {
            return false;
          }
        })
      : [];

    return {
      tasks: tasksForDay,
      leaves: leavesForDay,
      duties: dutiesForDay,
      meetings: meetingsForDay,
      dutySchedules: dutySchedulesForDay,
      timeOffs: timeOffsForDay,
      hasEvents: tasksForDay.length > 0 || leavesForDay.length > 0 || dutiesForDay.length > 0 ||
                 meetingsForDay.length > 0 || dutySchedulesForDay.length > 0 || timeOffsForDay.length > 0
    };
  };

  // Get week days for the week strip
  const getWeekDays = () => {
    const weekStart = startOfWeek(viewingDate);
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  };

  // AI Context Registration
  const { updatePageContext } = useAI();

  // Compute all visible events for the current month view
  const allVisibleEvents = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const events = [];
    days.forEach(day => {
      const dayEvents = getEventsForDate(day);
      dayEvents.tasks.forEach(t => events.push({ type: 'task', title: t.title, date: t.due_date, ...t }));
      dayEvents.meetings.forEach(m => events.push({ type: 'meeting', title: m.title || m.subject, start_date: m.scheduled_date, ...m }));
      dayEvents.dutySchedules.forEach(d => events.push({ type: 'duty', title: `${d.duty_type} - ${d.assignee_name || 'Unassigned'}`, start_date: d.start_date, ...d }));
      dayEvents.timeOffs.forEach(t => events.push({ type: 'timeoff', title: `${t.person_name || 'Someone'} - ${t.type || 'Time Off'}`, start_date: t.start_date, ...t }));
    });
    return events;
  }, [currentMonth, tasks, meetings, dutySchedules, timeOffs, filters]);

  // Register calendar context for AI
  useEffect(() => {
    const dateRange = {
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    };

    const contextSummary = formatCalendarContext(
      allVisibleEvents,
      'month',
      viewingDate,
      dateRange
    );

    updatePageContext({
      page: '/calendar',
      summary: contextSummary,
      selection: selectedTask ? { id: selectedTask.id, type: 'task' } : null,
      data: {
        eventCount: allVisibleEvents.length,
        viewMode: 'month',
        currentMonth: format(currentMonth, 'yyyy-MM'),
        viewingDate: format(viewingDate, 'yyyy-MM-dd')
      }
    });
  }, [allVisibleEvents, currentMonth, viewingDate, selectedTask, updatePageContext]);

  // Listen for context refresh events
  useEffect(() => {
    const handleRefresh = () => {
      const dateRange = {
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
      };

      const contextSummary = formatCalendarContext(
        allVisibleEvents,
        'month',
        viewingDate,
        dateRange
      );

      updatePageContext({
        page: '/calendar',
        summary: contextSummary,
        selection: selectedTask ? { id: selectedTask.id, type: 'task' } : null,
        data: {
          eventCount: allVisibleEvents.length,
          viewMode: 'month',
          currentMonth: format(currentMonth, 'yyyy-MM'),
          viewingDate: format(viewingDate, 'yyyy-MM-dd')
        }
      });
    };

    window.addEventListener('ai-context-refresh', handleRefresh);
    return () => window.removeEventListener('ai-context-refresh', handleRefresh);
  }, [allVisibleEvents, currentMonth, viewingDate, selectedTask, updatePageContext]);

  // ============================================
  // SECTION: FILTERS
  // ============================================
  const renderFilters = () => {
    const filterConfig = [
      { key: 'tasks', label: 'Tasks', icon: CheckSquare, activeClass: 'bg-purple-100 text-purple-800 border-purple-300', color: 'purple' },
      { key: 'leave', label: 'Leave', icon: Plane, activeClass: 'bg-red-100 text-red-800 border-red-300', color: 'red' },
      { key: 'timeOff', label: 'Time Off', icon: Palmtree, activeClass: 'bg-blue-100 text-blue-800 border-blue-300', color: 'blue' },
      { key: 'duties', label: 'DevOps', icon: Shield, activeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300', color: 'indigo' },
      { key: 'dutySchedule', label: 'Rotation', icon: CalendarDays, activeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300', color: 'emerald' },
      { key: 'meetings', label: 'Meetings', icon: Users, activeClass: 'bg-teal-100 text-teal-800 border-teal-300', color: 'teal' },
    ];

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500 mr-1">Show:</span>
        {filterConfig.map(({ key, label, icon: Icon, activeClass }) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            onClick={() => toggleFilter(key)}
            className={cn(
              "h-8 px-3 text-xs font-medium transition-colors",
              filters[key] ? activeClass : "bg-white text-gray-400 border-gray-200"
            )}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {label}
          </Button>
        ))}
      </div>
    );
  };

  // ============================================
  // SECTION 1: TODAY HERO SECTION
  // ============================================
  const renderTodaySection = () => {
    const events = getEventsForDate(viewingDate);
    const isToday = isSameDay(viewingDate, new Date());

    // Count events by type
    const taskCount = events.tasks.length;
    const leaveCount = events.leaves.length;
    const timeOffCount = events.timeOffs.length;
    const meetingCount = events.meetings.length;
    const dutyCount = events.duties.length + events.dutySchedules.length;

    return (
      <Card className="mb-6 shadow-lg border-2 border-indigo-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {isToday ? "Today" : format(viewingDate, "EEEE")}
              </CardTitle>
              <p className="text-lg text-gray-600 mt-1">
                {format(viewingDate, "MMMM d, yyyy")}
              </p>
            </div>
            <div className="flex gap-2">
              {!isToday && (
                <Button variant="outline" size="sm" onClick={handleGoToToday}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Today
                </Button>
              )}
              {!isPresentationMode && (
                <>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingTimeOff(null);
                    setShowTimeOffForm(true);
                  }}>
                    <Palmtree className="h-4 w-4 mr-2" />
                    Time Off
                  </Button>
                  <Button size="sm" onClick={() => setShowTaskCreation(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex gap-3 mt-4 flex-wrap">
            {taskCount > 0 && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 px-3 py-1">
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                {taskCount} Task{taskCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {meetingCount > 0 && (
              <Badge className="bg-teal-100 text-teal-800 border-teal-200 px-3 py-1">
                <Users className="h-3.5 w-3.5 mr-1" />
                {meetingCount} Meeting{meetingCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {(leaveCount > 0 || timeOffCount > 0) && (
              <Badge className="bg-red-100 text-red-800 border-red-200 px-3 py-1">
                <Plane className="h-3.5 w-3.5 mr-1" />
                {leaveCount + timeOffCount} OOO
              </Badge>
            )}
            {dutyCount > 0 && (
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 px-3 py-1">
                <Shield className="h-3.5 w-3.5 mr-1" />
                {dutyCount} Dut{dutyCount !== 1 ? 'ies' : 'y'}
              </Badge>
            )}
            {!events.hasEvents && (
              <Badge variant="outline" className="text-gray-500 px-3 py-1">
                No events scheduled
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {events.hasEvents ? (
            <div className="space-y-4">
              {/* Tasks Card Group */}
              {events.tasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Tasks
                  </h3>
                  <div className="space-y-2">
                    {events.tasks.map(task => (
                      <div
                        key={task.id}
                        className="p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 cursor-pointer transition-colors"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-purple-900">{task.title}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">{task.type}</Badge>
                            <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-sm text-purple-700 mt-1 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meetings Card Group */}
              {events.meetings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-teal-800 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Meetings
                  </h3>
                  <div className="space-y-2">
                    {events.meetings.map(meeting => (
                      <div
                        key={meeting.id}
                        className="p-3 bg-teal-50 border border-teal-200 rounded-lg"
                      >
                        <span className="font-medium text-teal-900">{meeting.title}</span>
                        {meeting.location && (
                          <p className="text-sm text-teal-700 mt-1">{meeting.location}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Off Card Group */}
              {events.timeOffs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    <Palmtree className="h-4 w-4" />
                    Time Off
                  </h3>
                  <div className="space-y-2">
                    {events.timeOffs.map((timeOff, idx) => (
                      <TimeOffCard
                        key={timeOff.id}
                        timeOff={timeOff}
                        compact={false}
                        showTeamMember={true}
                        index={idx}
                        onEdit={!isPresentationMode ? (t) => {
                          setEditingTimeOff(t);
                          setShowTimeOffForm(true);
                        } : undefined}
                        onDelete={!isPresentationMode ? handleDeleteTimeOff : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Leave Card Group */}
              {events.leaves.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Team Leave
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {events.leaves.map((member, idx) => (
                      <Badge key={member.id} className="bg-red-100 text-red-800 border-red-200">
                        {isPresentationMode
                          ? `${anonymizeName(member.name, idx, 'Team Member')} - Leave`
                          : `${member.name} - ${member.leave_title || 'Leave'}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Duty Rotation Card Group */}
              {events.dutySchedules.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Duty Rotation
                  </h3>
                  <div className="space-y-2">
                    {events.dutySchedules.map((duty, idx) => {
                      const dutyTypeConfig = {
                        devops: { icon: Shield, bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', label: 'DevOps' },
                        dev_on_duty: { icon: Wrench, bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', label: 'Dev On Duty' },
                        replacement: { icon: UserCog, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', label: 'SM Cover' },
                      };
                      const config = dutyTypeConfig[duty.duty_type] || dutyTypeConfig.devops;
                      const DutyIcon = config.icon;
                      const displayDutyName = isPresentationMode
                        ? anonymizeName(duty.team_member_name, idx, 'Team Member')
                        : duty.team_member_name;
                      return (
                        <div
                          key={duty.id}
                          className={`p-3 ${config.bg} border ${config.border} rounded-lg`}
                        >
                          <div className="flex items-center gap-2">
                            <DutyIcon className={`h-4 w-4 ${config.text}`} />
                            <span className={`font-medium ${config.text}`}>{config.label}</span>
                            <span className={config.text}>—</span>
                            <span className={config.text}>{displayDutyName}</span>
                            {duty.team && (
                              <Badge variant="outline" className="ml-auto text-xs">{duty.team}</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DevOps Duties (historical) Card Group */}
              {events.duties.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    DevOps Tracking
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {events.duties.map((duty, idx) => (
                      <Badge key={duty.id} className="bg-indigo-100 text-indigo-800 border-indigo-200">
                        {isPresentationMode
                          ? anonymizeName(duty.team_member_name, idx, 'Team Member')
                          : (duty.team_member_name || 'DevOps Duty')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No events scheduled for this day</p>
              {!isPresentationMode && (
                <Button variant="outline" onClick={() => setShowTaskCreation(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first task
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ============================================
  // SECTION 2: WEEK STRIP
  // ============================================
  const renderWeekStrip = () => {
    const weekDays = getWeekDays();

    return (
      <Card className="mb-6">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-700">This Week</CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingDate(addDays(viewingDate, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingDate(addDays(viewingDate, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const events = getEventsForDate(day);
              const isSelected = isSameDay(day, viewingDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toString()}
                  onClick={() => handleWeekDayClick(day)}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-lg transition-all",
                    isSelected && "bg-indigo-100 border-2 border-indigo-400",
                    !isSelected && "hover:bg-gray-100 border-2 border-transparent",
                    isToday && !isSelected && "border-2 border-red-300"
                  )}
                >
                  <span className="text-xs font-medium text-gray-500">
                    {format(day, "EEE")}
                  </span>
                  <span className={cn(
                    "text-lg font-bold mt-1",
                    isSelected ? "text-indigo-700" : "text-gray-900",
                    isToday && "text-red-600"
                  )}>
                    {format(day, "d")}
                  </span>
                  {/* Event indicator dots */}
                  <div className="flex gap-0.5 mt-2 min-h-[8px]">
                    {events.tasks.length > 0 && (
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                    )}
                    {events.meetings.length > 0 && (
                      <div className="w-2 h-2 rounded-full bg-teal-500" />
                    )}
                    {(events.leaves.length > 0 || events.timeOffs.length > 0) && (
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    )}
                    {(events.duties.length > 0 || events.dutySchedules.length > 0) && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================
  // SECTION 3: COMPACT MONTH GRID
  // ============================================
  const renderMonthSection = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <Card className={cn("transition-all", monthCollapsed && "")}>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg font-semibold text-gray-700">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handlePreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMonthCollapsed(!monthCollapsed)}
              className="text-gray-500"
            >
              {monthCollapsed ? (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {!monthCollapsed && (
          <CardContent className="pt-2 pb-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
                <div key={dayName} className="text-center text-xs font-medium text-gray-500 py-1">
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => {
                const events = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isSelected = isSameDay(day, viewingDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toString()}
                    onClick={() => handleMonthDateClick(day)}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-md text-sm transition-colors relative",
                      !isCurrentMonth && "text-gray-300",
                      isCurrentMonth && "text-gray-700 hover:bg-gray-100",
                      isSelected && "bg-indigo-100 text-indigo-800 font-bold",
                      isToday && !isSelected && "border-2 border-red-400 font-bold text-red-600"
                    )}
                  >
                    <span>{format(day, "d")}</span>
                    {/* Compact event dots */}
                    {events.hasEvents && isCurrentMonth && (
                      <div className="flex gap-0.5 mt-0.5 absolute bottom-1">
                        {events.tasks.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                        {events.meetings.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                        )}
                        {(events.leaves.length > 0 || events.timeOffs.length > 0) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                        {(events.duties.length > 0 || events.dutySchedules.length > 0) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">Calendar</h1>
          {renderFilters()}
        </div>

        {/* Section 1: TODAY - Hero View */}
        {renderTodaySection()}

        {/* Section 2: WEEK - Horizontal Strip */}
        {renderWeekStrip()}

        {/* Section 3: MONTH - Compact Collapsible Grid */}
        {renderMonthSection()}

        {/* Task Creation Dialog */}
        <Dialog open={showTaskCreation} onOpenChange={setShowTaskCreation}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Task for {format(viewingDate, "MMMM d, yyyy")}</DialogTitle>
            </DialogHeader>
            <TaskCreationForm
              onCreateTask={handleCreateTask}
              initialTaskData={{
                due_date: viewingDate.toISOString(),
                status: "todo",
                priority: "medium",
                type: "generic"
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Task Detail Dialog */}
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          {selectedTask && (
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Task Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{selectedTask.title}</h3>
                  <div className="flex items-center mt-2 space-x-2">
                    <Badge>{selectedTask.type}</Badge>
                    <Badge variant="outline">{selectedTask.priority} priority</Badge>
                    {selectedTask.strategic && <Badge variant="secondary">Strategic</Badge>}
                  </div>
                </div>

                {selectedTask.description && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-500">Description</h4>
                    <p>{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.due_date && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-500">Due Date</h4>
                    <p>{format(parseISO(selectedTask.due_date), "PPpp")}</p>
                  </div>
                )}

                {selectedTask.stakeholders?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-500">Stakeholders</h4>
                    <p>{selectedTask.stakeholders.join(", ")}</p>
                  </div>
                )}

                {selectedTask.tags?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-500">Tags</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTask.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          )}
        </Dialog>

        {/* Time Off Form Dialog */}
        <TimeOffForm
          open={showTimeOffForm}
          onOpenChange={(open) => {
            setShowTimeOffForm(open);
            if (!open) setEditingTimeOff(null);
          }}
          onSubmit={handleTimeOffSubmit}
          initialData={editingTimeOff}
          preselectedDate={viewingDate}
          isLoading={timeOffLoading}
        />
      </div>
    </div>
  );
}
