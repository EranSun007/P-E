import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Calendar, AlertTriangle } from 'lucide-react';

export default function DuplicateWarningDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  duplicateWarnings = [],
  formData = {}
}) {
  if (!duplicateWarnings.length) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getWarningType = (warning) => {
    if (warning.type === 'exact_duplicate') {
      return {
        title: 'Exact Duplicate Detected',
        description: 'A duty with identical details already exists',
        severity: 'high'
      };
    } else if (warning.type === 'overlapping_dates') {
      return {
        title: 'Overlapping Duty Period',
        description: 'This duty overlaps with existing duties for the same team member',
        severity: 'medium'
      };
    } else if (warning.type === 'same_type_overlap') {
      return {
        title: 'Same Type Overlap',
        description: 'This duty overlaps with existing duties of the same type',
        severity: 'high'
      };
    }
    return {
      title: 'Potential Duplicate',
      description: 'Similar duty detected',
      severity: 'low'
    };
  };

  const highSeverityWarnings = duplicateWarnings.filter(w => 
    getWarningType(w).severity === 'high'
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Duplicate Duty Warning
          </AlertDialogTitle>
          <AlertDialogDescription>
            We found potential conflicts with your duty assignment. Please review the details below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* New Duty Summary */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">New Duty Assignment</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {formData.type}
                </Badge>
                <span className="font-medium">{formData.title}</span>
              </div>
              <div className="flex items-center gap-1 text-blue-700">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDate(formData.start_date)} - {formatDate(formData.end_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Warning Details */}
          {duplicateWarnings.map((warning, index) => {
            const warningType = getWarningType(warning);
            const severityColor = {
              high: 'red',
              medium: 'orange',
              low: 'yellow'
            }[warningType.severity];

            return (
              <div 
                key={index} 
                className={`p-4 rounded-lg border border-${severityColor}-200 bg-${severityColor}-50`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className={`font-medium text-${severityColor}-900`}>
                    {warningType.title}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={`text-xs text-${severityColor}-700 border-${severityColor}-300`}
                  >
                    {warningType.severity} priority
                  </Badge>
                </div>
                
                <p className={`text-sm text-${severityColor}-800 mb-3`}>
                  {warningType.description}
                </p>

                {/* Conflicting Duties */}
                {warning.conflictingDuties && warning.conflictingDuties.length > 0 && (
                  <div className="space-y-2">
                    <h5 className={`text-sm font-medium text-${severityColor}-900`}>
                      Conflicting Duties:
                    </h5>
                    {warning.conflictingDuties.map((duty, dutyIndex) => (
                      <div 
                        key={dutyIndex}
                        className={`flex items-center justify-between p-2 bg-${severityColor}-100 rounded`}
                      >
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {duty.type}
                          </Badge>
                          <span className="font-medium text-sm">{duty.title}</span>
                        </div>
                        <div className={`flex items-center space-x-1 text-xs text-${severityColor}-700`}>
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(duty.start_date)} - {formatDate(duty.end_date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Specific conflict details */}
                {warning.details && (
                  <div className={`mt-2 p-2 bg-${severityColor}-100 rounded text-sm text-${severityColor}-800`}>
                    {warning.details}
                  </div>
                )}
              </div>
            );
          })}

          {/* Resolution Suggestions */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Suggested Actions</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Adjust the start or end dates to avoid overlap</li>
              <li>Choose a different team member for this duty</li>
              <li>Consider if this duty should replace an existing one</li>
              <li>Verify that you're not creating a duplicate by mistake</li>
              {highSeverityWarnings.length > 0 && (
                <li className="text-red-700 font-medium">
                  High priority conflicts should be resolved before proceeding
                </li>
              )}
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Cancel & Review
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={highSeverityWarnings.length > 0 ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {highSeverityWarnings.length > 0 ? 'Create Anyway' : 'Create Duty'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}