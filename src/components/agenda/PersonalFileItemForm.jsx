import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PersonalFileItem } from '@/api/oneOnOneAgenda';
import { toast } from 'sonner';

/**
 * Form component for creating and editing personal file items
 * 
 * @param {Object} props
 * @param {string} props.teamMemberId - ID of the team member this personal file item is for
 * @param {Function} props.onSubmit - Callback function called after successful submission
 * @param {Object} [props.initialData] - Initial data for editing an existing personal file item
 * @param {Object} [props.sourceItem] - Source item data when creating from existing content
 * @param {Function} [props.onCancel] - Optional callback for canceling the form
 */
const PersonalFileItemForm = ({ 
  teamMemberId, 
  onSubmit, 
  initialData = null, 
  sourceItem = null,
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    category: 'achievement',
    tags: '',
    importance: '3'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form with data if editing an existing item or creating from source
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        notes: initialData.notes || '',
        category: initialData.category || 'achievement',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '',
        importance: initialData.importance?.toString() || '3'
      });
    } else if (sourceItem) {
      // Pre-fill form with source item data
      setFormData({
        title: sourceItem.title || '',
        notes: sourceItem.description || sourceItem.text || '',
        category: 'achievement', // Default category
        tags: '',
        importance: '3'
      });
    }
  }, [initialData, sourceItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Process tags from comma-separated string to array
      const tags = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];
      
      const personalFileItemData = {
        teamMemberId,
        title: formData.title.trim(),
        notes: formData.notes.trim(),
        category: formData.category,
        tags,
        importance: parseInt(formData.importance, 10),
        sourceType: sourceItem?.type || 'manual',
        sourceId: sourceItem?.id || null
      };
      
      let result;
      
      if (initialData?.id) {
        // Update existing personal file item
        result = await PersonalFileItem.update(initialData.id, personalFileItemData);
        toast.success('Personal file item updated successfully');
      } else {
        // Create new personal file item
        result = await PersonalFileItem.create(personalFileItemData);
        toast.success('Item saved to personal file');
      }
      
      // Reset form
      if (!initialData) {
        setFormData({
          title: '',
          notes: '',
          category: 'achievement',
          tags: '',
          importance: '3'
        });
      }
      
      // Call onSubmit callback with the result
      if (onSubmit) {
        onSubmit(result);
      }
    } catch (error) {
      console.error('Error saving personal file item:', error);
      toast.error('Failed to save personal file item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter a title for this item"
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Enter detailed notes about this item"
          rows={4}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select 
          value={formData.category} 
          onValueChange={(value) => handleSelectChange('category', value)}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="achievement">Achievement</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
            <SelectItem value="concern">Concern</SelectItem>
            <SelectItem value="goal">Goal</SelectItem>
            <SelectItem value="improvement">Improvement</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="importance">Importance</Label>
        <Select 
          value={formData.importance} 
          onValueChange={(value) => handleSelectChange('importance', value)}
        >
          <SelectTrigger id="importance">
            <SelectValue placeholder="Select importance level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Low</SelectItem>
            <SelectItem value="2">Medium-Low</SelectItem>
            <SelectItem value="3">Medium</SelectItem>
            <SelectItem value="4">Medium-High</SelectItem>
            <SelectItem value="5">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleChange}
          placeholder="e.g. leadership, communication, project-x"
        />
      </div>
      
      <div className="flex justify-end space-x-2 pt-2">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update Item' : 'Save to Personal File'}
        </Button>
      </div>
    </form>
  );
};

export default PersonalFileItemForm;