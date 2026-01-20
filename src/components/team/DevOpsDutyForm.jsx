import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Lightbulb } from 'lucide-react';

const DevOpsDutyForm = ({
  open,
  onOpenChange,
  onSubmit,
  teamMemberId,
  initialData = null,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    bugs_at_start: '',
    bugs_at_end: '',
    bugs_solved: '',
    escalations: '',
    notes: '',
  });
  const [insights, setInsights] = useState([]);
  const [newInsight, setNewInsight] = useState('');
  const [errors, setErrors] = useState({});

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
          end_date: initialData.end_date ? initialData.end_date.split('T')[0] : '',
          bugs_at_start: initialData.bugs_at_start?.toString() || '',
          bugs_at_end: initialData.bugs_at_end?.toString() || '',
          bugs_solved: initialData.bugs_solved?.toString() || '',
          escalations: initialData.escalations?.toString() || '',
          notes: initialData.notes || '',
        });
        setInsights(initialData.insights || []);
      } else {
        // Set default start_date to today
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          start_date: today,
          end_date: '',
          bugs_at_start: '',
          bugs_at_end: '',
          bugs_solved: '',
          escalations: '',
          notes: '',
        });
        setInsights([]);
      }
      setNewInsight('');
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

  const addInsight = () => {
    if (!newInsight.trim()) return;
    setInsights((prev) => [...prev, newInsight.trim()]);
    setNewInsight('');
  };

  const removeInsight = (index) => {
    setInsights((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
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
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      bugs_at_start: parseInt(formData.bugs_at_start, 10) || 0,
      bugs_at_end: parseInt(formData.bugs_at_end, 10) || 0,
      bugs_solved: parseInt(formData.bugs_solved, 10) || 0,
      escalations: parseInt(formData.escalations, 10) || 0,
      notes: formData.notes.trim() || null,
      insights: insights,
      status: formData.end_date ? 'completed' : 'active',
    };

    await onSubmit(submitData);
  };

  const isEditing = !!initialData;

  // Calculate suggested bugs_solved when bugs_at_start and bugs_at_end are filled
  const suggestedBugsSolved =
    formData.bugs_at_start && formData.bugs_at_end
      ? Math.max(0, parseInt(formData.bugs_at_start, 10) - parseInt(formData.bugs_at_end, 10))
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit DevOps Duty' : 'Add DevOps Duty'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the DevOps duty details below.'
              : 'Track a DevOps duty period with bug metrics and learnings.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                disabled={isLoading}
                className={errors.start_date ? 'border-destructive' : ''}
              />
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">Leave empty for ongoing duty</p>
            </div>
          </div>

          {/* Bug Metrics Section */}
          <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
            <h4 className="font-medium text-sm text-gray-700">Bug Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bugs_at_start">Bugs at Start</Label>
                <Input
                  id="bugs_at_start"
                  type="number"
                  min="0"
                  placeholder="e.g., 45"
                  value={formData.bugs_at_start}
                  onChange={(e) => handleInputChange('bugs_at_start', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bugs_at_end">Bugs at End</Label>
                <Input
                  id="bugs_at_end"
                  type="number"
                  min="0"
                  placeholder="e.g., 38"
                  value={formData.bugs_at_end}
                  onChange={(e) => handleInputChange('bugs_at_end', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bugs_solved">Bugs Solved</Label>
                <Input
                  id="bugs_solved"
                  type="number"
                  min="0"
                  placeholder={suggestedBugsSolved !== null ? `Suggested: ${suggestedBugsSolved}` : 'e.g., 7'}
                  value={formData.bugs_solved}
                  onChange={(e) => handleInputChange('bugs_solved', e.target.value)}
                  disabled={isLoading}
                />
                {suggestedBugsSolved !== null && !formData.bugs_solved && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleInputChange('bugs_solved', suggestedBugsSolved.toString())}
                  >
                    Use suggested: {suggestedBugsSolved}
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="escalations">Escalations</Label>
                <Input
                  id="escalations"
                  type="number"
                  min="0"
                  placeholder="e.g., 2"
                  value={formData.escalations}
                  onChange={(e) => handleInputChange('escalations', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Insights Section */}
          <div className="space-y-3 p-3 border rounded-lg">
            <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Insights & Learnings
            </h4>
            <div className="flex gap-2">
              <Input
                placeholder="What did you learn from this duty?"
                value={newInsight}
                onChange={(e) => setNewInsight(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addInsight();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addInsight}
                disabled={!newInsight.trim() || isLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {insights.length > 0 && (
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm"
                  >
                    <span className="flex-1">{insight}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeInsight(index)}
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this duty period..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>
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
                ? 'Update Duty'
                : 'Create Duty'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DevOpsDutyForm;
