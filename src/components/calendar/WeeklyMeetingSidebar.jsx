import React, { useMemo, useState, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, isToday } from 'date-fns';
import { Calendar, User, UserX, Shield, Cake, CalendarDays, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { CalendarAgendaCount } from './CalendarAgendaIndicator';
import { EventStylingService } from '@/utils/eventStylingService';
import { ErrorHandlingService } from '@/services/errorHandlingService';

/**
 * WeeklyMeetingSidebar - Displays current week's meetings in a sidebar
 * 
 * @param {Object} props
 * @param {Date} props.currentWeek - The current week date (any date within the week)
 * @param {Array} props.meetings - Array of CalendarEvent objects
 * @param {Function} props.onMeetingClick - Handler for meeting click (meeting, date) => void
 * @param {Function} props.onDateNavigate - Handler for date navigation (date) => void
 * @param {Object} props.agendaCounts - Agenda counts by event ID
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message to display
 * @param {Function} props.onRetry - Retry handler for error recovery
 * @param {boolean} props.showRetryButton - Whether to show retry button
 * @param {Object} props.errorContext - Additional error context for debugging
 */
export default function WeeklyMeetingSidebar({
  currentWeek = new Date(),
  meetings = [],
  onMeetingClick,
  onDateNavigate,
  agendaCounts = {},
  className = '',
  isLoading = false,
  error = null,
  onRetry = null,
  showRetryButton = true,
  errorContext = {}
}) {
  const [processingError, setProcessingError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  // Calculate week boundaries
  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]); // Monday start
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]); // Sunday end
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  // Group meetings by day with error handling
  const meetingsByDay = useMemo(() => {
    try {
      setProcessingError(null);
      
      const grouped = {};
      
      weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        grouped[dayKey] = {
          date: day,
          meetings: []
        };
      });

      meetings.forEach(meeting => {
        try {
          if (!meeting.start_date) return;
          
          const meetingStartDate = parseISO(meeting.start_date);
          const meetingEndDate = meeting.end_date ? parseISO(meeting.end_date) : meetingStartDate;
          
          // Add meeting to all days it spans within the current week
          weekDays.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            
            // Check if meeting occurs on this day (within the week boundaries)
            if ((isSameDay(meetingStartDate, day) || 
                isSameDay(meetingEndDate, day) || 
                (meetingStartDate < day && meetingEndDate > day)) &&
                (meetingStartDate <= weekEnd && meetingEndDate >= weekStart)) {
              grouped[dayKey].meetings.push(meeting);
            }
          });
        } catch (meetingError) {
          console.warn(`Error processing meeting ${meeting.id}:`, meetingError);
          // Continue processing other meetings
        }
      });

      return grouped;
    } catch (error) {
      const errorResult = ErrorHandlingService.handleError(error, {
        operation: 'process weekly meetings',
        showToast: false,
        context: { weekStart, weekEnd, meetingsCount: meetings.length }
      });
      
      setProcessingError(errorResult);
      
      // Return empty structure to prevent component crash
      const emptyGrouped = {};
      weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        emptyGrouped[dayKey] = { date: day, meetings: [] };
      });
      return emptyGrouped;
    }
  }, [meetings, weekDays, weekStart, weekEnd]);

  // Get total meeting count for the week
  const totalMeetings = useMemo(() => {
    return Object.values(meetingsByDay).reduce((total, day) => total + day.meetings.length, 0);
  }, [meetingsByDay]);



  // Helper function to format meeting time with error handling
  const formatMeetingTime = useCallback((meeting) => {
    try {
      if (meeting.all_day) return 'All day';
      if (!meeting.start_date) return '';
      
      const startTime = format(parseISO(meeting.start_date), 'h:mm a');
      if (meeting.end_date) {
        const endTime = format(parseISO(meeting.end_date), 'h:mm a');
        if (startTime !== endTime) {
          return `${startTime} - ${endTime}`;
        }
      }
      return startTime;
    } catch (error) {
      console.warn(`Error formatting meeting time for ${meeting.id}:`, error);
      return 'Time unavailable';
    }
  }, []);

  // Handle meeting click with error handling
  const handleMeetingClick = useCallback((meeting, date) => {
    try {
      const result = ErrorHandlingService.wrapOperation(async () => {
        if (onMeetingClick) {
          await onMeetingClick(meeting, date);
        }
      }, {
        operationName: 'Navigate to Meeting',
        showLoading: false,
        showSuccess: false,
        retryOptions: {
          maxRetries: 1,
          baseDelay: 500
        },
        errorOptions: {
          severity: ErrorHandlingService.SEVERITY.LOW,
          context: { 
            meetingId: meeting.id, 
            meetingTitle: meeting.title,
            date: date.toISOString()
          }
        }
      });
      
      // Handle promise if returned
      if (result && typeof result.catch === 'function') {
        return result.catch(error => {
          console.warn('Meeting click failed:', error);
        });
      }
      
      return result;
    } catch (error) {
      console.warn('Meeting click failed:', error);
    }
  }, [onMeetingClick]);

  // Handle date click with error handling
  const handleDateClick = useCallback((date) => {
    try {
      const result = ErrorHandlingService.wrapOperation(async () => {
        if (onDateNavigate) {
          await onDateNavigate(date);
        }
      }, {
        operationName: 'Navigate to Date',
        showLoading: false,
        showSuccess: false,
        retryOptions: {
          maxRetries: 1,
          baseDelay: 500
        },
        errorOptions: {
          severity: ErrorHandlingService.SEVERITY.LOW,
          context: { date: date.toISOString() }
        }
      });
      
      // Handle promise if returned
      if (result && typeof result.catch === 'function') {
        return result.catch(error => {
          console.warn('Date navigation failed:', error);
        });
      }
      
      return result;
    } catch (error) {
      console.warn('Date navigation failed:', error);
    }
  }, [onDateNavigate]);

  // Handle retry with exponential backoff
  const handleRetry = useCallback(() => {
    if (onRetry) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      // Clear processing error before retry
      setProcessingError(null);
      
      // Add delay for subsequent retries
      const delay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 5000);
      
      setTimeout(() => {
        onRetry();
      }, delay);
    }
  }, [onRetry, retryCount]);

  // Reset retry count when error changes or is cleared
  React.useEffect(() => {
    if (!error && !processingError) {
      setRetryCount(0);
    }
  }, [error, processingError]);

  // Handle keyboard navigation
  const handleKeyDown = (event, handler, ...args) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(...args);
    }
  };

  return (
    <Card className={cn('w-80 h-fit', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          This Week
          {totalMeetings > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {totalMeetings} meeting{totalMeetings !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Error display */}
        {(error || processingError) && (
          <Alert 
            variant="destructive" 
            className="mb-3"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {error || processingError?.userMessage || 'Error processing meetings'}
                  </span>
                  {showRetryButton && onRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      disabled={isLoading}
                      className="ml-2"
                      aria-label={`Retry loading meetings${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}`}
                    >
                      {isLoading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        'Retry'
                      )}
                    </Button>
                  )}
                </div>
                
                {/* Show suggestions for error recovery */}
                {processingError?.suggestions && processingError.suggestions.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    <p className="font-medium">Suggestions:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {processingError.suggestions.slice(0, 2).map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Show retry count if multiple attempts */}
                {retryCount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Retry attempt: {retryCount}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoading && (
          <div 
            className="text-center py-8 text-muted-foreground"
            role="status"
            aria-label="Loading meetings"
          >
            <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin" />
            <p className="text-sm">Loading meetings...</p>
            {retryCount > 0 && (
              <p className="text-xs mt-1">Retrying... (attempt {retryCount + 1})</p>
            )}
          </div>
        )}

        {!isLoading && totalMeetings === 0 ? (
          // Empty state
          <div 
            className="text-center py-8 text-muted-foreground"
            role="status"
            aria-label="No meetings this week"
          >
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No meetings this week</p>
            <p className="text-xs mt-1">Your calendar is clear for the week</p>
          </div>
        ) : (
          // Meeting list grouped by day
          weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayData = meetingsByDay[dayKey];
            const hasMeetings = dayData.meetings.length > 0;
            
            if (!hasMeetings) return null;
            
            return (
              <div key={dayKey} className="space-y-2">
                {/* Day header */}
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start p-2 h-auto font-medium text-left",
                    isToday(day) && "bg-blue-50 text-blue-900"
                  )}
                  onClick={() => handleDateClick(day)}
                  onKeyDown={(e) => handleKeyDown(e, handleDateClick, day)}
                  aria-label={`Navigate to ${format(day, 'EEEE, MMMM d')}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="text-sm">
                        {format(day, 'EEEE')}
                        {isToday(day) && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Today
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(day, 'MMM d')}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {dayData.meetings.length}
                    </Badge>
                  </div>
                </Button>
                
                {/* Meetings for this day */}
                <div className="space-y-1 ml-2">
                  {dayData.meetings.map((meeting, index) => {
                    const styling = EventStylingService.getEventStyling(meeting, EventStylingService.VARIANTS.SIDEBAR);
                    const Icon = styling.icon;
                    const meetingTime = formatMeetingTime(meeting);
                    const eventAgendaCounts = agendaCounts[meeting.id];
                    
                    return (
                      <Button
                        key={`${meeting.id}-${index}`}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start p-2 h-auto text-left border hover:opacity-80 transition-opacity"
                        )}
                        style={{
                          backgroundColor: styling.colors.light,
                          color: styling.colors.text,
                          borderColor: styling.colors.border
                        }}
                        onClick={() => handleMeetingClick(meeting, day)}
                        onKeyDown={(e) => handleKeyDown(e, handleMeetingClick, meeting, day)}
                        aria-label={`${meeting.title} at ${meetingTime || 'no specific time'}`}
                      >
                        <div className="flex items-start gap-2 w-full min-w-0">
                          <Icon 
                            className="h-4 w-4 mt-0.5 flex-shrink-0" 
                            style={{ color: styling.colors.primary }}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">
                                {meeting.title}
                              </p>
                              {/* Show agenda indicator for 1:1 meetings */}
                              {meeting.event_type === 'one_on_one' && eventAgendaCounts && eventAgendaCounts.count > 0 && (
                                <CalendarAgendaCount
                                  count={eventAgendaCounts.unresolvedCount || eventAgendaCounts.count}
                                  hasUnresolved={eventAgendaCounts.hasUnresolved}
                                  className="flex-shrink-0"
                                />
                              )}
                            </div>
                            {meetingTime && (
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3 opacity-60" aria-hidden="true" />
                                <p className="text-xs opacity-80">{meetingTime}</p>
                              </div>
                            )}
                            {meeting.description && (
                              <p className="text-xs opacity-70 mt-1 line-clamp-2">
                                {meeting.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}