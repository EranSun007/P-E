import React, { useState, useEffect, lazy, Suspense } from "react";
import { Task, CalendarEvent, TeamMember, OutOfOffice, Duty } from "@/api/entities";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO, differenceInDays, isAfter, isBefore } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar, CalendarDays, MessageSquare, Menu, X, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { FormLoadingSkeleton, ComponentLoadingSkeleton } from "@/components/ui/loading-skeletons";

import { ComponentChunkErrorBoundary, retryImport } from "@/components/ui/error-boundaries";

// Lazy load TaskCreationForm for better performance with error handling
const TaskCreationForm = lazy(() => retryImport(() => import("../components/task/TaskCreationForm"), 3, 1000));
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import ViewModeSelector from "@/components/calendar/ViewModeSelector";
import { CalendarViewEmptyState, CalendarDateEmptyState, CalendarLoadingEmptyState } from "@/components/calendar/CalendarEmptyState";
import { viewModeManager } from "@/services/viewModeManager";
import { CalendarEventGenerationService } from "@/services/calendarEventGenerationService";
import AgendaContextActions from "@/components/agenda/AgendaContextActions";
import { AgendaIndicatorService } from "@/services/agendaIndicatorService";
import { CalendarAgendaIndicator, CalendarAgendaCount } from "@/components/calendar/CalendarAgendaIndicator";

// Lazy load MeetingDetailView for better performance with error handling
const MeetingDetailView = lazy(() => retryImport(() => import("@/components/calendar/MeetingDetailView"), 3, 1000));

// Lazy load WeeklyMeetingSidebar for better performance with error handling
const WeeklyMeetingSidebar = lazy(() => retryImport(() => import("@/components/calendar/WeeklyMeetingSidebar"), 3, 1000));
import { useIsMobile } from "@/hooks/use-mobile";
import { EventStylingService } from "@/utils/eventStylingService";
import { CalendarSyncStatusService } from "@/services/calendarSyncStatusService";
import { ErrorHandlingService } from "@/services/errorHandlingService";
import { useToast } from "@/components/ui/use-toast";

