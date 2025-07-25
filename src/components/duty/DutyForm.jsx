import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Duty, TeamMember } from '../../api/entities';

const DUTY_TYPES = [
  { value: 'devops', label: 'DevOps Duty' },
  { value: 'on_call', label: 'On-Call Duty' },
  { value: 'other', label: 'Other' }
];

export default function DutyForm({ duty = null, onSave, onCancel, teamMembers = [] }) {
  const [formData, setFormData] = useState({
    team_member_id: '',
    type: '',
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  });
  const [errors, setErrors] = useState({});
  const [conflicts, setConflicts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableTeamMembers, setAvailableTeamMembers] = useState([]);

  // Load team members if not provided
  useEffect(() => {
    if (teamMembers.length === 0) {
      loadTeamMembers();
    } else {
      setAvailableTeamMembers(teamMembers);
    }
  }, [teamMembers]);

  // Initialize form with existing duty data
  useEffect(() => {
    if (duty) {
      setFormData({
        team_member_id: duty.team_member_id || '',
        type: duty.type || '',
        title: duty.title || '',
        description: duty.description || '',
        start_date: duty.start_date ? duty.start_date.split('T')[0] : '',
        end_date: duty.end_date ? duty.end_date.split('T')[0] : ''
      });
    }
  }, [duty]);

  const loadTeamMembers = async () => {
    try {
      const members = await TeamMember.findAll();
      setAvailableTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.team_member_id) {
      newErrors.team_member_id = 'Team member is required';
    }
    
    if (!formData.type) {
      newErrors.type = 'Duty type is required';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate < startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkForConflicts = async () => {
    if (!formData.team_member_id || !formData.start_date || !formData.end_date) {
      return [];
    }

    try {
      const conflictingDuties = await Duty.getConflicts(
        formData.team_member_id,
        formData.start_date,
        formData.end_date,
        duty?.id // Exclude current duty when editing
      );
      
      return conflictingDuties;
    } catch (error) {
      console.error('Failed to check for conflicts:', error);
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Check for conflicts
      const conflictingDuties = await checkForConflicts();
      setConflicts(conflictingDuties);
      
      if (conflictingDuties.length > 0) {
        setIsLoading(false);
        return; // Don't submit if there are conflicts
      }

      // Prepare duty data
      const dutyData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

      let savedDuty;
      if (duty) {
        // Update existing duty
        savedDuty = await Duty.update(duty.id, dutyData);
      } else {
        // Create new duty
        savedDuty = await Duty.create(dutyData);
      }

      onSave?.(savedDuty);
    } catch (error) {
      console.error('Failed to save duty:', error);
      setErrors({ submit: error.message || 'Failed to save duty' });
    } finally {
      setIsLoading(false);
    }
  };

  const getTeamMemberName = (memberId) => {
    const member = availableTeamMembers.find(m => m.id === memberId);
    return member ? member.name : 'Unknown';
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {duty ? 'Edit Duty Assignment' : 'Create Duty Assignment'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Member Selection */}
          <div className="space-y-2">
            <Label htmlFor="team_member_id">Team Member *</Label>
            <Select
              value={formData.team_member_id}
              onValueChange={(value) => handleInputChange('team_member_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {availableTeamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.team_member_id && (
              <p className="text-sm text-red-600">{errors.team_member_id}</p>
            )}
          </div>

          {/* Duty Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Duty Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duty type" />
              </SelectTrigger>
              <SelectContent>
                {DUTY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter duty title"
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter duty description (optional)"
              rows={3}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
              {errors.start_date && (
                <p className="text-sm text-red-600">{errors.start_date}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
              {errors.end_date && (
                <p className="text-sm text-red-600">{errors.end_date}</p>
              )}
            </div>
          </div>

          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription>
                <strong>Warning: Duty conflicts detected!</strong>
                <ul className="mt-2 list-disc list-inside">
                  {conflicts.map(conflict => (
                    <li key={conflict.id}>
                      {conflict.title} ({new Date(conflict.start_date).toLocaleDateString()} - {new Date(conflict.end_date).toLocaleDateString()})
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm">
                  Please adjust the dates or confirm if you want to proceed with overlapping duties.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {errors.submit}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (conflicts.length > 0)}
            >
              {isLoading ? 'Saving...' : (duty ? 'Update Duty' : 'Create Duty')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}