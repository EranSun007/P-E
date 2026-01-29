// src/components/sync/SyncItemModal.jsx
// Modal for viewing/editing sync items with all form fields

import { useState, useEffect, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppContext } from '@/contexts/AppContext';
import { useSync, CATEGORIES, TEAM_DEPARTMENTS, SYNC_STATUSES } from '@/contexts/SyncContext';
import { getCurrentCycle, listSprints, formatSprintLabel } from '@/utils/releaseCycles';
import { Pencil, Trash2 } from 'lucide-react';
import { SubtaskSection } from './SubtaskSection';

// Generate sprint options for dropdown (current + 2 more cycles)
function getSprintOptions() {
  const currentCycle = getCurrentCycle();
  const sprints = listSprints(currentCycle.id, 3);
  return sprints.map(sprint => ({
    id: sprint.id,
    label: formatSprintLabel(sprint.id, true),
  }));
}

// Get default sprint ID
function getDefaultSprintId() {
  const currentCycle = getCurrentCycle();
  return currentCycle.currentSprint?.id || `${currentCycle.id}a`;
}

export function SyncItemModal({
  open,
  onOpenChange,
  item,
  onSave,
  onDelete,
}) {
  const { teamMembers } = useContext(AppContext);
  const { currentTeam } = useSync();

  // Mode: 'view' for existing items, 'edit' for editing/creating
  const [mode, setMode] = useState('view');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'goal',
    team_department: 'all',
    sync_status: 'not_started',
    assigned_to: '',
    sprint_id: '',
    description: '',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  // Sprint options (memoized but still fresh per render since dates don't change mid-session)
  const sprintOptions = getSprintOptions();

  // Reset form when modal opens or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        // Editing existing item - start in view mode
        setFormData({
          name: item.name || '',
          category: item.category || 'goal',
          team_department: item.team_department || 'all',
          sync_status: item.sync_status || 'not_started',
          assigned_to: item.assigned_to || '',
          sprint_id: item.sprint_id || '',
          description: item.description || '',
        });
        setMode('view');
      } else {
        // Creating new item - start in edit mode with defaults
        setFormData({
          name: '',
          category: CATEGORIES[0].id,
          team_department: currentTeam !== 'all' ? currentTeam : TEAM_DEPARTMENTS[1].id,
          sync_status: 'not_started',
          assigned_to: '',
          sprint_id: getDefaultSprintId(),
          description: '',
        });
        setMode('edit');
      }
      setHasChanges(false);
      setErrors({});
    }
  }, [open, item?.id, currentTeam]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);

    // Clear field error when user types
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Title is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.team_department) {
      newErrors.team_department = 'Team is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async (e) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        name: formData.name.trim(),
        category: formData.category,
        team_department: formData.team_department,
        sync_status: formData.sync_status,
        assigned_to: formData.assigned_to || null,
        sprint_id: formData.sprint_id || null,
        description: formData.description.trim() || null,
      };

      await onSave(submitData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save sync item:', error);
      // Keep modal open on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close with unsaved changes check
  const handleClose = (newOpen) => {
    if (!newOpen && hasChanges && mode === 'edit') {
      setShowDiscardAlert(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  // Handle discard confirmation
  const handleDiscardConfirm = () => {
    setShowDiscardAlert(false);
    setHasChanges(false);
    onOpenChange(false);
  };

  // Handle delete
  const handleDelete = async () => {
    if (onDelete && item?.id) {
      await onDelete(item.id);
    }
  };

  // Find label for a value in an options array
  const findLabel = (options, value) => {
    const option = options.find(opt => opt.id === value);
    return option?.label || value || 'None';
  };

  // Find team member name by ID
  const findTeamMemberName = (id) => {
    if (!id) return 'Unassigned';
    const member = teamMembers?.find(m => m.id === id);
    return member?.name || 'Unknown';
  };

  // Find sprint label
  const findSprintLabel = (sprintId) => {
    if (!sprintId) return 'None';
    return formatSprintLabel(sprintId, true);
  };

  // View mode content
  const renderViewMode = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">{formData.name}</DialogTitle>
        <DialogDescription>
          Sync item details
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Category</Label>
            <p className="mt-1 font-medium">{findLabel(CATEGORIES, formData.category)}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Team</Label>
            <p className="mt-1 font-medium">{findLabel(TEAM_DEPARTMENTS, formData.team_department)}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Status</Label>
            <p className="mt-1 font-medium">{findLabel(SYNC_STATUSES, formData.sync_status)}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Assigned To</Label>
            <p className="mt-1 font-medium">{findTeamMemberName(formData.assigned_to)}</p>
          </div>
          <div className="col-span-2">
            <Label className="text-sm text-muted-foreground">Sprint</Label>
            <p className="mt-1 font-medium">{findSprintLabel(formData.sprint_id)}</p>
          </div>
        </div>

        {formData.description && (
          <div>
            <Label className="text-sm text-muted-foreground">Description</Label>
            <p className="mt-1 whitespace-pre-wrap">{formData.description}</p>
          </div>
        )}
      </div>

      {/* Subtask Section - shown for existing items in view mode */}
      <SubtaskSection
        itemId={item?.id}
        isNewItem={!item}
      />

      <DialogFooter className="gap-2">
        {onDelete && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button onClick={() => setMode('edit')}>
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogFooter>
    </>
  );

  // Edit mode content
  const renderEditMode = () => (
    <>
      <DialogHeader>
        <DialogTitle>
          {item ? 'Edit Sync Item' : 'Create Sync Item'}
        </DialogTitle>
        <DialogDescription>
          {item ? 'Update the sync item details.' : 'Add a new sync item to track.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSave} className="space-y-4 py-4">
        {/* Name field */}
        <div className="space-y-2">
          <Label htmlFor="name">Title *</Label>
          <Input
            id="name"
            placeholder="Enter sync item title"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={isSubmitting}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Category and Team dropdowns - side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="team_department">Team *</Label>
            <Select
              value={formData.team_department}
              onValueChange={(value) => handleInputChange('team_department', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className={errors.team_department ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_DEPARTMENTS.filter(t => t.id !== 'all').map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.team_department && (
              <p className="text-sm text-destructive">{errors.team_department}</p>
            )}
          </div>
        </div>

        {/* Status and Assigned To - side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sync_status">Status</Label>
            <Select
              value={formData.sync_status}
              onValueChange={(value) => handleInputChange('sync_status', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {SYNC_STATUSES.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Select
              value={formData.assigned_to || 'unassigned'}
              onValueChange={(value) => handleInputChange('assigned_to', value === 'unassigned' ? '' : value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {(teamMembers || []).map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sprint dropdown - full width */}
        <div className="space-y-2">
          <Label htmlFor="sprint_id">Sprint</Label>
          <Select
            value={formData.sprint_id || 'none'}
            onValueChange={(value) => handleInputChange('sprint_id', value === 'none' ? '' : value)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Sprint</SelectItem>
              {sprintOptions.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  {sprint.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description textarea */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Add additional details or context..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={isSubmitting}
            rows={3}
          />
        </div>
      </form>

      {/* Subtask Section - shown for existing items in edit mode */}
      <SubtaskSection
        itemId={item?.id}
        isNewItem={!item}
      />

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => handleClose(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (item ? 'Update' : 'Create')}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          {mode === 'view' ? renderViewMode() : renderEditMode()}
        </DialogContent>
      </Dialog>

      {/* Discard changes confirmation */}
      <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardConfirm}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SyncItemModal;
