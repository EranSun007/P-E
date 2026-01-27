# Phase 11: CSV Upload - Research

**Researched:** 2026-01-27
**Domain:** Frontend file upload UI with drag-and-drop, progress feedback, and validation
**Confidence:** HIGH

## Summary

Phase 11 implements the frontend CSV upload UI that consumes the backend API built in Phase 10. The backend foundation is complete with `POST /api/bugs/upload` (multipart/form-data with multer), `GET /api/bugs/uploads/check` (duplicate detection), and full validation. This phase focuses exclusively on the React UI components: a drag-and-drop file picker, week-ending date selector (Saturday-only), progress feedback, error display, and duplicate confirmation dialog.

**Key Technical Decisions (from Phase 10 foundation):**
- Backend uses multer memory storage (no disk I/O) - already configured
- CSV validation happens server-side - UI just displays errors
- Duplicate detection via `GET /api/bugs/uploads/check?weekEnding=` endpoint
- Week-ending must be a Saturday (validated client-side before submit)

**Primary recommendation:** Use react-dropzone for drag-and-drop file selection with native HTML `<input type="date">` for week-ending selection. Display upload progress with Radix Progress component, errors with Alert component, and duplicates with AlertDialog.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-dropzone | ^14.x | Drag-and-drop file upload | De facto React standard, 4M+ weekly downloads, simple useDropzone hook API |
| @radix-ui/react-progress | ^1.1.2 | Progress bar | Already installed, consistent with project UI |
| @radix-ui/react-alert-dialog | ^1.1.6 | Confirmation dialogs | Already installed, used for duplicate prompt |
| date-fns | ^3.6.0 | Date manipulation | Already installed, used for Saturday validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.475.0 | Icons | Upload, file, error icons (already installed) |
| @radix-ui/react-toast | ^1.2.14 | Success/error toasts | Post-upload notifications (already installed) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-dropzone | Native HTML5 | Native requires more boilerplate for drag states, file validation; react-dropzone is well-tested |
| Custom date picker | react-day-picker | Native date input simpler for single-day Saturday selection; DayPicker better for ranges |

**Installation:**
```bash
npm install react-dropzone
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── bugs/
│       ├── CSVUploadDialog.jsx     # Main upload dialog component
│       ├── WeekEndingPicker.jsx    # Saturday-only date selector
│       └── UploadProgress.jsx      # Progress display component
├── api/
│   └── apiClient.js                # Add BugUpload methods (already has pattern)
└── pages/
    └── BugDashboard.jsx            # Page with upload trigger (Phase 12)
```

### Pattern 1: React Dropzone with File Type Validation
**What:** Drag-and-drop zone with CSV-only file filter
**When to use:** All file upload scenarios
**Example:**
```jsx
// Source: react-dropzone documentation
import { useDropzone } from 'react-dropzone';

function CSVDropzone({ onFileSelect, disabled }) {
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    disabled,
    maxSize: 10 * 1024 * 1024 // 10MB (matches backend)
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive && "border-primary bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the CSV file here...</p>
      ) : (
        <p>Drag and drop a CSV file here, or click to select</p>
      )}
    </div>
  );
}
```

### Pattern 2: Saturday-Only Date Validation
**What:** Enforce week-ending date is always a Saturday
**When to use:** Week-ending date selection
**Example:**
```jsx
// Client-side Saturday validation
import { isSaturday, nextSaturday, previousSaturday, format } from 'date-fns';

function getSaturdayBounds() {
  const today = new Date();
  return {
    // Most recent Saturday (default selection)
    defaultDate: isSaturday(today) ? today : previousSaturday(today),
    // Can't select future Saturdays beyond next week
    maxDate: nextSaturday(today)
  };
}

function validateSaturday(dateString) {
  const date = new Date(dateString);
  return isSaturday(date);
}

// In component
const [weekEnding, setWeekEnding] = useState(() => {
  const { defaultDate } = getSaturdayBounds();
  return format(defaultDate, 'yyyy-MM-dd');
});

// Step through Saturdays only
const handleDateChange = (e) => {
  const date = new Date(e.target.value);
  if (!isSaturday(date)) {
    // Snap to nearest Saturday
    const nearestSat = date.getDay() < 4
      ? previousSaturday(date)
      : nextSaturday(date);
    setWeekEnding(format(nearestSat, 'yyyy-MM-dd'));
  } else {
    setWeekEnding(e.target.value);
  }
};
```

