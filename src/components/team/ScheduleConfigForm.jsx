/**
 * ScheduleConfigForm Component
 * Form for creating and editing recurring 1:1 meeting schedules with
 * frequency selection, day/time picker, duration, and validation
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Repeat, Users } from 'lucide-react';
import { OneOnOneScheduleService } from '@/services/oneOnOneScheduleService';
import { localClient } from '@/api/localClient';

const ScheduleConfigForm = ({
  teamMemberId,
  initialData = null,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    frequency: 'weekly',
    day_of_week: 1, // Monday
    time: '14:00',
    duration_minutes: 60,
    custom_interval_weeks: null,
    start_date: new Date().toISOString().split('T')[0],
    end_date: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMember, setTeamMember] = useState(null);
  const [existingSchedule, setExistingSchedule] = useState(null);
  const [scheduleDescription, setScheduleDescription] = useState('');

  // Days of the week
  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  // Frequency options
  const frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 Weeks' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom' }
  ];

  // Duration options (in minutes)
  const durationOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  // Load team member and check for existing schedule
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load team member
        const member = await localClient.entities.TeamMember.get(teamMemberId);
        setTeamMember(member);

        // Check for existing schedule
        const existing = await OneOnOneScheduleService.getScheduleByTeamMember(teamMemberId);
        setExistingSchedule(existing);

        // Initialize form data from existing schedule or initialData
        if (initialData) {
          setFormData({
            frequency: initialData.frequency || 'weekly',
            day_of_week: initialData.day_of_week ?? 1,
            time: initialData.time || '14:00',
            duration_minutes: initialData.duration_minutes || 60,
            custom_interval_weeks: initialData.custom_interval_weeks || null,
            start_date: initialData.start_date || new Date().toISOString().split('T')[0],
            end_date: initialData.end_date || null
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setErrors({ general: 'Failed to load team member data' });
      }
    };

    if (teamMemberId) {
      loadData();
    }
  }, [teamMemberId, initialData]);

  // Update schedule description whenever form data changes
  useEffect(() => {
    try {
      const description = OneOnOneScheduleService.getScheduleDescription(formData);
      setScheduleDescription(description);
    } catch (error) {
      setScheduleDescription('');
    }
  }, [formData]);

  /**
   * Validates the form data
   * @returns {boolean} - True if form is valid
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate frequency
    if (!formData.frequency) {
      newErrors.frequency = 'Frequency is required';
    }

    // Validate day of week
    if (formData.day_of_week === null || formData.day_of_week === undefined) {
      newErrors.day_of_week = 'Day of week is required';
    } else if (formData.day_of_week < 0 || formData.day_of_week > 6) {
      newErrors.day_of_week = 'Day of week must be between 0 and 6';
    }

    // Validate time
    if (!formData.time) {
      newErrors.time = 'Time is required';
    } else {
      const timePattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timePattern.test(formData.time)) {
        newErrors.time = 'Time must be in HH:mm format (24-hour)';
      }
    }

    // Validate duration
    if (!formData.duration_minutes || formData.duration_minutes < 15 || formData.duration_minutes > 480) {
      newErrors.duration_minutes = 'Duration must be between 15 and 480 minutes';
    }

    // Validate custom interval if frequency is custom
    if (formData.frequency === 'custom') {
      if (!formData.custom_interval_weeks || formData.custom_interval_weeks < 1) {
        newErrors.custom_interval_weeks = 'Custom interval must be at least 1 week';
      }
    }

    // Validate start date
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    // Validate end date (if provided)
    if (formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    // Check for existing active schedule (only for new schedules, not edits)
    if (!initialData && existingSchedule) {
      newErrors.general = `${teamMember?.name || 'This team member'} already has an active schedule. Please deactivate it first.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const scheduleData = {
        frequency: formData.frequency,
        day_of_week: formData.day_of_week,
        time: formData.time,
        duration_minutes: formData.duration_minutes,
        custom_interval_weeks: formData.frequency === 'custom' ? formData.custom_interval_weeks : null,
        start_date: formData.start_date,
        end_date: formData.end_date || null
      };

      if (initialData?.id) {
        // Update existing schedule
        await OneOnOneScheduleService.updateSchedule(initialData.id, scheduleData, true);
      } else {
        // Create new schedule
        await OneOnOneScheduleService.createSchedule(teamMemberId, scheduleData);
      }

      if (onSubmit) {
        onSubmit();
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      setErrors({ general: error.message || 'Failed to save schedule' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles form field changes
   */
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          {initialData ? 'Edit' : 'Create'} Recurring 1:1 Schedule
          {teamMember && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              for {teamMember.name}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General error */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Frequency selection */}
          <div className="space-y-2">
            <Label htmlFor="frequency" className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Frequency
            </Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => handleChange('frequency', value)}
            >
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.frequency && (
              <p className="text-sm text-destructive">{errors.frequency}</p>
            )}
          </div>

          {/* Custom interval (shown only for custom frequency) */}
          {formData.frequency === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="custom_interval_weeks">
                Custom Interval (weeks)
              </Label>
              <Input
                id="custom_interval_weeks"
                type="number"
                min="1"
                value={formData.custom_interval_weeks || ''}
                onChange={(e) => handleChange('custom_interval_weeks', parseInt(e.target.value))}
                placeholder="Number of weeks"
              />
              {errors.custom_interval_weeks && (
                <p className="text-sm text-destructive">{errors.custom_interval_weeks}</p>
              )}
            </div>
          )}

          {/* Day of week */}
          <div className="space-y-2">
            <Label htmlFor="day_of_week" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Day of Week
            </Label>
            <Select
              value={formData.day_of_week?.toString()}
              onValueChange={(value) => handleChange('day_of_week', parseInt(value))}
            >
              <SelectTrigger id="day_of_week">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map(day => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.day_of_week && (
              <p className="text-sm text-destructive">{errors.day_of_week}</p>
            )}
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time
            </Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => handleChange('time', e.target.value)}
            />
            {errors.time && (
              <p className="text-sm text-destructive">{errors.time}</p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration_minutes" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duration
            </Label>
            <Select
              value={formData.duration_minutes?.toString()}
              onValueChange={(value) => handleChange('duration_minutes', parseInt(value))}
            >
              <SelectTrigger id="duration_minutes">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.duration_minutes && (
              <p className="text-sm text-destructive">{errors.duration_minutes}</p>
            )}
          </div>

          {/* Start date */}
          <div className="space-y-2">
            <Label htmlFor="start_date">
              Start Date
            </Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
            />
            {errors.start_date && (
              <p className="text-sm text-destructive">{errors.start_date}</p>
            )}
          </div>

          {/* End date (optional) */}
          <div className="space-y-2">
            <Label htmlFor="end_date">
              End Date (optional)
            </Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => handleChange('end_date', e.target.value)}
            />
            {errors.end_date && (
              <p className="text-sm text-destructive">{errors.end_date}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Leave blank for ongoing schedule
            </p>
          </div>

          {/* Schedule description preview */}
          {scheduleDescription && (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                <strong>Schedule Preview:</strong> {scheduleDescription}
              </AlertDescription>
            </Alert>
          )}

          {/* Form actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Saving...' : (initialData ? 'Update Schedule' : 'Create Schedule')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ScheduleConfigForm;
