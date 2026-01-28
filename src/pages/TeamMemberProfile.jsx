import React, { useState, useEffect, useContext } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { format, parseISO, isFuture, isPast } from "date-fns";
import { TeamMember, OneOnOne, TimeOff } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { AppContext } from "@/contexts/AppContext.jsx";
import { useDisplayMode } from "@/contexts/DisplayModeContext.jsx";
import { logger } from "@/utils/logger";
import {
  anonymizeName,
  anonymizeEmail,
  anonymizeNotes,
  getAnonymizedInitials
} from "@/utils/anonymize";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  MessageSquare,
  AlertCircle,
  SmilePlus,
  Trash2,
  Pencil,
  Palmtree,
} from "lucide-react";
import TagInput from "@/components/ui/tag-input";
import CurrentWorkSection from "@/components/team/CurrentWorkSection";
import DeveloperGoalsCard from "@/components/team/DeveloperGoalsCard";
import PerformanceEvaluationCard from "@/components/team/PerformanceEvaluationCard";
import TimeOffForm from "@/components/timeoff/TimeOffForm";
import TimeOffCard from "@/components/timeoff/TimeOffCard";

export default function TeamMemberProfile() {
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get("id");
  const { isPresentationMode } = useDisplayMode();

  const [member, setMember] = useState(null);
  const [oneOnOnes, setOneOnOnes] = useState([]);
  const [timeOffs, setTimeOffs] = useState([]);
  const { tasks, projects, teamMembers: allTeamMembers, stakeholders: allStakeholders, refreshAll } = useContext(AppContext);
  const [loading, setLoading] = useState(true);

  // Time Off state
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState(null);
  const [timeOffLoading, setTimeOffLoading] = useState(false);

  // Get the index of current member for consistent anonymization
  const getMemberIndex = () => {
    if (!member || !allTeamMembers) return 0;
    return allTeamMembers.findIndex(m => m.id === member.id);
  };

  // Helper to get display name for the current member
  const getDisplayName = () => {
    if (!member) return '';
    if (!isPresentationMode) return member.name;
    return anonymizeName(member.name, getMemberIndex(), 'Team Member');
  };

  // Helper to get display email
  const getDisplayEmail = () => {
    if (!member) return '';
    if (!isPresentationMode) return member.email;
    return anonymizeEmail(member.email);
  };

  // Helper to get display notes
  const getDisplayNotes = () => {
    if (!member) return '';
    if (!isPresentationMode) return member.notes;
    return anonymizeNotes(member.notes);
  };

  // Helper to get initials for avatar
  const getDisplayInitials = () => {
    if (!member) return '';
    if (isPresentationMode) {
      return getAnonymizedInitials(getMemberIndex(), 'TM');
    }
    return member.name.split(' ').map(n => n[0]).join('');
  };

  // Helper to get anonymized name for any team member by ID
  const getAnonymizedTeamMemberName = (tmId) => {
    if (!isPresentationMode) {
      const tm = allTeamMembers.find(m => String(m.id) === String(tmId));
      return tm?.name || 'Unknown';
    }
    const index = allTeamMembers.findIndex(m => String(m.id) === String(tmId));
    return anonymizeName('', index, 'Team Member');
  };

  // Helper to get anonymized name for stakeholder by ID
  const getAnonymizedStakeholderName = (sId) => {
    if (!isPresentationMode) {
      const s = allStakeholders.find(st => String(st.id) === String(sId));
      return s?.name || 'Unknown';
    }
    const index = allStakeholders.findIndex(st => String(st.id) === String(sId));
    return anonymizeName('', index, 'Stakeholder');
  };
  const [showNewMeetingDialog, setShowNewMeetingDialog] = useState(false);
  const [showActionItemDialog, setShowActionItemDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [noteForm, setNoteForm] = useState({
    text: "",
    referenced_entity: { type: "team_member", id: "" },
  });
  const [selectedMeetingForNote, setSelectedMeetingForNote] = useState(null);

  const [meetingForm, setMeetingForm] = useState({
    date: new Date().toISOString(),
    notes: "",
    mood: "good",
    topics_discussed: [],
    next_meeting_date: "",
    action_items: []
  });

  const [actionItemForm, setActionItemForm] = useState({
    description: "",
    due_date: "",
    linked_task_id: "",
    linked_project_id: "",
    status: "open"
  });

  const [noteTagType, setNoteTagType] = useState("none");
  const [noteTagId, setNoteTagId] = useState("");

  const [discussedNotes, setDiscussedNotes] = useState(() => {
    // Load discussed notes from localStorage
    try {
      return JSON.parse(localStorage.getItem('discussedNotes') || '{}');
    } catch {
      return {};
    }
  });

  // Edit Team Member state
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    department: "",
    skills: [],
    notes: "",
  });

  // Edit Meeting state
  const [showEditMeetingDialog, setShowEditMeetingDialog] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [editMeetingForm, setEditMeetingForm] = useState({
    date: "",
    mood: "good",
    next_meeting_date: "",
  });

  useEffect(() => {
    if (memberId) {
      loadData();
    }
  }, [memberId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const memberData = await TeamMember.get(memberId);
      setMember(memberData);
      await refreshAll();
      // Fetch fresh one-on-ones directly from API to avoid stale closure data
      const allOneOnOnes = await OneOnOne.list();
      const memberOneOnOnes = (Array.isArray(allOneOnOnes) ? allOneOnOnes : []).filter(o => String(o.team_member_id) === String(memberId));
      setOneOnOnes(memberOneOnOnes);
      // Load time off for this team member
      await loadTimeOffs();
    } catch (error) {
      logger.error("Error loading team member data", { error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const loadTimeOffs = async () => {
    try {
      const entries = await TimeOff.listByTeamMember(memberId);
      setTimeOffs(Array.isArray(entries) ? entries : []);
    } catch (error) {
      logger.error("Error loading time off", { error: String(error) });
      setTimeOffs([]);
    }
  };

  const handleCreateMeeting = async () => {
    try {
      await OneOnOne.create({
        ...meetingForm,
        notes: Array.isArray(meetingForm.notes) ? meetingForm.notes : [], // always save as array
        team_member_id: memberId
      });
      setShowNewMeetingDialog(false);
      loadData();
    } catch (error) {
      logger.error("Error creating 1:1 meeting", { error: String(error) });
    }
  };

  const handleCreateActionItem = async () => {
    if (!selectedMeeting) return;

    try {
      const updatedMeeting = {
        ...selectedMeeting,
        action_items: [
          ...(selectedMeeting.action_items || []),
          actionItemForm
        ]
      };

      await OneOnOne.update(selectedMeeting.id, updatedMeeting);
      setShowActionItemDialog(false);
      loadData();
    } catch (error) {
      logger.error("Error adding action item", { error: String(error) });
    }
  };

  // Update handleAddNote to set referenced_entity to null if no tag
  const handleAddNote = async (meetingId) => {
    if (!noteForm.text) return;
    let referenced_entity = null;
    if (noteTagType !== "none" && noteTagId) {
      referenced_entity = { type: noteTagType, id: noteTagId };
    }
    const meeting = oneOnOnes.find(o => o.id === meetingId);
    if (!meeting) return;
    const newNote = {
      text: noteForm.text,
      referenced_entity,
      created_by: memberId,
      timestamp: new Date().toISOString(),
    };
    const updatedNotes = Array.isArray(meeting.notes) ? [...meeting.notes, newNote] : [newNote];
    await OneOnOne.update(meetingId, { ...meeting, notes: updatedNotes });
    setNoteForm({ text: "", referenced_entity: { type: "team_member", id: "" } });
    setSelectedMeetingForNote(null);
    loadData();
  };

  const updateActionItemStatus = async (meetingId, actionItemIndex, newStatus) => {
    try {
      const meeting = oneOnOnes.find(o => o.id === meetingId);
      if (!meeting) return;

      const updatedActionItems = [...meeting.action_items];
      updatedActionItems[actionItemIndex] = {
        ...updatedActionItems[actionItemIndex],
        status: newStatus
      };

      await OneOnOne.update(meetingId, {
        ...meeting,
        action_items: updatedActionItems
      });
      loadData();
    } catch (error) {
      logger.error("Error updating action item status", { error: String(error) });
    }
  };

  const persistDiscussedNotes = (updated) => {
    setDiscussedNotes(updated);
    localStorage.setItem('discussedNotes', JSON.stringify(updated));
  };

  const handleDeleteMeeting = async (meetingId) => {
    try {
      await OneOnOne.delete(meetingId);
      loadData();
    } catch (error) {
      logger.error("Error deleting meeting", { error: String(error) });
    }
  };

  // Open edit member dialog
  const openEditMemberDialog = () => {
    if (!member) return;
    setEditMemberForm({
      name: member.name || "",
      role: member.role || "",
      email: member.email || "",
      phone: member.phone || "",
      department: member.department || "",
      skills: Array.isArray(member.skills) ? member.skills : [],
      notes: member.notes || "",
    });
    setShowEditMemberDialog(true);
  };

  // Handle update team member
  const handleUpdateMember = async () => {
    try {
      await TeamMember.update(memberId, {
        name: editMemberForm.name,
        email: editMemberForm.email || null,
        role: editMemberForm.role || null,
        phone: editMemberForm.phone || null,
        department: editMemberForm.department || null,
        skills: Array.isArray(editMemberForm.skills) ? editMemberForm.skills : [],
        notes: editMemberForm.notes || null,
      });
      setShowEditMemberDialog(false);
      loadData();
    } catch (error) {
      logger.error("Error updating team member", { error: String(error) });
    }
  };

  // Open edit meeting dialog
  const openEditMeetingDialog = (meeting) => {
    setEditingMeeting(meeting);
    setEditMeetingForm({
      date: meeting.date || "",
      mood: meeting.mood || "good",
      next_meeting_date: meeting.next_meeting_date || "",
    });
    setShowEditMeetingDialog(true);
  };

  // Handle update meeting
  const handleUpdateMeeting = async () => {
    if (!editingMeeting) return;
    try {
      await OneOnOne.update(editingMeeting.id, {
        ...editingMeeting,
        date: editMeetingForm.date,
        mood: editMeetingForm.mood,
        next_meeting_date: editMeetingForm.next_meeting_date || null,
      });
      setShowEditMeetingDialog(false);
      setEditingMeeting(null);
      loadData();
    } catch (error) {
      logger.error("Error updating meeting", { error: String(error) });
    }
  };

  // Handle time off form submission
  const handleTimeOffSubmit = async (data) => {
    setTimeOffLoading(true);
    try {
      if (editingTimeOff) {
        await TimeOff.update(editingTimeOff.id, data);
      } else {
        await TimeOff.create(data);
      }
      await loadTimeOffs();
      setShowTimeOffForm(false);
      setEditingTimeOff(null);
    } catch (error) {
      logger.error("Error saving time off", { error: String(error) });
    } finally {
      setTimeOffLoading(false);
    }
  };

  // Handle time off deletion
  const handleDeleteTimeOff = async (id) => {
    try {
      await TimeOff.delete(id);
      await loadTimeOffs();
    } catch (error) {
      logger.error("Error deleting time off", { error: String(error) });
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!member) {
    return <div className="p-6">Team member not found</div>;
  }

  const getStatusBadge = (status) => {
    const statusStyles = {
      open: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800"
    };
    return statusStyles[status] || "bg-gray-100 text-gray-800";
  };

  const getMoodIcon = (mood) => {
    const moodIcons = {
      great: "😄",
      good: "🙂",
      neutral: "😐",
      concerned: "😟"
    };
    return moodIcons[mood] || "😐";
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/team">
            <Button variant="ghost">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Team
            </Button>
          </Link>

          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {member.avatar && !isPresentationMode ? (
                <AvatarImage src={member.avatar} alt={getDisplayName()} />
              ) : (
                <AvatarFallback>
                  {getDisplayInitials()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{getDisplayName()}</h1>
              <p className="text-gray-500">{member.role}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Work Items and 1:1s */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Work Section */}
            <CurrentWorkSection teamMemberId={memberId} />

            {/* 1:1 Meetings Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>1:1 Meetings</CardTitle>
                  <Button onClick={() => setShowNewMeetingDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New 1:1
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {oneOnOnes.length === 0 ? (
                  <div className="text-center py-6">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No 1:1 meetings recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {oneOnOnes
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(meeting => (
                        <Card key={meeting.id}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="flex items-center gap-2">
                                  {format(parseISO(meeting.date), "PPP")}
                                  <span className="text-xl">
                                    {getMoodIcon(meeting.mood)}
                                  </span>
                                </CardTitle>
                                <CardDescription>
                                  Next meeting: {meeting.next_meeting_date ? 
                                    format(parseISO(meeting.next_meeting_date), "PPP") :
                                    "Not scheduled"}
                                </CardDescription>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedMeeting(meeting);
                                    setShowActionItemDialog(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Action Item
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditMeetingDialog(meeting)}
                                  title="Edit meeting"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteMeeting(meeting.id)}
                                  title="Delete meeting"
                                >
                                  <Trash2 className="h-5 w-5 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {/* Show only notes that are untagged or tagged with someone else */}
                              {Array.isArray(meeting.notes) && meeting.notes.filter(n => n.text && n.text !== '{}' && (!n.referenced_entity || !n.referenced_entity.id || String(n.referenced_entity.id) !== String(memberId))).length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Notes</h4>
                                  {isPresentationMode ? (
                                    <p className="text-gray-400 italic">[Meeting notes hidden]</p>
                                  ) : (
                                    <ul className="list-disc pl-5">
                                      {meeting.notes.filter(n => n.text && n.text !== '{}' && (!n.referenced_entity || !n.referenced_entity.id || String(n.referenced_entity.id) !== String(memberId))).map((n, i) => (
                                        <li key={i} className="mb-1">
                                          <span>{n.text}</span>
                                          {n.referenced_entity?.id && (
                                            <span className="ml-2 text-xs bg-gray-200 rounded px-2 py-0.5">
                                              {n.referenced_entity.type === "team_member" &&
                                                getAnonymizedTeamMemberName(n.referenced_entity.id)}
                                              {n.referenced_entity.type === "stakeholder" &&
                                                getAnonymizedStakeholderName(n.referenced_entity.id)}
                                              {n.referenced_entity.type === "project" &&
                                                projects.find(p => String(p.id) === String(n.referenced_entity.id))?.name}
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                              {/* Add Note form for this meeting */}
                              <div className="mt-2 flex gap-2 items-end">
                                <Input
                                  className="flex-1"
                                  placeholder="Note text..."
                                  value={selectedMeetingForNote === meeting.id ? noteForm.text : ""}
                                  onChange={e => {
                                    setSelectedMeetingForNote(meeting.id);
                                    setNoteForm(f => ({ ...f, text: e.target.value }));
                                  }}
                                />
                                <Select
                                  value={selectedMeetingForNote === meeting.id ? noteTagType : "none"}
                                  onValueChange={val => {
                                    setSelectedMeetingForNote(meeting.id);
                                    setNoteTagType(val);
                                    setNoteTagId("");
                                    setNoteForm(f => ({ ...f, referenced_entity: val === "none" ? null : { type: val, id: "" } }));
                                  }}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="No tag" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No tag</SelectItem>
                                    <SelectItem value="team_member">Team Members</SelectItem>
                                    <SelectItem value="stakeholder">Stakeholders</SelectItem>
                                    <SelectItem value="project">Projects</SelectItem>
                                  </SelectContent>
                                </Select>
                                {noteTagType !== "none" && selectedMeetingForNote === meeting.id && (
                                  <Select
                                    value={noteTagId}
                                    onValueChange={val => {
                                      setNoteTagId(val);
                                      setNoteForm(f => ({ ...f, referenced_entity: { type: noteTagType, id: val } }));
                                    }}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue placeholder="Select name" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {noteTagType === "team_member" &&
                                        allTeamMembers.filter(tm => tm.id.toString() !== memberId?.toString()).map(tm => (
                                          <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                                        ))}
                                      {noteTagType === "stakeholder" &&
                                        allStakeholders.map(s => (
                                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                      {noteTagType === "project" &&
                                        projects.map(p => (
                                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                <Button
                                  onClick={() => {
                                    setSelectedMeetingForNote(meeting.id);
                                    handleAddNote(meeting.id);
                                  }}
                                  disabled={!noteForm.text || (noteTagType !== "none" && !noteTagId) || selectedMeetingForNote !== meeting.id}
                                >
                                  Add
                                </Button>
                              </div>

                              {meeting.topics_discussed?.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Topics Discussed</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {meeting.topics_discussed.map((topic, i) => (
                                      <Badge key={i} variant="secondary">
                                        {topic}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {meeting.action_items?.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Action Items</h4>
                                  {isPresentationMode ? (
                                    <p className="text-gray-400 italic">[Action items hidden]</p>
                                  ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Links</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {meeting.action_items.map((item, index) => (
                                        <TableRow key={index}>
                                          <TableCell>{item.description}</TableCell>
                                          <TableCell>
                                            {item.due_date ? 
                                              format(parseISO(item.due_date), "MMM d, yyyy") :
                                              "No due date"}
                                          </TableCell>
                                          <TableCell>
                                            <Badge className={getStatusBadge(item.status)}>
                                              {item.status}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            {(item.linked_task_id || item.linked_project_id) && (
                                              <div className="flex items-center gap-2">
                                                {item.linked_task_id && (
                                                  <Badge variant="outline" className="flex items-center gap-1">
                                                    <LinkIcon className="h-3 w-3" />
                                                    Task
                                                  </Badge>
                                                )}
                                                {item.linked_project_id && (
                                                  <Badge variant="outline" className="flex items-center gap-1">
                                                    <LinkIcon className="h-3 w-3" />
                                                    Project
                                                  </Badge>
                                                )}
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => updateActionItemStatus(meeting.id, index, "completed")}
                                                disabled={item.status === "completed"}
                                              >
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => updateActionItemStatus(meeting.id, index, "in_progress")}
                                                disabled={item.status === "in_progress"}
                                              >
                                                <Clock className="h-4 w-4 text-blue-500" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Team Member Info</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openEditMemberDialog}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {member.department && (
                    <div>
                      <Label>Department</Label>
                      <p className="text-gray-600">{member.department}</p>
                    </div>
                  )}
                  {member.skills?.length > 0 && (
                    <div>
                      <Label>Skills</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {member.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {member.notes && (
                    <div>
                      <Label>Notes</Label>
                      <p className="text-gray-600 whitespace-pre-wrap">{getDisplayNotes()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Last 1:1</Label>
                    <p className="text-gray-600">
                      {oneOnOnes[0] ?
                        format(parseISO(oneOnOnes[0].date), "PPP") :
                        "No meetings yet"}
                    </p>
                  </div>
                  <div>
                    <Label>Open Action Items</Label>
                    <p className="text-gray-600">
                      {oneOnOnes.reduce((count, meeting) =>
                        count + (meeting.action_items?.filter(item => item.status !== "completed").length || 0),
                      0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Developer Goals */}
            <DeveloperGoalsCard teamMemberId={memberId} />

            {/* Performance Evaluation */}
            <PerformanceEvaluationCard teamMemberId={memberId} />

            {/* Time Off */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Palmtree className="h-5 w-5 text-blue-600" />
                    Time Off
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTimeOff(null);
                      setShowTimeOffForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {timeOffs.length === 0 ? (
                  <div className="text-center py-4">
                    <Palmtree className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No time off recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Upcoming time off */}
                    {timeOffs.filter(t => isFuture(parseISO(t.start_date)) || isFuture(parseISO(t.end_date))).length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Upcoming</h4>
                        <div className="space-y-2">
                          {timeOffs
                            .filter(t => isFuture(parseISO(t.start_date)) || isFuture(parseISO(t.end_date)))
                            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
                            .map(timeOff => (
                              <TimeOffCard
                                key={timeOff.id}
                                timeOff={timeOff}
                                compact={true}
                                showTeamMember={false}
                                onEdit={(t) => {
                                  setEditingTimeOff(t);
                                  setShowTimeOffForm(true);
                                }}
                                onDelete={handleDeleteTimeOff}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                    {/* Past time off */}
                    {timeOffs.filter(t => isPast(parseISO(t.end_date))).length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Past</h4>
                        <div className="space-y-2">
                          {timeOffs
                            .filter(t => isPast(parseISO(t.end_date)))
                            .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                            .slice(0, 3)
                            .map(timeOff => (
                              <TimeOffCard
                                key={timeOff.id}
                                timeOff={timeOff}
                                compact={true}
                                showTeamMember={false}
                                onEdit={(t) => {
                                  setEditingTimeOff(t);
                                  setShowTimeOffForm(true);
                                }}
                                onDelete={handleDeleteTimeOff}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* New Meeting Dialog */}
      <Dialog open={showNewMeetingDialog} onOpenChange={setShowNewMeetingDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New 1:1 Meeting</DialogTitle>
            <DialogDescription>
              Record a new one-on-one meeting with {member?.name || 'this team member'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {meetingForm.date ? 
                      format(parseISO(meetingForm.date), "PPP") : 
                      "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={meetingForm.date ? parseISO(meetingForm.date) : undefined}
                    onSelect={(date) => setMeetingForm(prev => ({
                      ...prev,
                      date: date?.toISOString()
                    }))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Mood</Label>
              <Select
                value={meetingForm.mood}
                onValueChange={(value) => setMeetingForm(prev => ({
                  ...prev,
                  mood: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="great">Great 😄</SelectItem>
                  <SelectItem value="good">Good 🙂</SelectItem>
                  <SelectItem value="neutral">Neutral 😐</SelectItem>
                  <SelectItem value="concerned">Concerned 😟</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Structured Notes UI */}
            <div className="space-y-2">
              <Label>Notes</Label>
              {/* List of notes to be added to this meeting */}
              {Array.isArray(meetingForm.notes) && meetingForm.notes.length > 0 && (
                <ul className="list-disc pl-5 mb-2">
                  {meetingForm.notes.map((n, i) => (
                    <li key={i} className="mb-1 flex items-center gap-2">
                      <span>{n.text}</span>
                      {n.referenced_entity?.id && (
                        <span className="ml-2 text-xs bg-gray-200 rounded px-2 py-0.5">
                          {n.referenced_entity.type === "team_member" &&
                            allTeamMembers.find(tm => tm.id === n.referenced_entity.id)?.name}
                          {n.referenced_entity.type === "stakeholder" &&
                            allStakeholders.find(s => s.id === n.referenced_entity.id)?.name}
                          {n.referenced_entity.type === "project" &&
                            projects.find(p => p.id === n.referenced_entity.id)?.name}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="xs"
                        className="ml-2"
                        onClick={() => setMeetingForm(prev => ({
                          ...prev,
                          notes: prev.notes.filter((_, idx) => idx !== i)
                        }))}
                      >Remove</Button>
                    </li>
                  ))}
                </ul>
              )}
              {/* Add note form for new meeting */}
              <div className="flex gap-2 items-end">
                <Input
                  className="flex-1"
                  placeholder="Note text..."
                  value={noteForm.text}
                  onChange={e => setNoteForm(f => ({ ...f, text: e.target.value }))}
                />
                {/* Tag type dropdown */}
                <Select
                  value={noteTagType}
                  onValueChange={val => {
                    setNoteTagType(val);
                    setNoteTagId("");
                    setNoteForm(f => ({ ...f, referenced_entity: { type: val, id: "" } }));
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="No tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tag</SelectItem>
                    <SelectItem value="team_member">Team Members</SelectItem>
                    <SelectItem value="stakeholder">Stakeholders</SelectItem>
                    <SelectItem value="project">Projects</SelectItem>
                  </SelectContent>
                </Select>
                {/* Entity name dropdown, only if a type is selected and not 'none' */}
                {noteTagType !== "none" && (
                  <Select
                    value={noteTagId}
                    onValueChange={val => {
                      setNoteTagId(val);
                      setNoteForm(f => ({ ...f, referenced_entity: { type: noteTagType, id: val } }));
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select name" />
                    </SelectTrigger>
                    <SelectContent>
                      {noteTagType === "team_member" &&
                        allTeamMembers.filter(tm => tm.id !== memberId).map(tm => (
                          <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                        ))}
                      {noteTagType === "stakeholder" &&
                        allStakeholders.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      {noteTagType === "project" &&
                        projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  onClick={() => {
                    if (!noteForm.text) return;
                    setMeetingForm(prev => ({
                      ...prev,
                      notes: [
                        ...(Array.isArray(prev.notes) ? prev.notes : []),
                        {
                          text: noteForm.text,
                          referenced_entity: noteTagType === "none" ? {} : { type: noteTagType, id: noteTagId },
                          created_by: memberId,
                          timestamp: new Date().toISOString(),
                        }
                      ]
                    }));
                    setNoteForm({ text: "", referenced_entity: { type: "team_member", id: "" } });
                    setNoteTagType("none");
                    setNoteTagId("");
                  }}
                  disabled={!noteForm.text || (noteTagType !== "none" && !noteTagId)}
                >
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Next Meeting Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {meetingForm.next_meeting_date ? 
                      format(parseISO(meetingForm.next_meeting_date), "PPP") : 
                      "Schedule next meeting"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={meetingForm.next_meeting_date ? parseISO(meetingForm.next_meeting_date) : undefined}
                    onSelect={(date) => setMeetingForm(prev => ({
                      ...prev,
                      next_meeting_date: date?.toISOString()
                    }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMeetingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMeeting}>Create Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Action Item Dialog */}
      <Dialog open={showActionItemDialog} onOpenChange={setShowActionItemDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Action Item</DialogTitle>
            <DialogDescription>
              Create a new action item to track follow-up tasks from this meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={actionItemForm.description}
                onChange={(e) => setActionItemForm(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder="What needs to be done?"
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {actionItemForm.due_date ? 
                      format(parseISO(actionItemForm.due_date), "PPP") : 
                      "Set due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={actionItemForm.due_date ? parseISO(actionItemForm.due_date) : undefined}
                    onSelect={(date) => setActionItemForm(prev => ({
                      ...prev,
                      due_date: date?.toISOString()
                    }))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Link to Task (Optional)</Label>
              <Select
                value={actionItemForm.linked_task_id}
                onValueChange={(value) => setActionItemForm(prev => ({
                  ...prev,
                  linked_task_id: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {tasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Link to Project (Optional)</Label>
              <Select
                value={actionItemForm.linked_project_id}
                onValueChange={(value) => setActionItemForm(prev => ({
                  ...prev,
                  linked_project_id: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateActionItem}>Add Action Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Member Dialog */}
      <Dialog open={showEditMemberDialog} onOpenChange={setShowEditMemberDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editMemberForm.name}
                onChange={(e) => setEditMemberForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role / Position</Label>
                <Input
                  id="edit-role"
                  value={editMemberForm.role}
                  onChange={(e) => setEditMemberForm(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. Product Manager"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={editMemberForm.department}
                  onChange={(e) => setEditMemberForm(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g. Engineering"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editMemberForm.email}
                  onChange={(e) => setEditMemberForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editMemberForm.phone}
                  onChange={(e) => setEditMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-skills">Skills</Label>
              <TagInput
                value={editMemberForm.skills || []}
                onChange={(skills) => setEditMemberForm(prev => ({ ...prev, skills }))}
                placeholder="Enter skills, press Enter or comma to add"
              />
              <p className="text-xs text-gray-500">Press Enter or comma after each skill</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editMemberForm.notes}
                onChange={(e) => setEditMemberForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional information"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditMemberDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMember}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Meeting Dialog */}
      <Dialog open={showEditMeetingDialog} onOpenChange={setShowEditMeetingDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit 1:1 Meeting</DialogTitle>
            <DialogDescription>
              Update meeting details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editMeetingForm.date ?
                      format(parseISO(editMeetingForm.date), "PPP") :
                      "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editMeetingForm.date ? parseISO(editMeetingForm.date) : undefined}
                    onSelect={(date) => setEditMeetingForm(prev => ({
                      ...prev,
                      date: date?.toISOString()
                    }))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Mood</Label>
              <Select
                value={editMeetingForm.mood}
                onValueChange={(value) => setEditMeetingForm(prev => ({
                  ...prev,
                  mood: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="great">Great 😄</SelectItem>
                  <SelectItem value="good">Good 🙂</SelectItem>
                  <SelectItem value="neutral">Neutral 😐</SelectItem>
                  <SelectItem value="concerned">Concerned 😟</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Next Meeting Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editMeetingForm.next_meeting_date ?
                      format(parseISO(editMeetingForm.next_meeting_date), "PPP") :
                      "Schedule next meeting"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editMeetingForm.next_meeting_date ? parseISO(editMeetingForm.next_meeting_date) : undefined}
                    onSelect={(date) => setEditMeetingForm(prev => ({
                      ...prev,
                      next_meeting_date: date?.toISOString()
                    }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditMeetingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMeeting}>Update Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Off Form Dialog */}
      <TimeOffForm
        open={showTimeOffForm}
        onOpenChange={(open) => {
          setShowTimeOffForm(open);
          if (!open) setEditingTimeOff(null);
        }}
        onSubmit={handleTimeOffSubmit}
        initialData={editingTimeOff}
        preselectedTeamMemberId={memberId}
        isLoading={timeOffLoading}
      />
    </div>
  );
}