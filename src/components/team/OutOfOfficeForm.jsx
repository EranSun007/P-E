/**
 * OutOfOfficeForm Component
 * Form for creating and editing out of office periods with date range picker,
 * reason selection, validation, and error handling
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import OutOfOfficeService from '@/services/outOfOfficeService';
import { OutOfOffice } from '@/api/entities';

const OutOfOfficeForm = ({ 
  teamMemberId, 
  initialData = null, 
  onSubmit, 
  onCancel,
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        start_date: initialData.start_date || '',
        end_date: initialData.end_date || '',
        reason: initialData.reason || '',
        notes: initialData.notes || ''
      });
    }
  }, [initialData]);

  // Get available reason types
  const reasonTypes = OutOfOfficeService.getReasonTypes();

  /**
   * Validates the form data
   * @returns {boolean} - True if form is valid
   */
  const validateForm = () => {
    const validation = OutOfOfficeService.validatePeriod(
      formData.start_date,
      formData.end_date,
      formData.reason,
      teamMemberId
    );

    const newErrors = {};
    validation.errors.forEach(error => {
      if (error.includes('Start date')) {
        newErrors.start_date = error;
      } else if (error.includes('End date')) {
        newErrors.end_date = error;
      } else if (error.includes('Reason')) {
        newErrors.reason = error;
      } else if (error.includes('Team member')) {
        newErrors.general = error;
      } else {
        newErrors.general = error;
      }
    });

    setErrors(newErrors);
    return validation.isValid;
  };

  /**
   * Checks for overlapping periods and shows warnings
   */
  const checkOverlaps = async () => {
    if (!formData.start_date || !formData.end_date || !teamMemberId) {
      return;
    }

    try {
      const overlaps = await OutOfOfficeService.checkOverlaps(
        teamMemberId,
        formData.start_date,
        formData.end_date,
        initialData?.id
      );

      if (overlaps.length > 0) {
        const warningMessages = overlaps.map(overlap => {
          const startDate = format(new Date(overlap.start_date), 'MMM dd, yyyy');
          const endDate = format(new Date(overlap.end_date), 'MMM dd, yyyy');
          const reasonType = OutOfOfficeService.getReasonType(overlap.reason);
          return `Overlaps with existing ${reasonType?.name || overlap.reason} period (${startDate} - ${endDate})`;
        });
        setWarnings(warningMessages);
      } else {
        setWarnings([]);
      }
    } catch (error) {
      console.error('Error checking overlaps:', error);
    }
  };

  /**
   * Handles input field changes
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Clear general errors
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: ''
      }));
    }
  };

  /**
   * Handles date selection
   */
  const handleDateSelect = (field, date) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      handleInputChange(field, dateString);
      
      // Close the popover
      if (field === 'start_date') {
        setStartDateOpen(false);
      } else {
        setEndDateOpen(false);
      }
    }
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

    try {
      // Check for overlaps one more time before submitting
      await checkOverlaps();

      // Prepare submission data
      const submissionData = {
        ...formData,
        team_member_id: teamMemberId,
        created_date: initialData?.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString()
      };

      if (initialData?.id) {
        submissionData.id = initialData.id;
      }

      // Call the onSubmit callback
      if (onSubmit) {
        await onSubmit(submissionData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ general: 'Failed to save out of office period. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check for overlaps when dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      checkOverlaps();
    }
  }, [formData.start_date, formData.end_date, teamMemberId]);

  const isFormLoading = isLoading || isSubmitting;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Out of Office Period' : 'New Out of Office Period'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error Alert */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Overlap Warnings */}
          {warnings.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Warning: Period overlaps detected</p>
                  {warnings.map((warning, index) => (
                    <p key={index} className="text-sm">{warning}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Date Range Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground",
                      errors.start_date && "border-destructive"
                    )}
                    disabled={isFormLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? (
                      format(new Date(formData.start_date), 'PPP')
                    ) : (
                      <span>Pick start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => handleDateSelect('start_date', date)}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.end_date && "text-muted-foreground",
                      errors.end_date && "border-destructive"
                    )}
                    disabled={isFormLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? (
                      format(new Date(formData.end_date), 'PPP')
                    ) : (
                      <span>Pick end date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date ? new Date(formData.end_date) : undefined}
                    onSelect={(date) => handleDateSelect('end_date', date)}
                    disabled={(date) => {
                      const today = new Date(new Date().setHours(0, 0, 0, 0));
                      const startDate = formData.start_date ? new Date(formData.start_date) : today;
                      return date < Math.max(today, startDate);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.end_date && (
                <p className="text-sm text-destructive">{errors.end_date}</p>
              )}
            </div>
          </div>

          {/* Duration Display */}
          {formData.start_date && formData.end_date && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Duration: {OutOfOfficeService.calculateDaysInPeriod(formData.start_date, formData.end_date)} days
              </p>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => handleInputChange('reason', value)}
              disabled={isFormLoading}
            >
              <SelectTrigger className={cn(errors.reason && "border-destructive")}>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonTypes.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: reason.color }}
                      />
                      <span>{reason.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason}</p>
            )}
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={isFormLoading}
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isFormLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isFormLoading}
            >
              {isFormLoading ? 'Saving...' : (initialData ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default OutOfOfficeForm;