import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AgendaItem } from '@/api/oneOnOneAgenda';
import { toast } from 'sonner';

/**
 * Form component for creating and editing 1:1 agenda items
 * 
 * @param {Object} props
 * @param {string} props.teamMemberId - ID of the team member this agenda item is for
 * @param {Function} props.onSubmit - Callback function called after successful submission
 * @param {Object} [props.initialData] - Initial data for editing an existing agenda item
 * @param {Object} [props.sourceItem] - Source item data when creating from existing content
 * @param {Function} [props.onCancel] - Optional callback for canceling the form
 */
const AgendaItemForm = ({ 
  teamMemberId, 
  onSubmit, 
  initialData = null, 
  sourceItem = null,
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: '2',
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form with data if editing an existing item or creating from source
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority?.toString() || '2',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : ''
      });
    } else if (sourceItem) {
      // Pre-fill form with source item data
      setFormData({
        title: sourceItem.title || '',
        description: sourceItem.description || sourceItem.text || '',
        priority: '2',
        tags: ''
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

  const handlePriorityChange = (value) => {
    setFormData(prev => ({
      ...prev,
      priority: value
    }));
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
      
      const agendaItemData = {
        teamMemberId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: parseInt(formData.priority, 10),
        tags,
        status: 'pending'
      };
      
      let result;
      
      if (initialData?.id) {
        // Update existing agenda item
        result = await AgendaItem.update(initialData.id, agendaItemData);
        toast.success('Agenda item updated successfully');
      } else {
        // Create new agenda item
        result = await AgendaItem.create(agendaItemData);
        toast.success('Agenda item added to next 1:1 meeting');
      }
      
      // Reset form
      if (!initialData) {
        setFormData({
          title: '',
          description: '',
          priority: '2',
          tags: ''
        });
      }
      
      // Call onSubmit callback with the result
      if (onSubmit) {
        onSubmit(result);
      }
    } catch (error) {
      console.error('Error saving agenda item:', error);
      toast.error('Failed to save agenda item');
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
          placeholder="Enter agenda item title"
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter details about this agenda item"
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Priority</Label>
        <RadioGroup 
          value={formData.priority} 
          onValueChange={handlePriorityChange}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1" id="priority-high" />
            <Label htmlFor="priority-high">High</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="2" id="priority-medium" />
            <Label htmlFor="priority-medium">Medium</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="3" id="priority-low" />
            <Label htmlFor="priority-low">Low</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleChange}
          placeholder="e.g. feedback, project-x, career"
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
          {isSubmitting ? 'Saving...' : initialData ? 'Update Item' : 'Add to Agenda'}
        </Button>
      </div>
    </form>
  );
};

export default AgendaItemForm;