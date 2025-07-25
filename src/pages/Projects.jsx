import React, { useState, useEffect } from "react";
import { Project, Task } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { format, parseISO } from "date-fns";
import { 
  ChevronDown, ChevronRight, MessageSquare,
  Users, Plus, Calendar as CalendarIcon, 
  MoreHorizontal, CheckSquare, Edit, Trash2,
  ArrowUpCircle, Circle, CheckCircle2,
  Folders, Bot, AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TagInput from "../components/ui/tag-input";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [projectTasks, setProjectTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "not_started",
    start_date: "",
    end_date: "",
    deadline: "",
    owner: "",
    budget: "",
    cost: "",
    priority_level: "medium",
    color: getRandomColor(),
    tags: []
  });
  const [expandedProjects, setExpandedProjects] = useState({});
  const [projectAnalysis, setProjectAnalysis] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingProject, setAnalyzingProject] = useState(null);
  const [ownerType, setOwnerType] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [stakeholders, setStakeholders] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [peers, setPeers] = useState([]);

  useEffect(() => {
    loadProjects();
  }, []);

  function getRandomColor() {
    const colors = [
      "indigo",
      "blue",
      "green",
      "amber",
      "red",
      "purple",
      "pink",
      "teal"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const projectData = await Project.list("-created_date");
      setProjects(projectData);
      
      // Load tasks for each project
      const allTasks = await Task.list();
      const tasksByProject = {};
      
      projectData.forEach(project => {
        tasksByProject[project.id] = allTasks.filter(task => 
          task.project === project.name
        );
      });
      
      setProjectTasks(tasksByProject);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError("Failed to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Ensure arrays are properly handled
    if (field === 'tags') {
      const safeValue = Array.isArray(value) ? value : [];
      setFormData(prev => ({
        ...prev,
        [field]: safeValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const openCreateDialog = () => {
    setFormData({
      name: "",
      description: "",
      status: "not_started",
      start_date: "",
      end_date: "",
      deadline: "",
      owner: "",
      budget: "",
      cost: "",
      priority_level: "medium",
      color: getRandomColor(),
      tags: []
    });
    setEditingProject(null);
    setShowDialog(true);
  };

  const openEditDialog = (project) => {
    if (!project) return;
    
    setFormData({
      name: project.name || "",
      description: project.description || "",
      status: project.status || "not_started",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      deadline: project.deadline || "",
      owner: project.owner || "",
      budget: project.budget || "",
      cost: project.cost || "",
      priority_level: project.priority_level || "medium",
      color: project.color || getRandomColor(),
      tags: Array.isArray(project.tags) ? project.tags : []
    });
    setEditingProject(project);
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingProject) {
        await Project.update(editingProject.id, formData);
      } else {
        await Project.create(formData);
      }
      setShowDialog(false);
      await loadProjects();
    } catch (err) {
      console.error("Failed to save project:", err);
      setError("Failed to save project. Please try again.");
    }
  };

  const handleDelete = async (projectId) => {
    try {
      await Project.delete(projectId);
      await loadProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
      setError("Failed to delete project. Please try again.");
    }
  };

  const getColorClass = (color) => {
    const colorMap = {
      indigo: "bg-indigo-500",
      blue: "bg-blue-500",
      green: "bg-green-500",
      amber: "bg-amber-500",
      red: "bg-red-500",
      purple: "bg-purple-500",
      pink: "bg-pink-500",
      teal: "bg-teal-500"
    };
    return colorMap[color] || "bg-gray-500";
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      not_started: "bg-gray-100 text-gray-800 border-gray-200",
      in_progress: "bg-blue-100 text-blue-800 border-blue-200",
      on_hold: "bg-amber-100 text-amber-800 border-amber-200",
      completed: "bg-green-100 text-green-800 border-green-200"
    };
    
    const statusNames = {
      not_started: "Not Started",
      in_progress: "In Progress",
      on_hold: "On Hold",
      completed: "Completed"
    };
    
    return (
      <Badge className={statusMap[status]}>
        {statusNames[status]}
      </Badge>
    );
  };

  const calculateProgress = (projectId) => {
    const tasks = projectTasks[projectId] || [];
    if (tasks.length === 0) return 0;
    
    const completedTasks = tasks.filter(task => task.status === "done").length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getTaskStatusCounts = (projectId) => {
    // Get the tasks array safely
    const tasks = Array.isArray(projectTasks[projectId]) ? projectTasks[projectId] : [];
    
    const counts = {
      total: tasks.length,
      done: 0,
      in_progress: 0,
      todo: 0,
      backlog: 0,
      blocked: 0
    };
    
    tasks.forEach(task => {
      if (task && task.status) {
        counts[task.status] = (counts[task.status] || 0) + 1;
      }
    });
    
    return counts;
  };

  const analyzeProject = async (project) => {
    setAnalyzingProject(project.id);
    try {
      const tasks = projectTasks[project.id] || [];
      const completedTasks = tasks.filter(t => t.status === "done").length;
      const totalTasks = tasks.length;
      const recentUpdates = tasks
        .flatMap(t => (t.updates || [])
        .map(u => ({ ...u, taskTitle: t.title })))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

      const response = await InvokeLLM({
        prompt: `Analyze this project's status and provide next steps:
          Project: ${project.name}
          Description: ${project.description || 'No description provided'}
          Status: ${project.status}
          Progress: ${completedTasks}/${totalTasks} tasks completed
          Recent Updates: ${recentUpdates.map(u => u.text).join(", ") || 'No recent updates'}
          
          Provide a comprehensive analysis including current status, challenges, and recommended next steps.`,
        response_json_schema: {
          type: "object",
          properties: {
            currentStatus: { type: "string" },
            challenges: { type: "array", items: { type: "string" } },
            nextSteps: { type: "array", items: { type: "string" } }
          },
          required: ["currentStatus", "challenges", "nextSteps"]
        }
      });

      // Save analysis to project
      const analyses = [...(project.analyses || [])];
      analyses.push({
        ...response,
        date: new Date().toISOString()
      });

      await Project.update(project.id, {
        ...project,
        analyses
      });

      // Refresh projects to get the latest data
      await loadProjects();

    } catch (error) {
      console.error(`Failed to analyze project ${project.name}:`, error);
    } finally {
      setAnalyzingProject(null);
    }
  };

  const toggleProjectExpansion = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const getProjectsStatusData = () => {
    const statusCounts = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      on_hold: 0
    };

    projects.forEach(project => {
      statusCounts[project.status] = (statusCounts[project.status] || 0) + 1;
    });

    return [
      { name: 'Not Started', value: statusCounts.not_started, color: '#94a3b8' },
      { name: 'In Progress', value: statusCounts.in_progress, color: '#60a5fa' },
      { name: 'Completed', value: statusCounts.completed, color: '#4ade80' },
      { name: 'On Hold', value: statusCounts.on_hold, color: '#fbbf24' }
    ];
  };

  // Fetch all owner entities when dialog opens
  useEffect(() => {
    if (showDialog) {
      // Dynamically import to avoid circular dependencies if any
      import('@/api/entities').then(({ Stakeholder, TeamMember, Peer }) => {
        Stakeholder.list().then(setStakeholders);
        TeamMember.list().then(setTeamMembers);
        Peer.list().then(setPeers);
      });
      // If editing, set ownerType and ownerId from formData.owner
      if (editingProject && formData.owner && typeof formData.owner === 'object') {
        setOwnerType(formData.owner.type);
        setOwnerId(formData.owner.id);
      } else {
        setOwnerType('');
        setOwnerId('');
      }
    }
    // eslint-disable-next-line
  }, [showDialog]);

  // Update formData.owner when ownerType or ownerId changes
  useEffect(() => {
    if (ownerType && ownerId) {
      handleInputChange('owner', { type: ownerType, id: ownerId });
    } else {
      handleInputChange('owner', '');
    }
    // eslint-disable-next-line
  }, [ownerType, ownerId]);

  // Helper to get owner display name
  function getOwnerName(owner) {
    if (!owner || typeof owner !== 'object' || !owner.type || !owner.id) return '';
    if (owner.type === 'stakeholder') {
      const s = stakeholders.find(s => s.id === owner.id);
      return s ? s.name : '(Unknown Stakeholder)';
    }
    if (owner.type === 'team_member') {
      const m = teamMembers.find(m => m.id === owner.id);
      return m ? m.name : '(Unknown Team Member)';
    }
    if (owner.type === 'peer') {
      const p = peers.find(p => p.id === owner.id);
      return p ? p.name : '(Unknown Peer)';
    }
    return '';
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Projects</h1>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Projects Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Projects Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getProjectsStatusData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {getProjectsStatusData().map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Active Projects</span>
                      <span>{projects.filter(p => p.status === 'in_progress').length}</span>
                    </div>
                    <Progress 
                      value={
                        (projects.filter(p => p.status === 'in_progress').length / projects.length) * 100
                      } 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completed Projects</span>
                      <span>{projects.filter(p => p.status === 'completed').length}</span>
                    </div>
                    <Progress 
                      value={
                        (projects.filter(p => p.status === 'completed').length / projects.length) * 100
                      }
                      className="bg-green-100" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Folders className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No projects yet</h3>
              <p className="text-gray-500 text-center mb-4">Create your first project to organize your tasks</p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => {
              const isExpanded = expandedProjects[project.id] !== false;
              const progress = calculateProgress(project.id);
              const taskCounts = getTaskStatusCounts(project.id);
              const analysis = projectAnalysis[project.id] || { currentStatus: "", nextSteps: [] };
              
              return (
                <Card key={project.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${getColorClass(project.color)}`}></div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleProjectExpansion(project.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <div>
                          <CardTitle 
                            className="truncate hover:text-indigo-600 cursor-pointer transition-colors"
                            onClick={() => navigate(createPageUrl("ProjectDetails") + `?id=${project.id}`)}
                          >
                            {project.name}
                          </CardTitle>
                          <div className="flex items-center mt-2">
                            {getStatusBadge(project.status)}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(project)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(project.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent>
                      {project.description && (
                        <p className="text-gray-600 text-sm mb-4">
                          {project.description}
                        </p>
                      )}
                      
                      {(Array.isArray(project.tags) && project.tags.length > 0) && (
                        <div className="mb-3 flex flex-wrap gap-1">
                          {project.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {project.start_date && project.end_date && (
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          <span>
                            {format(parseISO(project.start_date), "MMM d")} - {format(parseISO(project.end_date), "MMM d, yyyy")}
                          </span>
                        </div>
                      )}
                      
                      {project.owner && typeof project.owner === 'object' && project.owner.type && project.owner.id && (
                        <div className="mb-4">
                          <Badge variant="outline" className="text-gray-600">
                            Owner: {getOwnerName(project.owner)}
                          </Badge>
                        </div>
                      )}
                      {project.owner && typeof project.owner === 'string' && project.owner && (
                        <div className="mb-4">
                          <Badge variant="outline" className="text-gray-600">
                            Owner: {project.owner}
                          </Badge>
                        </div>
                      )}
                      
                      {/* AI Analysis Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            AI Analysis
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => analyzeProject(project)}
                            disabled={analyzingProject === project.id}
                          >
                            {analyzingProject === project.id ? (
                              <>
                                <span className="animate-spin mr-2">⭮</span>
                                Analyzing...
                              </>
                            ) : (
                              "Run Analysis"
                            )}
                          </Button>
                        </div>

                        {project.analyses?.length > 0 ? (
                          <div className="bg-blue-50 rounded-md p-3 space-y-2">
                            <p className="text-sm text-blue-900">
                              {project.analyses[project.analyses.length - 1].currentStatus}
                            </p>
                            <div className="text-sm text-blue-800">
                              <strong className="block mb-1">Next Steps:</strong>
                              <ul className="list-disc pl-4">
                                {project.analyses[project.analyses.length - 1].nextSteps.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="text-xs text-blue-600 mt-2">
                              Last analyzed: {format(parseISO(project.analyses[project.analyses.length - 1].date), "PPp")}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-4 border border-dashed rounded-md">
                            <AlertCircle className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500">No analysis available yet</p>
                          </div>
                        )}
                      </div>

                      {/* Project Updates */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Updates</h4>
                        <ScrollArea className="h-32 rounded-md border p-2">
                          {projectTasks[project.id]?.flatMap(task => 
                            (task.updates || []).map(update => ({
                              ...update,
                              taskTitle: task.title
                            }))
                          )
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((update, i) => (
                            <div key={i} className="mb-2 last:mb-0">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="h-4 w-4 text-gray-400 mt-1" />
                                <div>
                                  <p className="text-sm">{update.text}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {format(parseISO(update.date), "MMM d, yyyy")}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      in {update.taskTitle}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>

                      {/* Project Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      
                      {/* Task Status */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <CheckSquare className="h-4 w-4 text-indigo-500 mr-1" />
                          <span className="text-sm">{taskCounts.total} tasks</span>
                        </div>
                        <div className="flex space-x-2">
                          {taskCounts.done > 0 && (
                            <Badge variant="outline" className="bg-green-50">
                              {taskCounts.done} done
                            </Badge>
                          )}
                          {taskCounts.in_progress > 0 && (
                            <Badge variant="outline" className="bg-blue-50">
                              {taskCounts.in_progress} in progress
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "Create New Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Enter project description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ownerType">Project Owner Type</Label>
                <Select value={ownerType} onValueChange={setOwnerType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stakeholder">Stakeholder</SelectItem>
                    <SelectItem value="team_member">Team Member</SelectItem>
                    <SelectItem value="peer">Peer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {ownerType && (
              <div className="space-y-2">
                <Label htmlFor="ownerId">Project Owner</Label>
                <Select
                  value={ownerId}
                  onValueChange={setOwnerId}
                  disabled={
                    !ownerType ||
                    (ownerType === 'stakeholder' && (!stakeholders || stakeholders.length === 0)) ||
                    (ownerType === 'team_member' && (!teamMembers || teamMembers.length === 0)) ||
                    (ownerType === 'peer' && (!peers || peers.length === 0))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${ownerType.replace('_', ' ')}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerType === 'stakeholder' && stakeholders && stakeholders.length > 0 && stakeholders.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    {ownerType === 'team_member' && teamMembers && teamMembers.length > 0 && teamMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                    {ownerType === 'peer' && peers && peers.length > 0 && peers.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {((ownerType === 'stakeholder' && (!stakeholders || stakeholders.length === 0)) ||
                  (ownerType === 'team_member' && (!teamMembers || teamMembers.length === 0)) ||
                  (ownerType === 'peer' && (!peers || peers.length === 0))) && (
                  <div className="text-xs text-gray-500 mt-1">No records found for this type.</div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? (
                        format(parseISO(formData.start_date), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date ? parseISO(formData.start_date) : undefined}
                      onSelect={(date) => handleInputChange("start_date", date ? date.toISOString() : "")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.end_date ? (
                        format(parseISO(formData.end_date), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.end_date ? parseISO(formData.end_date) : undefined}
                      onSelect={(date) => handleInputChange("end_date", date ? date.toISOString() : "")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Deadline (Critical Date)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deadline ? (
                      format(parseISO(formData.deadline), "PPP")
                    ) : (
                      <span>Set deadline (optional)</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.deadline ? parseISO(formData.deadline) : undefined}
                    onSelect={(date) => handleInputChange("deadline", date ? date.toISOString() : "")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority_level">Priority</Label>
                <Select
                  value={formData.priority_level}
                  onValueChange={(value) => handleInputChange("priority_level", value)}
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
              
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.budget}
                  onChange={(e) => handleInputChange("budget", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cost">Actual Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => handleInputChange("cost", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Project Tags</Label>
              <TagInput
                value={formData.tags || []}
                onChange={(tags) => handleInputChange("tags", tags)}
                placeholder="Add service-related tags..."
              />
              <p className="text-xs text-gray-500">
                Tags for service categorization (e.g., software, consulting, support)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {["indigo", "blue", "green", "amber", "red", "purple", "pink", "teal"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full ${getColorClass(color)} border-2 ${
                      formData.color === color ? "border-black" : "border-transparent"
                    }`}
                    onClick={() => handleInputChange("color", color)}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingProject ? "Update Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
