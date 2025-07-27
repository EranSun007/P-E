import React, { useState, useEffect } from "react";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Check, Calendar as CalendarIcon, Loader2, Plus, X, Target, Lightbulb } from "lucide-react";
import MeetingMetadataForm from "./metadata/MeetingMetadataForm";
import MetricMetadataForm from "./metadata/MetricMetadataForm";
import ActionMetadataForm from "./metadata/ActionMetadataForm";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/api/entities";
import { Stakeholder, TeamMember, Peer } from "@/api/entities";
import EmployeeGoalsService from "@/services/employeeGoalsService.js";
import TagInput from "../ui/tag-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
    assignee: "",
    estimated_hours: "",
    actual_hours: "",
    stakeholders: [],
    tags: [],
    strategic: false,
    reminders: [],
    subtasks: [],
    relatedGoals: [], // New field for goal associations
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
    
    safeInitialData.relatedGoals = Array.isArray(initialTaskData.relatedGoals)
        ? [...initialTaskData.relatedGoals]
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
  const [teamMembers, setTeamMembers] = useState([]);
  const [peers, setPeers] = useState([]);
  const [assigneeType, setAssigneeType] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const [newSubtask, setNewSubtask] = useState("");
  
  // Goals integration state
  const [relatedGoals, setRelatedGoals] = useState(safeInitialData.relatedGoals || []);
  const [showGoalSuggestions, setShowGoalSuggestions] = useState(false);
  const [goalSuggestions, setGoalSuggestions] = useState([]);
  const [loadingGoalSuggestions, setLoadingGoalSuggestions] = useState(false);

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
    
    // Fetch team members and peers for assignee
    const fetchEntities = async () => {
      try {
        const [teamMemberData, peerData] = await Promise.all([
          TeamMember.list(),
          Peer.list()
        ]);
        setTeamMembers(teamMemberData || []);
        setPeers(peerData || []);
      } catch (err) {
        setTeamMembers([]);
        setPeers([]);
      }
    };
    
    loadProjects();
    loadStakeholders();
    fetchEntities();
  }, []);

  useEffect(() => {
    if (initialTaskData && initialTaskData.assignee && typeof initialTaskData.assignee === "object") {
      setAssigneeType(initialTaskData.assignee.type);
      setAssigneeId(initialTaskData.assignee.id);
    } else {
      setAssigneeType("");
      setAssigneeId("");
    }
  }, [initialTaskData]);

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

  // Goals integration functions
  const loadGoalSuggestions = async () => {
    if (!taskData.title && !taskData.description) return;
    
    setLoadingGoalSuggestions(true);
    try {
      const searchTerm = taskData.title + ' ' + taskData.description;
      const suggestions = await EmployeeGoalsService.findRelatedGoals(searchTerm);
      setGoalSuggestions(suggestions);
      setShowGoalSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error loading goal suggestions:', error);
    } finally {
      setLoadingGoalSuggestions(false);
    }
  };

  const addRelatedGoal = (goal) => {
    if (!relatedGoals.find(g => g.id === goal.id)) {
      const newRelatedGoals = [...relatedGoals, goal];
      setRelatedGoals(newRelatedGoals);
      updateTaskField('relatedGoals', newRelatedGoals);
    }
    setShowGoalSuggestions(false);
  };

  const removeRelatedGoal = (goalId) => {
    const newRelatedGoals = relatedGoals.filter(g => g.id !== goalId);
    setRelatedGoals(newRelatedGoals);
    updateTaskField('relatedGoals', newRelatedGoals);
  };

  const loadTaskSuggestionsFromAssignee = async () => {
    if (!assigneeId || assigneeType !== 'team_member') return;
    
    try {
      const suggestions = await EmployeeGoalsService.suggestTasksFromGoals(assigneeId);
      if (suggestions.length > 0) {
        // Show the first few suggestions as a hint
        console.log('Task suggestions for assignee:', suggestions.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading task suggestions:', error);
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
      assignee: "",
      estimated_hours: "",
      actual_hours: "",
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
                    <label className="block text-sm font-medium mb-1">Assignee Type</label>
                    <Select
                      value={assigneeType}
                      onValueChange={val => {
                        setAssigneeType(val);
                        setAssigneeId("");
                        // Optionally clear assignee in taskData
                        updateTaskField("assignee", "");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stakeholder">Stakeholder</SelectItem>
                        <SelectItem value="member">Team Member</SelectItem>
                        <SelectItem value="peer">Peer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Assignee</label>
                    <Select
                      value={assigneeId}
                      onValueChange={val => {
                        setAssigneeId(val);
                        // Store as object in taskData
                        updateTaskField("assignee", val ? { type: assigneeType, id: val } : "");
                      }}
                      disabled={!assigneeType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={assigneeType ? "Select assignee" : "Select type first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {assigneeType === "stakeholder" && stakeholders.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                        {assigneeType === "member" && teamMembers.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                        {assigneeType === "peer" && peers.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Estimated Hours</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={taskData.estimated_hours || ""}
                      onChange={(e) => updateTaskField("estimated_hours", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Actual Hours</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={taskData.actual_hours || ""}
                      onChange={(e) => updateTaskField("actual_hours", e.target.value)}
                      placeholder="0"
                    />
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

                {/* Goals Integration Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Related Goals</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadGoalSuggestions}
                        disabled={loadingGoalSuggestions || (!taskData.title && !taskData.description)}
                        className="flex items-center gap-1"
                      >
                        {loadingGoalSuggestions ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Lightbulb className="h-3 w-3" />
                        )}
                        Suggest Goals
                      </Button>
                      {assigneeId && assigneeType === 'team_member' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={loadTaskSuggestionsFromAssignee}
                          className="flex items-center gap-1"
                        >
                          <Target className="h-3 w-3" />
                          Get Ideas
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Related Goals Display */}
                  {relatedGoals.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {relatedGoals.map((goal) => (
                        <Badge
                          key={goal.id}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Target className="h-3 w-3" />
                          {goal.title}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-1"
                            onClick={() => removeRelatedGoal(goal.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Goal Suggestions Dialog */}
                  <Dialog open={showGoalSuggestions} onOpenChange={setShowGoalSuggestions}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Related Goal Suggestions</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {goalSuggestions.map((goal) => (
                          <div
                            key={goal.id}
                            className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">{goal.title}</h4>
                              <p className="text-xs text-muted-foreground mb-1">
                                <strong>Focus:</strong> {goal.developmentNeed}
                              </p>
                              {goal.developmentActivity && (
                                <p className="text-xs text-muted-foreground">
                                  <strong>Activity:</strong> {goal.developmentActivity.substring(0, 100)}
                                  {goal.developmentActivity.length > 100 && '...'}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addRelatedGoal(goal)}
                              disabled={relatedGoals.find(g => g.id === goal.id)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {goalSuggestions.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No related goals found. Try updating the task title or description.
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
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
