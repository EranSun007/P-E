
import React, { useState, useEffect, useContext } from "react";
import { Task } from "@/api/entities";
import { Plus, CheckSquare, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";

import TaskCreationForm from "../components/task/TaskCreationForm";
import TaskList from "../components/task/TaskList";
import TaskFilterBar from "../components/task/TaskFilterBar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/utils/logger";
import { AppContext } from "@/contexts/AppContext.jsx";

export default function TasksPage() {
  const { tasks, loading, refreshAll } = useContext(AppContext);
  const [localTasks, setLocalTasks] = useState([]);
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    type: [],
    search: "",
    tags: [],
    strategic: null,
    groupBy: "none"
  });
  
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    setLocalTasks(Array.isArray(tasks) ? tasks : []);
  }, [tasks]);

  // Recompute available tags whenever local tasks change
  useEffect(() => {
    const allTags = new Set();
    (Array.isArray(localTasks) ? localTasks : []).forEach(task => {
      if (Array.isArray(task?.tags)) {
        task.tags.forEach(tag => allTags.add(tag));
      }
    });
    setAvailableTags(Array.from(allTags));
  }, [localTasks]);

  const loadTasks = async () => {
    setError(null);
    try {
      await refreshAll();
      const taskData = Array.isArray(tasks) ? tasks : [];
      const allTags = new Set();
      taskData.forEach(task => {
        if (Array.isArray(task.tags)) {
          task.tags.forEach(tag => allTags.add(tag));
        }
      });
      setAvailableTags(Array.from(allTags));
    } catch (err) {
      logger.error("Failed to refresh tasks", { error: String(err) });
      setError("Failed to load tasks. Please try again.");
    }
  };

  const handleCreateTask = async (taskData) => {
    if (!taskData) {
      setShowCreationForm(false);
      setEditingTask(null);
      return;
    }
    
    try {
      if (editingTask) {
        await Task.update(editingTask.id, taskData);
      } else {
        await Task.create(taskData);
      }
      await loadTasks();
      setShowCreationForm(false);
      setEditingTask(null);
    } catch (err) {
      logger.error("Failed to save task", { error: String(err) });
      setError("Failed to save task. Please try again.");
    }
  };

  const handleDeleteTask = async (task) => {
    try {
      await Task.delete(task.id);
      await loadTasks();
    } catch (err) {
      logger.error("Failed to delete task", { error: String(err) });
      setError("Failed to delete task. Please try again.");
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowCreationForm(true);
  };
  
  const handleStatusChange = async (task, newStatus) => {
    try {
      await Task.update(task.id, { ...task, status: newStatus });
      await loadTasks();
    } catch (err) {
      logger.error("Failed to update task status", { error: String(err) });
      setError("Failed to update task status. Please try again.");
    }
  };

  const filterTasks = (tasks) => {
    // Ensure tasks is an array
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    
    // Ensure all filter arrays are arrays
    const safeFilters = {
      ...filters,
      status: Array.isArray(filters.status) ? filters.status : [],
      priority: Array.isArray(filters.priority) ? filters.priority : [],
      type: Array.isArray(filters.type) ? filters.type : [],
      tags: Array.isArray(filters.tags) ? filters.tags : [],
    };
    
    return safeTasks.filter(task => {
      // Status filter
      if (safeFilters.status.length > 0 && !safeFilters.status.includes(task.status)) {
        return false;
      }
      
      // Type filter
      if (safeFilters.type.length > 0 && !safeFilters.type.includes(task.type)) {
        return false;
      }
      
      // Priority filter
      if (safeFilters.priority.length > 0 && !safeFilters.priority.includes(task.priority)) {
        return false;
      }
      
      // Tags filter
      if (safeFilters.tags.length > 0) {
        const taskTags = Array.isArray(task.tags) ? task.tags : [];
        if (!safeFilters.tags.some(tag => taskTags.includes(tag))) {
          return false;
        }
      }
      
      // Strategic/Tactical filter
      if (safeFilters.strategic !== null && task.strategic !== safeFilters.strategic) {
        return false;
      }
      
      // Search filter
      if (safeFilters.search) {
        const searchTerm = safeFilters.search.toLowerCase();
        const titleMatch = (task.title || "").toLowerCase().includes(searchTerm);
        const descriptionMatch = (task.description || "").toLowerCase().includes(searchTerm);
        if (!titleMatch && !descriptionMatch) {
          return false;
        }
      }
      
      return true;
    });
  };

  const filteredTasks = filterTasks(localTasks);
  const activeTasks = filteredTasks.filter(task => task?.status !== "done");
  const completedTasks = filteredTasks.filter(task => task?.status === "done");

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-3xl font-bold">Tasks</h1>
          
          {!showCreationForm && (
            <Button 
              onClick={() => setShowCreationForm(true)}
              className="mt-4 sm:mt-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          {showCreationForm ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <TaskCreationForm 
                onCreateTask={handleCreateTask}
                initialTaskData={editingTask}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TaskFilterBar 
                filters={filters}
                setFilters={setFilters}
                availableTags={availableTags}
              />
              
              {loading ? (
                <div className="text-center p-12">
                  <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading tasks...</p>
                </div>
              ) : (
                <>
                  {filteredTasks.length === 0 ? (
                    <div className="text-center p-12 border border-dashed rounded-lg">
                      <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                      <p className="text-gray-500">
                        {tasks.length === 0
                          ? "Create your first task to get started"
                          : "Try adjusting your filters to see more tasks"}
                      </p>
                      {tasks.length > 0 && (
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setFilters({
                            status: [],
                            priority: [],
                            type: [],
                            search: "",
                            tags: [],
                            strategic: null,
                            groupBy: "none"
                          })}
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Active Tasks */}
                      <div>
                        <TaskList
                          tasks={activeTasks}
                          onEditTask={handleEditTask}
                          onDeleteTask={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                          groupBy={filters.groupBy === "none" ? null : filters.groupBy}
                        />
                      </div>

                      {/* Completed Tasks */}
                      {completedTasks.length > 0 && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-600">
                            <CheckSquare className="h-5 w-5" />
                            Completed Tasks ({completedTasks.length})
                          </h2>
                          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Task</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Completed Date</TableHead>
                                  <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {completedTasks.map(task => (
                                  <TableRow key={task.id}>
                                    <TableCell>
                                      <div>
                                        <span className="font-medium">{task.title}</span>
                                        {task.project && (
                                          <span className="ml-2 text-sm text-gray-500">
                                            in {task.project}
                                          </span>
                                        )}
                                      </div>
                                      {task.tags?.length > 0 && (
                                        <div className="flex gap-1 mt-1">
                                          {task.tags.map(tag => (
                                            <Badge 
                                              key={tag} 
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {task.type}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {format(new Date(task.updated_date), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleStatusChange(task, "todo")}
                                          title="Mark as Todo"
                                        >
                                          <RotateCcw className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteTask(task)}
                                          className="text-red-500"
                                          title="Delete"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
