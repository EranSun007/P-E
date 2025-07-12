import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { TeamMember, OneOnOne, Task, Project } from "@/api/entities";
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
} from "lucide-react";

export default function TeamMemberProfile() {
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get("id");

  const [member, setMember] = useState(null);
  const [oneOnOnes, setOneOnOnes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewMeetingDialog, setShowNewMeetingDialog] = useState(false);
  const [showActionItemDialog, setShowActionItemDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

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

  useEffect(() => {
    if (memberId) {
      loadData();
    }
  }, [memberId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load team member details
      const memberData = await TeamMember.get(memberId);
      setMember(memberData);

      // Load 1:1s
      const oneOnOneData = await OneOnOne.list();
      const memberOneOnOnes = oneOnOneData.filter(o => o.team_member_id === memberId);
      setOneOnOnes(memberOneOnOnes);

      // Load tasks and projects for linking
      const taskData = await Task.list();
      const projectData = await Project.list();
      setTasks(taskData);
      setProjects(projectData);
    } catch (error) {
      console.error("Error loading team member data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    try {
      await OneOnOne.create({
        ...meetingForm,
        team_member_id: memberId
      });
      setShowNewMeetingDialog(false);
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
              {member.avatar ? (
                <AvatarImage src={member.avatar} alt={member.name} />
              ) : (
                <AvatarFallback>
                  {member.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{member.name}</h1>
              <p className="text-gray-500">{member.role}</p>
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
                                <CardDescription>
                                  Next meeting: {meeting.next_meeting_date ? 
                                    format(parseISO(meeting.next_meeting_date), "PPP") :
                                    "Not scheduled"}
                                </CardDescription>
                              </div>
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
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {meeting.notes && (
                                <div>
                                  <h4 className="font-medium mb-2">Notes</h4>
                                  <p className="text-gray-600 whitespace-pre-wrap">
                                    {meeting.notes}
                                  </p>
                                </div>
                              )}

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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Member Info</CardTitle>
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
                      <p className="text-gray-600 whitespace-pre-wrap">{member.notes}</p>
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

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={meetingForm.notes}
                onChange={(e) => setMeetingForm(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="Meeting notes and discussion points..."
                rows={4}
              />
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
    </div>
  );
}