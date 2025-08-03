import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Loader2, 
  Calendar,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Duty, TeamMember } from '../../api/entities';
import DuplicateWarningDialog from './DuplicateWarningDialog';
import { useDutyFormValidation, useDutyFormSubmission } from '../../hooks/useDutyFormValidation';
import { parseApiError } from '../../utils/dutyValidation';
import DutyRefreshService from '../../services/dutyRefreshService';
import sessionManagementService from '../../services/sessionManagementService';

const DUTY_TYPES = [
  { value: 'devops', label: 'DevOps Duty' },
  { value: 'on_call', label: 'On-Call Duty' },
  { value: 'other', label: 'Other' }
];

const DUTY_TITLES = [
  { value: 'Reporting', label: 'Reporting' },
  { value: 'Metering', label: 'Metering' },
  { value: 'DevOps', label: 'DevOps' }
];

export default function DutyForm({ duty = null, onSave, onCancel, teamMembers = [] }) {
  // Refs for cleanup and memory management
  const isUnmountedRef = useRef(false);
  const conflictCheckTimeoutRef = useRef(null);
  const duplicateCheckCacheRef = useRef(new Map());
  // Enhanced form validation and error handling
  const {
    formData,
    errors,
    isValidating,
    validationStatus,
    hasErrors,
    isFormValid,
    handleFieldChange,
    handleFieldBlur,
    getFieldError,
    getFieldValidationState,
    validateFormData,
    resetForm,
    handleApiError,
    categorizeErrors
  } = useDutyFormValidation({
    team_member_id: '',
    type: '',
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  });

  // Enhanced submission handling with retry logic
  const {
    isSubmitting,
    submitError,
    submitSuccess,
    canSubmit,
    handleSubmit,
    clearSubmissionState,
    retrySubmission
  } = useDutyFormSubmission();

  // Legacy state for backward compatibility
  const [conflicts, setConflicts] = useState([]);
  const [availableTeamMembers, setAvailableTeamMembers] = useState([]);
  const [duplicateError, setDuplicateError] = useState(null);
  const [rotationErrors, setRotationErrors] = useState([]);
  const [submissionSessionId] = useState(() => sessionManagementService.generateSessionId());
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [networkError, setNetworkError] = useState(null);

  // Load team members if not provided
  useEffect(() => {
    if (teamMembers.length === 0) {
      loadTeamMembers();
    } else {
      setAvailableTeamMembers(teamMembers);
    }
  }, [teamMembers]);

  // Cleanup effect for memory management
  useEffect(() => {
    return () => {
      // Mark component as unmounted
      isUnmountedRef.current = true;
      
      // Clear conflict check timeout
      if (conflictCheckTimeoutRef.current) {
        clearTimeout(conflictCheckTimeoutRef.current);
      }
      
      // Clear duplicate check cache
      duplicateCheckCacheRef.current.clear();
      
      // Clear any pending session cleanup
      if (submissionSessionId) {
        sessionManagementService.markSessionFailed(submissionSessionId, 'Component unmounted');
      }
    };
  }, [submissionSessionId]);

  // Initialize form with existing duty data
  useEffect(() => {
    if (duty) {
      const initialData = {
        team_member_id: duty.team_member_id || '',
        type: duty.type || '',
        title: duty.title || '',
        description: duty.description || '',
        start_date: duty.start_date ? duty.start_date.split('T')[0] : '',
        end_date: duty.end_date ? duty.end_date.split('T')[0] : ''
      };
      resetForm(initialData);
    }
  }, [duty, resetForm]);

  const loadTeamMembers = async () => {
    try {
      const members = await TeamMember.findAll();
      setAvailableTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const resetFormState = () => {
    resetForm({
      team_member_id: '',
      type: '',
      title: '',
      description: '',
      start_date: '',
      end_date: ''
    });
    setConflicts([]);
    setDuplicateError(null);
    setRotationErrors([]);
    setDuplicateWarnings([]);
    setShowDuplicateDialog(false);
    setPendingSubmission(null);
    setNetworkError(null);
    clearSubmissionState();
  };

  const handleInputChange = (field, value) => {
    handleFieldChange(field, value);
    
    // Clear legacy errors when form changes
    setDuplicateError(null);
    setRotationErrors([]);
    setDuplicateWarnings([]);
    setNetworkError(null);
    
    // Clear conflicts if date or team member changes
    if (['team_member_id', 'start_date', 'end_date'].includes(field)) {
      setConflicts([]);
    }
  };

  // Enhanced form validation with comprehensive error handling
  const validateFormWithConflicts = async () => {
    const { isValid, errors: validationErrors, sanitizedData, categorized } = validateFormData();
    
    if (!isValid) {
      return { isValid: false, errors: validationErrors, sanitizedData, categorized };
    }
    
    // Check for conflicts if basic validation passes using sanitized data
    try {
      const conflictingDuties = await checkForConflicts(sanitizedData);
      setConflicts(conflictingDuties);
      
      if (conflictingDuties.length > 0) {
        return { 
          isValid: false, 
          errors: { ...validationErrors, conflicts: 'Duty conflicts detected' },
          sanitizedData,
          categorized,
          hasConflicts: true
        };
      }
      
      return { isValid: true, errors: validationErrors, sanitizedData, categorized };
    } catch (error) {
      const errorInfo = handleApiError(error);
      setNetworkError(errorInfo);
      return { 
        isValid: false, 
        errors: { ...validationErrors, network: errorInfo.message },
        sanitizedData,
        categorized
      };
    }
  };

  // Optimized conflict checking with client-side filtering and caching
  const checkForConflicts = useCallback(async (dataToCheck = null) => {
    const checkData = dataToCheck || formData;
    
    if (!checkData.team_member_id || !checkData.start_date || !checkData.end_date) {
      return [];
    }

    // Create cache key for conflict check
    const cacheKey = `${checkData.team_member_id}:${checkData.start_date}:${checkData.end_date}:${duty?.id || 'new'}`;
    
    // Check cache first
    if (duplicateCheckCacheRef.current.has(cacheKey)) {
      return duplicateCheckCacheRef.current.get(cacheKey);
    }

    try {
      const conflictingDuties = await Duty.getConflicts(
        checkData.team_member_id,
        checkData.start_date,
        checkData.end_date,
        duty?.id // Exclude current duty when editing
      );
      
      // Cache the result with TTL
      duplicateCheckCacheRef.current.set(cacheKey, conflictingDuties);
      
      // Limit cache size and add TTL cleanup
      if (duplicateCheckCacheRef.current.size > 50) {
        const firstKey = duplicateCheckCacheRef.current.keys().next().value;
        duplicateCheckCacheRef.current.delete(firstKey);
      }
      
      // Auto-expire cache entries after 30 seconds
      setTimeout(() => {
        if (!isUnmountedRef.current) {
          duplicateCheckCacheRef.current.delete(cacheKey);
        }
      }, 30000);
      
      return conflictingDuties;
    } catch (error) {
      console.error('Failed to check for conflicts:', error);
      throw new Error('Failed to validate duty conflicts. Please check your connection and try again.');
    }
  }, [formData, duty?.id]);

  // Optimized real-time conflict checking with improved debouncing and client-side filtering
  useEffect(() => {
    // Clear previous timeout
    if (conflictCheckTimeoutRef.current) {
      clearTimeout(conflictCheckTimeoutRef.current);
    }

    const validateInRealTime = async () => {
      // Skip if component is unmounted
      if (isUnmountedRef.current) return;

      if (formData.team_member_id && formData.start_date && formData.end_date && formData.type && formData.title) {
        try {
          // First do client-side filtering to reduce API calls
          const allDuties = await Duty.list();
          const potentialConflicts = allDuties.filter(existingDuty => {
            // Skip current duty when editing
            if (duty?.id && existingDuty.id === duty.id) return false;
            
            // Only check duties for the same team member
            if (existingDuty.team_member_id !== formData.team_member_id) return false;
            
            // Quick date range overlap check
            const existingStart = new Date(existingDuty.start_date);
            const existingEnd = new Date(existingDuty.end_date);
            const newStart = new Date(formData.start_date);
            const newEnd = new Date(formData.end_date);
            
            return (newStart <= existingEnd && newEnd >= existingStart);
          });
          
          // Only make API call if there are potential conflicts
          if (potentialConflicts.length > 0) {
            const conflicts = await checkForConflicts();
            if (!isUnmountedRef.current) {
              setConflicts(conflicts);
            }
          } else {
            if (!isUnmountedRef.current) {
              setConflicts([]);
            }
          }
        } catch (error) {
          // Silently handle real-time validation errors
          console.warn('Real-time conflict check failed:', error);
        }
      } else {
        // Clear conflicts if required fields are missing
        if (!isUnmountedRef.current) {
          setConflicts([]);
        }
      }
    };

    // Increased debounce time to reduce API calls
    conflictCheckTimeoutRef.current = setTimeout(validateInRealTime, 1200);
    
    return () => {
      if (conflictCheckTimeoutRef.current) {
        clearTimeout(conflictCheckTimeoutRef.current);
      }
    };
  }, [formData.team_member_id, formData.start_date, formData.end_date, formData.type, formData.title, checkForConflicts]);

  const performDutySubmission = async (dutyData) => {
    let savedDuty;
    
    if (duty) {
      // Update existing duty with refresh service
      savedDuty = await DutyRefreshService.updateDutyWithRefresh(duty.id, dutyData, {
        showOptimistic: true,
        highlightUpdated: true,
        refreshViews: true
      });
    } else {
      // Create new duty with refresh service
      savedDuty = await DutyRefreshService.createDutyWithRefresh(dutyData, {
        showOptimistic: true,
        highlightNew: true,
        refreshViews: true
      });
    }

    // Auto-close after showing success for 1.5 seconds
    setTimeout(() => {
      resetFormState();
      onSave?.(savedDuty);
    }, 1500);
    
    return savedDuty;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!canSubmit) {
      return;
    }

    // Clear previous errors
    setDuplicateError(null);
    setRotationErrors([]);
    setDuplicateWarnings([]);
    setNetworkError(null);
    
    // Validate form with conflict checking
    const validation = await validateFormWithConflicts();
    if (!validation.isValid) {
      if (validation.hasConflicts) {
        return; // Don't submit if there are conflicts
      }
      return; // Don't submit if validation fails
    }

    // Use sanitized data for submission
    const sanitizedFormData = validation.sanitizedData;
    
    // Prepare duty data with session ID for duplicate prevention
    const dutyData = {
      ...sanitizedFormData,
      start_date: new Date(sanitizedFormData.start_date).toISOString(),
      end_date: new Date(sanitizedFormData.end_date).toISOString(),
      creation_session_id: submissionSessionId
    };

    // Check for duplicates using enhanced detection
    try {
      const duplicateWarnings = await Duty.checkForDuplicates(dutyData, duty?.id);
      
      if (duplicateWarnings.length > 0) {
        // Show duplicate warning dialog
        setDuplicateWarnings(duplicateWarnings);
        setShowDuplicateDialog(true);
        setPendingSubmission(dutyData);
        return;
      }

      // No duplicates detected, proceed with submission
      await handleSubmit(() => performDutySubmission(dutyData));
      
    } catch (error) {
      console.error('Failed to check for duplicates or save duty:', error);
      const errorInfo = handleApiError(error);
      
      if (error.message?.includes('Duplicate duty detected') || error.message?.includes('already exists')) {
        setDuplicateError(errorInfo.message);
      } else if (error.message?.includes('rotation')) {
        setRotationErrors([errorInfo.message]);
      } else {
        setNetworkError(errorInfo);
      }
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!pendingSubmission) return;
    
    setShowDuplicateDialog(false);
    
    try {
      await handleSubmit(() => performDutySubmission(pendingSubmission));
    } finally {
      setPendingSubmission(null);
    }
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateDialog(false);
    setPendingSubmission(null);
    setDuplicateWarnings([]);
  };

  // Retry failed submission
  const handleRetrySubmission = async () => {
    setNetworkError(null);
    await retrySubmission(() => performDutySubmission({
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
      creation_session_id: submissionSessionId
    }));
  };



  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {duty ? 'Edit Duty Assignment' : 'Create Duty Assignment'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Team Member Selection */}
          <div className="space-y-2">
            <Label htmlFor="team_member_id">Team Member *</Label>
            <Select
              value={formData.team_member_id}
              onValueChange={(value) => handleInputChange('team_member_id', value)}
              name="team_member_id"
            >
              <SelectTrigger 
                id="team_member_id" 
                aria-label="Team Member"
                className={getFieldValidationState('team_member_id') === 'error' ? 'border-red-500 focus:border-red-500' : 
                          getFieldValidationState('team_member_id') === 'success' ? 'border-green-500' : ''}
              >
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
            {getFieldError('team_member_id') && (
              <div className="flex items-center space-x-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{getFieldError('team_member_id')}</span>
              </div>
            )}
          </div>

          {/* Duty Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Duty Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
              name="type"
            >
              <SelectTrigger 
                id="type" 
                aria-label="Duty Type"
                className={getFieldValidationState('type') === 'error' ? 'border-red-500 focus:border-red-500' : 
                          getFieldValidationState('type') === 'success' ? 'border-green-500' : ''}
              >
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
            {getFieldError('type') && (
              <div className="flex items-center space-x-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{getFieldError('type')}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Select
              value={formData.title}
              onValueChange={(value) => handleInputChange('title', value)}
              name="title"
            >
              <SelectTrigger 
                id="title" 
                aria-label="Title"
                className={getFieldValidationState('title') === 'error' ? 'border-red-500 focus:border-red-500' : 
                          getFieldValidationState('title') === 'success' ? 'border-green-500' : ''}
              >
                <SelectValue placeholder="Select duty title" />
              </SelectTrigger>
              <SelectContent>
                {DUTY_TITLES.map(title => (
                  <SelectItem key={title.value} value={title.value}>
                    {title.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getFieldError('title') && (
              <div className="flex items-center space-x-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{getFieldError('title')}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              onBlur={() => handleFieldBlur('description')}
              placeholder="Enter duty description (optional)"
              rows={3}
              className={getFieldValidationState('description') === 'error' ? 'border-red-500 focus:border-red-500' : ''}
            />
            {getFieldError('description') && (
              <div className="flex items-center space-x-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{getFieldError('description')}</span>
              </div>
            )}
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
                onBlur={() => handleFieldBlur('start_date')}
                className={getFieldValidationState('start_date') === 'error' ? 'border-red-500 focus:border-red-500' : 
                          getFieldValidationState('start_date') === 'success' ? 'border-green-500' : ''}
              />
              {getFieldError('start_date') && (
                <div className="flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{getFieldError('start_date')}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                onBlur={() => handleFieldBlur('end_date')}
                className={getFieldValidationState('end_date') === 'error' ? 'border-red-500 focus:border-red-500' : 
                          getFieldValidationState('end_date') === 'success' ? 'border-green-500' : ''}
              />
              {getFieldError('end_date') && (
                <div className="flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{getFieldError('end_date')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Validation Status Indicator */}
          {(isValidating || validationStatus || submitSuccess) && (
            <div className="space-y-3">
              {isValidating && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription className="text-blue-800">
                    Validating duty assignment...
                  </AlertDescription>
                </Alert>
              )}
              
              {submitSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Success!</strong> Duty assignment has been {duty ? 'updated' : 'created'} successfully. 
                    <br />
                    <span className="text-sm">This dialog will close automatically...</span>
                  </AlertDescription>
                </Alert>
              )}
              
              {validationStatus === 'success' && !isValidating && conflicts.length === 0 && !submitSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-green-800">
                    <strong>Validation successful!</strong> No conflicts detected with existing duties.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Duplicate Error */}
          {duplicateError && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-red-800">
                  <strong>Duplicate Duty Detected</strong>
                  <p className="mt-2">{duplicateError}</p>
                  <div className="mt-3 p-3 bg-red-100 rounded-lg">
                    <p className="text-sm font-medium">What you can do:</p>
                    <ul className="mt-1 text-sm list-disc list-inside space-y-1">
                      <li>Change the duty title to make it unique</li>
                      <li>Adjust the start or end dates</li>
                      <li>Select a different team member</li>
                      <li>Check if you meant to edit an existing duty instead</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Rotation Errors */}
          {rotationErrors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-red-800">
                  <strong>Rotation Configuration Error</strong>
                  <ul className="mt-2 space-y-1">
                    {rotationErrors.map((error, index) => (
                      <li key={index} className="text-sm">• {error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-orange-800">
                  <strong>Duty Conflicts Detected</strong>
                  <p className="mt-2 text-sm">
                    This duty assignment overlaps with existing duties for the same team member:
                  </p>
                  <div className="mt-3 space-y-2">
                    {conflicts.map(conflict => (
                      <div key={conflict.id} className="flex items-center justify-between p-2 bg-orange-100 rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {conflict.type}
                          </Badge>
                          <span className="font-medium text-sm">{conflict.title}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-orange-700">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(conflict.start_date).toLocaleDateString()} - {new Date(conflict.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <p className="text-sm font-medium">Resolution required:</p>
                    <ul className="mt-1 text-sm list-disc list-inside space-y-1">
                      <li>Adjust the start or end dates to avoid overlap</li>
                      <li>Choose a different team member</li>
                      <li>Consider if this duty should replace an existing one</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Network/Submit Error with Retry */}
          {(submitError || networkError) && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                <div className="space-y-3">
                  <div>
                    <strong>Save Failed</strong>
                    <p className="mt-1">{submitError?.message || networkError?.message}</p>
                  </div>
                  
                  {(submitError?.canRetry || networkError?.canRetry) && (
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRetrySubmission}
                        disabled={isSubmitting}
                        className="text-red-700 border-red-300 hover:bg-red-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </>
                        )}
                      </Button>
                      <span className="text-xs text-red-600">
                        This error may be temporary. Click retry to try again.
                      </span>
                    </div>
                  )}
                  
                  {!submitError?.canRetry && !networkError?.canRetry && (
                    <div className="bg-red-100 p-3 rounded-lg">
                      <p className="text-sm font-medium">What you can do:</p>
                      <ul className="mt-1 text-sm list-disc list-inside space-y-1">
                        <li>Check your input data for errors</li>
                        <li>Ensure all required fields are filled</li>
                        <li>Try refreshing the page and starting over</li>
                        <li>Contact support if the problem persists</li>
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetFormState();
                onCancel?.();
              }}
              disabled={isSubmitting || submitSuccess}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isValidating || (conflicts.length > 0) || submitSuccess || hasErrors}
              className={submitSuccess ? 'bg-green-600 hover:bg-green-700' : validationStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {submitSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-white" />
                  {duty ? 'Updated!' : 'Created!'}
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {duty ? 'Updating...' : 'Creating...'}
                </>
              ) : isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  {validationStatus === 'success' && !submitSuccess && <CheckCircle className="h-4 w-4 mr-2" />}
                  {duty ? 'Update Duty' : 'Create Duty'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
      
      {/* Duplicate Warning Dialog */}
      <DuplicateWarningDialog
        isOpen={showDuplicateDialog}
        onClose={handleDuplicateCancel}
        onConfirm={handleDuplicateConfirm}
        duplicateWarnings={duplicateWarnings}
        formData={formData}
      />
    </Card>
  );
}