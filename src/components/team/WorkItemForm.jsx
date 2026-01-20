import { useState, useEffect, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppContext } from '@/contexts/AppContext';
import { CheckCircle2, ArrowUpCircle } from 'lucide-react';

const WorkItemForm = ({
  open,
  onOpenChange,
  onSubmit,
  teamMemberId,
  initialData = null,
  isLoading = false,
}) => {
  const { projects } = useContext(AppContext);
  const [formData, setFormData] = useState({
    name: '',
    project_id: '',
    effort_value: '',
    effort_unit: 'hours',
    sprint_name: '',
    initialInsight: '',
    insightType: 'keep',
  });
  const [errors, setErrors] = useState({});

  // Parse effort_estimation string (e.g., "16 hours") into value and unit
  const parseEffortEstimation = (estimation) => {
    if (!estimation) return { value: '', unit: 'hours' };
    const match = estimation.match(/^(\d+(?:\.\d+)?)\s*(hours?|days?)$/i);
    if (match) {
      const unit = match[2].toLowerCase().startsWith('day') ? 'days' : 'hours';
      return { value: match[1], unit };
    }
    return { value: '', unit: 'hours' };
  };

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        const { value, unit } = parseEffortEstimation(initialData.effort_estimation);
        setFormData({
          name: initialData.name || '',
          project_id: initialData.project_id || '',
          effort_value: value,
          effort_unit: unit,
          sprint_name: initialData.sprint_name || '',
          initialInsight: '',
          insightType: 'keep',
        });
      } else {
        setFormData({
          name: '',
          project_id: '',
          effort_value: '',
          effort_unit: 'hours',
          sprint_name: '',
          initialInsight: '',
          insightType: 'keep',
        });
      }
      setErrors({});
    }
  }, [open, initialData]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Work item name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = {
      team_member_id: teamMemberId,
      name: formData.name.trim(),
      project_id: formData.project_id && formData.project_id !== 'none' ? formData.project_id : null,
      effort_estimation: formData.effort_value
        ? `${formData.effort_value} ${formData.effort_unit}`
        : null,
      sprint_name: formData.sprint_name.trim() || null,
    };

    // Include initial insight if provided
    const initialInsight = formData.initialInsight.trim()
      ? { text: formData.initialInsight.trim(), type: formData.insightType }
      : null;

    await onSubmit(submitData, initialInsight);
  };

  const isEditing = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Work Item' : 'Add Work Item'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the work item details below.'
              : 'Add a new work item to track current work for this team member.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Work Item Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Work Item Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Implement user authentication"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isLoading}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Project (Epic)</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => handleInputChange('project_id', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sprint Name */}
          <div className="space-y-2">
            <Label htmlFor="sprint_name">Sprint Name</Label>
            <Input
              id="sprint_name"
              placeholder="e.g., Sprint 42, 2026-Q1-W3"
              value={formData.sprint_name}
              onChange={(e) => handleInputChange('sprint_name', e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Effort Estimation */}
          <div className="space-y-2">
            <Label>Effort Estimation</Label>
            <div className="flex gap-2">
              <Input
                id="effort_value"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g., 8"
                value={formData.effort_value}
                onChange={(e) => handleInputChange('effort_value', e.target.value)}
                disabled={isLoading}
                className="w-24"
              />
              <Select
                value={formData.effort_unit}
                onValueChange={(value) => handleInputChange('effort_unit', value)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">hours</SelectItem>
                  <SelectItem value="days">days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Initial Insight (only for new work items) */}
          {!isEditing && (
            <div className="space-y-2 p-3 border rounded-lg bg-gray-50">
              <Label htmlFor="initialInsight">Initial Insight (optional)</Label>
              <Input
                id="initialInsight"
                placeholder="Any initial observations or notes?"
                value={formData.initialInsight}
                onChange={(e) => handleInputChange('initialInsight', e.target.value)}
                disabled={isLoading}
              />
              <div className="flex items-center gap-4 pt-1">
                <span className="text-sm text-gray-500">Type:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="insightType"
                    value="keep"
                    checked={formData.insightType === 'keep'}
                    onChange={() => handleInputChange('insightType', 'keep')}
                    disabled={isLoading}
                    className="w-4 h-4"
                  />
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Keep</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="insightType"
                    value="improve"
                    checked={formData.insightType === 'improve'}
                    onChange={() => handleInputChange('insightType', 'improve')}
                    disabled={isLoading}
                    className="w-4 h-4"
                  />
                  <ArrowUpCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Improve</span>
                </label>
              </div>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? 'Saving...'
              : isEditing
                ? 'Update Work Item'
                : 'Create Work Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkItemForm;
