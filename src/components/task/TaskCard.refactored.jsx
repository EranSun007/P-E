import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRightCircle,
  AlertCircle,
  Edit,
  Trash2,
  Users,
  Target,
  Briefcase,
  MessageSquare
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Import our new utilities
import { safeArray, safeUpdateArray } from '@/utils/arrayUtils.js';
import { 
  getTaskStatusStyle, 
  getTaskPriorityStyle, 
  getTaskTypeStyle,
  getTaskStatusDisplay,
  getTaskPriorityDisplay,
  getTaskTypeDisplay,
  TASK_STATUS 
} from '@/utils/statusUtils.js';
import { getTagColor, getInitials } from '@/utils/colorUtils.js';
import { sanitizeInput } from '@/utils/validation.js';
import { SimpleErrorBoundary } from '@/components/ErrorBoundary.jsx';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner.jsx';

const TaskCard = React.memo(({ task, onEdit, onDelete, onStatusChange }) => {
  // Use safe defaults with object spread
  const safeTask = useMemo(() => ({
    title: "",
    description: "",
    type: "generic",
    status: "todo",
    priority: "medium",
    tags: [],
    stakeholders: [],
    strategic: false,
    ...task
  }), [task]);

  // Use safe array utilities
  const tags = useMemo(() => safeArray(safeTask.tags), [safeTask.tags]);
  const stakeholders = useMemo(() => safeArray(safeTask.stakeholders), [safeTask.stakeholders]);
  const subtasks = useMemo(() => safeArray(safeTask.subtasks), [safeTask.subtasks]);

  // State management
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Status icon mapping using utilities
  const StatusIcon = useMemo(() => {
    const iconMap = {
      [TASK_STATUS.TODO]: Circle,
      [TASK_STATUS.IN_PROGRESS]: ArrowRightCircle,
      [TASK_STATUS.BLOCKED]: AlertCircle,
      [TASK_STATUS.DONE]: CheckCircle2,
      [TASK_STATUS.BACKLOG]: Clock
    };
    return iconMap[safeTask.status] || Circle;
  }, [safeTask.status]);

  // Type icon mapping
  const TypeIcon = useMemo(() => {
    const iconMap = {
      meeting: Calendar,
      metric: Target,
      action: Briefcase,
      generic: MessageSquare
    };
    return iconMap[safeTask.type] || MessageSquare;
  }, [safeTask.type]);

  // Memoized style calculations
  const statusStyle = useMemo(() => getTaskStatusStyle(safeTask.status), [safeTask.status]);
  const priorityStyle = useMemo(() => getTaskPriorityStyle(safeTask.priority), [safeTask.priority]);
  const typeStyle = useMemo(() => getTaskTypeStyle(safeTask.type), [safeTask.type]);

  // Event handlers with useCallback for performance
  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(safeTask);
    }
  }, [onEdit, safeTask]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(safeTask.id);
    }
  }, [onDelete, safeTask.id]);

  const handleStatusChange = useCallback((newStatus) => {
    if (onStatusChange) {
      onStatusChange(safeTask.id, newStatus);
    }
  }, [onStatusChange, safeTask.id]);

  const handleSubtaskToggle = useCallback(async (subtaskIndex, done) => {
    if (!onStatusChange) return;

    const updatedSubtasks = safeUpdateArray(subtasks, subtaskIndex, {
      ...subtasks[subtaskIndex],
      done
    });

    const updatedTask = {
      ...safeTask,
      subtasks: updatedSubtasks
    };

    try {
      await onStatusChange(safeTask.id, safeTask.status, updatedTask);
    } catch (error) {
      console.error("Failed to update subtask:", error);
    }
  }, [subtasks, safeTask, onStatusChange]);

  const handleAddUpdate = useCallback(async () => {
    if (!updateText.trim()) return;

    setIsUpdating(true);
    try {
      const sanitizedText = sanitizeInput.text(updateText);
      
      const newUpdate = {
        id: Date.now().toString(),
        text: sanitizedText,
        timestamp: new Date().toISOString(),
        user: "Local User"
      };

      const updatedTask = {
        ...safeTask,
        updates: [...safeArray(safeTask.updates), newUpdate]
      };

      if (onStatusChange) {
        await onStatusChange(safeTask.id, safeTask.status, updatedTask);
      }

      setUpdateText("");
      setShowUpdateDialog(false);
    } catch (error) {
      console.error("Failed to add update:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [updateText, safeTask, onStatusChange]);

  const openUpdateDialog = useCallback(() => {
    setShowUpdateDialog(true);
  }, []);

  const closeUpdateDialog = useCallback(() => {
    setShowUpdateDialog(false);
    setUpdateText("");
  }, []);

  // Format due date with error handling
  const formattedDueDate = useMemo(() => {
    if (!safeTask.due_date) return null;
    try {
      return format(parseISO(safeTask.due_date), "MMM d, yyyy");
    } catch (error) {
      console.error("Invalid due date:", safeTask.due_date);
      return null;
    }
  }, [safeTask.due_date]);

  return (
    <SimpleErrorBoundary fallback="Error loading task card">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className={`text-base ${safeTask.status === "done" ? "line-through text-gray-500" : ""}`}>
              {sanitizeInput.text(safeTask.title)}
            </CardTitle>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openUpdateDialog}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Update
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {safeTask.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {sanitizeInput.text(safeTask.description)}
            </p>
          )}

          {/* Status and Priority Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className={statusStyle}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {getTaskStatusDisplay(safeTask.status)}
            </Badge>
            
            <Badge variant="outline" className={priorityStyle}>
              {getTaskPriorityDisplay(safeTask.priority)}
            </Badge>
            
            <Badge variant="outline" className={typeStyle}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {getTaskTypeDisplay(safeTask.type)}
            </Badge>
            
            {safeTask.strategic && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <Target className="h-3 w-3 mr-1" />
                Strategic
              </Badge>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className={`text-xs ${getTagColor(tag)}`}>
                  {sanitizeInput.text(tag)}
                </Badge>
              ))}
            </div>
          )}

          {/* Stakeholders */}
          {stakeholders.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{stakeholders.length} stakeholder{stakeholders.length > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Subtasks:</div>
              {subtasks.map((subtask, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    checked={subtask.done}
                    onCheckedChange={(checked) => handleSubtaskToggle(index, checked)}
                  />
                  <label className={`text-sm ${subtask.done ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                    {sanitizeInput.text(subtask.title)}
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Due Date */}
          {formattedDueDate && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Due: {formattedDueDate}</span>
            </div>
          )}
        </CardContent>

        {/* Quick Status Actions */}
        <CardFooter className="pt-2">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(TASK_STATUS.IN_PROGRESS)}
              disabled={safeTask.status === TASK_STATUS.IN_PROGRESS}
            >
              <ArrowRightCircle className="h-4 w-4 mr-1" />
              Start
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(TASK_STATUS.DONE)}
              disabled={safeTask.status === TASK_STATUS.DONE}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Complete
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Update</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="update-text">Update</Label>
              <Textarea
                id="update-text"
                placeholder="Describe your progress or add notes..."
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeUpdateDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddUpdate} disabled={!updateText.trim() || isUpdating}>
              {isUpdating ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Add Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SimpleErrorBoundary>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;