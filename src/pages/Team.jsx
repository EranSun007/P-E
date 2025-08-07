import React, { useState, useEffect, lazy, Suspense } from "react";
import { Task } from "@/api/entities";
import { TeamMember } from "@/api/entities";
import { AgendaService } from "@/utils/agendaService";
import EmployeeGoalsService from "@/services/employeeGoalsService";
import { AgendaBadge } from "@/components/agenda/AgendaBadge";
import GoalsBadge from "@/components/team/GoalsBadge";
import { ComponentLoadingSkeleton } from "@/components/ui/loading-skeletons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, FileText, CheckSquare, BarChart2, Search, Clock, Plus, Edit, Trash2, MoreHorizontal, Mail, BriefcaseBusiness, Code, RotateCcw, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TagInput from "../components/ui/tag-input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CalendarEventGenerationService } from "@/services/calendarEventGenerationService";
import DutyRotationService from "@/services/dutyRotationService";
import RotationStatusIndicator from "@/components/duty/RotationStatusIndicator";
import DutyRefreshService from "@/services/dutyRefreshService";

// Lazy load DutyForm for better performance with error handling
const DutyForm = lazy(() => retryImport(() => import("@/components/duty/DutyForm"), 3, 1000));

import { ComponentChunkErrorBoundary, retryImport } from "@/components/ui/error-boundaries";

// Lazy load TeamMemberDeletionDialog for better performance with error handling
const TeamMemberDeletionDialog = lazy(() => retryImport(() => import("@/components/team/TeamMemberDeletionDialog"), 3, 1000));

