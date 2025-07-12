
import React, { useState, useEffect } from "react";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Check, Calendar as CalendarIcon, Loader2, Plus, X } from "lucide-react";
import MeetingMetadataForm from "./metadata/MeetingMetadataForm";
import MetricMetadataForm from "./metadata/MetricMetadataForm";
import ActionMetadataForm from "./metadata/ActionMetadataForm";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/api/entities";
import { Stakeholder } from "@/api/entities";
import TagInput from "../ui/tag-input";
import { Label } from "@/components/ui/label";

export default function TaskCreationForm({ onCreateTask, initialTaskData = null }) {
  const [taskInput, setTaskInput] = useState("");
  const [processingInput, setProcessingInput] = useState(false);
  const [showManualForm, setShowManualForm] = useState(!!initialTaskData);
  
  // Create a safe default task data object with all required properties
  const defaultTaskData = {
    title: "",
    description: "",
    type: "generic",
    status: "todo",
    priority: "medium",
    project: "",
    due_date: "",
    stakeholders: [],
    tags: [],
    strategic: false,
    reminders: [],
    subtasks: [],
    metadata: {
      meeting: {
        participants: [],
        agenda: [],
        location: ""
      },
      metric: {
        kpi_name: "",
        current_value: "",
        target_value: "",
        measurement_frequency: ""
      },
      action: {
        outcome: "",
        dependencies: []
      }
    }
  };
  
  // Create a safe initial state by merging with defaults and ensuring arrays
  let safeInitialData = { ...defaultTaskData };
  
  if (initialTaskData) {
    // Merge top level properties
    safeInitialData = { ...safeInitialData, ...initialTaskData };
    
    // Ensure arrays are arrays
    safeInitialData.stakeholders = Array.isArray(initialTaskData.stakeholders) 
      ? [...initialTaskData.stakeholders] 
      : [];
    
    safeInitialData.tags = Array.isArray(initialTaskData.tags) 
      ? [...initialTaskData.tags] 
      : [];
    
    safeInitialData.reminders = Array.isArray(initialTaskData.reminders) 
      ? [...initialTaskData.reminders] 
      : [];
    
    safeInitialData.subtasks = Array.isArray(initialTaskData.subtasks)
        ? [...initialTaskData.subtasks]
        : [];
    
    // Handle nested metadata object
    safeInitialData.metadata = {
      ...defaultTaskData.metadata,
      ...(initialTaskData.metadata || {})
    };
    
    // Ensure nested arrays in metadata are arrays
    if (initialTaskData.metadata?.meeting) {
      safeInitialData.metadata.meeting = {
        ...defaultTaskData.metadata.meeting,
        ...initialTaskData.metadata.meeting,
        participants: Array.isArray(initialTaskData.metadata.meeting.participants)
          ? [...initialTaskData.metadata.meeting.participants]
          : [],
        agenda: Array.isArray(initialTaskData.metadata.meeting.agenda)
          ? [...initialTaskData.metadata.meeting.agenda]
          : []
      };
    }
    
    if (initialTaskData.metadata?.action?.dependencies) {
      safeInitialData.metadata.action.dependencies = 
        Array.isArray(initialTaskData.metadata.action.dependencies)
          ? [...initialTaskData.metadata.action.dependencies]
          : [];
    }
  }
  
  const [taskData, setTaskData] = useState(safeInitialData);
  const [projects, setProjects] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);

  const [newSubtask, setNewSubtask] = useState("");

  useEffect(() => {
    // Load projects for dropdown
    const loadProjects = async () => {
      try {
        const projectData = await Project.list();
        setProjects(projectData || []);
      } catch (error) {
        console.error("Error loading projects:", error);
        setProjects([]);
      }
    };
    
    // Load stakeholders for dropdown
    const loadStakeholders = async () => {
      try {
        const stakeholderData = await Stakeholder.list();
        setStakeholders(stakeholderData || []);
      } catch (error) {
        console.error("Error loading stakeholders:", error);
        setStakeholders([]);
      }
    };
    
    loadProjects();
    loadStakeholders();
  }, []);

  const processNaturalLanguage = async () => {
    if (!taskInput.trim()) return;
    
    setProcessingInput(true);
    
    try {
      const result = await InvokeLLM({
        prompt: `Extract structured task information from this natural language input: "${taskInput}". 
        Identify task title, description, type (meeting, metric, action, or generic), 
        priority (low, medium, high, urgent), due date (in ISO format), 
        stakeholders (as array of names), tags (as array), and whether it's strategic (true/false).
        For meetings, extract participants and agenda items if mentioned.
        For metrics, extract KPI name, current value, target value if mentioned.
        For actions, extract expected outcome if mentioned.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["meeting", "metric", "action", "generic"] },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            due_date: { type: "string" },
            stakeholders: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
            strategic: { type: "boolean" },
            metadata: {
              type: "object",
              properties: {
                meeting: {
                  type: "object",
                  properties: {
                    participants: { type: "array", items: { type: "string" } },
                    agenda: { type: "array", items: { type: "string" } },
                    location: { type: "string" }
                  }
                },
                metric: {
                  type: "object",
                  properties: {
                    kpi_name: { type: "string" },
                    current_value: { type: "string" },
                    target_value: { type: "string" }
                  }
                },
                action: {
                  type: "object",
                  properties: {
                    outcome: { type: "string" },
                    dependencies: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          }
        }
      });
      
      // Ensure all arrays are properly initialized
      const safeResult = {
        ...result,
        stakeholders: Array.isArray(result.stakeholders) ? result.stakeholders : [],
        tags: Array.isArray(result.tags) ? result.tags : [],
        metadata: {
          ...(result.metadata || {}),
          meeting: {
            ...(result.metadata?.meeting || {}),
            participants: Array.isArray(result.metadata?.meeting?.participants) 
              ? result.metadata.meeting.participants 
              : [],
            agenda: Array.isArray(result.metadata?.meeting?.agenda)
              ? result.metadata.meeting.agenda
              : []
          }
        }
      };
      
      // Prepare task data from AI response, ensuring all arrays are defined
      const extractedData = {
        ...defaultTaskData,
        ...safeResult
      };
      
      setTaskData(extractedData);
      setShowManualForm(true);
    } catch (error) {
      console.error("Error processing natural language input:", error);
      // Fall back to manual input
      setTaskData({
        ...defaultTaskData,
        title: taskInput
      });
      setShowManualForm(true);
    } finally {
      setProcessingInput(false);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      processNaturalLanguage();
    }
  };

  const updateTaskField = (field, value) => {
    if (field === 'tags' || field === 'stakeholders' || field === 'reminders') {
      // Ensure value is an array for array fields
      const safeValue = Array.isArray(value) ? value : [];
      setTaskData(prev => ({ ...prev, [field]: safeValue }));
    } else {
      setTaskData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateTask(taskData);
    
    // Reset form data
    setTaskInput("");
    setTaskData({
      title: "",
      description: "",
      type: "generic",
      status: "todo",
      priority: "medium",
      project: "",
      due_date: "",
      stakeholders: [],
      tags: [],
      strategic: false,
      reminders: [],
      subtasks: [],
      metadata: {
        meeting: {
          participants: [],
          agenda: [],
          location: ""
        },
        metric: {
          kpi_name: "",
          current_value: "",
          target_value: "",
          measurement_frequency: ""
        },
        action: {
          outcome: "",
          dependencies: []
        }
      }
    });
    setShowManualForm(false);
  };

  const renderMetadataForm = () => {
    const metadata = taskData.metadata || {};
    
    switch (taskData.type) {
      case "meeting":
        return (
          <MeetingMetadataForm
            metadata={metadata.meeting || {
              participants: [],
              agenda: [],
              location: ""
            }}
            onChange={(meetingData) => 
              setTaskData(prev => ({
                ...prev,
                metadata: { ...prev.metadata, meeting: meetingData }
              }))
            }
          />
        );
      case "metric":
        return (
          <MetricMetadataForm
            metadata={metadata.metric || {}}
            onChange={(metricData) => 
              setTaskData(prev => ({
                ...prev,
                metadata: { ...prev.metadata, metric: metricData }
              }))
            }
          />
        );
      case "action":
        return (
          <ActionMetadataForm
            metadata={metadata.action || {}}
            onChange={(actionData) => 
              setTaskData(prev => ({
                ...prev,
                metadata: { ...prev.metadata, action: actionData }
              }))
            }
          />
        );
      default:
        return null;
    }
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    
    setTaskData(prev => ({
      ...prev,
      subtasks: [
        ...(Array.isArray(prev.subtasks) ? prev.subtasks : []),
        { title: newSubtask.trim(), done: false }
      ]
    }));
    
    setNewSubtask("");
  };

  const removeSubtask = (index) => {
    setTaskData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index)
    }));
  };

  const renderSubtasksSection = () => (
    <div className="space-y-2">
      <Label>Subtasks</Label>
      <div className="flex gap-2">
        <Input
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          placeholder="Add a subtask"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSubtask();
            }
          }}
        />
        <Button type="button" onClick={addSubtask}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2 mt-2">
        {Array.isArray(taskData.subtasks) && taskData.subtasks.map((subtask, index) => (
          <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
            <span className="flex-1 text-sm">{subtask.title}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeSubtask(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {!showManualForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Textarea
                  placeholder="Enter task naturally: 'Schedule quarterly review meeting with design team next Tuesday at 2pm'"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  className="h-24"
                  disabled={processingInput}
                />
              </div>
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setShowManualForm(true)}
                >
                  Enter Details Manually
                </Button>
                <Button
                  onClick={processNaturalLanguage}
                  disabled={!taskInput.trim() || processingInput}
                  className="relative"
                >
                  {processingInput ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Create Task"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{initialTaskData ? "Edit Task" : "Task Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input
                    value={taskData.title}
                    onChange={(e) => updateTaskField("title", e.target.value)}
                    placeholder="Task title"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea
                    value={taskData.description || ""}
                    onChange={(e) => updateTaskField("description", e.target.value)}
                    placeholder="Task description"
                    className="h-20"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Task Type</label>
                    <Select
                      value={taskData.type}
                      onValueChange={(value) => updateTaskField("type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="generic">Generic</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="metric">Metric</SelectItem>
                        <SelectItem value="action">Action</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <Select
                      value={taskData.priority}
                      onValueChange={(value) => updateTaskField("priority", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Project</label>
                  <Select
                    value={taskData.project || ""}
                    onValueChange={(value) => updateTaskField("project", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No Project</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.name}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date & Time</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {taskData.due_date ? (
                            format(new Date(taskData.due_date), "PPP p")
                          ) : (
                            <span>Pick a date & time</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={taskData.due_date ? new Date(taskData.due_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const datetime = new Date(date);
                              // Set time to current time
                              const now = new Date();
                              datetime.setHours(now.getHours());
                              datetime.setMinutes(now.getMinutes());
                              updateTaskField("due_date", datetime.toISOString());
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Strategic</label>
                    <Button
                      type="button"
                      variant={taskData.strategic ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => updateTaskField("strategic", !taskData.strategic)}
                    >
                      {taskData.strategic && <Check className="mr-2 h-4 w-4" />}
                      {taskData.strategic ? "Strategic Task" : "Tactical Task"}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Tags</label>
                  <TagInput
                    value={Array.isArray(taskData.tags) ? taskData.tags : []}
                    onChange={(tags) => updateTaskField("tags", tags)}
                    placeholder="Add tags to categorize your task"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Stakeholders</label>
                  <Select 
                    value={(taskData.stakeholders || [])[0] || ""}
                    onValueChange={(value) => {
                      const stakeholderArray = value ? [value] : [];
                      updateTaskField("stakeholders", stakeholderArray);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a stakeholder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      {stakeholders.map(stakeholder => (
                        <SelectItem key={stakeholder.id} value={stakeholder.name}>
                          {stakeholder.name} {stakeholder.role && `(${stakeholder.role})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {renderSubtasksSection()}
              
              {/* Type-specific metadata form */}
              {renderMetadataForm()}
              
              <CardFooter className="px-0 pt-4">
                <div className="flex justify-end gap-2 w-full">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      if (initialTaskData) {
                        // If editing, just close the form
                        onCreateTask(null);
                      } else {
                        // If creating new, go back to natural language input
                        setShowManualForm(false);
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {initialTaskData ? "Update Task" : "Create Task"}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
