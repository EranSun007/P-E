
import React, { useState } from "react";
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
import AgendaContextActions from "@/components/agenda/AgendaContextActions";
import { TeamMember } from "@/api/entities";

export default function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  // Ensure all task properties have safe defaults
  const safeTask = {
    title: "",
    description: "",
    type: "generic",
    status: "todo",
    priority: "medium",
    tags: [],
    stakeholders: [],
    strategic: false,
    ...task
  };

  // Ensure arrays are properly initialized
  const tags = Array.isArray(safeTask.tags) ? safeTask.tags : [];
  const stakeholders = Array.isArray(safeTask.stakeholders) ? safeTask.stakeholders : [];
  
  // State for team members (for context actions)
  const [teamMembers, setTeamMembers] = React.useState([]);
  
  // Load team members for context actions
  React.useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const members = await TeamMember.list();
        setTeamMembers(members);
      } catch (error) {
        console.error("Failed to load team members:", error);
      }
    };
    loadTeamMembers();
  }, []);
  
  const getStatusIcon = () => {
    switch (safeTask.status) {
      case "done":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <ArrowRightCircle className="h-5 w-5 text-blue-500" />;
      case "blocked":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "backlog":
        return <Clock className="h-5 w-5 text-gray-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTypeColor = () => {
    switch (safeTask.type) {
      case "meeting":
        return "bg-blue-100 text-blue-800";
      case "metric":
        return "bg-green-100 text-green-800";
      case "action":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = () => {
    switch (safeTask.priority) {
      case "low":
        return "bg-blue-100 text-blue-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "urgent":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSubtaskToggle = async (subtaskIndex, done) => {
    const updatedTask = { ...task };
    updatedTask.subtasks = [...(task.subtasks || [])];
    updatedTask.subtasks[subtaskIndex] = {
      ...updatedTask.subtasks[subtaskIndex],
      done
    };
    
    // try {
    //   await Task.update(task.id, updatedTask);
      // The parent component will refresh the tasks list
      if (onStatusChange) onStatusChange(updatedTask, task.status);
    // } catch (error) {
    //   console.error("Failed to update subtask:", error);
    // }
  };

  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateText, setUpdateText] = useState("");

  const addUpdate = async () => {
    if (!updateText.trim()) return;

    const updatedTask = {
      ...task,
      updates: [
        ...(task.updates || []),
        {
          text: updateText.trim(),
          date: new Date().toISOString()
        }
      ]
    };

    // try {
    //   await Task.update(task.id, updatedTask);
      setShowUpdateDialog(false);
      setUpdateText("");
      if (onStatusChange) {
        onStatusChange(updatedTask, task.status); // Trigger refresh
      }
    // } catch (error) {
    //   console.error("Failed to add update:", error);
    // }
  };

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-2">
              <div className="mt-0.5" onClick={() => onStatusChange?.(safeTask, safeTask.status === "done" ? "todo" : "done")}>
                {getStatusIcon()}
              </div>
              <div>
                <CardTitle className={`text-base ${safeTask.status === "done" ? "line-through text-gray-500" : ""}`}>
                  {safeTask.title}
                </CardTitle>
                {safeTask.project && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {safeTask.project}
                  </div>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(safeTask)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => onStatusChange?.(safeTask, "todo")}>
                  <Circle className="mr-2 h-4 w-4" />
                  Mark as Todo
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => onStatusChange?.(safeTask, "in_progress")}>
                  <ArrowRightCircle className="mr-2 h-4 w-4" />
                  Mark as In Progress
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => onStatusChange?.(safeTask, "done")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Done
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => onDelete?.(safeTask)} 
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent>
          {safeTask.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{safeTask.description}</p>
          )}
          
          {Array.isArray(safeTask.subtasks) && safeTask.subtasks.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="text-sm font-medium text-gray-700">Subtasks</div>
              <div className="space-y-2">
                {safeTask.subtasks.map((subtask, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Checkbox
                      checked={subtask.done}
                      onCheckedChange={(checked) => handleSubtaskToggle(index, checked)}
                      id={`subtask-${task.id}-${index}`}
                    />
                    <label
                      htmlFor={`subtask-${task.id}-${index}`}
                      className={`text-sm ${subtask.done ? 'line-through text-gray-500' : 'text-gray-700'}`}
                    >
                      {subtask.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge className={getTypeColor()}>
              {safeTask.type}
            </Badge>
            
            <Badge className={getPriorityColor()}>
              {safeTask.priority}
            </Badge>
            
            {safeTask.strategic && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Strategic
              </Badge>
            )}
          </div>
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {safeTask.due_date && (
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Due {format(new Date(safeTask.due_date), "PPp")}</span>
            </div>
          )}
          
          {stakeholders.length > 0 && (
            <div className="flex items-center text-sm text-gray-500">
              <Users className="h-4 w-4 mr-1" />
              <span>Stakeholders: {stakeholders.join(", ")}</span>
            </div>
          )}

          {/* Context Actions for Team Members */}
          {stakeholders.length > 0 && teamMembers.length > 0 && (
            <div className="mt-3 space-y-2">
              {stakeholders.map(stakeholderName => {
                const teamMember = teamMembers.find(tm => tm.name === stakeholderName);
                if (!teamMember) return null;
                
                return (
                  <div key={teamMember.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{teamMember.name}</span>
                    <AgendaContextActions
                      teamMemberId={teamMember.id}
                      teamMemberName={teamMember.name}
                      sourceItem={{
                        title: safeTask.title,
                        description: safeTask.description,
                        type: 'task',
                        id: safeTask.id,
                        priority: safeTask.priority,
                        status: safeTask.status
                      }}
                      variant="outline"
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          )}
        
        {/* Add Updates Section */}
        {Array.isArray(task.updates) && task.updates.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-sm font-medium text-gray-700">Updates</div>
            {task.updates.slice(0, 2).map((update, index) => (
              <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <p>{update.text}</p>
                <span className="text-xs text-gray-500">
                  {format(parseISO(update.date), "MMM d, yyyy")}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setShowUpdateDialog(true)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Add Update
        </Button>
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Progress Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Update Details</Label>
              <Textarea
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Share progress, blockers, or achievements..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addUpdate}>
              Add Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
