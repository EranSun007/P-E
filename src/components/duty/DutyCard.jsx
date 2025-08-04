import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Shield, Phone, Settings, Calendar, User, Trash2, Edit, RotateCcw, Users, Clock, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react';
import AgendaContextActions from '@/components/agenda/AgendaContextActions';
import DutyRotationService from '@/services/dutyRotationService';
import DutyRefreshService from '@/services/dutyRefreshService';

const DUTY_TYPE_CONFIG = {
  devops: {
    label: 'DevOps Duty',
    icon: Settings,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeVariant: 'secondary'
  },
  on_call: {
    label: 'On-Call Duty',
    icon: Phone,
    color: 'bg-red-100 text-red-800 border-red-200',
    badgeVariant: 'destructive'
  },
  other: {
    label: 'Other Duty',
    icon: Shield,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    badgeVariant: 'outline'
  }
};

export default function DutyCard({ 
  duty, 
  teamMember, 
  onEdit, 
  onDelete, 
  onManageRotation,
  showActions = true,
  compact = false 
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rotationInfo, setRotationInfo] = useState(null);
  const [nextAssignee, setNextAssignee] = useState(null);
  const [isLoadingRotation, setIsLoadingRotation] = useState(false);

  // Load rotation information if this is a rotation duty
  useEffect(() => {
    const loadRotationInfo = async () => {
      if (!duty?.is_rotation || !duty?.rotation_id) return;
      
      setIsLoadingRotation(true);
      try {
        const [rotation, nextAssigneeInfo] = await Promise.all([
          DutyRotationService.getCurrentAssignee(duty.rotation_id),
          DutyRotationService.getNextAssignee(duty.rotation_id)
        ]);
        
        setRotationInfo(rotation);
        setNextAssignee(nextAssigneeInfo);
      } catch (error) {
        console.error('Failed to load rotation info:', error);
      } finally {
        setIsLoadingRotation(false);
      }
    };

    loadRotationInfo();
  }, [duty?.is_rotation, duty?.rotation_id]);

  if (!duty) {
    return null;
  }

  const dutyConfig = DUTY_TYPE_CONFIG[duty.type] || DUTY_TYPE_CONFIG.other;
  const DutyIcon = dutyConfig.icon;
  
  const startDate = new Date(duty.start_date);
  const endDate = new Date(duty.end_date);
  const now = new Date();
  
  // Determine duty status
  const isActive = now >= startDate && now <= endDate;
  const isPast = now > endDate;
  const isFuture = now < startDate;
  
  // Calculate upcoming alert
  const daysUntilStart = isFuture ? Math.ceil((startDate - now) / (1000 * 60 * 60 * 24)) : 0;
  const isUpcoming = isFuture && daysUntilStart <= 7; // Show alert for duties starting within 7 days
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRange = () => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    if (start === end) {
      return start;
    }
    
    return `${start} - ${end}`;
  };

  const getDurationText = () => {
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    
    if (diffDays === 1) {
      return '1 day';
    } else if (diffDays < 7) {
      return `${diffDays} days`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      const remainingDays = diffDays % 7;
      if (remainingDays === 0) {
        return `${weeks} week${weeks > 1 ? 's' : ''}`;
      }
      return `${weeks}w ${remainingDays}d`;
    } else {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      if (remainingDays === 0) {
        return `${months} month${months > 1 ? 's' : ''}`;
      }
      return `${months}m ${remainingDays}d`;
    }
  };

  const getStatusBadge = () => {
    if (isActive) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
    } else if (isPast) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Completed</Badge>;
    } else {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Upcoming</Badge>;
    }
  };

  const getRotationBadge = () => {
    if (!duty.is_rotation) return null;
    
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        <RotateCcw className="h-3 w-3 mr-1" />
        Rotation
      </Badge>
    );
  };

  const getRotationStatusText = () => {
    if (!duty.is_rotation || !nextAssignee) return null;
    
    const weeksText = nextAssignee.weeks_until_rotation === 1 ? '1 week' : `${nextAssignee.weeks_until_rotation} weeks`;
    return `Next: ${nextAssignee.assignee_name} in ${weeksText}`;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Use refresh service for consistent deletion
      await DutyRefreshService.deleteDutyWithRefresh(duty.id, {
        showOptimistic: true,
        refreshViews: true
      });
      
      // Call parent callback if provided
      await onDelete?.(duty);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete duty:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getTeamMemberInitials = () => {
    if (!teamMember?.name) return '?';
    return teamMember.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if duty should be highlighted
  const isHighlighted = DutyRefreshService.isDutyHighlighted(duty.id);
  const isOptimistic = duty._isOptimistic || false;

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 transition-all duration-300 ${
        isUpcoming ? 'border-orange-200 bg-orange-50' : ''
      } ${
        isHighlighted ? 'ring-2 ring-blue-400 bg-blue-50 border-blue-200' : ''
      } ${
        isOptimistic ? 'opacity-75' : ''
      }`}>
        <div className="flex items-center space-x-3">
          <DutyIcon className={`h-4 w-4 ${
            isHighlighted ? 'text-blue-600' : 
            isUpcoming ? 'text-orange-600' : 'text-gray-600'
          }`} />
          <div>
            <div className="flex items-center space-x-2">
              <p className="font-medium text-sm">{duty.title}</p>
              {getRotationBadge()}
              {isHighlighted && (
                <div className="flex items-center space-x-1">
                  <Sparkles className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-700 font-medium">
                    {duty.id.startsWith('temp_') ? 'Creating...' : 'Updated'}
                  </span>
                </div>
              )}
              {isUpcoming && !isHighlighted && (
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                  <span className="text-xs text-orange-700 font-medium">
                    {daysUntilStart}d
                  </span>
                </div>
              )}
            </div>
            <p className={`text-xs ${isUpcoming ? 'text-orange-600' : 'text-gray-500'}`}>
              {formatDateRange()}
            </p>
            {duty.is_rotation && nextAssignee && (
              <p className="text-xs text-purple-600">{getRotationStatusText()}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit?.(duty)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {duty.is_rotation && onManageRotation && (
                  <DropdownMenuItem onClick={() => onManageRotation?.(duty.rotation_id)}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Rotation
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Card className={`w-full transition-all duration-300 ${
        isActive ? 'ring-2 ring-green-200' : ''
      } ${
        isHighlighted ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      } ${
        isOptimistic ? 'opacity-75' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${dutyConfig.color}`}>
                <DutyIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{duty.title}</CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={dutyConfig.badgeVariant}>
                    {dutyConfig.label}
                  </Badge>
                  {getStatusBadge()}
                  {getRotationBadge()}
                  {isHighlighted && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {duty.id.startsWith('temp_') ? 'Creating...' : 'Updated'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit?.(duty)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Duty
                  </DropdownMenuItem>
                  {duty.is_rotation && onManageRotation && (
                    <DropdownMenuItem onClick={() => onManageRotation?.(duty.rotation_id)}>
                      <Users className="h-4 w-4 mr-2" />
                      Manage Rotation
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Duty
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Upcoming Alert */}
          {isUpcoming && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Upcoming Duty Assignment
                  </p>
                  <p className="text-xs text-orange-700">
                    This duty starts in {daysUntilStart} day{daysUntilStart !== 1 ? 's' : ''}
                    {teamMember && ` for ${teamMember.name}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Team Member Info */}
          {teamMember && (
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm">
                  {getTeamMemberInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{teamMember.name}</p>
                <p className="text-xs text-gray-500 flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  Assigned Team Member
                </p>
              </div>
            </div>
          )}

          {/* Date and Duration Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 flex items-center mb-1">
                <Calendar className="h-4 w-4 mr-1" />
                Duration
              </p>
              <p className="font-medium">{getDurationText()}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Date Range</p>
              <p className="font-medium">{formatDateRange()}</p>
            </div>
          </div>

          {/* Description */}
          {duty.description && (
            <div>
              <p className="text-gray-500 text-sm mb-1">Description</p>
              <p className="text-sm">{duty.description}</p>
            </div>
          )}

          {/* Rotation Information */}
          {duty.is_rotation && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <RotateCcw className="h-4 w-4 text-purple-600" />
                <p className="font-medium text-sm text-purple-800">Rotation Details</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-purple-600 mb-1">Participants</p>
                  <p className="font-medium text-purple-800">
                    {duty.rotation_participants} team members
                  </p>
                </div>
                <div>
                  <p className="text-purple-600 mb-1">Cycle Length</p>
                  <p className="font-medium text-purple-800">
                    {duty.rotation_cycle_weeks} week{duty.rotation_cycle_weeks !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {nextAssignee && !isLoadingRotation && (
                <div className="mt-3 pt-2 border-t border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-purple-600" />
                      <span className="text-xs text-purple-600">Next Assignment</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-purple-800">
                      <span className="font-medium">{nextAssignee.assignee_name}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>
                        {nextAssignee.weeks_until_rotation === 0 
                          ? 'This week' 
                          : `${nextAssignee.weeks_until_rotation} week${nextAssignee.weeks_until_rotation !== 1 ? 's' : ''}`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isLoadingRotation && (
                <div className="mt-3 pt-2 border-t border-purple-200">
                  <p className="text-xs text-purple-600">Loading rotation info...</p>
                </div>
              )}
            </div>
          )}

          {/* Progress indicator for active duties */}
          {isActive && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{duty.is_rotation ? 'Rotation Progress' : 'Progress'}</span>
                <span>
                  {Math.round(((now - startDate) / (endDate - startDate)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    duty.is_rotation ? 'bg-purple-500' : 'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, Math.max(0, ((now - startDate) / (endDate - startDate)) * 100))}%` 
                  }}
                />
              </div>
              {duty.is_rotation && (
                <p className="text-xs text-purple-600 mt-1">
                  Current rotation period for {teamMember?.name || 'team member'}
                </p>
              )}
            </div>
          )}

          {/* Context Actions for Team Member */}
          {teamMember && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <AgendaContextActions
                teamMemberId={teamMember.id}
                teamMemberName={teamMember.name}
                sourceItem={{
                  title: `${dutyConfig.label}: ${duty.title}`,
                  description: `${duty.description || ''} (${formatDateRange()})`,
                  type: 'duty',
                  id: duty.id,
                  start_date: duty.start_date,
                  end_date: duty.end_date,
                  duty_type: duty.type
                }}
                variant="outline"
                size="sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Duty Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{duty.title}"? This action cannot be undone.
              {isActive && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Warning: This duty is currently active.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Duty'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}