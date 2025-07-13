import React from 'react';
import { Plus, Search, Filter, AlertCircle, FileText, Users, Calendar, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Generic empty state component
 */
export const EmptyState = ({ 
  icon: Icon = FileText, 
  title = 'No items found',
  description = 'Get started by creating your first item.',
  actionLabel = 'Create Item',
  onAction = null,
  className = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: {
      container: 'p-8',
      icon: 'h-8 w-8',
      title: 'text-base',
      description: 'text-sm',
      spacing: 'mb-3'
    },
    md: {
      container: 'p-12',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-base',
      spacing: 'mb-4'
    },
    lg: {
      container: 'p-16',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-lg',
      spacing: 'mb-6'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={cn(
      'text-center border border-dashed border-gray-300 rounded-lg',
      classes.container,
      className
    )}>
      <Icon className={cn(
        'text-gray-400 mx-auto',
        classes.icon,
        classes.spacing
      )} />
      
      <h3 className={cn(
        'font-medium text-gray-900',
        classes.title,
        'mb-2'
      )}>
        {title}
      </h3>
      
      <p className={cn(
        'text-gray-500',
        classes.description,
        classes.spacing
      )}>
        {description}
      </p>
      
      {onAction && (
        <Button onClick={onAction} className="mt-2">
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

/**
 * Empty state for search results
 */
export const EmptySearchState = ({ 
  searchTerm = '',
  onClearSearch = null,
  onReset = null,
  className = ''
}) => {
  return (
    <div className={cn(
      'text-center p-12 border border-dashed border-gray-300 rounded-lg',
      className
    )}>
      <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No results found
      </h3>
      
      <p className="text-gray-500 mb-4">
        {searchTerm ? (
          <>No items match your search for <strong>"{searchTerm}"</strong></>
        ) : (
          'Try adjusting your search terms or filters.'
        )}
      </p>
      
      <div className="flex gap-2 justify-center">
        {onClearSearch && (
          <Button variant="outline" onClick={onClearSearch}>
            Clear Search
          </Button>
        )}
        {onReset && (
          <Button variant="outline" onClick={onReset}>
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Empty state for filtered results
 */
export const EmptyFilterState = ({ 
  onClearFilters = null,
  activeFiltersCount = 0,
  className = ''
}) => {
  return (
    <div className={cn(
      'text-center p-12 border border-dashed border-gray-300 rounded-lg',
      className
    )}>
      <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No items match your filters
      </h3>
      
      <p className="text-gray-500 mb-4">
        {activeFiltersCount > 0 ? (
          <>You have {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}</>
        ) : (
          'Try adjusting your filter settings.'
        )}
      </p>
      
      {onClearFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
};

/**
 * Empty state for errors
 */
export const EmptyErrorState = ({ 
  title = 'Something went wrong',
  description = 'We encountered an error loading your data.',
  onRetry = null,
  className = ''
}) => {
  return (
    <div className={cn(
      'text-center p-12 border border-dashed border-red-300 rounded-lg bg-red-50',
      className
    )}>
      <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
      
      <h3 className="text-lg font-medium text-red-900 mb-2">
        {title}
      </h3>
      
      <p className="text-red-600 mb-4">
        {description}
      </p>
      
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};

/**
 * Specific empty states for different entities
 */
export const EmptyTasksState = ({ onCreateTask }) => (
  <EmptyState
    icon={CheckSquare}
    title="No tasks yet"
    description="Start organizing your work by creating your first task."
    actionLabel="Create Task"
    onAction={onCreateTask}
  />
);

export const EmptyProjectsState = ({ onCreateProject }) => (
  <EmptyState
    icon={FileText}
    title="No projects yet"
    description="Create a project to start organizing your tasks and goals."
    actionLabel="Create Project"
    onAction={onCreateProject}
  />
);

export const EmptyTeamState = ({ onAddMember }) => (
  <EmptyState
    icon={Users}
    title="No team members yet"
    description="Add team members to start collaborating on projects."
    actionLabel="Add Member"
    onAction={onAddMember}
  />
);

export const EmptyStakeholdersState = ({ onAddStakeholder }) => (
  <EmptyState
    icon={Users}
    title="No stakeholders yet"
    description="Add stakeholders to keep track of important contacts."
    actionLabel="Add Stakeholder"
    onAction={onAddStakeholder}
  />
);

export const EmptyCalendarState = ({ onCreateEvent }) => (
  <EmptyState
    icon={Calendar}
    title="No events scheduled"
    description="Create your first event to start managing your calendar."
    actionLabel="Create Event"
    onAction={onCreateEvent}
  />
);

/**
 * Empty state with custom content
 */
export const CustomEmptyState = ({ 
  children, 
  className = '',
  showBorder = true
}) => {
  return (
    <div className={cn(
      'text-center p-12 rounded-lg',
      showBorder && 'border border-dashed border-gray-300',
      className
    )}>
      {children}
    </div>
  );
};

export default EmptyState;