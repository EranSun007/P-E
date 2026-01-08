import React, { useState, useEffect } from "react";
import { Task, TeamMember } from "@/api/entities";
import { Peer } from "@/api/entities";
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
import { Video, FileText, CheckSquare, BarChart2, Search, Clock, Plus, Edit, Trash2, MoreHorizontal, Mail, BriefcaseBusiness, Code, Building2, Users, Tag } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TagInput from "../components/ui/tag-input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AgendaContextActions from "@/components/agenda/AgendaContextActions";

export default function PeersPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [peers, setPeers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [agendaSummary, setAgendaSummary] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingPeer, setEditingPeer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    department: "",
    organization: "",
    collaboration_context: "",
    relationship_type: "cross_team",
    availability: "full_time",
    skills: [],
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
      const [peerData, taskData, teamMemberData] = await Promise.all([
        Peer.list().catch(() => []),
        Task.list().catch(() => []),
        TeamMember.list().catch(() => [])
      ]);
      
      setTasks(taskData || []);
      setTeamMembers(teamMemberData || []);
      
      let agendaData = {};
      try {
        agendaData = await AgendaService.getAgendaSummaryForAllPeers?.() || {};
      } catch (agendaError) {
        console.error("Failed to load agenda data:", agendaError);
      }
      setAgendaSummary(agendaData);
      const enhancedPeers = (peerData || []).map(peer => {
        const relatedTasks = (taskData || []).filter(task =>
          (task.metadata?.meeting?.participants || []).includes(peer.name)
        );
        let lastActivity = null;
        if (relatedTasks.length > 0) {
          lastActivity = relatedTasks.reduce((latest, task) => {
            const taskDate = new Date(task.created_date);
            return !latest || taskDate > latest ? taskDate : latest;
          }, null);
        }
        const peerAgenda = agendaData[peer.id] || {
          count: 0,
          recentItems: [],
          hasUnresolved: false
        };
        return {
          ...peer,
          tasks: relatedTasks,
          taskCount: relatedTasks.length,
          lastActivity: lastActivity ? lastActivity.toISOString() : null,
          agenda: peerAgenda
        };
      });
      setPeers(enhancedPeers);
    } catch (err) {
      console.error("Failed to load peers:", err);
      setError("Failed to load peers. Please try again.");
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
      organization: "",
      collaboration_context: "",
      relationship_type: "cross_team",
      availability: "full_time",
      skills: [],
      notes: "",
      avatar: ""
    });
    setEditingPeer(null);
    setShowDialog(true);
  };

  const openEditDialog = (peer) => {
    if (!peer) return;
    setFormData({
      name: peer.name || "",
      role: peer.role || "",
      email: peer.email || "",
      phone: peer.phone || "",
      department: peer.department || "",
      organization: peer.organization || "",
      collaboration_context: peer.collaboration_context || "",
      relationship_type: peer.relationship_type || "cross_team",
      availability: peer.availability || "full_time",
      skills: Array.isArray(peer.skills) ? peer.skills : [],
      notes: peer.notes || "",
      avatar: peer.avatar || ""
    });
    setEditingPeer(peer);
    setShowDialog(true);
  };

  const handleInputChange = (field, value) => {
    if (field === 'skills') {
      const safeValue = Array.isArray(value) ? value : [];
      setFormData(prev => ({ ...prev, [field]: safeValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingPeer) {
        await Peer.update(editingPeer.id, formData);
      } else {
        await Peer.create(formData);
      }
      setShowDialog(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save peer:", err);
      setError("Failed to save peer. Please try again.");
    }
  };

  const handleDelete = async (peerId) => {
    try {
      await Peer.delete(peerId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete peer:", err);
      setError("Failed to delete peer. Please try again.");
    }
  };

  const filteredPeers = searchQuery
    ? peers.filter(peer =>
        peer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (peer.role || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (peer.department || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (peer.organization || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (peer.collaboration_context || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (peer.relationship_type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(peer.skills) && peer.skills.some(skill =>
          skill.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      )
    : peers;

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

  const goToPeerProfile = (peerId) => {
    navigate(createPageUrl("PeerProfile") + `?id=${peerId}`);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Peers</h1>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Peer
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
            placeholder="Search peers by name, role, organization, department, context, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {loading ? (
          <div className="text-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading peers...</p>
          </div>
        ) : filteredPeers.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-lg">
            {searchQuery ? (
              <>
                <h3 className="text-lg font-medium mb-2">No peers found</h3>
                <p className="text-gray-500">Try adjusting your search term</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No peers yet</h3>
                <p className="text-gray-500 mb-4">
                  Add peers to track cross-team and external collaborators
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Peer
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPeers.map(peer => {
              const colorClass = getRandomColor(peer.name);
              return (
                <Card key={peer.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex items-start space-x-4 cursor-pointer group"
                        onClick={() => goToPeerProfile(peer.id)}
                      >
                        <Avatar className={`h-12 w-12 ${peer.avatar ? "" : colorClass} ring-2 ring-white transition-transform group-hover:scale-105`}>
                          {peer.avatar ? (
                            <AvatarImage src={peer.avatar} alt={peer.name} />
                          ) : null}
                          <AvatarFallback>
                            {getInitials(peer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="group-hover:text-indigo-600 transition-colors">
                            {peer.name}
                          </CardTitle>
                          {peer.role && (
                            <CardDescription className="mt-1">
                              {peer.role}
                            </CardDescription>
                          )}
                          {peer.organization && (
                            <CardDescription className="mt-1 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {peer.organization}
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
                          <DropdownMenuItem onClick={() => openEditDialog(peer)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(peer.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {peer.department && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <BriefcaseBusiness className="h-3 w-3" />
                          {peer.department}
                        </Badge>
                      )}
                      {peer.relationship_type && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {peer.relationship_type.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {peer.collaboration_context && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {peer.collaboration_context}
                        </Badge>
                      )}
                      {peer.availability && getAvailabilityBadge(peer.availability)}
                      {peer.agenda && (
                        <AgendaBadge
                          count={peer.agenda.count}
                          unresolvedCount={peer.agenda.hasUnresolved ? peer.agenda.count : 0}
                          hasUnresolved={peer.agenda.hasUnresolved}
                          onClick={() => goToPeerProfile(peer.id)}
                          memberName={peer.name}
                          size="sm"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Array.isArray(peer.skills) && peer.skills.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                          <Code className="h-3.5 w-3.5" />
                          Skills
                        </h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.isArray(peer.skills) && peer.skills.map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {peer.notes && (
                      <p className="text-sm text-gray-600">{peer.notes}</p>
                    )}
                    {Array.isArray(peer.tasks) && peer.tasks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Recent Meetings</h4>
                        <div className="space-y-2">
                          {peer.tasks
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
                        {getRelativeTime(peer.lastActivity)}
                      </span>
                      {peer.taskCount > 0 && (
                        <span>{peer.taskCount} meetings</span>
                      )}
                    </div>

                    {/* Context Actions for Team Members */}
                    {teamMembers.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 font-medium mb-2">Add to team member agendas:</p>
                        <div className="flex flex-wrap gap-1">
                          {teamMembers.slice(0, 2).map(teamMember => (
                            <AgendaContextActions
                              key={teamMember.id}
                              teamMemberId={teamMember.id}
                              teamMemberName={teamMember.name}
                              sourceItem={{
                                title: `Peer: ${peer.name}`,
                                description: `${peer.role ? `${peer.role} - ` : ''}${peer.organization || ''}${peer.collaboration_context ? ` | Context: ${peer.collaboration_context}` : ''}${peer.notes ? ` | ${peer.notes}` : ''}`,
                                type: 'peer',
                                id: peer.id,
                                relationship_type: peer.relationship_type,
                                department: peer.department
                              }}
                              variant="ghost"
                              size="xs"
                              showAgendaAction={true}
                              showPersonalFileAction={true}
                            />
                          ))}
                          {teamMembers.length > 2 && (
                            <span className="text-xs text-gray-400">+{teamMembers.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  {peer.email && (
                    <CardFooter className="border-t pt-4">
                      <a 
                        href={`mailto:${peer.email}`} 
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {peer.email}
                      </a>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
      {/* Peer Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPeer ? "Edit Peer" : "Add Peer"}
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
                <Label htmlFor="organization">Group</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => handleInputChange("organization", e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="relationship_type">Relationship Type</Label>
                <Select
                  value={formData.relationship_type}
                  onValueChange={(value) => handleInputChange("relationship_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cross_team">Cross-team</SelectItem>
                    <SelectItem value="external_partner">External Partner</SelectItem>
                    <SelectItem value="client_contact">Client Contact</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="collaboration_context">Collaboration Context</Label>
              <Input
                id="collaboration_context"
                value={formData.collaboration_context}
                onChange={(e) => handleInputChange("collaboration_context", e.target.value)}
                placeholder="e.g. Project Apollo, Vendor Management"
              />
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
                placeholder="Additional information about this peer"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingPeer ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
