/**
 * GoalStatusManager Component
 * Manages goal status transitions and displays status information
 */

import React, { useState } from 'react';
import { CheckCircle, Pause, Play, MoreHorizontal, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import EmployeeGoalsService from '@/services/employeeGoalsService';

const GoalStatusManager = ({ 
  goal, 
  onStatusChange,
  isLoading = false,
  compact = false,
  showHistory = false
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState('');

  const { toast } = useToast();

  // Handle missing goal prop
  if (!goal) {
    return (
      <div className="text-sm text-muted-foreground">
        No goal data
      </div>
    );
  }

  /**
   * Get status badge styling and text
   */
  const getStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return {
          text: 'Active',
          className: 'bg-green-100 text-green-800 hover:bg-green-200',
          icon: Play
        };
      case 'completed':
        return {
          text: 'Completed',
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
          icon: CheckCircle
        };
      case 'paused':
        return {
          text: 'Paused',
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
          icon: Pause
        };
      default:
        return {
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
          icon: Clock
        };
    }
  };

  /**
   * Get available actions based on current status
   */
  const getAvailableActions = (status) => {
    const actions = [];

    switch (status) {
      case 'active':
        actions.push(
          { id: 'complete', label: 'Mark as Complete', icon: CheckCircle, type: 'success' },
          { id: 'pause', label: 'Pause Goal', icon: Pause, type: 'warning' }
        );
        break;
      case 'paused':
        actions.push(
          { id: 'complete', label: 'Mark as Complete', icon: CheckCircle, type: 'success' },
          { id: 'reactivate', label: 'Reactivate Goal', icon: Play, type: 'default' }
        );
        break;
      case 'completed':
        actions.push(
          { id: 'reactivate', label: 'Reactivate Goal', icon: Play, type: 'default' }
        );
        break;
      default:
        break;
    }

    return actions;
  };

  /**
   * Handle status action click
   */
  const handleActionClick = (action) => {
    setPendingAction(action);
    setShowConfirmDialog(true);
    setError('');
  };

  /**
   * Execute status change
   */
  const executeStatusChange = async () => {
    if (!pendingAction || !goal.id) return;

    try {
      setIsUpdating(true);
      setError('');

      let updatedGoal;

      switch (pendingAction.id) {
        case 'complete':
          updatedGoal = await EmployeeGoalsService.completeGoal(goal.id);
          break;
        case 'pause':
          updatedGoal = await EmployeeGoalsService.pauseGoal(goal.id);
          break;
        case 'reactivate':
          updatedGoal = await EmployeeGoalsService.reactivateGoal(goal.id);
          break;
        default:
          throw new Error('Invalid action');
      }

      // Call the callback if provided
      if (onStatusChange) {
        onStatusChange(updatedGoal);
      }

      // Show success toast
      toast({
        title: 'Success',
        description: `Goal status updated to ${updatedGoal.status}`,
        variant: 'default'
      });

      // Close dialog
      setShowConfirmDialog(false);
      setPendingAction(null);

    } catch (err) {
      console.error('Error updating goal status:', err);
      setError('Failed to update goal status. Please try again.');
      
      toast({
        title: 'Error',
        description: 'Failed to update goal status. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Cancel status change
   */
  const cancelStatusChange = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
    setError('');
  };

  /**
   * Get confirmation dialog content
   */
  const getConfirmationContent = (action) => {
    switch (action?.id) {
      case 'complete':
        return {
          title: 'Complete Goal',
          description: 'Are you sure you want to mark this goal as completed?',
          details: 'This action will change the goal status to completed.',
          confirmText: 'Complete Goal',
          confirmVariant: 'default'
        };
      case 'pause':
        return {
          title: 'Pause Goal',
          description: 'Are you sure you want to pause this goal?',
          details: 'This action will change the goal status to paused. You can reactivate it later.',
          confirmText: 'Pause Goal',
          confirmVariant: 'default'
        };
      case 'reactivate':
        return {
          title: 'Reactivate Goal',
          description: 'Are you sure you want to reactivate this goal?',
          details: 'This action will change the goal status back to active.',
          confirmText: 'Reactivate Goal',
          confirmVariant: 'default'
        };
      default:
        return {
          title: 'Confirm Action',
          description: 'Are you sure you want to perform this action?',
          details: '',
          confirmText: 'Confirm',
          confirmVariant: 'default'
        };
    }
  };

  const statusInfo = getStatusInfo(goal.status);
  const availableActions = getAvailableActions(goal.status);
  const StatusIcon = statusInfo.icon;
  const isDisabled = isLoading || isUpdating || !goal.id;
  const confirmContent = getConfirmationContent(pendingAction);

  return (
    <div className="flex items-center space-x-2">
      {/* Status Badge */}
      <Badge 
        variant="secondary" 
        className={cn(
          "capitalize flex items-center space-x-1",
          statusInfo.className,
          compact && "text-xs px-1 py-0.5"
        )}
      >
        <StatusIcon className={cn("h-3 w-3", compact && "h-2.5 w-2.5")} />
        <span>{statusInfo.text}</span>
      </Badge>

      {/* Actions Dropdown */}
      {availableActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={compact ? "sm" : "default"}
              className={cn(
                "h-8 w-8 p-0",
                compact && "h-6 w-6"
              )}
              disabled={isDisabled}
              aria-label="Status actions"
              aria-haspopup="true"
            >
              {isUpdating ? (
                <LoadingSpinner className="h-3 w-3" />
              ) : (
                <MoreHorizontal className="h-3 w-3" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableActions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="flex items-center space-x-2"
                >
                  <ActionIcon className="h-4 w-4" />
                  <span>{action.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Status History */}
      {showHistory && !compact && (
        <div className="text-xs text-muted-foreground">
          {goal.completedAt && (
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Completed on {format(new Date(goal.completedAt), 'MMM dd, yyyy')}</span>
            </div>
          )}
          {goal.pausedAt && goal.status === 'paused' && (
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Paused on {format(new Date(goal.pausedAt), 'MMM dd, yyyy')}</span>
            </div>
          )}
          {goal.reactivatedAt && (
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Reactivated on {format(new Date(goal.reactivatedAt), 'MMM dd, yyyy')}</span>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmContent.description}
              {confirmContent.details && (
                <>
                  <br /><br />
                  {confirmContent.details}
                </>
              )}
              <br /><br />
              <strong>Goal:</strong> {goal.title}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelStatusChange}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeStatusChange}
              disabled={isUpdating}
              className={cn(
                confirmContent.confirmVariant === 'destructive' && 
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {isUpdating ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner className="h-4 w-4" />
                  <span>Updating...</span>
                </div>
              ) : (
                confirmContent.confirmText
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Screen Reader Status */}
      <div role="status" aria-live="polite" className="sr-only">
        {isUpdating && 'Updating goal status...'}
        {!isUpdating && error && 'Goal status update failed'}
        {!isUpdating && !error && pendingAction && 'Goal status updated successfully'}
      </div>
    </div>
  );
};

export default GoalStatusManager;