export default function CalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [outOfOfficeRecords, setOutOfOfficeRecords] = useState([]);
  const [duties, setDuties] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showTaskCreation, setShowTaskCreation] = useState(false);
  const [currentViewMode, setCurrentViewMode] = useState(viewModeManager.getCurrentViewMode());
  const [isLoading, setIsLoading] = useState(true);
  const [agendaCounts, setAgendaCounts] = useState({});
  const [showMeetingDetail, setShowMeetingDetail] = useState(false);
  const [selectedMeetingEvent, setSelectedMeetingEvent] = useState(null);
  
  // Weekly sidebar state
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weeklyMeetings, setWeeklyMeetings] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const isMobile = useIsMobile();
  
  // Enhanced caching state for calendar data
  const [dataCache, setDataCache] = useState({
    events: [],
    tasks: [],
    teamMembers: [],
    outOfOffice: [],
    duties: [],
    lastUpdated: null,
    loadedDateRanges: new Set()
  });
  const [loadingError, setLoadingError] = useState(null);
  
  // Sync status state
  const [syncStatus, setSyncStatus] = useState(CalendarSyncStatusService.getSyncStatus());
  const [showSyncStatus, setShowSyncStatus] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Manual sync function with comprehensive error handling
  const handleManualSync = async () => {
    return ErrorHandlingService.wrapOperation(async () => {
      setShowSyncStatus(true);
      const results = await CalendarSyncStatusService.manualSync({
        createMissing: true,
        updateExisting: true,
        repairBroken: true,
        showProgress: true
      });
      
      // Reload calendar data after successful sync
      if (results.summary.success && results.summary.totalChanges > 0) {
        await loadCalendarData(true);
      }
      
      return results;
    }, {
      operationName: 'Manual Calendar Sync',
      showLoading: true,
      showSuccess: true,
      successMessage: 'Calendar synchronized successfully',
      retryOptions: {
        maxRetries: 2,
        baseDelay: 2000,
        onRetry: (error, attempt, delay) => {
          console.log(`Retrying sync operation (attempt ${attempt}) in ${delay}ms...`);
          toast({
            title: 'Retrying Sync',
            description: `Attempting to sync again (attempt ${attempt})...`,
            duration: 2000
          });
        }
      },
      errorOptions: {
        severity: ErrorHandlingService.SEVERITY.HIGH,
        context: { source: 'manual_sync_button' }
      }
    }).catch(error => {
      // Additional error handling for sync failures
      setShowSyncStatus(true); // Keep status visible to show error
      throw error; // Re-throw to maintain error handling chain
    });
  };

  useEffect(() => {
    loadCalendarData();
    
    // Initialize sync service and add status listener
    CalendarSyncStatusService.initialize();
    CalendarSyncStatusService.addStatusListener(setSyncStatus);
    
    // Cleanup on unmount
    return () => {
      CalendarSyncStatusService.removeStatusListener(setSyncStatus);
    };
  }, []);

  // Load data when month changes, with intelligent caching
  useEffect(() => {
    const targetYear = currentMonth.getFullYear();
    const yearKey = `${targetYear}`;
    
    // Check if we need to load data for this year
    if (!dataCache.loadedDateRanges.has(yearKey) && 
        !dataCache.loadedDateRanges.has(`${targetYear - 1}`) &&
        !dataCache.loadedDateRanges.has(`${targetYear + 1}`)) {
      loadCalendarData(false, currentMonth);
    }
    
    // Update current week when month changes
    setCurrentWeek(currentMonth);
  }, [currentMonth]);

  // Update weekly meetings when calendar events change
  useEffect(() => {
    updateWeeklyMeetings();
  }, [calendarEvents, currentWeek, currentViewMode]);

  // Handle mobile sidebar visibility
  useEffect(() => {
    if (isMobile) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }
  }, [isMobile]);

  const loadCalendarData = async (forceRefresh = false, targetMonth = null) => {
    const operationName = 'Load Calendar Data';
    
    return ErrorHandlingService.wrapOperation(async () => {
      setIsLoading(true);
      setLoadingError(null);
      
      const now = Date.now();
      const cacheValidityMs = 5 * 60 * 1000; // 5 minutes cache validity
      const targetDate = targetMonth || currentMonth;
      
      // Check if we can use cached data (unless force refresh is requested)
      if (!forceRefresh && 
          dataCache.lastUpdated && 
          (now - dataCache.lastUpdated) < cacheValidityMs &&
          dataCache.events.length > 0) {
        
        // Use cached data but still update state
        setTasks(dataCache.tasks);
        setCalendarEvents(dataCache.events);
        setTeamMembers(dataCache.teamMembers);
        setOutOfOfficeRecords(dataCache.outOfOffice);
        setDuties(dataCache.duties);
        
        // Load agenda counts for cached events
        const agendaCountsData = await AgendaIndicatorService.getAgendaCountsForCalendarEvents(dataCache.events);
        setAgendaCounts(agendaCountsData);
        
        setIsLoading(false);
        return;
      }

      // Load all data in parallel with enhanced error handling
      const loadPromises = [
        Task.list().catch(err => {
          console.warn("Failed to load tasks:", err);
          return dataCache.tasks || [];
        }),
        CalendarEvent.list().catch(err => {
          console.warn("Failed to load calendar events:", err);
          return dataCache.events || [];
        }),
        TeamMember.list().catch(err => {
          console.warn("Failed to load team members:", err);
          return dataCache.teamMembers || [];
        }),
        OutOfOffice.list().catch(err => {
          console.warn("Failed to load out of office records:", err);
          return dataCache.outOfOffice || [];
        }),
        Duty.list().catch(err => {
          console.warn("Failed to load duties:", err);
          return dataCache.duties || [];
        })
      ];

      const [taskData, eventData, teamMemberData, outOfOfficeData, dutyData] = await Promise.all(loadPromises);
      
      // Update state with loaded data
      setTasks(taskData);
      setTeamMembers(teamMemberData);
      setOutOfOfficeRecords(outOfOfficeData);
      setDuties(dutyData);

      // Generate calendar events for extended date range (current year + previous year + next year)
      const currentYear = targetDate.getFullYear();
      const yearsToSync = [currentYear - 1, currentYear, currentYear + 1];
      
      try {
        // Synchronize events for multiple years to ensure past and future events are available
        for (const year of yearsToSync) {
          await CalendarEventGenerationService.synchronizeAllEvents({
            includeBirthdays: true,
            includeDuties: true,
            includeOutOfOffice: true,
            year: year
          });
        }
      } catch (syncError) {
        console.warn("Failed to synchronize some calendar events:", syncError);
        // Continue with existing events even if sync fails
      }

      // Ensure 1:1 meeting visibility by running calendar synchronization
      try {
        const { CalendarSynchronizationService } = await import('../services/calendarSynchronizationService.js');
        await CalendarSynchronizationService.ensureOneOnOneVisibility({
          createMissing: true
        });
      } catch (syncError) {
        console.warn("Failed to synchronize OneOnOne meetings:", syncError);
        // Continue with existing events even if sync fails
      }

      // Reload calendar events after synchronization
      let updatedEventData;
      try {
        updatedEventData = await CalendarEvent.list();
      } catch (eventLoadError) {
        console.warn("Failed to reload calendar events after sync:", eventLoadError);
        updatedEventData = eventData; // Use original data if reload fails
      }
      
      setCalendarEvents(updatedEventData);

      // Load agenda counts for calendar events
      try {
        const agendaCountsData = await AgendaIndicatorService.getAgendaCountsForCalendarEvents(updatedEventData);
        setAgendaCounts(agendaCountsData);
      } catch (agendaError) {
        console.warn("Failed to load agenda counts:", agendaError);
        setAgendaCounts({});
      }

      // Update cache with fresh data
      setDataCache({
        events: updatedEventData,
        tasks: taskData,
        teamMembers: teamMemberData,
        outOfOffice: outOfOfficeData,
        duties: dutyData,
        lastUpdated: now,
        loadedDateRanges: new Set([
          `${currentYear - 1}`,
          `${currentYear}`,
          `${currentYear + 1}`
        ])
      });

    }, {
      operationName,
      showLoading: false, // We handle loading state manually
      showSuccess: false, // Don't show success for routine data loading
      retryOptions: {
        maxRetries: 2,
        baseDelay: 1000,
        shouldRetry: (error, attempt) => {
          // Retry network errors but not validation errors
          return !(error.message?.includes('validation') || error.message?.includes('invalid'));
        }
      },
      errorOptions: {
        severity: ErrorHandlingService.SEVERITY.MEDIUM,
        showToast: false, // We handle error display in the UI
        context: { forceRefresh, targetMonth: targetMonth?.toISOString() }
      }
    }).catch(err => {
      console.error("Failed to load calendar data:", err);
      setLoadingError(err.message || "Failed to load calendar data");
      
      // Try to use cached data as fallback
      if (dataCache.events.length > 0) {
        setTasks(dataCache.tasks);
        setCalendarEvents(dataCache.events);
        setTeamMembers(dataCache.teamMembers);
        setOutOfOfficeRecords(dataCache.outOfOffice);
        setDuties(dataCache.duties);
        
        try {
          const agendaCountsData = AgendaIndicatorService.getAgendaCountsForCalendarEvents(dataCache.events);
          setAgendaCounts(agendaCountsData);
        } catch (agendaError) {
          setAgendaCounts({});
        }
      }
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const loadTasks = async () => {
    await loadCalendarData(true); // Force refresh when tasks are updated
  };

  // Method to refresh calendar data (useful for manual refresh)
  const refreshCalendarData = async () => {
    await loadCalendarData(true, currentMonth);
  };

  const handleCreateTask = async (taskData) => {
    if (!taskData) {
      setShowTaskCreation(false);
      return;
    }

    return ErrorHandlingService.wrapOperation(async () => {
      await Task.create({
        ...taskData,
        due_date: taskData.due_date || selectedDate.toISOString()
      });
      await loadTasks();
      setShowTaskCreation(false);
    }, {
      operationName: 'Create Task',
      showLoading: true,
      showSuccess: true,
      successMessage: 'Task created successfully',
      retryOptions: {
        maxRetries: 2
      },
      errorOptions: {
        severity: ErrorHandlingService.SEVERITY.MEDIUM,
        context: { taskTitle: taskData.title, dueDate: taskData.due_date }
      }
    });
  };

  const handlePreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    
    // If it's a 1:1 meeting event, show meeting detail view
    if (event.event_type === "one_on_one" && event.team_member_id) {
      setSelectedMeetingEvent(event);
      setShowMeetingDetail(true);
    }
  };

  const handleCloseMeetingDetail = () => {
    setShowMeetingDetail(false);
    setSelectedMeetingEvent(null);
  };

  const handleNavigateToProfile = (teamMemberId) => {
    navigate(`/team/${teamMemberId}`);
    setShowMeetingDetail(false);
    setSelectedMeetingEvent(null);
  };

  const handleViewModeChange = (newViewMode) => {
    setCurrentViewMode(newViewMode);
    viewModeManager.setViewMode(newViewMode);
  };

  // Update weekly meetings based on current week and calendar events
  const updateWeeklyMeetings = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday end
    
    // Filter events for the current week
    const weeklyEvents = calendarEvents.filter(event => {
      if (!event.start_date) return false;
      
      try {
        const eventStartDate = parseISO(event.start_date);
        const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
        
        // Include events that start, end, or span through the current week
        return (eventStartDate >= weekStart && eventStartDate <= weekEnd) ||
               (eventEndDate >= weekStart && eventEndDate <= weekEnd) ||
               (eventStartDate <= weekStart && eventEndDate >= weekEnd);
      } catch (dateError) {
        console.warn("Invalid date in calendar event:", event.id, dateError);
        return false;
      }
    });
    
    // Filter events based on current view mode
    const filteredWeeklyEvents = viewModeManager.filterEventsForView(weeklyEvents, currentViewMode);
    setWeeklyMeetings(filteredWeeklyEvents);
  };

  // Handle sidebar meeting click
  const handleSidebarMeetingClick = (meeting, date) => {
    // Navigate to the date and select it
    setCurrentMonth(date);
    setSelectedDate(date);
    
    // Handle the event click (same as calendar event click)
    handleEventClick(meeting);
    
    // Close sidebar on mobile after selection
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  // Handle sidebar date navigation
  const handleSidebarDateNavigate = (date) => {
    // Navigate to the date and select it
    setCurrentMonth(date);
    setSelectedDate(date);
    
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };



  // Helper function to check if an event spans multiple days
  const isMultiDayEvent = (event) => {
    if (!event.start_date || !event.end_date) return false;
    const startDate = parseISO(event.start_date);
    const endDate = parseISO(event.end_date);
    return differenceInDays(endDate, startDate) > 0;
  };

  // Helper function to get multi-day event position for a specific day
  const getMultiDayEventPosition = (event, currentDay) => {
    if (!isMultiDayEvent(event)) return 'single';
    
    const startDate = parseISO(event.start_date);
    const endDate = parseISO(event.end_date);
    
    if (isSameDay(currentDay, startDate)) return 'start';
    if (isSameDay(currentDay, endDate)) return 'end';
    if (isAfter(currentDay, startDate) && isBefore(currentDay, endDate)) return 'middle';
    
    return 'none';
  };

  // Helper function to get enhanced tooltip content
  const getEventTooltipContent = (event) => {
    const teamMember = teamMembers.find(tm => tm.id === event.team_member_id);
    const startTime = event.start_date ? format(parseISO(event.start_date), "h:mm a") : "";
    const endTime = event.end_date ? format(parseISO(event.end_date), "h:mm a") : "";
    const eventAgendaCounts = agendaCounts[event.id];
    
    // Get styling information for enhanced tooltip
    const styling = EventStylingService.getEventStyling(event);
    
    const content = {
      title: event.title,
      time: null,
      details: [],
      actions: [],
      styling: styling,
      eventType: styling.label
    };

    // Add time information for non-all-day events
    if (!event.all_day && startTime) {
      content.time = endTime && endTime !== startTime ? `${startTime} - ${endTime}` : startTime;
    }

    // Add event-specific details
    switch (event.event_type) {
      case 'one_on_one':
        if (teamMember) {
          content.details.push(`1:1 with ${teamMember.name}`);
          
          // Add agenda information to tooltip
          if (eventAgendaCounts && eventAgendaCounts.count > 0) {
            if (eventAgendaCounts.hasUnresolved) {
              content.details.push(`${eventAgendaCounts.unresolvedCount} pending agenda items`);
            } else {
              content.details.push(`${eventAgendaCounts.count} agenda items ready`);
            }
          } else {
            content.details.push('No agenda items yet');
          }
          
          content.actions.push('Click to view team member profile');
        }
        break;
      case 'out_of_office':
        if (teamMember) {
          content.details.push(`${teamMember.name} is out of office`);
          if (isMultiDayEvent(event)) {
            const days = differenceInDays(parseISO(event.end_date), parseISO(event.start_date)) + 1;
            content.details.push(`Duration: ${days} day${days > 1 ? 's' : ''}`);
          }
        }
        break;
      case 'duty':
        if (teamMember) {
          content.details.push(`Duty assignment for ${teamMember.name}`);
          if (isMultiDayEvent(event)) {
            const days = differenceInDays(parseISO(event.end_date), parseISO(event.start_date)) + 1;
            content.details.push(`Duration: ${days} day${days > 1 ? 's' : ''}`);
          }
        }
        break;
      case 'birthday':
        if (teamMember) {
          content.details.push(`Wish ${teamMember.name} a happy birthday!`);
        }
        break;
    }

    if (event.description && event.description !== event.title) {
      content.details.push(event.description);
    }

    return content;
  };

  const getAllEventsForMonth = (month) => {
    // Get all calendar events including generated ones - now supports extended date ranges
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    return calendarEvents.filter(event => {
      if (!event.start_date) return false;
      
      try {
        const eventStartDate = parseISO(event.start_date);
        const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
        
        // Include events that start, end, or span through the month
        return (eventStartDate >= monthStart && eventStartDate <= monthEnd) ||
               (eventEndDate >= monthStart && eventEndDate <= monthEnd) ||
               (eventStartDate <= monthStart && eventEndDate >= monthEnd);
      } catch (dateError) {
        console.warn("Invalid date in calendar event:", event.id, dateError);
        return false;
      }
    });
  };

  const renderHeader = () => {
    // Get all events for the current month for count calculation
    const allEvents = getAllEventsForMonth(currentMonth);
    const eventCounts = viewModeManager.getEventCounts(allEvents);

    return (
      <div className="space-y-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            {isMobile && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleSidebar}
                title={showSidebar ? "Hide weekly meetings" : "Show weekly meetings"}
              >
                {showSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth} disabled={isLoading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date())} disabled={isLoading}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={refreshCalendarData} disabled={isLoading} title="Refresh calendar data">
              <Calendar className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleManualSync} 
              disabled={isLoading || syncStatus.isRunning} 
              title={syncStatus.isRunning ? "Sync in progress..." : "Sync calendar events"}
              className={cn(
                syncStatus.lastError && "border-red-200 text-red-600",
                syncStatus.lastSync && !syncStatus.lastError && "border-green-200 text-green-600"
              )}
            >
              {syncStatus.isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : syncStatus.lastError ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            {!isMobile && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleSidebar}
                title={showSidebar ? "Hide weekly meetings" : "Show weekly meetings"}
              >
                {showSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
        
        {/* Error display */}
        {loadingError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="text-red-600 text-sm">
                <strong>Error loading calendar data:</strong> {loadingError}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshCalendarData}
                disabled={isLoading}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Sync status display */}
        {showSyncStatus && syncStatus.lastSync && (
          <div className={cn(
            "border rounded-md p-3 mb-4",
            syncStatus.lastError 
              ? "bg-red-50 border-red-200" 
              : "bg-green-50 border-green-200"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {syncStatus.lastError ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                <div className={cn(
                  "text-sm",
                  syncStatus.lastError ? "text-red-600" : "text-green-600"
                )}>
                  {syncStatus.lastError ? (
                    <>
                      <strong>Sync failed:</strong> {syncStatus.lastError}
                    </>
                  ) : (
                    <>
                      <strong>Sync completed</strong>
                      {syncStatus.syncResults?.summary?.userMessage && (
                        <>: {syncStatus.syncResults.summary.userMessage}</>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {syncStatus.lastSync && new Date(syncStatus.lastSync).toLocaleTimeString()}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSyncStatus(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* View Mode Selector */}
        <div className="flex justify-center">
          <ViewModeSelector
            currentViewMode={currentViewMode}
            onViewModeChange={handleViewModeChange}
            eventCounts={eventCounts}
            disabled={isLoading}
          />
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const dateFormat = "EEEE";
    const days = [];
    const startDate = startOfWeek(currentMonth);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="font-medium text-sm py-2 text-center">
          {format(addDays(startDate, i), dateFormat)}
        </div>
      );
    }

    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];

    let days = [];
    let day = startDate;

    // Get all events for the visible date range (including days from previous/next month)
    // Enhanced to handle all time periods without date restrictions
    const allEventsInRange = calendarEvents.filter(event => {
      if (!event.start_date) return false;
      
      try {
        const eventStartDate = parseISO(event.start_date);
        const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
        
        // Include events that start, end, or span through the visible date range
        return (eventStartDate >= startDate && eventStartDate <= endDate) ||
               (eventEndDate >= startDate && eventEndDate <= endDate) ||
               (eventStartDate <= startDate && eventEndDate >= endDate);
      } catch (dateError) {
        console.warn("Invalid date in calendar event:", event.id, dateError);
        return false;
      }
    });

    // Check if there are any events for the current view mode in the visible range
    const filteredEventsInRange = viewModeManager.filterEventsForView(allEventsInRange, currentViewMode);
    const hasAnyEventsInView = filteredEventsInRange.length > 0 || tasks.some(task => 
      task.due_date && parseISO(task.due_date) >= startDate && parseISO(task.due_date) <= endDate
    );

    // Show empty state if no events/tasks for current view mode and not loading
    if (!isLoading && !hasAnyEventsInView) {
      return (
        <CalendarViewEmptyState
          viewMode={currentViewMode}
          onCreateTask={() => setShowTaskCreation(true)}
          onAddTeamMember={() => navigate('/team')}
          onManageDuties={() => navigate('/team')}
        />
      );
    }

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const tasksForDay = tasks.filter(task => 
          task.due_date && isSameDay(parseISO(task.due_date), day)
        );
        
        // Get events for this specific day, including multi-day events
        const allEventsForDay = allEventsInRange.filter(event => {
          if (!event.start_date) return false;
          const eventStartDate = parseISO(event.start_date);
          const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
          
          // Include if event starts on this day, ends on this day, or spans through this day
          return (isSameDay(eventStartDate, day) || 
                  isSameDay(eventEndDate, day) || 
                  (isAfter(day, eventStartDate) && isBefore(day, eventEndDate)));
        });
        
        // Filter events based on current view mode
        const eventsForDay = viewModeManager.filterEventsForView(allEventsForDay, currentViewMode);

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[120px] p-2 border border-gray-200 relative",
              !isSameMonth(day, monthStart) && "text-gray-400 bg-gray-50",
              isSameDay(day, selectedDate) && "bg-blue-50",
              "hover:bg-blue-50 cursor-pointer transition-colors"
            )}
            onClick={() => handleDateClick(cloneDay)}
          >
            <div className="font-medium text-right">{formattedDate}</div>
            <div className="mt-2 space-y-1 max-h-[90px] overflow-y-auto">
              {/* Display tasks */}
              {tasksForDay.map(task => (
                <div
                  key={`task-${task.id}`}
                  className={cn(
                    "text-xs p-1 rounded truncate",
                    task.type === "meeting" && "bg-blue-100 text-blue-800",
                    task.type === "metric" && "bg-green-100 text-green-800",
                    task.type === "action" && "bg-purple-100 text-purple-800",
                    task.type === "generic" && "bg-gray-100 text-gray-800"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTaskClick(task);
                  }}
                >
                  {task.title}
                </div>
              ))}
              
              {/* Display calendar events with enhanced styling */}
              {eventsForDay.map(event => {
                const multiDayPosition = getMultiDayEventPosition(event, day);
                
                // Skip events that don't appear on this day for multi-day events
                if (multiDayPosition === 'none') return null;

                // Get enhanced styling from EventStylingService
                const styling = isMultiDayEvent(event) 
                  ? EventStylingService.getMultiDayEventStyling(event, multiDayPosition, EventStylingService.VARIANTS.DEFAULT)
                  : EventStylingService.getEventStyling(event, EventStylingService.VARIANTS.DEFAULT);
                
                const Icon = styling.icon;
                const tooltipContent = getEventTooltipContent(event);
                const eventTitle = styling.titlePrefix ? `${styling.titlePrefix}${event.title}` : event.title;
                
                // Get agenda counts for this event
                const eventAgendaCounts = agendaCounts[event.id];
                
                return (
                  <TooltipProvider key={`event-${event.id}-${day.toString()}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={styling.className}
                          style={styling.style}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          aria-label={EventStylingService.getAccessibilityInfo(event.event_type).ariaLabel}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                              <span className="truncate">{eventTitle}</span>
                            </div>
                            {/* Show agenda indicator for 1:1 meetings */}
                            {event.event_type === 'one_on_one' && eventAgendaCounts && eventAgendaCounts.count > 0 && (
                              <CalendarAgendaCount
                                count={eventAgendaCounts.unresolvedCount || eventAgendaCounts.count}
                                hasUnresolved={eventAgendaCounts.hasUnresolved}
                                className="flex-shrink-0 ml-1"
                              />
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Icon 
                              className="h-4 w-4 flex-shrink-0" 
                              style={{ color: tooltipContent.styling.colors.primary }}
                            />
                            <p className="font-medium">{tooltipContent.title}</p>
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                borderColor: tooltipContent.styling.colors.primary + '50',
                                color: tooltipContent.styling.colors.primary
                              }}
                            >
                              {tooltipContent.eventType}
                            </Badge>
                          </div>
                          {tooltipContent.time && (
                            <p className="text-xs">{tooltipContent.time}</p>
                          )}
                          {tooltipContent.details.map((detail, index) => (
                            <p key={index} className="text-xs text-gray-600">{detail}</p>
                          ))}
                          {tooltipContent.actions.map((action, index) => (
                            <p key={index} className="text-xs text-gray-500 italic">{action}</p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
            {isSameDay(day, new Date()) && (
              <Badge className="absolute top-1 left-1 bg-red-500 text-white">Today</Badge>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    return <div className="mb-4">{rows}</div>;
  };

  const itemsByDate = () => {
    const tasksForSelectedDate = tasks.filter(task => 
      task.due_date && isSameDay(parseISO(task.due_date), selectedDate)
    );
    
    // Get events for selected date, including multi-day events that span through this date
    // Enhanced to handle all time periods with better error handling
    const allEventsForSelectedDate = calendarEvents.filter(event => {
      if (!event.start_date) return false;
      
      try {
        const eventStartDate = parseISO(event.start_date);
        const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
        
        return (isSameDay(eventStartDate, selectedDate) || 
                isSameDay(eventEndDate, selectedDate) || 
                (isAfter(selectedDate, eventStartDate) && isBefore(selectedDate, eventEndDate)));
      } catch (dateError) {
        console.warn("Invalid date in calendar event:", event.id, dateError);
        return false;
      }
    });

    // Filter events based on current view mode
    const filteredEventsForSelectedDate = viewModeManager.filterEventsForView(allEventsForSelectedDate, currentViewMode);

    const hasItems = tasksForSelectedDate.length > 0 || filteredEventsForSelectedDate.length > 0;

    if (!hasItems) {
      return (
        <CalendarDateEmptyState
          viewMode={currentViewMode}
          onCreateTask={() => setShowTaskCreation(true)}
        />
      );
    }

    return (
      <div className="space-y-3">
        {/* Filtered Events Section */}
        {filteredEventsForSelectedDate.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              Events ({filteredEventsForSelectedDate.length})
            </h3>
            <div className="space-y-2">
              {filteredEventsForSelectedDate.map(event => {
                const styling = EventStylingService.getEventCardStyling(event);
                const Icon = styling.icon;
                const tooltipContent = getEventTooltipContent(event);
                const teamMember = teamMembers.find(tm => tm.id === event.team_member_id);
                const isMultiDay = isMultiDayEvent(event);
                const eventAgendaCounts = agendaCounts[event.id];
                
                return (
                  <div 
                    key={event.id}
                    className={styling.className}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: styling.colors.primary }} />
                        <h4 className="font-medium">{event.title}</h4>
                        {isMultiDay && (
                          <Badge variant="secondary" className="text-xs">
                            Multi-day
                          </Badge>
                        )}
                        {/* Show agenda indicator for 1:1 meetings */}
                        {event.event_type === 'one_on_one' && eventAgendaCounts && eventAgendaCounts.count > 0 && (
                          <CalendarAgendaIndicator
                            count={eventAgendaCounts.count}
                            unresolvedCount={eventAgendaCounts.unresolvedCount}
                            hasUnresolved={eventAgendaCounts.hasUnresolved}
                            size="sm"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {tooltipContent.time && (
                          <span className="text-xs text-gray-500">{tooltipContent.time}</span>
                        )}
                        <Badge 
                          variant="outline" 
                          style={{ 
                            borderColor: styling.colors.primary + '50',
                            color: styling.colors.primary
                          }}
                        >
                          {tooltipContent.eventType}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Event details */}
                    {tooltipContent.details.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {tooltipContent.details.map((detail, index) => (
                          <p key={index} className="text-sm text-gray-600">{detail}</p>
                        ))}
                      </div>
                    )}
                    
                    {/* Multi-day event duration indicator */}
                    {isMultiDay && (
                      <div className="mt-2 text-xs text-gray-500">
                        {format(parseISO(event.start_date), "MMM d")} - {format(parseISO(event.end_date), "MMM d")}
                      </div>
                    )}

                    {/* Context Actions for Team Member Events */}
                    {teamMember && (event.event_type === "one_on_one" || event.event_type === "meeting") && (
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <AgendaContextActions
                            teamMemberId={teamMember.id}
                            teamMemberName={teamMember.name}
                            sourceItem={{
                              title: event.title,
                              description: event.description || `${event.event_type === "one_on_one" ? "1:1 meeting" : "Meeting"} on ${format(parseISO(event.start_date), "MMM d, yyyy")}`,
                              type: event.event_type,
                              id: event.id,
                              date: event.start_date
                            }}
                            variant="outline"
                            size="sm"
                          />
                          {/* Meeting Detail Button for 1:1 meetings */}
                          {event.event_type === "one_on_one" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMeetingEvent(event);
                                setShowMeetingDetail(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Meeting Details
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Tasks Section */}
        {tasksForSelectedDate.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Tasks ({tasksForSelectedDate.length})
            </h3>
            <div className="space-y-2">
              {tasksForSelectedDate.map(task => {
                const taskStakeholders = Array.isArray(task.stakeholders) ? task.stakeholders : [];
                const relevantTeamMembers = teamMembers.filter(tm => 
                  taskStakeholders.includes(tm.name)
                );
                
                return (
                  <div 
                    key={task.id}
                    className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{task.title}</h4>
                      <Badge variant="outline">{task.type}</Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    
                    {/* Context Actions for Team Member Stakeholders */}
                    {relevantTeamMembers.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-200 space-y-2">
                        {relevantTeamMembers.map(teamMember => (
                          <div key={teamMember.id} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{teamMember.name}</span>
                            <AgendaContextActions
                              teamMemberId={teamMember.id}
                              teamMemberName={teamMember.name}
                              sourceItem={{
                                title: task.title,
                                description: task.description,
                                type: 'task',
                                id: task.id,
                                priority: task.priority,
                                status: task.status,
                                due_date: task.due_date
                              }}
                              variant="outline"
                              size="sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col xl:flex-row space-y-6 xl:space-y-0 xl:space-x-6">
          {/* Main Calendar Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Calendar</h1>
              <Button onClick={() => setShowTaskCreation(true)} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
            {isLoading ? (
              <CalendarLoadingEmptyState />
            ) : (
              <>
                {renderHeader()}
                {renderDays()}
                {renderCells()}
              </>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="xl:w-80">
            {/* Selected Date Details */}
            <div className="bg-white rounded-md border p-4 sticky top-4">
              <h2 className="font-semibold mb-4 pb-2 border-b">
                {format(selectedDate, "MMMM d, yyyy")}
              </h2>
              {itemsByDate()}
            </div>
            
            {/* Weekly Meeting Sidebar */}
            {showSidebar && (
              <div className={cn(
                "mt-6",
                isMobile && "fixed inset-0 z-50 bg-white p-4 overflow-y-auto"
              )}>
                {isMobile && (
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Weekly Meetings</h2>
                    <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <ComponentChunkErrorBoundary componentName="Weekly Meeting Sidebar" inline>
                  <Suspense fallback={<ComponentLoadingSkeleton />}>
                    <WeeklyMeetingSidebar
                      currentWeek={currentWeek}
                      meetings={weeklyMeetings}
                      onMeetingClick={handleSidebarMeetingClick}
                      onDateNavigate={handleSidebarDateNavigate}
                      agendaCounts={agendaCounts}
                      isLoading={isLoading}
                      error={loadingError}
                      onRetry={() => loadCalendarData(true)}
                      className={cn(
                        isMobile && "static"
                      )}
                    />
                  </Suspense>
                </ComponentChunkErrorBoundary>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sidebar Backdrop */}
        {isMobile && showSidebar && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        {/* Task Creation Dialog */}
        <Dialog open={showTaskCreation} onOpenChange={setShowTaskCreation}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Task for {format(selectedDate, "MMMM d, yyyy")}</DialogTitle>
            </DialogHeader>
            <ComponentChunkErrorBoundary componentName="Task Creation Form">
              <Suspense fallback={<FormLoadingSkeleton />}>
                <TaskCreationForm 
                  onCreateTask={handleCreateTask} 
                  initialTaskData={{
                    due_date: selectedDate.toISOString(),
                    status: "todo",
                    priority: "medium",
                    type: "generic"
                  }}
                />
              </Suspense>
            </ComponentChunkErrorBoundary>
          </DialogContent>
        </Dialog>

        {/* Meeting Detail Dialog */}
        <Dialog open={showMeetingDetail} onOpenChange={handleCloseMeetingDetail}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <ComponentChunkErrorBoundary componentName="Meeting Detail View">
              <Suspense fallback={<ComponentLoadingSkeleton />}>
                <MeetingDetailView
                  event={selectedMeetingEvent}
                  teamMember={selectedMeetingEvent ? teamMembers.find(tm => tm.id === selectedMeetingEvent.team_member_id) : null}
                  isOpen={showMeetingDetail}
                  onClose={handleCloseMeetingDetail}
                  onNavigateToProfile={handleNavigateToProfile}
                />
              </Suspense>
            </ComponentChunkErrorBoundary>
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
                    
                    {/* Context Actions for Team Member Stakeholders */}
                    <div className="mt-3 space-y-2">
                      {selectedTask.stakeholders.map(stakeholderName => {
                        const teamMember = teamMembers.find(tm => tm.name === stakeholderName);
                        if (!teamMember) return null;
                        
                        return (
                          <div key={teamMember.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{teamMember.name}</span>
                            <AgendaContextActions
                              teamMemberId={teamMember.id}
                              teamMemberName={teamMember.name}
                              sourceItem={{
                                title: selectedTask.title,
                                description: selectedTask.description,
                                type: 'task',
                                id: selectedTask.id,
                                priority: selectedTask.priority,
                                status: selectedTask.status,
                                due_date: selectedTask.due_date
                              }}
                              variant="outline"
                              size="sm"
                            />
                          </div>
                        );
                      })}
                    </div>
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
      </div>
    </div>
  );
}