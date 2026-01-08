import React from 'react';
import { Calendar, UserX, Shield, Cake, CalendarDays, Plus, Users, Clock, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ViewModeManager } from '@/services/viewModeManager';
import { cn } from '@/lib/utils';

/**
 * CalendarEmptyState - Empty state component for calendar view modes
 * 
 * Provides custom empty state messages and actionable suggestions for each calendar view mode
 */
export const CalendarEmptyState = ({ 
  viewMode, 
  onCreateTask = null,
  onAddTeamMember = null,
  onManageDuties = null,
  className = '',
  size = 'md',
  context = 'calendar' // 'calendar' or 'sidebar'
}) => {
  const getEmptyStateConfig = () => {
    switch (viewMode) {
      case ViewModeManager.VIEW_MODES.MEETINGS:
        return {
          icon: Calendar,
          title: context === 'sidebar' ? 'No meetings today' : 'No meetings scheduled',
          description: context === 'sidebar' 
            ? 'No meetings are scheduled for this date.' 
            : 'You don\'t have any meetings or one-on-ones scheduled. Create a task to schedule your first meeting.',
          actionLabel: 'Create Meeting Task',
          onAction: onCreateTask,
          suggestions: [
            'Schedule a one-on-one with a team member',
            'Plan your next team meeting',
            'Block time for important discussions'
          ]
        };

      case ViewModeManager.VIEW_MODES.OUT_OF_OFFICE:
        return {
          icon: UserX,
          title: context === 'sidebar' ? 'No one is out today' : 'No out-of-office periods',
          description: context === 'sidebar'
            ? 'No team members are out of office on this date.'
            : 'No team members have scheduled out-of-office periods. Manage team availability to track time off.',
          actionLabel: 'Manage Team',
          onAction: onAddTeamMember,
          suggestions: [
            'Add team members to track their availability',
            'Schedule upcoming vacation time',
            'Plan around team member absences'
          ]
        };

      case ViewModeManager.VIEW_MODES.DUTIES:
        return {
          icon: Shield,
          title: context === 'sidebar' ? 'No duties assigned today' : 'No duty assignments',
          description: context === 'sidebar'
            ? 'No duty assignments are scheduled for this date.'
            : 'No team member duties are currently assigned. Set up duty rotations to track responsibilities.',
          actionLabel: 'Manage Duties',
          onAction: onManageDuties,
          suggestions: [
            'Set up DevOps duty rotations',
            'Assign on-call responsibilities',
            'Track team member duties'
          ]
        };

      case ViewModeManager.VIEW_MODES.BIRTHDAYS:
        return {
          icon: Cake,
          title: context === 'sidebar' ? 'No birthdays today' : 'No birthdays this month',
          description: context === 'sidebar'
            ? 'No team member birthdays are on this date.'
            : 'No team member birthdays are scheduled. Add team members with birthday information to celebrate together.',
          actionLabel: 'Add Team Members',
          onAction: onAddTeamMember,
          suggestions: [
            'Add team member birthday information',
            'Plan birthday celebrations',
            'Never miss a team member\'s special day'
          ]
        };

      case ViewModeManager.VIEW_MODES.ALL_EVENTS:
      default:
        return {
          icon: CalendarDays,
          title: context === 'sidebar' ? 'Nothing scheduled today' : 'Your calendar is empty',
          description: context === 'sidebar'
            ? 'No tasks or events are scheduled for this date.'
            : 'You don\'t have any events, meetings, or tasks scheduled. Start organizing your work and team activities.',
          actionLabel: 'Create Task',
          onAction: onCreateTask,
          suggestions: [
            'Schedule your first meeting',
            'Add team member information',
            'Create tasks to stay organized'
          ]
        };
    }
  };

  const config = getEmptyStateConfig();

  // For sidebar context, use a more compact layout
  if (context === 'sidebar') {
    return (
      <div className={cn('text-center p-6', className)}>
        <config.icon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          {config.title}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {config.description}
        </p>
        {config.onAction && (
          <Button 
            onClick={config.onAction} 
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            {config.actionLabel}
          </Button>
        )}
      </div>
    );
  }

  // For main calendar context, use the full EmptyState component with suggestions
  return (
    <div className={cn('space-y-6', className)}>
      <EmptyState
        icon={config.icon}
        title={config.title}
        description={config.description}
        actionLabel={config.actionLabel}
        onAction={config.onAction}
        size={size}
      />
      
      {/* Quick suggestions */}
      {config.suggestions && config.suggestions.length > 0 && (
        <div className="max-w-md mx-auto">
          <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">
            Quick suggestions:
          </h4>
          <ul className="space-y-2">
            {config.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * CalendarViewEmptyState - Empty state for when a specific view mode has no events
 * Shows in the main calendar area when the current view mode filter returns no results
 */
export const CalendarViewEmptyState = ({ 
  viewMode, 
  onCreateTask,
  onAddTeamMember,
  onManageDuties,
  className = ''
}) => {
  return (
    <div className={cn(
      'flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300',
      className
    )}>
      <CalendarEmptyState
        viewMode={viewMode}
        onCreateTask={onCreateTask}
        onAddTeamMember={onAddTeamMember}
        onManageDuties={onManageDuties}
        context="calendar"
        size="lg"
      />
    </div>
  );
};

/**
 * CalendarDateEmptyState - Empty state for when a selected date has no events
 * Shows in the sidebar when the selected date has no events for the current view mode
 */
export const CalendarDateEmptyState = ({ 
  viewMode, 
  onCreateTask,
  className = ''
}) => {
  return (
    <CalendarEmptyState
      viewMode={viewMode}
      onCreateTask={onCreateTask}
      context="sidebar"
      className={className}
    />
  );
};

/**
 * CalendarLoadingEmptyState - Empty state shown while calendar data is loading
 */
export const CalendarLoadingEmptyState = ({ className = '' }) => {
  return (
    <div className={cn(
      'flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-200',
      className
    )}>
      <div className="text-center">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Loading calendar...
        </h3>
        <p className="text-gray-500">
          Please wait while we load your events and tasks.
        </p>
      </div>
    </div>
  );
};

export default CalendarEmptyState;