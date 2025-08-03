import React from 'react';
import { Badge } from '../ui/badge';
import { RotateCcw, Clock, Users } from 'lucide-react';

/**
 * RotationStatusIndicator Component
 * Displays rotation status information in a compact format
 */
export default function RotationStatusIndicator({ 
  rotation, 
  currentAssignee, 
  nextAssignee, 
  size = 'default',
  showDetails = true 
}) {
  if (!rotation) return null;

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 'h-3 w-3' : 'h-4 w-4';

  const getStatusColor = () => {
    if (!rotation.is_active) return 'bg-gray-100 text-gray-600';
    return 'bg-purple-100 text-purple-800';
  };

  const formatWeeksText = (weeks) => {
    if (weeks === 0) return 'This week';
    if (weeks === 1) return '1 week';
    return `${weeks} weeks`;
  };

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className={`${getStatusColor()} border-purple-200`}>
        <RotateCcw className={`${iconSize} mr-1`} />
        {rotation.name}
      </Badge>
      
      {showDetails && currentAssignee && (
        <div className={`flex items-center space-x-1 ${isSmall ? 'text-xs' : 'text-sm'} text-gray-600`}>
          <Users className={iconSize} />
          <span>Current: {currentAssignee.assignee_name}</span>
        </div>
      )}
      
      {showDetails && nextAssignee && (
        <div className={`flex items-center space-x-1 ${isSmall ? 'text-xs' : 'text-sm'} text-purple-600`}>
          <Clock className={iconSize} />
          <span>Next: {nextAssignee.assignee_name} in {formatWeeksText(nextAssignee.weeks_until_rotation)}</span>
        </div>
      )}
    </div>
  );
}