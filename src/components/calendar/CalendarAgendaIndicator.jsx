import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CalendarAgendaIndicator - Shows agenda item count on calendar events
 * 
 * @param {Object} props
 * @param {number} props.count - Total number of agenda items
 * @param {number} props.unresolvedCount - Number of unresolved agenda items
 * @param {boolean} props.hasUnresolved - Whether there are unresolved items
 * @param {string} props.size - Size variant ('sm', 'xs')
 * @param {string} props.className - Additional CSS classes
 */
export function CalendarAgendaIndicator({
  count = 0,
  unresolvedCount = 0,
  hasUnresolved = false,
  size = 'xs',
  className = ''
}) {
  // Don't render if no agenda items
  if (count === 0) {
    return null;
  }

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5 h-5',
    sm: 'text-xs px-2 py-0.5 h-6'
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3'
  };

  const badgeClasses = cn(
    'inline-flex items-center gap-1 font-medium rounded-full border',
    sizeClasses[size],
    hasUnresolved 
      ? 'bg-orange-100 text-orange-800 border-orange-300' 
      : 'bg-green-100 text-green-800 border-green-300',
    className
  );

  const Icon = hasUnresolved ? Clock : CheckCircle2;
  const displayCount = hasUnresolved ? unresolvedCount : count;
  const displayText = hasUnresolved ? 'pending' : 'items';

  return (
    <Badge className={badgeClasses} variant="outline">
      <Icon className={iconSizes[size]} />
      <span>{displayCount}</span>
    </Badge>
  );
}

/**
 * CalendarAgendaCount - Simple count badge for calendar events
 * 
 * @param {Object} props
 * @param {number} props.count - Total number of agenda items
 * @param {boolean} props.hasUnresolved - Whether there are unresolved items
 * @param {string} props.className - Additional CSS classes
 */
export function CalendarAgendaCount({
  count = 0,
  hasUnresolved = false,
  className = ''
}) {
  if (count === 0) {
    return null;
  }

  const badgeClasses = cn(
    'inline-flex items-center justify-center min-w-[18px] h-[18px] text-xs font-bold rounded-full border',
    hasUnresolved 
      ? 'bg-orange-500 text-white border-orange-600' 
      : 'bg-green-500 text-white border-green-600',
    className
  );

  return (
    <div className={badgeClasses}>
      {count > 99 ? '99+' : count}
    </div>
  );
}

/**
 * CalendarAgendaIcon - Icon-only indicator for calendar events
 * 
 * @param {Object} props
 * @param {boolean} props.hasItems - Whether there are any agenda items
 * @param {boolean} props.hasUnresolved - Whether there are unresolved items
 * @param {string} props.size - Icon size ('xs', 'sm')
 * @param {string} props.className - Additional CSS classes
 */
export function CalendarAgendaIcon({
  hasItems = false,
  hasUnresolved = false,
  size = 'xs',
  className = ''
}) {
  if (!hasItems) {
    return null;
  }

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4'
  };

  const iconClasses = cn(
    iconSizes[size],
    hasUnresolved ? 'text-orange-500' : 'text-green-500',
    className
  );

  const Icon = hasUnresolved ? Clock : CheckCircle2;
  
  return <Icon className={iconClasses} />;
}