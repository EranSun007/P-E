import React, { useState, useEffect } from "react";
import { Task, CalendarEvent, TeamMember } from "@/api/entities";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar, User } from "lucide-react";
import TaskCreationForm from "../components/task/TaskCreationForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function CalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showTaskCreation, setShowTaskCreation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      // Load tasks and calendar events in parallel
      const [taskData, eventData, teamMemberData] = await Promise.all([
        Task.list(),
        CalendarEvent.list(),
        TeamMember.list()
      ]);
      
      setTasks(taskData);
      setCalendarEvents(eventData);
      setTeamMembers(teamMemberData);
    } catch (err) {
      console.error("Failed to load calendar data:", err);
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
    
    // If it's a 1:1 meeting event, navigate to team member profile
    if (event.event_type === "one_on_one" && event.team_member_id) {
      navigate(`/team/${event.team_member_id}`);
    }
  };

  const getBirthdayEvents = (month, teamMembers) => {
    // Returns birthday events for the current month
    const events = [];
    teamMembers.forEach(member => {
      if (member.birthday) {
        const birthdayDate = parseISO(member.birthday);
        // Show birthday for this year
        const birthdayThisYear = new Date(month.getFullYear(), birthdayDate.getMonth(), birthdayDate.getDate());
        if (birthdayThisYear.getMonth() === month.getMonth()) {
          events.push({
            id: `birthday-${member.id}`,
            title: `${member.name}'s Birthday`,
            start_date: birthdayThisYear.toISOString(),
            event_type: "birthday",
            team_member_id: member.id
          });
        }
      }
    });
    return events;
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
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

    const birthdayEvents = getBirthdayEvents(currentMonth, teamMembers);

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const tasksForDay = tasks.filter(task => 
          task.due_date && isSameDay(parseISO(task.due_date), day)
        );
        
        const eventsForDay = [
          ...calendarEvents.filter(event => event.start_date && isSameDay(parseISO(event.start_date), day)),
          ...birthdayEvents.filter(event => event.start_date && isSameDay(parseISO(event.start_date), day))
        ];

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[120px] p-2 border border-gray-200 relative",
              !isSameMonth(day, monthStart) && "text-gray-400 bg-gray-50",
              isSameDay(day, selectedDate) && "bg-blue-50",
              "hover:bg-blue-50 cursor-pointer"
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
              
              {/* Display calendar events and birthdays */}
              {eventsForDay.map(event => {
                const teamMember = teamMembers.find(tm => tm.id === event.team_member_id);
                if (event.event_type === "birthday") {
                  return (
                    <TooltipProvider key={event.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs p-1 rounded truncate cursor-pointer bg-pink-100 text-pink-800 border-l-2 border-pink-400 hover:bg-pink-200 hover:shadow-sm">
                            <div className="flex items-center gap-1">
                              🎂 <span className="truncate">{event.title}</span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs text-gray-600">Wish {teamMember?.name} a happy birthday!</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                const startTime = event.start_date ? format(parseISO(event.start_date), "h:mm a") : "";
                const endTime = event.end_date ? format(parseISO(event.end_date), "h:mm a") : "";
                
                return (
                  <TooltipProvider key={`event-${event.id}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "text-xs p-1 rounded truncate cursor-pointer transition-all duration-200",
                            event.event_type === "one_on_one" && "bg-orange-100 text-orange-800 border-l-2 border-orange-400 hover:bg-orange-200 hover:shadow-sm",
                            event.event_type === "meeting" && "bg-blue-100 text-blue-800 hover:bg-blue-200 hover:shadow-sm",
                            (!event.event_type || event.event_type === "generic") && "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 hover:shadow-sm"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {event.event_type === "one_on_one" && <User className="h-3 w-3" />}
                            {event.event_type !== "one_on_one" && <Calendar className="h-3 w-3" />}
                            <span className="truncate">{event.title}</span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{event.title}</p>
                          {startTime && (
                            <p className="text-xs">
                              {startTime}{endTime && endTime !== startTime ? ` - ${endTime}` : ""}
                            </p>
                          )}
                          {event.event_type === "one_on_one" && teamMember && (
                            <p className="text-xs text-gray-600">1:1 with {teamMember.name}</p>
                          )}
                          {event.description && (
                            <p className="text-xs text-gray-600">{event.description}</p>
                          )}
                          {event.event_type === "one_on_one" && (
                            <p className="text-xs text-gray-500 italic">Click to view team member profile</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
            {isSameDay(day, new Date()) && (
              <Badge className="absolute top-1 left-1 bg-red-500">Today</Badge>
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
    
    const eventsForSelectedDate = calendarEvents.filter(event => 
      event.start_date && isSameDay(parseISO(event.start_date), selectedDate)
    );

    const birthdayEvents = getBirthdayEvents(selectedDate, teamMembers).filter(event => isSameDay(parseISO(event.start_date), selectedDate));

    const hasItems = tasksForSelectedDate.length > 0 || eventsForSelectedDate.length > 0 || birthdayEvents.length > 0;

    if (!hasItems) {
      return (
        <div className="text-center p-6">
          <p className="text-gray-500">No tasks or events scheduled for this date</p>
          <Button 
            onClick={() => setShowTaskCreation(true)} 
            variant="outline"
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Birthday Events Section */}
        {birthdayEvents.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-pink-700 mb-2 flex items-center gap-1">
              🎂 Birthdays ({birthdayEvents.length})
            </h3>
            <div className="space-y-2">
              {birthdayEvents.map(event => {
                const teamMember = teamMembers.find(tm => tm.id === event.team_member_id);
                return (
                  <div key={event.id} className="p-3 border rounded-md border-pink-200 bg-pink-50">
                    <div className="flex items-center gap-2">
                      🎂 <h4 className="font-medium">{event.title}</h4>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Wish {teamMember?.name} a happy birthday!</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Calendar Events Section */}
        {eventsForSelectedDate.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Events ({eventsForSelectedDate.length})
            </h3>
            <div className="space-y-2">
              {eventsForSelectedDate.map(event => {
                const teamMember = teamMembers.find(tm => tm.id === event.team_member_id);
                const startTime = event.start_date ? format(parseISO(event.start_date), "h:mm a") : "";
                
                return (
                  <div 
                    key={event.id}
                    className={cn(
                      "p-3 border rounded-md cursor-pointer transition-colors",
                      event.event_type === "one_on_one" && "border-orange-200 hover:bg-orange-50",
                      event.event_type === "meeting" && "border-blue-200 hover:bg-blue-50",
                      (!event.event_type || event.event_type === "generic") && "border-indigo-200 hover:bg-indigo-50"
                    )}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {event.event_type === "one_on_one" && <User className="h-4 w-4 text-orange-600" />}
                        {event.event_type !== "one_on_one" && <Calendar className="h-4 w-4 text-blue-600" />}
                        <h4 className="font-medium">{event.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {startTime && <span className="text-xs text-gray-500">{startTime}</span>}
                        <Badge 
                          variant="outline" 
                          className={cn(
                            event.event_type === "one_on_one" && "border-orange-300 text-orange-700",
                            event.event_type === "meeting" && "border-blue-300 text-blue-700",
                            (!event.event_type || event.event_type === "generic") && "border-indigo-300 text-indigo-700"
                          )}
                        >
                          {event.event_type === "one_on_one" ? "1:1" : event.event_type || "Event"}
                        </Badge>
                      </div>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                    {event.event_type === "one_on_one" && teamMember && (
                      <p className="text-xs text-gray-500 mt-1">with {teamMember.name}</p>
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
              {tasksForSelectedDate.map(task => (
                <div 
                  key={task.id}
                  className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{task.title}</h4>
                    <Badge variant="outline">{task.type}</Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                </div>
              ))}
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
              <Button onClick={() => setShowTaskCreation(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
            {renderHeader()}
            {renderDays()}
            {renderCells()}
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
      </div>
    </div>
  );
}
