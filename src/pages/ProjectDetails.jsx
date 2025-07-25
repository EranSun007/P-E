
import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Project, Task, Stakeholder, TeamMember } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  MessageSquare,
  Users,
  Timer,
  CheckSquare,
  PlusCircle,
  Bot,
  AlertTriangle,
  UserPlus
} from "lucide-react";
import TaskList from "../components/task/TaskList";
import TaskCreationForm from "../components/task/TaskCreationForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AgendaContextActions from "@/components/agenda/AgendaContextActions";

export default function ProjectDetailsPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("id");

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [stakeholders, setStakeholders] = useState([]);
  const [selectedStakeholders, setSelectedStakeholders] = useState([]);
  const [showStakeholderDialog, setShowStakeholderDialog] = useState(false);
  const [aiComment, setAiComment] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      // Load project details
      const projectData = await Project.get(projectId);
      setProject(projectData);

      // Load tasks
      const allTasks = await Task.list();
      const projectTasks = allTasks.filter(task => task.project === projectData.name);
      setTasks(projectTasks);

      // Load stakeholders and team members
      const [stakeholderData, teamMemberData] = await Promise.all([
        Stakeholder.list(),
        TeamMember.list()
      ]);
      setStakeholders(stakeholderData);
      setTeamMembers(teamMemberData);

      // Set selected stakeholders
      if (projectData.stakeholders) {
        setSelectedStakeholders(projectData.stakeholders);
      }

      // Get AI analysis
      analyzeProject(projectData, projectTasks);
    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeProject = async (projectData, projectTasks) => {
    setIsAnalyzing(true);
    try {
      const completedTasks = projectTasks.filter(t => t.status === "done").length;
      const totalTasks = projectTasks.length;

      const response = await InvokeLLM({
        prompt: `Analyze this project's status and provide next steps:
          Project: ${projectData.name}
          Description: ${projectData.description || 'No description provided'}
          Status: ${projectData.status}
          Progress: ${completedTasks}/${totalTasks} tasks completed
          User Comments: ${aiComment || 'No comments provided'}
          
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

      const newAnalysis = {
        ...response,
        date: new Date().toISOString()
      };

      // Update project with the new analysis
      const updatedAnalyses = projectData.analyses ? [...projectData.analyses, newAnalysis] : [newAnalysis];
      await Project.update(projectId, { ...projectData, analyses: updatedAnalyses });

      setProject(prev => ({ ...prev, analyses: updatedAnalyses }));

      setAnalysis(response);
    } catch (error) {
      console.error("Failed to analyze project:", error);
      setAnalysis({
        currentStatus: "Analysis currently unavailable",
        challenges: ["Unable to analyze project status"],
        nextSteps: ["Please try again later"]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await Project.update(projectId, { ...project, status: newStatus });
      setProject(prev => ({ ...prev, status: newStatus }));
      loadProjectData(); // Refresh data
    } catch (error) {
      console.error("Error updating project status:", error);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      await Task.create({ ...taskData, project: project.name });
      setShowTaskDialog(false);
      loadProjectData(); // Refresh data
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleUpdateStakeholders = async (stakeholders) => {
    try {
      await Project.update(projectId, { ...project, stakeholders });
      setSelectedStakeholders(stakeholders);
      setShowStakeholderDialog(false);
      loadProjectData(); // Refresh data
    } catch (error) {
      console.error("Error updating stakeholders:", error);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      not_started: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      on_hold: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800"
    };
    return statusMap[status] || statusMap.not_started;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-6">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
            <p className="text-gray-500">The requested project could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/projects">
              <Button variant="ghost">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge className={getStatusBadge(project.status)}>
              {project.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <Select value={project.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Change Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="mt-1">{project.description || "No description provided"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Owner</h3>
                    <p className="mt-1">{project.owner || "No owner assigned"}</p>
                  </div>
                  
                  {/* Context Actions for Team Members */}
                  {teamMembers.length > 0 && (
                    <div className="pt-3 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Add to team member agendas:</h3>
                      <div className="flex flex-wrap gap-2">
                        {teamMembers.slice(0, 3).map(teamMember => (
                          <AgendaContextActions
                            key={teamMember.id}
                            teamMemberId={teamMember.id}
                            teamMemberName={teamMember.name}
                            sourceItem={{
                              title: `Project: ${project.name}`,
                              description: `${project.description || ''} | Status: ${project.status}${project.owner ? ` | Owner: ${project.owner}` : ''}`,
                              type: 'project',
                              id: project.id,
                              status: project.status,
                              start_date: project.start_date,
                              end_date: project.end_date
                            }}
                            variant="outline"
                            size="sm"
                            showAgendaAction={true}
                            showPersonalFileAction={true}
                          />
                        ))}
                        {teamMembers.length > 3 && (
                          <span className="text-xs text-gray-400 self-center">+{teamMembers.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Dates</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <span>
                        {project.start_date ? format(parseISO(project.start_date), "MMM d, yyyy") : "Not set"} 
                        {" - "}
                        {project.end_date ? format(parseISO(project.end_date), "MMM d, yyyy") : "Not set"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Analysis */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      AI Analysis
                    </CardTitle>
                    <Button 
                      onClick={() => analyzeProject(project, tasks)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? "Analyzing..." : "Run New Analysis"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {project?.analyses?.map((analysis, index) => (
                      <div key={index} className="mb-6 last:mb-0">
                        <div className="bg-blue-50 rounded-md p-4">
                          <p className="text-blue-900">{analysis.currentStatus}</p>
                          
                          <div className="mt-4">
                            <h4 className="font-medium text-blue-800">Challenges:</h4>
                            <ul className="list-disc pl-4 mt-1 space-y-1">
                              {analysis.challenges.map((challenge, i) => (
                                <li key={i} className="text-blue-800">{challenge}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-4">
                            <h4 className="font-medium text-blue-800">Next Steps:</h4>
                            <ul className="list-disc pl-4 mt-1 space-y-1">
                              {analysis.nextSteps.map((step, i) => (
                                <li key={i} className="text-blue-800">{step}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-4 text-sm text-blue-600">
                            Analysis performed: {format(parseISO(analysis.date), "PPp")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tasks</CardTitle>
                  <Button onClick={() => setShowTaskDialog(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <TaskList
                  tasks={tasks}
                  onStatusChange={(task, newStatus) => {
                    // Handle task status change
                    loadProjectData();
                  }}
                  groupBy="status"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline>
                  <TimelineItem
                    icon={<Timer className="h-4 w-4" />}
                    title="Project Created"
                    timestamp={format(parseISO(project.created_date), "PPpp")}
                  />
                  {tasks.map(task => (
                    <TimelineItem
                      key={task.id}
                      icon={<CheckSquare className="h-4 w-4" />}
                      title={task.title}
                      subtitle={`Status: ${task.status}`}
                      timestamp={format(parseISO(task.updated_date), "PPpp")}
                    />
                  ))}
                  {project.end_date && (
                    <TimelineItem
                      icon={<CalendarIcon className="h-4 w-4" />}
                      title="Target Completion"
                      timestamp={format(parseISO(project.end_date), "PPp")}
                      variant="outline"
                    />
                  )}
                </Timeline>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stakeholders">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Stakeholders</CardTitle>
                  <Button onClick={() => setShowStakeholderDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Manage Stakeholders
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedStakeholders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No stakeholders assigned</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedStakeholders.map(stakeholderId => {
                      const stakeholder = stakeholders.find(s => s.id === stakeholderId);
                      return stakeholder ? (
                        <Card key={stakeholder.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <div>
                                <h3 className="font-medium">{stakeholder.name}</h3>
                                <p className="text-sm text-gray-500">{stakeholder.role}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : null;
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Task Creation Dialog */}
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <TaskCreationForm 
              onCreateTask={handleCreateTask}
              initialTaskData={{
                project: project.name,
                status: "todo"
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Stakeholder Management Dialog */}
        <Dialog open={showStakeholderDialog} onOpenChange={setShowStakeholderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Stakeholders</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                {stakeholders.map(stakeholder => (
                  <div key={stakeholder.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedStakeholders.includes(stakeholder.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStakeholders([...selectedStakeholders, stakeholder.id]);
                        } else {
                          setSelectedStakeholders(selectedStakeholders.filter(id => id !== stakeholder.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label className="flex-1">
                      <span className="font-medium">{stakeholder.name}</span>
                      {stakeholder.department && (
                        <span className="text-sm text-gray-500 ml-2">({stakeholder.department})</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowStakeholderDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateStakeholders(selectedStakeholders)}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