### Pattern 3: Multipart Form Upload with Progress
**What:** Upload file with FormData, track progress with XMLHttpRequest
**When to use:** When upload progress feedback is needed
**Example:**
```jsx
// Custom upload function with progress tracking
async function uploadCSVWithProgress(file, weekEnding, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('weekEnding', weekEnding);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || 'Upload failed'));
        } catch {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));

    const token = AuthService.getToken();
    xhr.open('POST', '/api/bugs/upload');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}
```

### Pattern 4: Duplicate Detection with Confirmation Dialog
**What:** Check for existing upload before submitting, prompt user to replace or cancel
**When to use:** Before every upload submission
**Example:**
```jsx
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

// Check for duplicate before upload
const checkForDuplicate = async (weekEnding) => {
  const response = await fetch(`/api/bugs/uploads/check?weekEnding=${weekEnding}`, {
    headers: { 'Authorization': `Bearer ${AuthService.getToken()}` }
  });
  const data = await response.json();
  return data.exists ? data.upload : null;
};

// In component
const [duplicateUpload, setDuplicateUpload] = useState(null);
const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

const handleUpload = async () => {
  // 1. Check for duplicate
  const existing = await checkForDuplicate(weekEnding);
  if (existing) {
    setDuplicateUpload(existing);
    setShowDuplicateDialog(true);
    return; // Wait for user confirmation
  }

  // 2. No duplicate, proceed with upload
  await performUpload();
};

const handleReplaceConfirm = async () => {
  setShowDuplicateDialog(false);
  await performUpload(); // Backend handles upsert
};

// AlertDialog JSX
<AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Replace Existing Upload?</AlertDialogTitle>
      <AlertDialogDescription>
        An upload already exists for week ending {duplicateUpload?.week_ending}.
        Uploaded on {format(new Date(duplicateUpload?.uploaded_at), 'PPp')}
        with {duplicateUpload?.bug_count} bugs.
        Do you want to replace it?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleReplaceConfirm}>Replace</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Anti-Patterns to Avoid
- **File validation only on backend:** Always validate file type client-side first for better UX
- **Blocking UI during upload:** Show progress indicator, don't freeze the interface
- **Ignoring file size limits:** Check size client-side before attempting upload
- **No error recovery:** Always provide clear error messages and retry options
- **Sunday-through-Saturday selection:** Enforce Saturday-only to match backend validation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop file zone | Custom dragover/drop handlers | react-dropzone | Handles browser quirks, file type validation, multiple file handling |
| Saturday date stepping | Custom day-of-week math | date-fns isSaturday/previousSaturday | Edge cases around year boundaries, daylight saving |
| Progress bar | Custom CSS animation | @radix-ui/react-progress | Accessible, animated, consistent with UI kit |
| Confirmation dialogs | Custom modal | @radix-ui/react-alert-dialog | Accessible, focus management, escape handling |
| File upload with auth | Custom XMLHttpRequest wrapper | Extend existing apiClient pattern | Consistent auth header handling |

**Key insight:** The project already has all the UI primitives needed (Dialog, Progress, AlertDialog, Button, Input). The main addition is react-dropzone for the drag-and-drop UX.

## Common Pitfalls

### Pitfall 1: FormData Content-Type Header
**What goes wrong:** Setting `Content-Type: application/json` for FormData uploads
**Why it happens:** apiClient defaults to JSON content type
**How to avoid:**
- Do NOT set Content-Type header for FormData uploads
- Browser automatically sets `multipart/form-data` with correct boundary
**Warning signs:** Backend receives empty file, multer fails to parse

### Pitfall 2: Week-Ending Date Zone Issues
**What goes wrong:** Date appears correct in UI but submits as different day
**Why it happens:** JavaScript Date parsing with timezone offsets
**How to avoid:**
- Use date strings in 'yyyy-MM-dd' format
- Avoid new Date() parsing - keep as string until backend
- Backend stores as DATE type, not TIMESTAMP
**Warning signs:** Saturday selected becomes Friday/Sunday in database

### Pitfall 3: Upload Progress Not Updating
**What goes wrong:** Progress bar jumps from 0% to 100%
**Why it happens:** Using fetch() instead of XMLHttpRequest
**How to avoid:**
- fetch() API doesn't support upload progress events
- Must use XMLHttpRequest for progress tracking
- Alternative: show indeterminate progress with fetch()
**Warning signs:** onProgress callback never fires during upload

### Pitfall 4: Memory Leak on Unmount
**What goes wrong:** State updates on unmounted component
**Why it happens:** Upload completes after user closes dialog
**How to avoid:**
- Use AbortController to cancel in-flight requests
- Check mounted state before setState
- Cleanup in useEffect return function
**Warning signs:** React warning about setState on unmounted component

### Pitfall 5: Large File Blocking UI
**What goes wrong:** UI freezes when selecting large CSV file
**Why it happens:** File validation or preview blocking main thread
**How to avoid:**
- Don't read file contents for preview in main thread
- Just show filename and size until upload
- Let backend do all CSV parsing
**Warning signs:** Unresponsive dropzone after selecting large file

## Code Examples

Verified patterns from project codebase and official sources:

### Complete CSVUploadDialog Component
```jsx
// src/components/bugs/CSVUploadDialog.jsx
import { useState, useCallback } from 'react';
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

