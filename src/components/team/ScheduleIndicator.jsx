/**
 * ScheduleIndicator Component
 * Visual badge/indicator showing recurring schedule status and next meeting
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Repeat, Calendar, Clock } from 'lucide-react';
import { OneOnOneScheduleService } from '@/services/oneOnOneScheduleService';

const ScheduleIndicator = ({ schedule, size = 'default', showNextMeeting = true }) => {
  if (!schedule) return null;

  /**
   * Gets a short frequency label for the badge
   */
  const getShortFrequencyLabel = () => {
    switch (schedule.frequency) {
      case 'weekly':
        return 'Weekly';
      case 'biweekly':
        return 'Biweekly';
      case 'monthly':
        return 'Monthly';
      case 'custom':
        return `Every ${schedule.custom_interval_weeks}w`;
      default:
        return schedule.frequency;
    }
  };

  /**
   * Gets the full schedule description for tooltip
   */
  const getFullDescription = () => {
    try {
      return OneOnOneScheduleService.getScheduleDescription(schedule);
    } catch (err) {
      return `${schedule.frequency} on ${getDayName(schedule.day_of_week)} at ${schedule.time}`;
    }
  };

  /**
   * Gets day name from day_of_week number
   */
  const getDayName = (dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || '';
  };

  /**
   * Formats date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (err) {
      return dateString;
    }
  };

  /**
   * Gets the badge variant based on schedule status
   */
  const getBadgeVariant = () => {
    if (!schedule.is_active) return 'secondary';

    if (schedule.end_date) {
      const endDate = new Date(schedule.end_date);
      const now = new Date();
      if (endDate < now) return 'destructive';
    }

    return 'default';
  };

  /**
   * Gets the icon size based on component size prop
   */
  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-4 w-4';
    }
  };

  const tooltipContent = (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Repeat className="h-4 w-4" />
        <span className="font-medium">{getFullDescription()}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Clock className="h-3 w-3" />
        <span>{schedule.duration_minutes} minutes</span>
      </div>
      {showNextMeeting && schedule.next_meeting_date && (
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="h-3 w-3" />
          <span>Next: {formatDate(schedule.next_meeting_date)}</span>
        </div>
      )}
      {schedule.last_meeting_date && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Last: {formatDate(schedule.last_meeting_date)}</span>
        </div>
      )}
      {!schedule.is_active && (
        <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
          Schedule is currently paused
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getBadgeVariant()} className="gap-1 cursor-help">
            <Repeat className={getIconSize()} />
            {getShortFrequencyLabel()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ScheduleIndicator;
