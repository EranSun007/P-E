/**
 * GoalForm Component
 * Form for creating and editing employee development goals
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Target, Lightbulb, Activity, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

// Form validation schema
const goalFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(500, 'Title must be less than 500 characters'),
  developmentNeed: z.string()
    .min(10, 'Development need must be at least 10 characters')
    .max(1000, 'Development need must be less than 1000 characters'),
  developmentActivity: z.string()
    .max(1000, 'Development activity must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  developmentGoalDescription: z.string()
    .min(20, 'Goal description must be at least 20 characters')
    .max(2000, 'Goal description must be less than 2000 characters'),
  status: z.enum(['active', 'completed', 'paused']).default('active')
});

const GoalForm = ({ 
  teamMembers = [], 
  initialData = null, 
  onSubmit, 
  onCancel,
  isLoading = false,
  isSubmitting = false,
  prefilledEmployeeId = null,
  hideEmployeeSelection = false
}) => {
  const [generalError, setGeneralError] = useState('');

  const form = useForm({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      employeeId: initialData?.employeeId || prefilledEmployeeId || '',
      title: initialData?.title || '',
      developmentNeed: initialData?.developmentNeed || '',
      developmentActivity: initialData?.developmentActivity || '',
      developmentGoalDescription: initialData?.developmentGoalDescription || '',
      status: initialData?.status || 'active'
    },
    mode: 'onChange'
  });

  const { handleSubmit, formState: { errors, isValid, isDirty }, reset, clearErrors } = form;

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      reset({
        employeeId: initialData.employeeId || prefilledEmployeeId || '',
        title: initialData.title || '',
        developmentNeed: initialData.developmentNeed || '',
        developmentActivity: initialData.developmentActivity || '',
        developmentGoalDescription: initialData.developmentGoalDescription || '',
        status: initialData.status || 'active'
      });
    } else if (prefilledEmployeeId) {
      // Set prefilled employee ID when no initial data
      reset({
        employeeId: prefilledEmployeeId,
        title: '',
        developmentNeed: '',
        developmentActivity: '',
        developmentGoalDescription: '',
        status: 'active'
      });
    }
  }, [initialData, prefilledEmployeeId, reset]);

  /**
   * Get employee name by ID
   */
  const getEmployeeName = (employeeId) => {
    const employee = teamMembers.find(tm => tm.id === employeeId);
    return employee ? employee.name : 'Unknown Employee';
  };

  /**
   * Handle form submission
   */
  const onFormSubmit = async (data) => {
    try {
      setGeneralError('');
      
      if (onSubmit) {
        await onSubmit(data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setGeneralError('Failed to save goal. Please try again.');
    }
  };

  /**
   * Clear field errors when user starts typing
   */
  const handleFieldChange = (fieldName) => {
    if (errors[fieldName]) {
      clearErrors(fieldName);
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const isFormLoading = isLoading || isSubmitting;
  const isEditMode = !!initialData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* General Error Alert */}
            {generalError && (
              <Alert variant="destructive">
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

            {/* Employee Selection - Conditional Display */}
            {!hideEmployeeSelection ? (
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Employee</span>
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleFieldChange('employeeId');
                      }} 
                      value={field.value}
                      disabled={isFormLoading}
                    >
                      <FormControl>
                        <SelectTrigger 
                          className={cn(errors.employeeId && "border-destructive")}
                          aria-invalid={!!errors.employeeId}
                        >
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teamMembers.length === 0 ? (
                          <SelectItem value="" disabled>
                            No team members available
                          </SelectItem>
                        ) : (
                          teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Employee</span>
                </Label>
                <div className="p-3 bg-muted rounded-md border">
                  <span className="text-sm font-medium">
                    {getEmployeeName(form.watch('employeeId'))}
                  </span>
                </div>
              </div>
            )}

            {/* Goal Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>Goal Title</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a clear and specific goal title"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('title');
                      }}
                      disabled={isFormLoading}
                      className={cn(errors.title && "border-destructive")}
                      aria-invalid={!!errors.title}
                    />
                  </FormControl>
                  <FormDescription>
                    A concise title that describes the main objective of this development goal.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Development Need */}
            <FormField
              control={form.control}
              name="developmentNeed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <Lightbulb className="h-4 w-4" />
                    <span>Development Need</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the skills, knowledge, or competencies that need development..."
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('developmentNeed');
                      }}
                      disabled={isFormLoading}
                      rows={3}
                      className={cn(errors.developmentNeed && "border-destructive")}
                      aria-invalid={!!errors.developmentNeed}
                    />
                  </FormControl>
                  <FormDescription>
                    Identify specific areas where the employee needs to grow or improve.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Development Activity */}
            <FormField
              control={form.control}
              name="developmentActivity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Development Activity (Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Outline specific activities, training, or experiences that will support this goal..."
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('developmentActivity');
                      }}
                      disabled={isFormLoading}
                      rows={3}
                      className={cn(errors.developmentActivity && "border-destructive")}
                      aria-invalid={!!errors.developmentActivity}
                    />
                  </FormControl>
                  <FormDescription>
                    Planned activities, training sessions, or experiences that will help achieve this goal.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Goal Description */}
            <FormField
              control={form.control}
              name="developmentGoalDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Goal Description</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed description of the goal, including specific objectives, success criteria, and expected outcomes..."
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('developmentGoalDescription');
                      }}
                      disabled={isFormLoading}
                      rows={4}
                      className={cn(errors.developmentGoalDescription && "border-destructive")}
                      aria-invalid={!!errors.developmentGoalDescription}
                    />
                  </FormControl>
                  <FormDescription>
                    A comprehensive description of what the employee should achieve and how success will be measured.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status (only show in edit mode) */}
            {isEditMode && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isFormLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Current status of this development goal.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Character Counts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div>
                Title: {form.watch('title')?.length || 0}/500
              </div>
              <div>
                Development Need: {form.watch('developmentNeed')?.length || 0}/1000
              </div>
              <div>
                Goal Description: {form.watch('developmentGoalDescription')?.length || 0}/2000
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
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
                disabled={isFormLoading || !isValid}
                className="min-w-24"
              >
                {isFormLoading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner className="h-4 w-4" />
                    <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  <span>{isEditMode ? 'Update Goal' : 'Create Goal'}</span>
                )}
              </Button>
            </div>

            {/* Form Debug Info (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <details>
                  <summary className="text-sm font-medium cursor-pointer">Form Debug Info</summary>
                  <div className="mt-2 text-xs space-y-1">
                    <div>Valid: {isValid ? 'Yes' : 'No'}</div>
                    <div>Dirty: {isDirty ? 'Yes' : 'No'}</div>
                    <div>Errors: {Object.keys(errors).length}</div>
                    <div>Mode: {isEditMode ? 'Edit' : 'Create'}</div>
                    <div>Loading: {isFormLoading ? 'Yes' : 'No'}</div>
                  </div>
                </details>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default GoalForm;