/**
 * ScheduleOverview Component
 * Table view showing all recurring 1:1 meeting schedules with management actions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Edit, MoreVertical, Pause, Play, Trash2, Users, Repeat } from 'lucide-react';
import { OneOnOneScheduleService } from '@/services/oneOnOneScheduleService';
import { localClient } from '@/api/localClient';

const ScheduleOverview = ({ onEdit, onDelete, onRefresh }) => {
  const [schedules, setSchedules] = useState([]);
  const [teamMembers, setTeamMembers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Loads all schedules and team member data
   */
  const loadSchedules = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load all schedules
      const allSchedules = await localClient.entities.OneOnOneSchedule.list();

      // Load all team members for name lookup
      const members = await localClient.entities.TeamMember.list();
      const membersMap = {};
      members.forEach(member => {
        membersMap[member.id] = member;
      });

      setSchedules(allSchedules);
      setTeamMembers(membersMap);
    } catch (err) {
      console.error('Error loading schedules:', err);
      setError('Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  };

  // Load schedules on mount
  useEffect(() => {
    loadSchedules();
  }, []);

  // Refresh when parent requests
  useEffect(() => {
    if (onRefresh) {
      loadSchedules();
    }
  }, [onRefresh]);

  /**
   * Handles toggling schedule active status
   */
  const handleToggleActive = async (schedule) => {
    try {
      if (schedule.is_active) {
        await OneOnOneScheduleService.deactivateSchedule(schedule.id);
      } else {
        await OneOnOneScheduleService.activateSchedule(schedule.id);
      }
      await loadSchedules();
    } catch (err) {
      console.error('Error toggling schedule:', err);
      setError(err.message || 'Failed to toggle schedule');
    }
  };

  /**
   * Handles deleting a schedule
   */
  const handleDelete = async (schedule) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the schedule for ${teamMembers[schedule.team_member_id]?.name}?\n\n` +
      `This will also delete all upcoming scheduled meetings.`
    );

    if (!confirmDelete) return;

    try {
      await OneOnOneScheduleService.deleteSchedule(schedule.id, true);
      await loadSchedules();
      if (onDelete) {
        onDelete(schedule);
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError(err.message || 'Failed to delete schedule');
    }
  };

  /**
   * Gets a human-readable frequency label
   */
  const getFrequencyLabel = (schedule) => {
    try {
      return OneOnOneScheduleService.getScheduleDescription(schedule);
    } catch (err) {
      return `${schedule.frequency}`;
    }
  };

  /**
   * Formats date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      return dateString;
    }
  };

  /**
   * Gets status badge for a schedule
   */
  const getStatusBadge = (schedule) => {
    if (!schedule.is_active) {
      return <Badge variant="secondary">Paused</Badge>;
    }

    if (schedule.end_date) {
      const endDate = new Date(schedule.end_date);
      const now = new Date();
      if (endDate < now) {
        return <Badge variant="destructive">Ended</Badge>;
      }
    }

    return <Badge variant="success">Active</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading schedules...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Recurring 1:1 Schedules
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recurring schedules configured yet.</p>
            <p className="text-sm mt-2">Create a schedule from a team member's profile.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Next Meeting</TableHead>
                  <TableHead>Last Meeting</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => {
                  const teamMember = teamMembers[schedule.team_member_id];
                  return (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {teamMember?.name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Repeat className="h-3 w-3" />
                            {getFrequencyLabel(schedule)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {schedule.duration_minutes} min
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(schedule.next_meeting_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(schedule.last_meeting_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(schedule)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onEdit && onEdit(schedule)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Schedule
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(schedule)}
                            >
                              {schedule.is_active ? (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause Schedule
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Resume Schedule
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(schedule)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Schedule
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScheduleOverview;
