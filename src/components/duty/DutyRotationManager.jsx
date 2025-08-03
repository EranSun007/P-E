import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Users, 
  Calendar, 
  Clock, 
  ArrowRight,
  RotateCcw,
  Play,
  Pause,
  User,
  Settings,
  XCircle,
  Loader2
} from 'lucide-react';
import { DutyRotationService } from '../../services/dutyRotationService';
import { localClient } from '../../api/localClient';

const DUTY_TITLES = [
  { value: 'Reporting', label: 'Reporting' },
  { value: 'Metering', label: 'Metering' },
  { value: 'DevOps', label: 'DevOps' }
];

export default function DutyRotationManager({ 
  rotations = [], 
  teamMembers = [], 
  onCreateRotation, 
  onUpdateRotation, 
  onDeleteRotation,
  onRefresh 
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [selectedRotation, setSelectedRotation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [operationInProgress, setOperationInProgress] = useState(null); // 'create', 'edit', 'delete', 'advance', 'toggle'
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    participants: [],
    cycle_weeks: 1
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Rotation schedules and details
  const [rotationSchedules, setRotationSchedules] = useState({});
  const [rotationDetails, setRotationDetails] = useState({});

  useEffect(() => {
    loadRotationDetails();
  }, [rotations]);

  const loadRotationDetails = async () => {
    const schedules = {};
    const details = {};
    
    for (const rotation of rotations) {
      try {
        // Get rotation schedule
        const schedule = await DutyRotationService.getRotationSchedule(rotation.id, 2);
        schedules[rotation.id] = schedule;
        
        // Get current and next assignee
        const currentAssignee = await DutyRotationService.getCurrentAssignee(rotation.id);
        const nextAssignee = await DutyRotationService.getNextAssignee(rotation.id);
        
        details[rotation.id] = {
          currentAssignee,
          nextAssignee
        };
      } catch (error) {
        console.error(`Failed to load details for rotation ${rotation.id}:`, error);
      }
    }
    
    setRotationSchedules(schedules);
    setRotationDetails(details);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      participants: [],
      cycle_weeks: 1
    });
    setFormErrors({});
    setError(null);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Rotation name is required';
    }
    
    if (!formData.type) {
      errors.type = 'Duty type is required';
    }
    
    if (formData.participants.length < 2) {
      errors.participants = 'At least 2 participants are required for a rotation';
    }
    
    if (formData.cycle_weeks < 1) {
      errors.cycle_weeks = 'Cycle duration must be at least 1 week';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRotation = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setOperationInProgress('create');
    setError(null);
    
    try {
      const rotation = await DutyRotationService.createRotation(formData);
      onCreateRotation?.(rotation);
      setShowCreateDialog(false);
      resetForm();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to create rotation:', error);
      
      // Parse error for better user experience
      let userFriendlyError = error.message;
      if (error.message.includes('participants')) {
        userFriendlyError = 'Invalid participants selected. Please ensure all selected team members are valid and at least 2 participants are chosen.';
      } else if (error.message.includes('cycle_weeks')) {
        userFriendlyError = 'Invalid cycle duration. Please enter a valid number of weeks (minimum 1).';
      } else if (error.message.includes('name')) {
        userFriendlyError = 'Rotation name is required. Please provide a descriptive name for this rotation.';
      }
      
      setError(userFriendlyError);
    } finally {
      setIsLoading(false);
      setOperationInProgress(null);
    }
  };

  const handleEditRotation = async () => {
    if (!validateForm() || !selectedRotation) return;
    
    setIsLoading(true);
    setOperationInProgress('edit');
    setError(null);
    
    try {
      const updatedRotation = await localClient.entities.DutyRotation.update(
        selectedRotation.id, 
        formData
      );
      onUpdateRotation?.(updatedRotation);
      setShowEditDialog(false);
      setSelectedRotation(null);
      resetForm();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update rotation:', error);
      
      // Parse error for better user experience
      let userFriendlyError = error.message;
      if (error.message.includes('active duties')) {
        userFriendlyError = 'Cannot modify rotation while there are active duties. Please wait for current duties to complete or deactivate the rotation first.';
      } else if (error.message.includes('participants')) {
        userFriendlyError = 'Invalid participants configuration. Ensure all selected team members are valid and at least 2 participants are chosen.';
      }
      
      setError(userFriendlyError);
    } finally {
      setIsLoading(false);
      setOperationInProgress(null);
    }
  };

  const handleDeleteRotation = async () => {
    if (!selectedRotation) return;
    
    setIsLoading(true);
    setOperationInProgress('delete');
    
    try {
      await localClient.entities.DutyRotation.delete(selectedRotation.id);
      onDeleteRotation?.(selectedRotation);
      setShowDeleteDialog(false);
      setSelectedRotation(null);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to delete rotation:', error);
      
      let userFriendlyError = error.message;
      if (error.message.includes('active duties')) {
        userFriendlyError = 'Cannot delete rotation with active duties. Please wait for current duties to complete or manually remove them first.';
      }
      
      setError(userFriendlyError);
    } finally {
      setIsLoading(false);
      setOperationInProgress(null);
    }
  };

  const handleAdvanceRotation = async () => {
    if (!selectedRotation) return;
    
    setIsLoading(true);
    setOperationInProgress('advance');
    
    try {
      await DutyRotationService.advanceRotation(selectedRotation.id);
      setShowAdvanceDialog(false);
      setSelectedRotation(null);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to advance rotation:', error);
      
      let userFriendlyError = error.message;
      if (error.message.includes('no active duties')) {
        userFriendlyError = 'Cannot advance rotation: No active duties found. The rotation may already be at the correct position.';
      } else if (error.message.includes('inactive')) {
        userFriendlyError = 'Cannot advance inactive rotation. Please activate the rotation first.';
      }
      
      setError(userFriendlyError);
    } finally {
      setIsLoading(false);
      setOperationInProgress(null);
    }
  };

  const handleToggleRotationStatus = async () => {
    if (!selectedRotation) return;
    
    setIsLoading(true);
    setOperationInProgress('toggle');
    
    try {
      if (selectedRotation.is_active) {
        await DutyRotationService.deactivateRotation(selectedRotation.id);
      } else {
        await DutyRotationService.activateRotation(selectedRotation.id);
      }
      setShowToggleDialog(false);
      setSelectedRotation(null);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to toggle rotation status:', error);
      
      let userFriendlyError = error.message;
      if (error.message.includes('participants not found')) {
        userFriendlyError = 'Cannot activate rotation: Some participants are no longer available. Please update the participant list.';
      } else if (error.message.includes('active duties')) {
        userFriendlyError = 'Cannot deactivate rotation with active duties. Please wait for current duties to complete.';
      }
      
      setError(userFriendlyError);
    } finally {
      setIsLoading(false);
      setOperationInProgress(null);
    }
  };

  const openEditDialog = (rotation) => {
    setSelectedRotation(rotation);
    setFormData({
      name: rotation.name,
      type: rotation.type,
      participants: rotation.participants,
      cycle_weeks: rotation.cycle_weeks
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (rotation) => {
    setSelectedRotation(rotation);
    setShowDeleteDialog(true);
  };

  const getTeamMemberName = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    return member ? member.name : 'Unknown';
  };

  const getTeamMemberInitials = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member?.name) return '?';
    return member.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderRotationCard = (rotation) => {
    const schedule = rotationSchedules[rotation.id] || [];
    const details = rotationDetails[rotation.id] || {};
    const currentAssignee = details.currentAssignee;
    const nextAssignee = details.nextAssignee;

    return (
      <Card key={rotation.id} className={`${rotation.is_active ? 'ring-2 ring-blue-200' : 'opacity-75'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{rotation.name}</CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">{rotation.type}</Badge>
                  <Badge variant={rotation.is_active ? "default" : "secondary"}>
                    {rotation.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {rotation.participants.length} participants
                  </Badge>
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(rotation)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Rotation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setSelectedRotation(rotation);
                  setShowAdvanceDialog(true);
                }}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Advance Rotation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setSelectedRotation(rotation);
                  setShowToggleDialog(true);
                }}>
                  {rotation.is_active ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => openDeleteDialog(rotation)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Rotation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Current and Next Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Current Assignee</p>
              {currentAssignee ? (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">
                      {getTeamMemberInitials(currentAssignee.id)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{currentAssignee.name}</span>
                </div>
              ) : (
                <span className="text-gray-400">Not assigned</span>
              )}
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-2">Next Assignee</p>
              {nextAssignee ? (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">
                      {getTeamMemberInitials(nextAssignee.id)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{nextAssignee.name}</span>
                </div>
              ) : (
                <span className="text-gray-400">Not set</span>
              )}
            </div>
          </div>

          {/* Rotation Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 flex items-center mb-1">
                <Clock className="h-4 w-4 mr-1" />
                Cycle Duration
              </p>
              <p className="font-medium">
                {rotation.cycle_weeks} week{rotation.cycle_weeks > 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <p className="text-gray-500 flex items-center mb-1">
                <Calendar className="h-4 w-4 mr-1" />
                Next Rotation
              </p>
              <p className="font-medium">{formatDate(rotation.next_rotation_date)}</p>
            </div>
          </div>

          {/* Participants */}
          <div>
            <p className="text-sm text-gray-500 mb-2 flex items-center">
              <Users className="h-4 w-4 mr-1" />
              Participants ({rotation.participants.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {rotation.participants.map((participantId, index) => (
                <div 
                  key={participantId}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                    index === rotation.current_assignee_index 
                      ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-200' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getTeamMemberInitials(participantId)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{getTeamMemberName(participantId)}</span>
                  {index === rotation.current_assignee_index && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Current
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Schedule Preview */}
          {schedule.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Upcoming Schedule</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {schedule.slice(0, 4).map((assignment, index) => (
                  <div 
                    key={`${assignment.participant_id}-${assignment.cycle}`}
                    className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getTeamMemberInitials(assignment.participant_id)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{assignment.participant_name}</span>
                      {assignment.is_current && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {formatDate(assignment.start_date)} - {formatDate(assignment.end_date)}
                    </span>
                  </div>
                ))}
                {schedule.length > 4 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{schedule.length - 4} more assignments
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCreateEditDialog = (isEdit = false) => {
    const title = isEdit ? 'Edit Rotation' : 'Create New Rotation';
    const action = isEdit ? handleEditRotation : handleCreateRotation;
    
    return (
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-red-800">
                  <strong>Configuration Error</strong>
                  <p className="mt-1">{error}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {operationInProgress && (
            <Alert className="border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription className="text-blue-800">
                {operationInProgress === 'create' && 'Creating rotation...'}
                {operationInProgress === 'edit' && 'Updating rotation...'}
                Please wait while the operation completes.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Rotation Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Rotation Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., On-Call Rotation"
            />
            {formErrors.name && (
              <p className="text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          {/* Duty Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Duty Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duty type" />
              </SelectTrigger>
              <SelectContent>
                {DUTY_TITLES.map(title => (
                  <SelectItem key={title.value} value={title.value}>
                    {title.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.type && (
              <p className="text-sm text-red-600">{formErrors.type}</p>
            )}
          </div>

          {/* Cycle Duration */}
          <div className="space-y-2">
            <Label htmlFor="cycle_weeks">Cycle Duration (weeks) *</Label>
            <Input
              id="cycle_weeks"
              type="number"
              min="1"
              value={formData.cycle_weeks}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                cycle_weeks: parseInt(e.target.value) || 1 
              }))}
            />
            {formErrors.cycle_weeks && (
              <p className="text-sm text-red-600">{formErrors.cycle_weeks}</p>
            )}
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label>Participants * (Select at least 2)</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center space-x-2 py-2">
                  <input
                    type="checkbox"
                    id={`participant-${member.id}`}
                    checked={formData.participants.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          participants: [...prev.participants, member.id]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          participants: prev.participants.filter(id => id !== member.id)
                        }));
                      }
                    }}
                    className="rounded"
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">
                      {getTeamMemberInitials(member.id)}
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor={`participant-${member.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    {member.name}
                  </label>
                </div>
              ))}
            </div>
            {formErrors.participants && (
              <p className="text-sm text-red-600">{formErrors.participants}</p>
            )}
            <p className="text-sm text-gray-500">
              Selected: {formData.participants.length} participants
            </p>
          </div>

          {/* Preview */}
          {formData.participants.length >= 2 && formData.cycle_weeks > 0 && (
            <div className="space-y-2">
              <Label>Rotation Preview</Label>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Each participant will serve for {formData.cycle_weeks} week{formData.cycle_weeks > 1 ? 's' : ''}, 
                  then wait {(formData.participants.length - 1) * formData.cycle_weeks} week{(formData.participants.length - 1) * formData.cycle_weeks > 1 ? 's' : ''} before their next turn.
                </p>
                <p className="text-sm text-gray-600">
                  Complete rotation cycle: {formData.participants.length * formData.cycle_weeks} weeks
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (isEdit) {
                setShowEditDialog(false);
                setSelectedRotation(null);
              } else {
                setShowCreateDialog(false);
              }
              resetForm();
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={action}
            disabled={isLoading || operationInProgress}
          >
            {isLoading || operationInProgress ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEdit ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEdit ? 'Update Rotation' : 'Create Rotation'
            )}
          </Button>
        </div>
      </DialogContent>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Duty Rotation Manager</h2>
          <p className="text-gray-600">
            Manage rotating duty assignments for your team
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rotation
            </Button>
          </DialogTrigger>
          {renderCreateEditDialog(false)}
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Rotations</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Rotations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {rotations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <RotateCcw className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No rotations configured
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  Create your first duty rotation to get started with automated scheduling.
                </p>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Rotation
                    </Button>
                  </DialogTrigger>
                  {renderCreateEditDialog(false)}
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {rotations.map(renderRotationCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-6">
            {rotations.filter(r => r.is_active).map(renderRotationCard)}
            {rotations.filter(r => r.is_active).length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Pause className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No active rotations
                  </h3>
                  <p className="text-gray-500 text-center">
                    All rotations are currently inactive.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <div className="grid gap-6">
            {rotations.filter(r => !r.is_active).map(renderRotationCard)}
            {rotations.filter(r => !r.is_active).length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Play className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No inactive rotations
                  </h3>
                  <p className="text-gray-500 text-center">
                    All rotations are currently active.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        {renderCreateEditDialog(true)}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRotation?.name}"? This action cannot be undone.
              {selectedRotation?.is_active && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Warning: This rotation is currently active and may have associated duties.
                </span>
              )}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">This will:</p>
                <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                  <li>Permanently remove the rotation configuration</li>
                  <li>Stop automatic duty scheduling for this rotation</li>
                  <li>Preserve existing individual duties (they won't be deleted)</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationInProgress === 'delete'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRotation}
              disabled={operationInProgress === 'delete'}
              className="bg-red-600 hover:bg-red-700"
            >
              {operationInProgress === 'delete' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Rotation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advance Rotation Confirmation Dialog */}
      <AlertDialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advance Rotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to advance "{selectedRotation?.name}" to the next participant?
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">This will:</p>
                <ul className="mt-1 text-sm text-blue-700 list-disc list-inside">
                  <li>End the current participant's duty period</li>
                  <li>Start the next participant's duty period immediately</li>
                  <li>Update the rotation schedule accordingly</li>
                  <li>Generate new calendar events for the next assignee</li>
                </ul>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <strong>Note:</strong> This action should typically be done automatically by the system. 
                Manual advancement is usually only needed for exceptional circumstances.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationInProgress === 'advance'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAdvanceRotation}
              disabled={operationInProgress === 'advance'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {operationInProgress === 'advance' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Advancing...
                </>
              ) : (
                'Advance Rotation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Confirmation Dialog */}
      <AlertDialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedRotation?.is_active ? 'Deactivate' : 'Activate'} Rotation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedRotation?.is_active ? 'deactivate' : 'activate'} "{selectedRotation?.name}"?
              
              {selectedRotation?.is_active ? (
                <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-orange-900">Deactivating will:</p>
                  <ul className="mt-1 text-sm text-orange-700 list-disc list-inside">
                    <li>Stop automatic rotation scheduling</li>
                    <li>Preserve current active duties until they naturally end</li>
                    <li>Prevent new duties from being automatically created</li>
                    <li>Allow manual duty management for this rotation type</li>
                  </ul>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">Activating will:</p>
                  <ul className="mt-1 text-sm text-green-700 list-disc list-inside">
                    <li>Resume automatic rotation scheduling</li>
                    <li>Start creating duties for the next scheduled participant</li>
                    <li>Generate calendar events according to the rotation schedule</li>
                    <li>Ensure continuous coverage for this duty type</li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationInProgress === 'toggle'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleRotationStatus}
              disabled={operationInProgress === 'toggle'}
              className={selectedRotation?.is_active ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {operationInProgress === 'toggle' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {selectedRotation?.is_active ? 'Deactivating...' : 'Activating...'}
                </>
              ) : (
                selectedRotation?.is_active ? 'Deactivate Rotation' : 'Activate Rotation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50 mt-4">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="text-red-800">
              <strong>Operation Failed</strong>
              <p className="mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}