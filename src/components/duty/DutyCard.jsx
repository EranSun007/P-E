import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
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
} from '../ui/alert-dialog';
import { MoreVertical, Shield, Phone, Settings, Calendar, User, Trash2, Edit } from 'lucide-react';
import AgendaContextActions from '../agenda/AgendaContextActions';

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
  showActions = true,
  compact = false 
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
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

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50">
        <div className="flex items-center space-x-3">
          <DutyIcon className="h-4 w-4 text-gray-600" />
          <div>
            <p className="font-medium text-sm">{duty.title}</p>
            <p className="text-xs text-gray-500">{formatDateRange()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(duty)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600"
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
      <Card className={`w-full ${isActive ? 'ring-2 ring-green-200' : ''}`}>
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
                </div>
              </div>
            </div>
            
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(duty)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Duty
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600"
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

          {/* Progress indicator for active duties */}
          {isActive && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>
                  {Math.round(((now - startDate) / (endDate - startDate)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, ((now - startDate) / (endDate - startDate)) * 100))}%` 
                  }}
                />
              </div>
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