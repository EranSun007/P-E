import React, { useState, useEffect } from "react";
import { Task } from "@/api/entities";
import { TeamMember } from "@/api/entities";
import { AgendaService } from "@/utils/agendaService";
import { AgendaBadge } from "@/components/agenda/AgendaBadge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, FileText, CheckSquare, BarChart2, Search, Clock, Plus, Edit, Trash2, MoreHorizontal, Mail, BriefcaseBusiness, Code } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TagInput from "../components/ui/tag-input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TeamMemberDeletionDialog from "@/components/team/TeamMemberDeletionDialog";

export default function TeamPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [agendaSummary, setAgendaSummary] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [error, setError] = useState(null);

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
      
      // Attach task data and agenda data to team member records
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
        
        return {
          ...member,
          tasks: relatedTasks,
          taskCount: relatedTasks.length,
          lastActivity: lastActivity ? lastActivity.toISOString() : null,
          agenda: memberAgenda
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
      if (editingMember) {
        await TeamMember.update(editingMember.id, formData);
      } else {
        await TeamMember.create(formData);
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
      <TeamMemberDeletionDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        teamMember={memberToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