export default function TeamPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [agendaSummary, setAgendaSummary] = useState({});
  const [goalsStats, setGoalsStats] = useState({});
  const [activeRotations, setActiveRotations] = useState([]);
  const [rotationDetails, setRotationDetails] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [showDutyCreation, setShowDutyCreation] = useState(false);
  const [editingDuty, setEditingDuty] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    department: "",
    availability: "full_time",
    skills: [], // Initialize with empty array
    notes: "",
    avatar: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load team members
      const memberData = await TeamMember.list().catch(() => []);
      
      // Load tasks to associate with team members
      const taskData = await Task.list().catch(() => []);
      setTasks(taskData || []);
      
      // Load agenda summaries for all team members
      let agendaData = {};
      try {
        agendaData = await AgendaService.getAgendaSummaryForAllMembers();
      } catch (agendaError) {
        console.error("Failed to load agenda data:", agendaError);
        // Continue without agenda data rather than failing completely
      }
      setAgendaSummary(agendaData);
      
      // Load goals statistics for all team members
      let goalsData = {};
      try {
        const allGoals = await EmployeeGoalsService.getAllGoals();
        
        // Group goals by employee and calculate stats
        goalsData = allGoals.reduce((acc, goal) => {
          if (!acc[goal.employeeId]) {
            acc[goal.employeeId] = {
              total: 0,
              active: 0,
              completed: 0,
              paused: 0
            };
          }
          
          acc[goal.employeeId].total++;
          
          if (goal.status === 'active') {
            acc[goal.employeeId].active++;
          } else if (goal.status === 'completed') {
            acc[goal.employeeId].completed++;
          } else if (goal.status === 'paused') {
            acc[goal.employeeId].paused++;
          }
          
          return acc;
        }, {});
        
      } catch (goalsError) {
        console.error("Failed to load goals data:", goalsError);
        // Continue without goals data rather than failing completely
      }
      setGoalsStats(goalsData);
      
      // Load active rotations
      let rotationsData = [];
      let rotationDetailsData = {};
      try {
        rotationsData = await DutyRotationService.getActiveRotations();
        
        // Load details for each rotation
        for (const rotation of rotationsData) {
          try {
            const [currentAssignee, nextAssignee] = await Promise.all([
              DutyRotationService.getCurrentAssignee(rotation.id),
              DutyRotationService.getNextAssignee(rotation.id)
            ]);
            
            rotationDetailsData[rotation.id] = {
              currentAssignee,
              nextAssignee
            };
          } catch (rotationError) {
            console.error(`Failed to load details for rotation ${rotation.id}:`, rotationError);
          }
        }
      } catch (rotationsError) {
        console.error("Failed to load rotations data:", rotationsError);
        // Continue without rotations data rather than failing completely
      }
      setActiveRotations(rotationsData);
      setRotationDetails(rotationDetailsData);
      
      // Attach task data, agenda data, and goals stats to team member records
      const enhancedMembers = (memberData || []).map(member => {
        const relatedTasks = (taskData || []).filter(task => 
          (task.metadata?.meeting?.participants || []).includes(member.name)
        );
        
        let lastActivity = null;
        if (relatedTasks.length > 0) {
          // Find most recent task
          lastActivity = relatedTasks.reduce((latest, task) => {
            const taskDate = new Date(task.created_date);
            return !latest || taskDate > latest ? taskDate : latest;
          }, null);
        }
        
        // Add agenda information to member data
        const memberAgenda = agendaData[member.id] || {
          count: 0,
          recentItems: [],
          hasUnresolved: false
        };
        
        // Add goals information to member data
        const memberGoals = goalsData[member.id] || {
          total: 0,
          active: 0,
          completed: 0,
          paused: 0
        };
        
        // Add rotation information to member data
        const memberRotations = rotationsData.filter(rotation => 
          rotation.participants && rotation.participants.includes(member.id)
        );
        
        return {
          ...member,
          tasks: relatedTasks,
          taskCount: relatedTasks.length,
          lastActivity: lastActivity ? lastActivity.toISOString() : null,
          agenda: memberAgenda,
          goals: memberGoals,
          rotations: memberRotations
        };
      });
      
      setTeamMembers(enhancedMembers);
    } catch (err) {
      console.error("Failed to load team members:", err);
      setError("Failed to load team members. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      name: "",
      role: "",
      email: "",
      phone: "",
      department: "",
      availability: "full_time",
      skills: [],
      notes: "",
      avatar: ""
    });
    setEditingMember(null);
    setShowDialog(true);
  };

  const openEditDialog = (member) => {
    if (!member) return;
    
    setFormData({
      name: member.name || "",
      role: member.role || "",
      email: member.email || "",
      phone: member.phone || "",
      department: member.department || "",
      availability: member.availability || "full_time",
      skills: Array.isArray(member.skills) ? member.skills : [],
      notes: member.notes || "",
      avatar: member.avatar || ""
    });
    setEditingMember(member);
    setShowDialog(true);
  };

  const handleInputChange = (field, value) => {
    if (field === 'skills') {
      // Always ensure skills is an array
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

  const handleSubmit = async () => {
    try {
      let savedMember;
      const previousData = editingMember ? { ...editingMember } : null;
      
      if (editingMember) {
        savedMember = await TeamMember.update(editingMember.id, formData);
        
        // Handle birthday event updates if birthday changed
        try {
          await CalendarEventGenerationService.handleTeamMemberUpdate(
            editingMember.id, 
            savedMember, 
            previousData
          );
        } catch (calendarError) {
          console.error("Failed to update birthday events:", calendarError);
          // Don't fail the entire operation for calendar event errors
        }
      } else {
        savedMember = await TeamMember.create(formData);
        
        // Generate birthday events for new team member
        try {
          await CalendarEventGenerationService.handleTeamMemberCreation(savedMember);
        } catch (calendarError) {
          console.error("Failed to generate birthday events:", calendarError);
          // Don't fail the entire operation for calendar event errors
        }
      }
      
      setShowDialog(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save team member:", err);
      setError("Failed to save team member. Please try again.");
    }
  };

  const handleDelete = (member) => {
    setMemberToDelete(member);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async (memberId, dataHandlingOption) => {
    try {
      // Clean up calendar events before deleting team member
      try {
        await CalendarEventGenerationService.handleTeamMemberDeletion(memberId);
      } catch (calendarError) {
        console.error("Failed to clean up calendar events:", calendarError);
        // Continue with deletion even if calendar cleanup fails
      }
      
      await TeamMember.delete(memberId);
      setShowDeleteDialog(false);
      setMemberToDelete(null);
      await loadData();
    } catch (err) {
      console.error("Failed to delete team member:", err);
      setError("Failed to delete team member. Please try again.");
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setMemberToDelete(null);
  };

  const handleCreateDuty = () => {
    setEditingDuty(null);
    setShowDutyCreation(true);
  };

  const handleEditDuty = (duty) => {
    setEditingDuty(duty);
    setShowDutyCreation(true);
  };

  const handleSaveDuty = async (dutyData) => {
    try {
      let savedDuty;
      
      if (editingDuty) {
        // Update existing duty with refresh service
        savedDuty = await DutyRefreshService.updateDutyWithRefresh(editingDuty.id, dutyData, {
          showOptimistic: true,
          highlightUpdated: true,
          refreshViews: true
        });
      } else {
        // Create new duty with refresh service
        savedDuty = await DutyRefreshService.createDutyWithRefresh(dutyData, {
          showOptimistic: true,
          highlightNew: true,
          refreshViews: true
        });
      }
      
      setShowDutyCreation(false);
      setEditingDuty(null);
      
      // Refresh data to show the new/updated duty
      await loadData();
      
      return savedDuty;
    } catch (error) {
      console.error('Failed to save duty:', error);
      throw error; // Let DutyForm handle the error display
    }
  };

  const filteredMembers = searchQuery 
    ? teamMembers.filter(member => 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.role || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.department || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(member.skills) && member.skills.some(skill => 
          skill.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      )
    : teamMembers;

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRandomColor = (name) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-purple-100 text-purple-800",
      "bg-pink-100 text-pink-800",
      "bg-yellow-100 text-yellow-800",
      "bg-indigo-100 text-indigo-800",
      "bg-red-100 text-red-800",
      "bg-orange-100 text-orange-800",
    ];
    
    // Use name to create a deterministic color assignment
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case "meeting": return <Video className="h-3 w-3" />;
      case "metric": return <BarChart2 className="h-3 w-3" />;
      case "action": return <CheckSquare className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return "No recent activity";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
  };

  const getAvailabilityBadge = (availability) => {
    const availabilityStyles = {
      full_time: "bg-green-100 text-green-800",
      part_time: "bg-blue-100 text-blue-800",
      contractor: "bg-orange-100 text-orange-800",
      remote: "bg-purple-100 text-purple-800"
    };
    
    const availabilityLabels = {
      full_time: "Full-time",
      part_time: "Part-time",
      contractor: "Contractor",
      remote: "Remote"
    };
    
    return (
      <Badge className={availabilityStyles[availability] || "bg-gray-100 text-gray-800"}>
        {availabilityLabels[availability] || availability}
      </Badge>
    );
  };

    const goToMemberProfile = (memberId) => {
    navigate(createPageUrl("TeamMemberProfile") + `?id=${memberId}`);
  };

  const goToMemberGoals = (memberId) => {
    navigate(createPageUrl("TeamMemberProfile") + `?id=${memberId}&tab=goals`);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Team Members</h1>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Active Rotations Overview */}
        {activeRotations.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RotateCcw className="h-5 w-5" />
                <span>Active Duty Rotations</span>
                <Badge variant="outline">{activeRotations.length}</Badge>
              </CardTitle>
              <CardDescription>
                Current status of all active duty rotations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeRotations.map(rotation => {
                  const details = rotationDetails[rotation.id];
                  return (
                    <div key={rotation.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{rotation.name}</h4>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          {rotation.type}
                        </Badge>
                      </div>
                      
                      {details && (
                        <RotationStatusIndicator
                          rotation={rotation}
                          currentAssignee={details.currentAssignee}
                          nextAssignee={details.nextAssignee}
                          size="sm"
                          showDetails={true}
                        />
                      )}
                      
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{rotation.participants?.length || 0} participants</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{rotation.cycle_weeks}w cycles</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Duty Management Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <BriefcaseBusiness className="h-5 w-5" />
                  <span>Duty Management</span>
                </CardTitle>
                <CardDescription>
                  Create and manage duty assignments for team members
                </CardDescription>
              </div>
              <Button onClick={handleCreateDuty}>
                <Plus className="h-4 w-4 mr-2" />
                Create Duty
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search team members by name, role, department, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="text-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading team members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-lg">
            {searchQuery ? (
              <>
                <h3 className="text-lg font-medium mb-2">No team members found</h3>
                <p className="text-gray-500">Try adjusting your search term</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No team members yet</h3>
                <p className="text-gray-500 mb-4">
                  Add team members to track participants in meetings and collaboration
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Team Member
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map(member => {
              const colorClass = getRandomColor(member.name);
              
              return (
                <Card key={member.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex items-start space-x-4 cursor-pointer group"
                        onClick={() => goToMemberProfile(member.id)}
                      >
                        <Avatar className={`h-12 w-12 ${member.avatar ? "" : colorClass} ring-2 ring-white transition-transform group-hover:scale-105`}>
                          {member.avatar ? (
                            <AvatarImage src={member.avatar} alt={member.name} />
                          ) : null}
                          <AvatarFallback>
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="group-hover:text-indigo-600 transition-colors">
                            {member.name}
                          </CardTitle>
                          {member.role && (
                            <CardDescription className="mt-1">
                              {member.role}
                            </CardDescription>
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
                          <DropdownMenuItem onClick={() => openEditDialog(member)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(member)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {member.department && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <BriefcaseBusiness className="h-3 w-3" />
                          {member.department}
                        </Badge>
                      )}
                      {member.availability && getAvailabilityBadge(member.availability)}
                      {member.agenda && (
                        <AgendaBadge
                          count={member.agenda.count}
                          unresolvedCount={member.agenda.hasUnresolved ? member.agenda.count : 0}
                          hasUnresolved={member.agenda.hasUnresolved}
                          onClick={() => goToMemberProfile(member.id)}
                          memberName={member.name}
                          size="sm"
                        />
                      )}
                      {member.goals && member.goals.total > 0 && (
                        <GoalsBadge
                          totalGoals={member.goals.total}
                          activeGoals={member.goals.active}
                          completedGoals={member.goals.completed}
                          pausedGoals={member.goals.paused}
                          onClick={() => goToMemberGoals(member.id)}
                          size="sm"
                        />
                      )}
                      {member.rotations && member.rotations.length > 0 && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {member.rotations.length} rotation{member.rotations.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Array.isArray(member.skills) && member.skills.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                          <Code className="h-3.5 w-3.5" />
                          Skills
                        </h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.isArray(member.skills) && member.skills.map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {member.notes && (
                      <p className="text-sm text-gray-600">{member.notes}</p>
                    )}
                    
                    {Array.isArray(member.tasks) && member.tasks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Recent Meetings</h4>
                        <div className="space-y-2">
                          {member.tasks
                            .filter(task => task.type === "meeting") 
                            .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                            .slice(0, 2)
                            .map(task => (
                              <div key={task.id} className="p-2 bg-gray-50 rounded-md text-sm">
                                <div className="flex items-center justify-between">
                                  <div className="truncate">{task.title}</div>
                                  <Badge variant="outline" className="ml-2 flex items-center gap-1 whitespace-nowrap">
                                    <Video className="h-3 w-3" />
                                    {task.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Rotation Information */}
                    {member.rotations && member.rotations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                          <RotateCcw className="h-3.5 w-3.5" />
                          Active Rotations
                        </h4>
                        <div className="space-y-1">
                          {member.rotations.slice(0, 2).map(rotation => {
                            const details = rotationDetails[rotation.id];
                            const isCurrentAssignee = details?.currentAssignee?.assignee_id === member.id;
                            const isNextAssignee = details?.nextAssignee?.assignee_id === member.id;
                            
                            return (
                              <div key={rotation.id} className="flex items-center justify-between text-xs">
                                <span className="font-medium">{rotation.name}</span>
                                <div className="flex items-center space-x-1">
                                  {isCurrentAssignee && (
                                    <Badge variant="default" className="text-xs px-1 py-0">Current</Badge>
                                  )}
                                  {isNextAssignee && (
                                    <Badge variant="secondary" className="text-xs px-1 py-0">Next</Badge>
                                  )}
                                  {!isCurrentAssignee && !isNextAssignee && (
                                    <Badge variant="outline" className="text-xs px-1 py-0">Participant</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {member.rotations.length > 2 && (
                            <p className="text-xs text-gray-400">
                              +{member.rotations.length - 2} more rotation{member.rotations.length - 2 !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getRelativeTime(member.lastActivity)}
                      </span>
                      {member.taskCount > 0 && (
                        <span>{member.taskCount} meetings</span>
                      )}
                    </div>
                  </CardContent>
                  {member.email && (
                    <CardFooter className="border-t pt-4">
                      <a 
                        href={`mailto:${member.email}`} 
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {member.email}
                      </a>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Team Member Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Edit Team Member" : "Add Team Member"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Full name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role / Position</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  placeholder="e.g. Product Manager"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange("department", e.target.value)}
                  placeholder="e.g. Engineering"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Email address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="availability">Availability</Label>
              <Select
                value={formData.availability}
                onValueChange={(value) => handleInputChange("availability", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <TagInput
                value={formData.skills || []}
                onChange={(skills) => handleInputChange("skills", skills)}
                placeholder="Enter skills, press Enter or comma to add"
              />
              <p className="text-xs text-gray-500">Press Enter or comma after each skill</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL (optional)</Label>
              <Input
                id="avatar"
                value={formData.avatar}
                onChange={(e) => handleInputChange("avatar", e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional information about this team member"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingMember ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Member Deletion Dialog */}
      {showDeleteDialog && (
        <ComponentChunkErrorBoundary componentName="Team Member Deletion Dialog">
          <Suspense fallback={
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogContent>
                <ComponentLoadingSkeleton />
              </DialogContent>
            </Dialog>
          }>
            <TeamMemberDeletionDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              teamMember={memberToDelete}
              onConfirm={handleDeleteConfirm}
              onCancel={handleDeleteCancel}
            />
          </Suspense>
        </ComponentChunkErrorBoundary>
      )}

      {/* Duty Creation Dialog */}
      <Dialog open={showDutyCreation} onOpenChange={setShowDutyCreation}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDuty ? "Edit Duty" : "Create New Duty"}
            </DialogTitle>
            <DialogDescription>
              {editingDuty ? "Modify the duty assignment details below." : "Create a new duty assignment for team members."}
            </DialogDescription>
          </DialogHeader>
          <ComponentChunkErrorBoundary componentName="Duty Form">
            <Suspense fallback={<ComponentLoadingSkeleton />}>
              <DutyForm
                duty={editingDuty}
                teamMembers={teamMembers}
                onSave={handleSaveDuty}
                onCancel={() => {
                  setShowDutyCreation(false);
                  setEditingDuty(null);
                }}
              />
            </Suspense>
          </ComponentChunkErrorBoundary>
        </DialogContent>
      </Dialog>
    </div>
  );
}
