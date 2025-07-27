/**
 * GoalsBadge Component
 * Displays a badge showing the number of goals for a team member
 */

import React from 'react';
import { Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const GoalsBadge = ({ 
  totalGoals = 0,
  activeGoals = 0, 
  completedGoals = 0,
  pausedGoals = 0,
  onClick,
  className,
  size = 'default'
}) => {
  // Don't render if no goals
  if (totalGoals === 0) {
    return null;
  }

  const goalText = totalGoals === 1 ? '1 Goal' : `${totalGoals} Goals`;
  
  const sizeClasses = {
    sm: 'text-xs h-5 px-2',
    default: 'text-sm h-6 px-2',
    lg: 'text-sm h-7 px-3'
  };

  const getBadgeVariant = () => {
    if (activeGoals > 0) return 'default';
    if (completedGoals > 0) return 'secondary';
    return 'outline';
  };

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-medium">Goal Breakdown</div>
      {activeGoals > 0 && <div className="text-sm">{activeGoals} Active</div>}
      {completedGoals > 0 && <div className="text-sm">{completedGoals} Completed</div>}
      {pausedGoals > 0 && <div className="text-sm">{pausedGoals} Paused</div>}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getBadgeVariant()}
            className={cn(
              'goals-badge flex items-center gap-1 cursor-pointer hover:bg-accent transition-colors',
              sizeClasses[size],
              className
            )}
            onClick={onClick}
          >
            <Target className="h-3 w-3" />
            {goalText}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default GoalsBadge;