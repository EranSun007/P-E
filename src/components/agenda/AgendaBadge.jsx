import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AgendaBadge - Component to show agenda item counts on team member cards
 * 
 * @param {Object} props
 * @param {number} props.count - Total number of agenda items
 * @param {number} props.unresolvedCount - Number of unresolved agenda items
 * @param {boolean} props.hasUnresolved - Whether there are unresolved items
 * @param {Function} props.onClick - Callback when badge is clicked
 * @param {string} props.memberName - Name of the team member (for accessibility)
 * @param {string} props.size - Size variant ('sm', 'default', 'lg')
 * @param {boolean} props.showIcon - Whether to show status icon (default: true)
 * @param {string} props.className - Additional CSS classes
 */
export function AgendaBadge({
  count = 0,
  unresolvedCount = 0,
  hasUnresolved = false,
  onClick,
  memberName = '',
  size = 'default',
  showIcon = true,
  className = ''
}) {
  // Don't render if no agenda items
  if (count === 0) {
    return null;
  }

  const isClickable = typeof onClick === 'function';
  const hasUrgentItems = unresolvedCount > 0;
  
  // Determine badge variant and styling based on status
  const getBadgeVariant = () => {
    if (hasUrgentItems) {
      return 'default'; // Will be styled with custom colors
    }
    return 'secondary';
  };

  const getBadgeClasses = () => {
    const baseClasses = 'transition-all duration-200';
    const sizeClasses = {
      sm: 'text-xs px-2 py-0.5',
      default: 'text-xs px-2.5 py-0.5',
      lg: 'text-sm px-3 py-1'
    };
    
    let statusClasses = '';
    if (hasUrgentItems) {
      statusClasses = 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
    } else {
      statusClasses = 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    }
    
    const interactionClasses = isClickable 
      ? 'cursor-pointer hover:shadow-sm active:scale-95' 
      : '';
    
    return cn(
      baseClasses,
      sizeClasses[size],
      statusClasses,
      interactionClasses,
      className
    );
  };

  const getIcon = () => {
    if (!showIcon) return null;
    
    const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
    
    if (hasUrgentItems) {
      return <Clock className={cn(iconSize, 'mr-1')} />;
    }
    return <CheckCircle2 className={cn(iconSize, 'mr-1')} />;
  };

  const getBadgeText = () => {
    if (hasUrgentItems) {
      return `${unresolvedCount} pending`;
    }
    return `${count} item${count !== 1 ? 's' : ''}`;
  };

  const getAriaLabel = () => {
    const itemText = count === 1 ? 'agenda item' : 'agenda items';
    const statusText = hasUrgentItems 
      ? `${unresolvedCount} pending` 
      : 'all resolved';
    
    return `${memberName} has ${count} ${itemText}, ${statusText}${isClickable ? '. Click to view details.' : ''}`;
  };

  const BadgeComponent = isClickable ? Button : 'div';
  const badgeProps = isClickable 
    ? {
        variant: 'ghost',
        size: 'sm',
        onClick,
        className: cn('h-auto p-0 hover:bg-transparent', getBadgeClasses()),
        'aria-label': getAriaLabel()
      }
    : {
        className: getBadgeClasses(),
        'aria-label': getAriaLabel()
      };

  return (
    <BadgeComponent {...badgeProps}>
      <div className="flex items-center">
        {getIcon()}
        <span className="font-medium">{getBadgeText()}</span>
      </div>
    </BadgeComponent>
  );
}

/**
 * AgendaIndicator - Compact indicator for agenda status
 * 
 * @param {Object} props
 * @param {number} props.count - Total number of agenda items
 * @param {boolean} props.hasUnresolved - Whether there are unresolved items
 * @param {Function} props.onClick - Callback when indicator is clicked
 * @param {string} props.className - Additional CSS classes
 */
export function AgendaIndicator({
  count = 0,
  hasUnresolved = false,
  onClick,
  className = ''
}) {
  if (count === 0) {
    return null;
  }

  const isClickable = typeof onClick === 'function';
  const indicatorClasses = cn(
    'inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full',
    hasUnresolved 
      ? 'bg-orange-500 text-white' 
      : 'bg-green-500 text-white',
    isClickable && 'cursor-pointer hover:scale-110 transition-transform',
    className
  );

  const IndicatorComponent = isClickable ? Button : 'div';
  const indicatorProps = isClickable
    ? {
        variant: 'ghost',
        size: 'sm',
        onClick,
        className: cn('h-5 w-5 p-0 rounded-full hover:bg-transparent', indicatorClasses),
        'aria-label': `${count} agenda items${hasUnresolved ? ', some pending' : ', all resolved'}`
      }
    : {
        className: indicatorClasses,
        'aria-label': `${count} agenda items${hasUnresolved ? ', some pending' : ', all resolved'}`
      };

  return (
    <IndicatorComponent {...indicatorProps}>
      {count > 99 ? '99+' : count}
    </IndicatorComponent>
  );
}

/**
 * AgendaStatusIcon - Simple icon-only status indicator
 * 
 * @param {Object} props
 * @param {boolean} props.hasItems - Whether there are any agenda items
 * @param {boolean} props.hasUnresolved - Whether there are unresolved items
 * @param {Function} props.onClick - Callback when icon is clicked
 * @param {string} props.size - Icon size ('sm', 'default', 'lg')
 * @param {string} props.className - Additional CSS classes
 */
export function AgendaStatusIcon({
  hasItems = false,
  hasUnresolved = false,
  onClick,
  size = 'default',
  className = ''
}) {
  if (!hasItems) {
    return null;
  }

  const isClickable = typeof onClick === 'function';
  const iconSizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const iconClasses = cn(
    iconSizes[size],
    hasUnresolved ? 'text-orange-500' : 'text-green-500',
    isClickable && 'cursor-pointer hover:scale-110 transition-transform',
    className
  );

  const Icon = hasUnresolved ? AlertCircle : CheckCircle2;
  
  if (isClickable) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className="h-auto w-auto p-1 hover:bg-transparent"
        aria-label={`Agenda items ${hasUnresolved ? 'pending' : 'resolved'}`}
      >
        <Icon className={iconClasses} />
      </Button>
    );
  }

  return (
    <Icon 
      className={iconClasses}
      aria-label={`Agenda items ${hasUnresolved ? 'pending' : 'resolved'}`}
    />
  );
}