import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Star, Plus, X } from 'lucide-react';

const StarRating = ({ value, onChange, disabled }) => {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className="p-0.5 focus:outline-none disabled:opacity-50"
          onClick={() => !disabled && onChange(rating)}
          onMouseEnter={() => !disabled && setHoverValue(rating)}
          onMouseLeave={() => setHoverValue(0)}
          disabled={disabled}
        >
          <Star
            className={`h-6 w-6 ${
              (hoverValue || value) >= rating
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const PerformanceFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  workItems = [],
  isLoading = false,
}) => {
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    year: currentYear.toString(),
    summary: '',
    strengths: '',
    areas_for_improvement: '',
    main_points: [],
    self_technical_rating: null,
    self_collaboration_rating: null,
    technical_rating: null,
    collaboration_rating: null,
    highlighted_work_items: [],
  });
  const [newMainPoint, setNewMainPoint] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          year: (initialData.year || currentYear).toString(),
          summary: initialData.summary || '',
          strengths: initialData.strengths || '',
          areas_for_improvement: initialData.areas_for_improvement || '',
          main_points: Array.isArray(initialData.main_points) ? initialData.main_points : [],
          self_technical_rating: initialData.self_technical_rating || null,
          self_collaboration_rating: initialData.self_collaboration_rating || null,
          technical_rating: initialData.technical_rating || null,
          collaboration_rating: initialData.collaboration_rating || null,
          highlighted_work_items: Array.isArray(initialData.highlighted_work_items)
            ? initialData.highlighted_work_items
            : [],
        });
      } else {
        setFormData({
          year: currentYear.toString(),
          summary: '',
          strengths: '',
          areas_for_improvement: '',
          main_points: [],
          self_technical_rating: null,
          self_collaboration_rating: null,
          technical_rating: null,
          collaboration_rating: null,
          highlighted_work_items: [],
        });
      }
      setNewMainPoint('');
      setErrors({});
    }
  }, [open, initialData, currentYear]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addMainPoint = () => {
    if (newMainPoint.trim()) {
      setFormData((prev) => ({
        ...prev,
        main_points: [...prev.main_points, newMainPoint.trim()],
      }));
      setNewMainPoint('');
    }
  };

  const removeMainPoint = (index) => {
    setFormData((prev) => ({
      ...prev,
      main_points: prev.main_points.filter((_, i) => i !== index),
    }));
  };

  const toggleWorkItem = (workItemId) => {
    setFormData((prev) => {
      const current = prev.highlighted_work_items;
      if (current.includes(workItemId)) {
        return {
          ...prev,
          highlighted_work_items: current.filter((id) => id !== workItemId),
        };
      }
      if (current.length >= 5) {
        return prev;
      }
      return {
        ...prev,
        highlighted_work_items: [...current, workItemId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submitData = {
      year: parseInt(formData.year, 10),
      summary: formData.summary.trim() || null,
      strengths: formData.strengths.trim() || null,
      areas_for_improvement: formData.areas_for_improvement.trim() || null,
      main_points: formData.main_points,
      self_technical_rating: formData.self_technical_rating,
      self_collaboration_rating: formData.self_collaboration_rating,
      technical_rating: formData.technical_rating,
      collaboration_rating: formData.collaboration_rating,
      highlighted_work_items: formData.highlighted_work_items,
    };

    await onSubmit(submitData);
  };

  const isEditing = !!initialData;

  // Calculate overall rating from all available ratings
  const getOverallRating = () => {
    const ratings = [
      formData.self_technical_rating,
      formData.self_collaboration_rating,
      formData.technical_rating,
      formData.collaboration_rating,
    ].filter((r) => r != null);
    if (ratings.length === 0) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  };

  const overallRating = getOverallRating();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Performance Evaluation' : 'Create Performance Evaluation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={formData.year}
                onValueChange={(value) => handleInputChange('year', value)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
                  <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Self-Assessment Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-sm font-medium text-gray-600">Self-Assessment</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <p className="text-xs text-gray-500">Developer's self-evaluation of their performance</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Technical Rating</Label>
                <StarRating
                  value={formData.self_technical_rating}
                  onChange={(value) => handleInputChange('self_technical_rating', value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Collaboration Rating</Label>
                <StarRating
                  value={formData.self_collaboration_rating}
                  onChange={(value) => handleInputChange('self_collaboration_rating', value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Manager Assessment Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-sm font-medium text-gray-600">Manager Assessment</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <p className="text-xs text-gray-500">Manager's evaluation of the developer's performance</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Technical Rating</Label>
                <StarRating
                  value={formData.technical_rating}
                  onChange={(value) => handleInputChange('technical_rating', value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Collaboration Rating</Label>
                <StarRating
                  value={formData.collaboration_rating}
                  onChange={(value) => handleInputChange('collaboration_rating', value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {overallRating && (
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Overall Rating: </span>
              <span className="font-bold text-lg">{overallRating}</span>
              <span className="text-gray-500"> / 5</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              placeholder="Summarize the overall performance..."
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strengths">Strengths</Label>
            <Textarea
              id="strengths"
              placeholder="Key strengths demonstrated..."
              value={formData.strengths}
              onChange={(e) => handleInputChange('strengths', e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areas_for_improvement">Areas for Improvement</Label>
            <Textarea
              id="areas_for_improvement"
              placeholder="Areas where improvement is needed..."
              value={formData.areas_for_improvement}
              onChange={(e) => handleInputChange('areas_for_improvement', e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Main Points</Label>
            <div className="space-y-2">
              {formData.main_points.map((point, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                  <span className="flex-1 text-sm">{point}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMainPoint(index)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a main point..."
                  value={newMainPoint}
                  onChange={(e) => setNewMainPoint(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMainPoint())}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMainPoint}
                  disabled={isLoading || !newMainPoint.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {workItems.length > 0 && (
            <div className="space-y-2">
              <Label>
                Key Contributions ({formData.highlighted_work_items.length}/5)
              </Label>
              <p className="text-xs text-gray-500">Select up to 5 work items to highlight</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                {workItems.map((item) => {
                  const isSelected = formData.highlighted_work_items.includes(item.id);
                  return (
                    <Badge
                      key={item.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer ${
                        !isSelected && formData.highlighted_work_items.length >= 5
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                      onClick={() => toggleWorkItem(item.id)}
                    >
                      {item.name}
                    </Badge>
                  );
                })}
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
                ? 'Update Evaluation'
                : 'Create Evaluation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PerformanceFormDialog;