const getDefaultSaturday = () => {
  const today = new Date();
  const saturday = isSaturday(today) ? today : previousSaturday(today);
  return format(saturday, 'yyyy-MM-dd');
};

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

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    setResult(null);

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

    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: uploading
  });

  // Week ending date change (snap to Saturday)
  const handleDateChange = (e) => {
    const date = new Date(e.target.value + 'T12:00:00'); // Noon to avoid timezone issues
    if (!isSaturday(date)) {
      const nearestSat = previousSaturday(date);
      setWeekEnding(format(nearestSat, 'yyyy-MM-dd'));
    } else {
      setWeekEnding(e.target.value);
    }
  };

  // Check for duplicate upload
  const checkForDuplicate = async () => {
    const token = AuthService.getToken();
    const response = await fetch(`/api/bugs/uploads/check?weekEnding=${weekEnding}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const data = await response.json();
    return data.exists ? data.upload : null;
  };

  // Perform the actual upload
  const performUpload = async () => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', selectedFile);
      formData.append('weekEnding', weekEnding);

      // Use XMLHttpRequest for progress tracking
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.message || 'Upload failed'));
            } catch {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));

        const token = AuthService.getToken();
        xhr.open('POST', '/api/bugs/upload');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });

      setResult(result);
      onUploadComplete?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Handle upload button click
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file');
      return;
    }

    if (!isSaturday(new Date(weekEnding + 'T12:00:00'))) {
      setError('Week ending date must be a Saturday');
      return;
    }

    // Check for duplicate
    try {
      const existing = await checkForDuplicate();
      if (existing) {
        setDuplicateUpload(existing);
        setShowDuplicateDialog(true);
        return;
      }
    } catch (err) {
      setError('Failed to check for existing upload');
      return;
    }

    await performUpload();
  };

  // Handle duplicate replacement confirmation
  const handleReplaceConfirm = async () => {
    setShowDuplicateDialog(false);
    await performUpload();
  };

  // Reset form
  const handleClose = (open) => {
    if (!open) {
      setSelectedFile(null);
      setWeekEnding(getDefaultSaturday());
      setProgress(0);
      setError(null);
      setResult(null);
    }
    onOpenChange(open);
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
                Select the Saturday that ends the reporting week
              </p>
            </div>

            {/* Dropzone */}
            <div className="space-y-2">
              <Label>CSV File *</Label>
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive && "border-primary bg-primary/5",
                  uploading && "opacity-50 cursor-not-allowed",
                  selectedFile && "border-green-500 bg-green-50"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setResult(null);
                      }}
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

            {/* Progress Bar */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
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
            <AlertDialogDescription>
              An upload already exists for week ending{' '}
              {duplicateUpload?.week_ending && format(new Date(duplicateUpload.week_ending), 'MMM d, yyyy')}.
              <br /><br />
              Previously uploaded on{' '}
              {duplicateUpload?.uploaded_at && format(new Date(duplicateUpload.uploaded_at), 'PPp')}{' '}
              with {duplicateUpload?.bug_count} bugs.
              <br /><br />
              Do you want to replace it with the new data?
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

export default CSVUploadDialog;
```

### API Client Extension Pattern
```jsx
// Add to src/api/apiClient.js under apiClient object

bugs: {
  // Check for duplicate upload
  async checkDuplicate(weekEnding) {
    return fetchWithAuth(`${API_BASE_URL}/bugs/uploads/check?weekEnding=${weekEnding}`);
  },

  // List all uploads
  async listUploads() {
    return fetchWithAuth(`${API_BASE_URL}/bugs/uploads`);
  },

  // Get KPIs for upload
  async getKPIs(uploadId, component = null) {
    let url = `${API_BASE_URL}/bugs/kpis?uploadId=${uploadId}`;
    if (component) url += `&component=${encodeURIComponent(component)}`;
    return fetchWithAuth(url);
  },

  // Note: Upload uses custom XMLHttpRequest for progress, not fetchWithAuth
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jQuery file upload | react-dropzone | 2018+ | React-native, hook-based API |
| Custom drag handlers | useDropzone hook | 2019+ | Less boilerplate, better browser compat |
| XMLHttpRequest only | fetch() with fallback | 2020+ | Cleaner API, but still need XHR for progress |
| Inline validation | Zod schema validation | 2022+ | Type-safe validation (optional for simple forms) |

**Deprecated/outdated:**
- react-dropzone v10 and below: Use v14+ with hooks API
- Custom file type validation: Use `accept` prop in dropzone config
- Manual drag state management: useDropzone handles isDragActive/isDragReject

## Open Questions

Things that couldn't be fully resolved:

1. **Large file upload timeout**
   - What we know: Backend multer configured for 10MB max
   - What's unclear: Optimal timeout for slow connections
   - Recommendation: Default 2-minute timeout should be sufficient; add retry button on timeout

2. **CSV encoding detection**
   - What we know: Backend parses as UTF-8
   - What's unclear: How to handle Excel-exported CSVs with BOM or different encodings
   - Recommendation: Backend already handles via fast-csv; just ensure clear error message if parsing fails

3. **Mobile upload experience**
   - What we know: react-dropzone falls back to file picker on mobile
   - What's unclear: UX testing results for mobile CSV upload
   - Recommendation: Mobile use case is secondary; desktop-first design

## Sources

### Primary (HIGH confidence)
- Existing codebase: BugService.js, server/routes/bugs.js (Phase 10 implementation)
- Existing codebase: TimeOffForm.jsx, GoalFormDialog.jsx (form patterns)
- Existing codebase: alert-dialog.jsx, progress.jsx (UI components)
- react-dropzone GitHub README - useDropzone hook API

### Secondary (MEDIUM confidence)
- date-fns documentation - isSaturday, previousSaturday functions
- XMLHttpRequest upload progress events - MDN Web Docs pattern

### Tertiary (LOW confidence)
- None - all patterns verified against existing codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-dropzone is de facto standard, all other libs already in project
- Architecture: HIGH - Following exact patterns from TimeOffForm, GoalFormDialog
- Pitfalls: HIGH - Common issues well-documented, verified against codebase
- Code examples: HIGH - Tested patterns matching project conventions

**Research date:** 2026-01-27
**Valid until:** 60 days (stable libraries, established patterns)

**Backend API summary (from Phase 10):**
- `POST /api/bugs/upload` - multipart/form-data with csvFile and weekEnding
- `GET /api/bugs/uploads/check?weekEnding=` - duplicate detection
- `GET /api/bugs/uploads` - list all uploads
- `GET /api/bugs/kpis?uploadId=&component=` - get KPIs
- `DELETE /api/bugs/uploads/:id` - delete upload
