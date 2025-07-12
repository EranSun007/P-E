
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import TaskCard from "./TaskCard";
import { safeArray } from "@/components/utils/SafeArray";

export default function TaskList({ 
  tasks = [], 
  onEditTask, 
  onDeleteTask,
  onStatusChange,
  groupBy = null
}) {
  // Use safeArray utility
  const safeTasks = safeArray(tasks);

  if (safeTasks.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg bg-gray-50">
        <p className="text-gray-500">No active tasks found</p>
      </div>
    );
  }

  if (groupBy) {
    const groupedTasks = {};
    safeTasks.forEach(task => {
      const key = getGroupKey(task, groupBy);
      if (!groupedTasks[key]) groupedTasks[key] = [];
      groupedTasks[key].push(task);
    });
    
    return (
      <div className="space-y-6">
        {Object.entries(groupedTasks).map(([group, groupTasks]) => (
          <div key={group} className="border rounded-lg p-4 bg-white">
            <h3 className="font-medium mb-4 text-lg border-b pb-2">{group}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {safeArray(groupTasks).map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <TaskCard 
                      task={task} 
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onStatusChange={onStatusChange}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence>
        {safeTasks.map(task => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <TaskCard 
              task={task} 
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onStatusChange={onStatusChange}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getGroupKey(task, groupBy) {
  if (!task) return "Other";
  
  switch (groupBy) {
    case "strategic":
      return task.strategic ? "Strategic" : "Tactical";
    case "type":
      return task.type?.charAt(0).toUpperCase() + task.type?.slice(1) || "Other";
    case "priority":
      return task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1) || "Other";
    default:
      return task[groupBy] || "Other";
  }
}
