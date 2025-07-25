import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Peer, OneOnOne, Task, Project, Stakeholder, OutOfOffice } from "@/api/entities";
import { AgendaService } from "@/utils/agendaService";
import { CalendarService } from "@/utils/calendarService";
import AgendaItemCard from "@/components/agenda/AgendaItemCard";
import AgendaItemList from "@/components/agenda/AgendaItemList";
import PeerOutOfOfficeCounter from "@/components/peer/PeerOutOfOfficeCounter";
import PeerOutOfOfficeManager from "@/components/peer/PeerOutOfOfficeManager";
import { createPageUrl } from "@/utils";
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
} from "lucide-react";

export default function PeerProfile() {
  const [searchParams] = useSearchParams();
  const peerId = searchParams.get("id");

  const [peer, setPeer] = useState(null);
  const [oneOnOnes, setOneOnOnes] = useState([]);
  const [agendaItems, setAgendaItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allPeers, setAllPeers] = useState([]);
  const [allStakeholders, setAllStakeholders] = useState([]);
  const [outOfOfficeStats, setOutOfOfficeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewMeetingDialog, setShowNewMeetingDialog] = useState(false);
  const [showActionItemDialog, setShowActionItemDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [noteForm, setNoteForm] = useState({
    text: "",
    referenced_entity: { type: "peer", id: "" },
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
  const [editingNextMeeting, setEditingNextMeeting] = useState(null);
  const [nextMeetingInfo, setNextMeetingInfo] = useState(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");

  const [discussedNotes, setDiscussedNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('discussedNotes') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (peerId) {
      loadData();
    }
  }, [peerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const peerData = await Peer.get(peerId);
      setPeer(peerData);
      const oneOnOneData = await OneOnOne.list();
      const peerOneOnOnes = oneOnOneData.filter(o => o.peer_id === peerId);
      setOneOnOnes(peerOneOnOnes);
      try {
        const peerAgendaItems = await AgendaService.getAgendaItemsForPeer?.(peerId) || [];
        setAgendaItems(peerAgendaItems);
      } catch (agendaError) {
        console.error("Error loading agenda items:", agendaError);
        setAgendaItems([]);
      }
      const taskData = await Task.list();
      const projectData = await Project.list();
      setTasks(taskData);
      setProjects(projectData);
      setAllPeers(await Peer.list());
      setAllStakeholders(await Stakeholder.list());
      await loadNextMeetingInfo(peerOneOnOnes);
    } catch (error) {
      console.error("Error loading peer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNextMeetingInfo = async (peerOneOnOnes) => {
    try {
      const meetingsWithNextDate = peerOneOnOnes
        .filter(meeting => meeting.next_meeting_date)
        .sort((a, b) => new Date(a.next_meeting_date) - new Date(b.next_meeting_date));
      if (meetingsWithNextDate.length > 0) {
        const nextMeeting = meetingsWithNextDate[0];
        let calendarEvent = null;
        if (nextMeeting.next_meeting_calendar_event_id) {
          try {
            const calendarEvents = await CalendarService.getOneOnOneMeetingsForPeer?.(peerId);
            calendarEvent = calendarEvents?.find(event => event.id === nextMeeting.next_meeting_calendar_event_id);
          } catch (calendarError) {
            console.error('Error loading calendar event:', calendarError);
          }
        }
        setNextMeetingInfo({
          oneOnOne: nextMeeting,
          calendarEvent,
          hasCalendarEvent: !!calendarEvent,
          meetingDate: nextMeeting.next_meeting_date
        });
      } else {
        setNextMeetingInfo(null);
      }
    } catch (error) {
      console.error("Error loading next meeting info:", error);
      setNextMeetingInfo(null);
    }
  };

  const handleCreateMeeting = async () => {
    try {
      // Create the OneOnOne meeting first
      const createdMeeting = await OneOnOne.create({
        ...meetingForm,
        notes: Array.isArray(meetingForm.notes) ? meetingForm.notes : [], // always save as array
        peer_id: peerId
      });

      // If next_meeting_date is set, create a calendar event
      if (meetingForm.next_meeting_date && peer) {
        try {
          const result = await CalendarService.createAndLinkOneOnOneMeetingForPeer?.(
            createdMeeting.id,
            peerId,
            meetingForm.next_meeting_date
          );
          console.log('Calendar event created successfully:', result?.calendarEvent);
        } catch (calendarError) {
          console.error('Error creating calendar event:', calendarError);
          // Don't fail the entire operation if calendar creation fails
        }
      }

      setShowNewMeetingDialog(false);
      setMeetingForm({
        date: new Date().toISOString(),
        notes: "",
        mood: "good",
        topics_discussed: [],
        next_meeting_date: "",
        action_items: []
      });
      loadData();
    } catch (error) {
      console.error("Error creating 1:1 meeting:", error);
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
      console.error("Error adding action item:", error);
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
      created_by: peerId,
      timestamp: new Date().toISOString(),
    };
    const updatedNotes = Array.isArray(meeting.notes) ? [...meeting.notes, newNote] : [newNote];
    await OneOnOne.update(meetingId, { ...meeting, notes: updatedNotes });
    setNoteForm({ text: "", referenced_entity: { type: "peer", id: "" } });
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
      console.error("Error updating action item status:", error);
    }
  };

  const persistDiscussedNotes = (updated) => {
    setDiscussedNotes(updated);
    localStorage.setItem('discussedNotes', JSON.stringify(updated));
  };

  const handleDeleteMeeting = async (meetingId) => {
    try {
      // First, unlink and delete any associated calendar event
      try {
        await CalendarService.unlinkCalendarEventFromOneOnOne?.(meetingId);
      } catch (calendarError) {
        console.error('Error deleting associated calendar event:', calendarError);
        // Continue with meeting deletion even if calendar cleanup fails
      }

      // Delete the OneOnOne meeting
      await OneOnOne.delete(meetingId);
      loadData();
    } catch (error) {
      console.error("Error deleting meeting:", error);
    }
  };

  const handleMarkAgendaItemDiscussed = async (agendaItem) => {
    try {
      const success = await AgendaService.markAgendaItemDiscussed?.(
        agendaItem.meetingId,
        agendaItem.timestamp
      );
      if (success) {
        // Reload data to reflect the changes
        loadData();
      }
    } catch (error) {
      console.error("Error marking agenda item as discussed:", error);
    }
  };

  const handleUpdateNextMeetingDate = async (meetingId, newDate) => {
    try {
      const meeting = oneOnOnes.find(o => o.id === meetingId);
      if (!meeting) return;

      // Update the OneOnOne record with the new next_meeting_date
      const updatedMeeting = {
        ...meeting,
        next_meeting_date: newDate
      };

      await OneOnOne.update(meetingId, updatedMeeting);

      // Handle calendar event creation/update
      if (newDate && peer) {
        try {
          await CalendarService.updateOneOnOneCalendarEventForPeer?.(
            meetingId,
            newDate
          );
          console.log('Calendar event updated successfully for meeting:', meetingId);
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError);
          // Don't fail the entire operation if calendar update fails
        }
      } else if (!newDate && meeting.next_meeting_calendar_event_id) {
        // If next_meeting_date is cleared, remove the calendar event
        try {
          await CalendarService.unlinkCalendarEventFromOneOnOne?.(meetingId);
          console.log('Calendar event removed for meeting:', meetingId);
        } catch (calendarError) {
          console.error('Error removing calendar event:', calendarError);
        }
      }

      loadData();
    } catch (error) {
      console.error("Error updating next meeting date:", error);
    }
  };

  const handleRescheduleNextMeeting = async () => {
    if (!nextMeetingInfo || !rescheduleDate) return;

    try {
      await handleUpdateNextMeetingDate(nextMeetingInfo.oneOnOne.id, rescheduleDate);
      setShowRescheduleDialog(false);
      setRescheduleDate("");
    } catch (error) {
      console.error("Error rescheduling meeting:", error);
    }
  };

  const handleCancelNextMeeting = async () => {
    if (!nextMeetingInfo) return;

    try {
      await handleUpdateNextMeetingDate(nextMeetingInfo.oneOnOne.id, "");
    } catch (error) {
      console.error("Error canceling meeting:", error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!peer) {
    return <div className="p-6">Peer not found</div>;
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
          <Link to="/peers">
            <Button variant="ghost">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Peers
            </Button>
          </Link>

          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {peer.avatar ? (
                <AvatarImage src={peer.avatar} alt={peer.name} />
              ) : (
                <AvatarFallback>
                  {peer.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{peer.name}</h1>
              <p className="text-gray-500">{peer.role || peer.title}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 1:1s */}
          <div className="lg:col-span-2 space-y-6">
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
                                <CardDescription className="flex items-center gap-2">
                                  {editingNextMeeting === meeting.id ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">Next meeting:</span>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                          >
                                            <CalendarIcon className="mr-1 h-3 w-3" />
                                            {meeting.next_meeting_date ?
                                              format(parseISO(meeting.next_meeting_date), "MMM d") :
                                              "Select date"}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                          <Calendar
                                            mode="single"
                                            selected={meeting.next_meeting_date ? parseISO(meeting.next_meeting_date) : undefined}
                                            onSelect={(date) => {
                                              const newDate = date?.toISOString() || "";
                                              handleUpdateNextMeetingDate(meeting.id, newDate);
                                              setEditingNextMeeting(null);
                                            }}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => setEditingNextMeeting(null)}
                                      >
                                        Cancel
                                      </Button>
                                      {meeting.next_meeting_date && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 text-red-500"
                                          onClick={() => {
                                            handleUpdateNextMeetingDate(meeting.id, "");
                                            setEditingNextMeeting(null);
                                          }}
                                        >
                                          Clear
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span>Next meeting: {meeting.next_meeting_date ?
                                        format(parseISO(meeting.next_meeting_date), "PPP") :
                                        "Not scheduled"}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => setEditingNextMeeting(meeting.id)}
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  )}
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
                              {Array.isArray(meeting.notes) && meeting.notes.filter(n => !n.referenced_entity || !n.referenced_entity.id || String(n.referenced_entity.id) !== String(peerId)).length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Notes</h4>
                                  <ul className="list-disc pl-5">
                                    {meeting.notes.filter(n => !n.referenced_entity || !n.referenced_entity.id || String(n.referenced_entity.id) !== String(peerId)).map((n, i) => (
                                      <li key={i} className="mb-1">
                                        <span>{n.text}</span>
                                        {n.referenced_entity?.id && (
                                          <span className="ml-2 text-xs bg-gray-200 rounded px-2 py-0.5">
                                            {n.referenced_entity.type === "peer" &&
                                              allPeers.find(p => String(p.id) === String(n.referenced_entity.id))?.name}
                                            {n.referenced_entity.type === "stakeholder" &&
                                              allStakeholders.find(s => String(s.id) === String(n.referenced_entity.id))?.name}
                                            {n.referenced_entity.type === "project" &&
                                              projects.find(p => String(p.id) === String(n.referenced_entity.id))?.name}
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
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
                                    <SelectItem value="peer">Peers</SelectItem>
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
                                      {noteTagType === "peer" &&
                                        allPeers.filter(p => p.id.toString() !== peerId?.toString()).map(p => (
                                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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

            {/* Out of Office Management */}
            <PeerOutOfOfficeManager
              peerId={peerId}
              peerName={peer?.name}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Peer Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {peer.company && (
                    <div>
                      <Label>Company</Label>
                      <p className="text-gray-600">{peer.company}</p>
                    </div>
                  )}
                  {peer.department && (
                    <div>
                      <Label>Department</Label>
                      <p className="text-gray-600">{peer.department}</p>
                    </div>
                  )}
                  {peer.skills?.length > 0 && (
                    <div>
                      <Label>Skills</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {peer.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {peer.notes && (
                    <div>
                      <Label>Notes</Label>
                      <p className="text-gray-600 whitespace-pre-wrap">{peer.notes}</p>
                    </div>
                  )}
                  {peer.contact_info && (
                    <div>
                      <Label>Contact Info</Label>
                      <p className="text-gray-600">{peer.contact_info}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Out of Office Counter */}
            <PeerOutOfOfficeCounter
              peerId={peerId}
              showBreakdown={true}
              showYearSelector={true}
              onStatsChange={setOutOfOfficeStats}
            />

            {/* Next 1:1 Meeting Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Next 1:1 Meeting
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextMeetingInfo ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Scheduled Date</Label>
                      <p className="text-gray-900 font-medium">
                        {format(parseISO(nextMeetingInfo.meetingDate), "PPP 'at' p")}
                      </p>
                    </div>
                    
                    <div>
                      <Label>Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {nextMeetingInfo.hasCalendarEvent ? (
                          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Calendar Event Created
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-700 border-yellow-200 bg-yellow-50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            No Calendar Event
                          </Badge>
                        )}
                      </div>
                    </div>

                    {nextMeetingInfo.calendarEvent && (
                      <div>
                        <Label>Calendar Event</Label>
                        <p className="text-sm text-gray-600">
                          {nextMeetingInfo.calendarEvent.title}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRescheduleDate(nextMeetingInfo.meetingDate);
                          setShowRescheduleDialog(true);
                        }}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Reschedule
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelNextMeeting}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No upcoming 1:1 scheduled</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Schedule your next meeting from any 1:1 record
                    </p>
                  </div>
                )}
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
                    <Label>Meeting Frequency</Label>
                    <p className="text-gray-600">
                      {oneOnOnes.length > 1 ? (
                        (() => {
                          const sortedMeetings = oneOnOnes
                            .filter(m => m.date)
                            .sort((a, b) => new Date(b.date) - new Date(a.date));
                          
                          if (sortedMeetings.length < 2) return "Insufficient data";
                          
                          const daysBetween = Math.round(
                            (new Date(sortedMeetings[0].date) - new Date(sortedMeetings[1].date)) / (1000 * 60 * 60 * 24)
                          );
                          
                          if (daysBetween <= 10) return "Weekly";
                          if (daysBetween <= 20) return "Bi-weekly";
                          if (daysBetween <= 35) return "Monthly";
                          return "Irregular";
                        })()
                      ) : (
                        "No pattern yet"
                      )}
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
                  
                  <div>
                    <Label>Agenda Items</Label>
                    <p className="text-gray-600">
                      {agendaItems.length} total, {agendaItems.filter(item => !item.isDiscussed).length} pending
                    </p>
                  </div>

                  <div>
                    <Label>Total 1:1s</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-600">{oneOnOnes.length}</p>
                      {oneOnOnes.length > 0 && (
                        <span className="text-xs text-gray-500">
                          (since {format(parseISO(oneOnOnes[oneOnOnes.length - 1].date), "MMM yyyy")})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Agenda Items Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Next Agenda Items
                </CardTitle>
                <CardDescription>
                  Items from other meetings where you are tagged
                </CardDescription>
              </CardHeader>
              <CardContent>
                {agendaItems.length === 0 ? (
                  <div className="text-center py-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No agenda items yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You'll see items here when others tag you in their meeting notes
                    </p>
                  </div>
                ) : (
                  <AgendaItemList
                    agendaItems={agendaItems.slice(0, 5)} // Show only first 5 items
                    peers={allPeers.reduce((acc, peer) => {
                      acc[peer.id] = peer;
                      return acc;
                    }, {})}
                    onMarkDiscussed={handleMarkAgendaItemDiscussed}
                    showActions={true}
                    emptyMessage="No agenda items found"
                  />
                )}
                {agendaItems.length > 5 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground text-center">
                      Showing 5 of {agendaItems.length} items
                    </p>
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
                          {n.referenced_entity.type === "peer" &&
                            allPeers.find(p => p.id === n.referenced_entity.id)?.name}
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
                    <SelectItem value="peer">Peers</SelectItem>
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
                      {noteTagType === "peer" &&
                        allPeers.filter(p => p.id !== peerId).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                          created_by: peerId,
                          timestamp: new Date().toISOString(),
                        }
                      ]
                    }));
                    setNoteForm({ text: "", referenced_entity: { type: "peer", id: "" } });
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

      {/* Reschedule Meeting Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reschedule Next 1:1 Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Date</Label>
              <p className="text-sm text-gray-600">
                {nextMeetingInfo && format(parseISO(nextMeetingInfo.meetingDate), "PPP 'at' p")}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>New Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {rescheduleDate ?
                      format(parseISO(rescheduleDate), "PPP") :
                      "Select new date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate ? parseISO(rescheduleDate) : undefined}
                    onSelect={(date) => setRescheduleDate(date?.toISOString() || "")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRescheduleDialog(false);
              setRescheduleDate("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleRescheduleNextMeeting}
              disabled={!rescheduleDate}
            >
              Reschedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
