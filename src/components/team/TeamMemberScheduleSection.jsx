/**
 * TeamMemberScheduleSection Component
 * Displays and manages recurring 1:1 schedule for a team member
 * Can be embedded in the TeamMemberProfile page
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Repeat, Calendar, Clock, Edit, Play, Pause, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import { OneOnOneScheduleService } from '@/services/oneOnOneScheduleService';
import ScheduleConfigForm from './ScheduleConfigForm';
import ScheduleIndicator from './ScheduleIndicator';

const TeamMemberScheduleSection = ({ teamMemberId, teamMemberName, onScheduleChange }) => {
  const [schedule, setSchedule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  /**
   * Loads the schedule for the team member
   */
  const loadSchedule = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const memberSchedule = await OneOnOneScheduleService.getScheduleByTeamMember(teamMemberId);
      setSchedule(memberSchedule);
    } catch (err) {
      console.error('Error loading schedule:', err);
      setError('Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  };

  // Load schedule on mount
  useEffect(() => {
    if (teamMemberId) {
      loadSchedule();
    }
  }, [teamMemberId]);

  /**
   * Handles form submission (create or update)
   */
  const handleFormSubmit = async () => {
    setShowForm(false);
    setIsEditing(false);
    await loadSchedule();
    if (onScheduleChange) {
      onScheduleChange();
    }
  };

  /**
   * Handles toggling schedule active status
   */
  const handleToggleActive = async () => {
    if (!schedule) return;

    try {
      if (schedule.is_active) {
        await OneOnOneScheduleService.deactivateSchedule(schedule.id);
      } else {
        await OneOnOneScheduleService.activateSchedule(schedule.id);
      }
      await loadSchedule();
      if (onScheduleChange) {
        onScheduleChange();
      }
    } catch (err) {
      console.error('Error toggling schedule:', err);
      setError(err.message || 'Failed to toggle schedule');
    }
  };

  /**
   * Handles deleting the schedule
   */
  const handleDelete = async () => {
    if (!schedule) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the recurring schedule for ${teamMemberName}?\n\n` +
      `This will also delete all upcoming scheduled meetings.`
    );

    if (!confirmDelete) return;

    try {
      await OneOnOneScheduleService.deleteSchedule(schedule.id, true);
      setSchedule(null);
      if (onScheduleChange) {
        onScheduleChange();
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError(err.message || 'Failed to delete schedule');
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
   * Gets the schedule description
   */
  const getScheduleDescription = () => {
    if (!schedule) return '';
    try {
      return OneOnOneScheduleService.getScheduleDescription(schedule);
    } catch (err) {
      return `${schedule.frequency} meetings`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Recurring 1:1 Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Loading schedule...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Recurring 1:1 Schedule
            </div>
            {schedule && (
              <ScheduleIndicator schedule={schedule} />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {schedule ? (
            <div className="space-y-4">
              {/* Schedule details */}
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Schedule</div>
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{getScheduleDescription()}</span>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Duration</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{schedule.duration_minutes} minutes</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Next Meeting</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-green-700">
                        {formatDate(schedule.next_meeting_date)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Last Meeting</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatDate(schedule.last_meeting_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {schedule.start_date && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Schedule Period</div>
                    <div className="text-sm">
                      Started: {formatDate(schedule.start_date)}
                      {schedule.end_date && ` • Ends: ${formatDate(schedule.end_date)}`}
                    </div>
                  </div>
                )}

                {!schedule.is_active && (
                  <Alert>
                    <Pause className="h-4 w-4" />
                    <AlertDescription>
                      This schedule is currently paused. New meetings will not be generated automatically.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(true);
                    setShowForm(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleActive}
                >
                  {schedule.is_active ? (
                    <>
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Resume
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Repeat className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No recurring schedule configured
              </p>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setShowForm(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Recurring Schedule
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Automatically schedule regular 1:1 meetings
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit' : 'Create'} Recurring Schedule
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? `Update the recurring 1:1 schedule for ${teamMemberName}`
                : `Create a recurring 1:1 schedule for ${teamMemberName}`}
            </DialogDescription>
          </DialogHeader>
          <ScheduleConfigForm
            teamMemberId={teamMemberId}
            initialData={isEditing ? schedule : null}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setIsEditing(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamMemberScheduleSection;
