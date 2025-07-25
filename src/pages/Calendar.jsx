import React, { useState, useEffect } from "react";
import { Task, CalendarEvent, TeamMember, OutOfOffice, Duty } from "@/api/entities";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO, differenceInDays, isAfter, isBefore } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar, User, UserX, Shield, Cake, CalendarDays, MessageSquare } from "lucide-react";
import TaskCreationForm from "../components/task/TaskCreationForm";
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
import MeetingDetailView from "@/components/calendar/MeetingDetailView";

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
  const navigate = useNavigate();

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      // Load all data in parallel
      const [taskData, eventData, teamMemberData, outOfOfficeData, dutyData] = await Promise.all([
        Task.list(),
        CalendarEvent.list(),
        TeamMember.list(),
        OutOfOffice.list(),
        Duty.list()
      ]);
      
      setTasks(taskData);
      setCalendarEvents(eventData);
      setTeamMembers(teamMemberData);
      setOutOfOfficeRecords(outOfOfficeData);
      setDuties(dutyData);

      // Generate calendar events from duties and out-of-office records if needed
      await CalendarEventGenerationService.synchronizeAllEvents({
        includeBirthdays: true,
        includeDuties: true,
        includeOutOfOffice: true,
        year: currentMonth.getFullYear()
      });

      // Reload calendar events after synchronization
      const updatedEventData = await CalendarEvent.list();
      setCalendarEvents(updatedEventData);

      // Load agenda counts for calendar events
      const agendaCountsData = await AgendaIndicatorService.getAgendaCountsForCalendarEvents(updatedEventData);
      setAgendaCounts(agendaCountsData);
    } catch (err) {
      console.error("Failed to load calendar data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    await loadCalendarData();
  };

  const handleCreateTask = async (taskData) => {
    if (!taskData) {
      setShowTaskCreation(false);
      return;
    }

    try {
      await Task.create({
        ...taskData,
        due_date: taskData.due_date || selectedDate.toISOString()
      });
      await loadTasks();
      setShowTaskCreation(false);
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
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

  // Helper function to get event styling based on type
  const getEventStyling = (event) => {
    const baseClasses = "text-xs p-1 rounded truncate cursor-pointer transition-all duration-200 border-l-2";
    
    switch (event.event_type) {
      case 'meeting':
        return {
          className: `${baseClasses} bg-blue-100 text-blue-800 border-blue-400 hover:bg-blue-200 hover:shadow-sm`,
          icon: Calendar,
          color: '#3b82f6'
        };
      case 'one_on_one':
        return {
          className: `${baseClasses} bg-orange-100 text-orange-800 border-orange-400 hover:bg-orange-200 hover:shadow-sm`,
          icon: User,
          color: '#f97316'
        };
      case 'out_of_office':
        return {
          className: `${baseClasses} bg-orange-100 text-orange-800 border-orange-400 hover:bg-orange-200 hover:shadow-sm`,
          icon: UserX,
          color: '#f97316'
        };
      case 'duty':
        return {
          className: `${baseClasses} bg-purple-100 text-purple-800 border-purple-400 hover:bg-purple-200 hover:shadow-sm`,
          icon: Shield,
          color: '#8b5cf6'
        };
      case 'birthday':
        return {
          className: `${baseClasses} bg-pink-100 text-pink-800 border-pink-400 hover:bg-pink-200 hover:shadow-sm`,
          icon: Cake,
          color: '#ec4899'
        };
      default:
        return {
          className: `${baseClasses} bg-indigo-100 text-indigo-800 border-indigo-400 hover:bg-indigo-200 hover:shadow-sm`,
          icon: Calendar,
          color: '#6366f1'
        };
    }
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
    
    const content = {
      title: event.title,
      time: null,
      details: [],
      actions: []
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
    // Get all calendar events including generated ones
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    return calendarEvents.filter(event => {
      if (!event.start_date) return false;
      const eventDate = parseISO(event.start_date);
      return eventDate >= monthStart && eventDate <= monthEnd;
    });
  };

  const renderHeader = () => {
    // Get all events for the current month for count calculation
    const allEvents = getAllEventsForMonth(currentMonth);
    const eventCounts = viewModeManager.getEventCounts(allEvents);

    return (
      <div className="space-y-4 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
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
          </div>
        </div>
        
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
    const allEventsInRange = calendarEvents.filter(event => {
      if (!event.start_date) return false;
      const eventStartDate = parseISO(event.start_date);
      const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
      
      // Include events that start, end, or span through the visible date range
      return (eventStartDate >= startDate && eventStartDate <= endDate) ||
             (eventEndDate >= startDate && eventEndDate <= endDate) ||
             (eventStartDate <= startDate && eventEndDate >= endDate);
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
                const styling = getEventStyling(event);
                const Icon = styling.icon;
                const tooltipContent = getEventTooltipContent(event);
                const multiDayPosition = getMultiDayEventPosition(event, day);
                
                // Skip events that don't appear on this day for multi-day events
                if (multiDayPosition === 'none') return null;

                // Modify styling for multi-day events
                let eventClassName = styling.className;
                let eventTitle = event.title;
                
                if (isMultiDayEvent(event)) {
                  switch (multiDayPosition) {
                    case 'start':
                      eventClassName += " rounded-r-none border-r-0";
                      eventTitle = `▶ ${event.title}`;
                      break;
                    case 'middle':
                      eventClassName += " rounded-none border-r-0 border-l-0";
                      eventTitle = `─ ${event.title}`;
                      break;
                    case 'end':
                      eventClassName += " rounded-l-none border-l-0";
                      eventTitle = `◀ ${event.title}`;
                      break;
                  }
                }
                
                // Get agenda counts for this event
                const eventAgendaCounts = agendaCounts[event.id];
                
                return (
                  <TooltipProvider key={`event-${event.id}-${day.toString()}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={eventClassName}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
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
                          <p className="font-medium">{tooltipContent.title}</p>
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
    const allEventsForSelectedDate = calendarEvents.filter(event => {
      if (!event.start_date) return false;
      const eventStartDate = parseISO(event.start_date);
      const eventEndDate = event.end_date ? parseISO(event.end_date) : eventStartDate;
      
      return (isSameDay(eventStartDate, selectedDate) || 
              isSameDay(eventEndDate, selectedDate) || 
              (isAfter(selectedDate, eventStartDate) && isBefore(selectedDate, eventEndDate)));
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
                const styling = getEventStyling(event);
                const Icon = styling.icon;
                const tooltipContent = getEventTooltipContent(event);
                const teamMember = teamMembers.find(tm => tm.id === event.team_member_id);
                const isMultiDay = isMultiDayEvent(event);
                const eventAgendaCounts = agendaCounts[event.id];
                
                return (
                  <div 
                    key={event.id}
                    className={cn(
                      "p-3 border rounded-md cursor-pointer transition-colors",
                      event.event_type === "birthday" && "border-pink-200 bg-pink-50 hover:bg-pink-100",
                      event.event_type === "one_on_one" && "border-orange-200 bg-orange-50 hover:bg-orange-100",
                      event.event_type === "meeting" && "border-blue-200 bg-blue-50 hover:bg-blue-100",
                      event.event_type === "out_of_office" && "border-orange-200 bg-orange-50 hover:bg-orange-100",
                      event.event_type === "duty" && "border-purple-200 bg-purple-50 hover:bg-purple-100",
                      (!event.event_type || event.event_type === "generic") && "border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                    )}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: styling.color }} />
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
                            borderColor: styling.color + '50',
                            color: styling.color
                          }}
                        >
                          {event.event_type === "one_on_one" ? "1:1" : 
                           event.event_type === "out_of_office" ? "OOO" :
                           event.event_type === "duty" ? "Duty" :
                           event.event_type === "birthday" ? "Birthday" :
                           event.event_type || "Event"}
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
        <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6">
          <div className="lg:flex-1">
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

          <div className="lg:w-80">
            <div className="bg-white rounded-md border p-4 sticky top-4">
              <h2 className="font-semibold mb-4 pb-2 border-b">
                {format(selectedDate, "MMMM d, yyyy")}
              </h2>
              {itemsByDate()}
            </div>
          </div>
        </div>

        {/* Task Creation Dialog */}
        <Dialog open={showTaskCreation} onOpenChange={setShowTaskCreation}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Task for {format(selectedDate, "MMMM d, yyyy")}</DialogTitle>
            </DialogHeader>
            <TaskCreationForm 
              onCreateTask={handleCreateTask} 
              initialTaskData={{
                due_date: selectedDate.toISOString(),
                status: "todo",
                priority: "medium",
                type: "generic"
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Meeting Detail Dialog */}
        <Dialog open={showMeetingDetail} onOpenChange={handleCloseMeetingDetail}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <MeetingDetailView
              event={selectedMeetingEvent}
              teamMember={selectedMeetingEvent ? teamMembers.find(tm => tm.id === selectedMeetingEvent.team_member_id) : null}
              isOpen={showMeetingDetail}
              onClose={handleCloseMeetingDetail}
              onNavigateToProfile={handleNavigateToProfile}
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