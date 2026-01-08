
import React, { useState, useEffect, useContext } from "react";
import { Task } from "@/api/entities";
import { AppContext } from "@/contexts/AppContext.jsx";
import { logger } from "@/utils/logger";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import TaskCreationForm from "../components/task/TaskCreationForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { tasks: ctxTasks, teamMembers: ctxMembers, refreshAll } = useContext(AppContext);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskCreation, setShowTaskCreation] = useState(false);

  useEffect(() => {
    setTasks(Array.isArray(ctxTasks) ? ctxTasks : []);
  }, [ctxTasks]);

  useEffect(() => {
    setTeamMembers(Array.isArray(ctxMembers) ? ctxMembers : []);
  }, [ctxMembers]);

  const loadTasks = async () => {
    try {
      await refreshAll();
    } catch (err) {
      logger.error("Failed to refresh tasks (calendar)", { error: String(err) });
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
        due_date: taskData.due_date || selectedDate.toISOString()
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

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
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

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const tasksForDay = tasks.filter(task => 
          task.due_date && isSameDay(parseISO(task.due_date), day)
        );

        const leavesForDay = teamMembers.filter(member => {
          if (!member?.leave_from || !member?.leave_to) return false;
          try {
            const start = startOfDay(parseISO(member.leave_from));
            const end = endOfDay(parseISO(member.leave_to));
            return isWithinInterval(day, { start, end });
          } catch (_) {
            return false;
          }
        });

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
              {tasksForDay.map(task => (
                <div
                  key={task.id}
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
              {leavesForDay.length > 0 && (
                <div className="pt-1 space-y-1">
                  {leavesForDay.slice(0, 2).map(m => (
                    <div key={m.id} className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-800 truncate">
                      {(m.leave_title || 'Leave')}: {m.name}
                    </div>
                  ))}
                  {leavesForDay.length > 2 && (
                    <div className="text-[10px] px-1 py-0.5 rounded bg-red-50 text-red-700">+{leavesForDay.length - 2} more</div>
                  )}
                </div>
              )}
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

  const tasksByDate = () => {
    const tasksForSelectedDate = tasks.filter(task => 
      task.due_date && isSameDay(parseISO(task.due_date), selectedDate)
    );
    const leavesForSelectedDate = teamMembers.filter(member => {
      if (!member?.leave_from || !member?.leave_to) return false;
      try {
        const start = startOfDay(parseISO(member.leave_from));
        const end = endOfDay(parseISO(member.leave_to));
        return isWithinInterval(selectedDate, { start, end });
      } catch (_) {
        return false;
      }
    });

    if (tasksForSelectedDate.length === 0 && leavesForSelectedDate.length === 0) {
      return (
        <div className="text-center p-6">
          <p className="text-gray-500">No tasks scheduled for this date</p>
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
      <div className="space-y-2">
        {leavesForSelectedDate.length > 0 && (
          <div className="p-3 border rounded-md bg-red-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-red-800 text-sm">Team Leave</h3>
              <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">{leavesForSelectedDate.length}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {leavesForSelectedDate.map(m => (
                <Badge key={m.id} variant="outline" className="text-xs border-red-200 text-red-800">{(m.leave_title || 'Leave')}: {m.name}</Badge>
              ))}
            </div>
          </div>
        )}
        {tasksForSelectedDate.map(task => (
          <div 
            key={task.id}
            className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
            onClick={() => handleTaskClick(task)}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{task.title}</h3>
              <Badge variant="outline">{task.type}</Badge>
            </div>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
          </div>
        ))}
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
              {tasksByDate()}
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
