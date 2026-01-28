// src/components/bugs/CSVUploadDialog.jsx
// CSV Upload Dialog with drag-and-drop, progress tracking, and duplicate detection

import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import { format, isSaturday, previousSaturday } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AuthService from '@/services/authService';

/**
 * Get the default Saturday (most recent Saturday from today)
 * @returns {string} Date string in yyyy-MM-dd format
 */
const getDefaultSaturday = () => {
  const today = new Date();
  const saturday = isSaturday(today) ? today : previousSaturday(today);
  return format(saturday, 'yyyy-MM-dd');
};

/**
 * API base URL for upload endpoint
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * CSVUploadDialog Component
 * Provides a dialog for uploading JIRA CSV exports with:
 * - Drag-and-drop file selection via react-dropzone
 * - Saturday-only week-ending date picker
 * - Upload progress tracking via XMLHttpRequest
 * - Duplicate detection with confirmation dialog
 * - Error and success messaging
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {function} props.onUploadComplete - Callback after successful upload
 */
const CSVUploadDialog = ({ open, onOpenChange, onUploadComplete }) => {
  // Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [weekEnding, setWeekEnding] = useState(getDefaultSaturday);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Duplicate dialog state
  const [duplicateUpload, setDuplicateUpload] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  /**
   * Handle file drop from react-dropzone
   */
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Clear previous state
    setError(null);
    setResult(null);

    // Handle rejected files (wrong type, too large, etc.)
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File too large. Maximum size is 10MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please select a CSV file.');
      } else {
        setError(rejection.errors[0]?.message || 'Invalid file');
      }
      return;
    }

    // Accept the first file
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  /**
   * Configure react-dropzone
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB (matches backend multer config)
    disabled: uploading
  });

  /**
   * Handle week ending date change
   * Snaps non-Saturday selections to the previous Saturday
   */
  const handleDateChange = (e) => {
    // Add T12:00:00 to avoid timezone issues when parsing
    const date = new Date(e.target.value + 'T12:00:00');
    if (!isSaturday(date)) {
      // Snap to previous Saturday
      const nearestSat = previousSaturday(date);
      setWeekEnding(format(nearestSat, 'yyyy-MM-dd'));
    } else {
      setWeekEnding(e.target.value);
    }
  };

  /**
   * Check for existing upload for the selected week ending
   * @returns {Object|null} Existing upload if found, null otherwise
   */
  const checkForDuplicate = async () => {
    const token = AuthService.getToken();
    const response = await fetch(`${API_BASE_URL}/bugs/uploads/check?weekEnding=${weekEnding}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const data = await response.json();
    return data.exists ? data.upload : null;
  };

  /**
   * Perform the actual file upload with progress tracking
   * Uses XMLHttpRequest for upload progress events (fetch doesn't support this)
   */
  const performUpload = async () => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', selectedFile);
      formData.append('weekEnding', weekEnding);

      // Use XMLHttpRequest for progress tracking
      const uploadResult = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setProgress(percentComplete);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || 'Upload failed'));
            } catch {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          }
        });

        // Handle network errors
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        // Send request with auth header
        const token = AuthService.getToken();
        xhr.open('POST', `${API_BASE_URL}/bugs/upload`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });

      setResult(uploadResult);
      onUploadComplete?.(uploadResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handle upload button click
   * Validates inputs, checks for duplicates, then uploads
   */
  const handleUpload = async () => {
    // Validate file selection
    if (!selectedFile) {
      setError('Please select a CSV file');
      return;
    }

    // Validate Saturday date
    if (!isSaturday(new Date(weekEnding + 'T12:00:00'))) {
      setError('Week ending date must be a Saturday');
      return;
    }

    // Check for existing upload for this week
    try {
      const existing = await checkForDuplicate();
      if (existing) {
        setDuplicateUpload(existing);
        setShowDuplicateDialog(true);
        return; // Wait for user confirmation
      }
    } catch {
      setError('Failed to check for existing upload');
      return;
    }

    // No duplicate found, proceed with upload
    await performUpload();
  };

  /**
   * Handle duplicate replacement confirmation
   */
  const handleReplaceConfirm = async () => {
    setShowDuplicateDialog(false);
    await performUpload();
  };

  /**
   * Reset form state and close dialog
   */
  const handleClose = (openState) => {
    if (!openState) {
      // Reset all state when closing
      setSelectedFile(null);
      setWeekEnding(getDefaultSaturday());
      setProgress(0);
      setError(null);
      setResult(null);
      setDuplicateUpload(null);
    }
    onOpenChange(openState);
  };

  /**
   * Clear selected file
   */
  const handleClearFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setResult(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload JIRA CSV Export</DialogTitle>
            <DialogDescription>
              Upload a CSV file exported from JIRA to analyze bug metrics for a specific week.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Week Ending Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="weekEnding">Week Ending (Saturday) *</Label>
              <Input
                id="weekEnding"
                type="date"
                value={weekEnding}
                onChange={handleDateChange}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Select the Saturday that ends the reporting week. Non-Saturday dates will snap to the previous Saturday.
              </p>
            </div>

            {/* Dropzone for file selection */}
            <div className="space-y-2">
              <Label>CSV File *</Label>
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive && "border-primary bg-primary/5",
                  uploading && "opacity-50 cursor-not-allowed",
                  selectedFile && !error && "border-green-500 bg-green-50"
                )}
              >
                <input {...getInputProps()} />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-10 w-10 text-green-600" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFile}
                      disabled={uploading}
                    >
                      Change file
                    </Button>
                  </div>
                ) : isDragActive ? (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-primary" />
                    <p>Drop the CSV file here...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p>Drag and drop a CSV file here, or click to select</p>
                    <p className="text-sm text-muted-foreground">Maximum file size: 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Progress Bar */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading and processing...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Result */}
            {result && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <p className="font-medium">Upload successful!</p>
                  <ul className="mt-2 text-sm space-y-1">
                    <li>Total bugs: {result.bugCount}</li>
                    <li>Components: {result.components?.join(', ') || 'None detected'}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={uploading}
            >
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Confirmation Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Existing Upload?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  An upload already exists for week ending{' '}
                  <strong>
                    {duplicateUpload?.week_ending && format(new Date(duplicateUpload.week_ending + 'T12:00:00'), 'MMM d, yyyy')}
                  </strong>.
                </p>
                <p className="mt-2">
                  Previously uploaded on{' '}
                  {duplicateUpload?.uploaded_at && format(new Date(duplicateUpload.uploaded_at), 'PPp')}{' '}
                  with <strong>{duplicateUpload?.bug_count} bugs</strong>.
                </p>
                <p className="mt-2">
                  Do you want to replace it with the new data?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplaceConfirm}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

CSVUploadDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  onUploadComplete: PropTypes.func,
};

export default CSVUploadDialog;
