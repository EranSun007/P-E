/**
 * Goal Import Dialog Component
 * Provides interface for importing employee goals from CSV/JSON files
 * Includes field mapping, validation, and import preview functionality
 */

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import GoalImportService from '../../services/goalImportService';
import { useToast } from '../ui/use-toast';

const REQUIRED_FIELDS = [
  { key: 'employeeId', label: 'Employee ID', description: 'Unique identifier for team member' },
  { key: 'title', label: 'Goal Title', description: 'Main goal title' },
  { key: 'developmentNeed', label: 'Development Need', description: 'Skills or areas needing improvement' },
  { key: 'developmentActivity', label: 'Development Activity', description: 'Specific planned activities' },
  { key: 'developmentGoalDescription', label: 'Goal Description', description: 'Detailed goal breakdown' }
];

const GoalImportDialog = ({ open, onOpenChange, onImportComplete }) => {
  const [step, setStep] = useState('upload'); // upload, preview, mapping, import
  const [file, setFile] = useState(null);
  const [importData, setImportData] = useState([]);
  const [preview, setPreview] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    source: 'File Import'
  });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const { toast } = useToast();

  const handleReset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setImportData([]);
    setPreview(null);
    setFieldMapping({});
    setImporting(false);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  const handleFileSelect = useCallback(async (selectedFile) => {
    try {
      setFile(selectedFile);
      const content = await readFileContent(selectedFile);
      
      let parsedData;
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        parsedData = await GoalImportService.parseCSV(content);
      } else if (selectedFile.name.toLowerCase().endsWith('.json')) {
        parsedData = await GoalImportService.parseJSON(content);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON files.');
      }

      setImportData(parsedData);

      // Generate field mapping suggestions if CSV
      if (selectedFile.name.toLowerCase().endsWith('.csv') && parsedData.length > 0) {
        const headers = Object.keys(parsedData[0]);
        const suggestions = GoalImportService.getFieldSuggestions(headers);
        setFieldMapping(suggestions);
        
        // If not all required fields are mapped, show mapping step
        const mappedFields = Object.keys(suggestions);
        const allRequiredMapped = REQUIRED_FIELDS.every(field => 
          mappedFields.includes(field.key)
        );
        
        if (!allRequiredMapped) {
          setStep('mapping');
          return;
        }
      }

      // Generate preview
      const previewData = await GoalImportService.generateImportPreview(parsedData);
      setPreview(previewData);
      setStep('preview');

    } catch (error) {
      toast({
        title: 'File Processing Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }, [toast]);

  const handleFieldMappingChange = useCallback((field, header) => {
    setFieldMapping(prev => ({
      ...prev,
      [field]: header
    }));
  }, []);

  const handleApplyMapping = useCallback(async () => {
    try {
      // Apply field mapping to import data
      const mappedData = GoalImportService.mapFields(importData, fieldMapping);
      
      // Generate preview with mapped data
      const previewData = await GoalImportService.generateImportPreview(mappedData);
      setPreview(previewData);
      setImportData(mappedData);
      setStep('preview');
    } catch (error) {
      toast({
        title: 'Mapping Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }, [importData, fieldMapping, toast]);

  const handleImport = useCallback(async () => {
    try {
      setImporting(true);
      setImportProgress(0);
      setStep('import');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await GoalImportService.importGoals(importData, importOptions);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);

      if (result.imported.length > 0) {
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${result.imported.length} goals`
        });
        
        if (onImportComplete) {
          onImportComplete(result);
        }
      }

      if (result.failed.length > 0) {
        toast({
          title: 'Partial Import',
          description: `${result.failed.length} goals failed to import`,
          variant: 'destructive'
        });
      }

    } catch (error) {
      setImporting(false);
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  }, [importData, importOptions, onImportComplete, toast]);

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Upload Goals File</h3>
        <p className="text-muted-foreground mb-4">
          Upload a CSV or JSON file containing employee goals data
        </p>
      </div>

      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
        <input
          type="file"
          accept=".csv,.json"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) {
              handleFileSelect(selectedFile);
            }
          }}
          className="w-full"
          id="file-upload"
        />
        <Label htmlFor="file-upload" className="cursor-pointer">
          <div className="text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to select or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              CSV or JSON files only
            </p>
          </div>
        </Label>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Required fields:</strong> Employee ID, Goal Title, Development Need, 
          Development Activity, Goal Description
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Map Fields</h3>
        <p className="text-muted-foreground mb-4">
          Map your file columns to the required goal fields
        </p>
      </div>

      <div className="space-y-4">
        {REQUIRED_FIELDS.map((field) => (
          <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
            <div>
              <Label className="font-medium">{field.label}</Label>
              <p className="text-xs text-muted-foreground">{field.description}</p>
            </div>
            <Select
              value={fieldMapping[field.key] || ''}
              onValueChange={(value) => handleFieldMappingChange(field.key, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(importData[0] || {}).map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('upload')}>
          Back
        </Button>
        <Button onClick={handleApplyMapping}>
          Apply Mapping
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Preview</h3>
        <p className="text-muted-foreground mb-4">
          Review the data before importing
        </p>
      </div>

      {preview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{preview.totalGoals}</div>
              <div className="text-xs text-muted-foreground">Total Goals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{preview.validGoals}</div>
              <div className="text-xs text-muted-foreground">Valid</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{preview.invalidGoals}</div>
              <div className="text-xs text-muted-foreground">Invalid</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{preview.duplicateGoals}</div>
              <div className="text-xs text-muted-foreground">Duplicates</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="sample" className="w-full">
        <TabsList>
          <TabsTrigger value="sample">Sample Data</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sample" className="space-y-4">
          {preview?.sampleGoals.slice(0, 3).map((goal, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="font-medium">{goal.title}</div>
                <div className="text-sm text-muted-foreground">
                  Employee: {goal.employeeId}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {goal.developmentNeed}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="errors">
          {preview?.validationErrors.length > 0 ? (
            <div className="space-y-2">
              {preview.validationErrors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Row {error.index + 1}: {error.error}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No validation errors found</p>
          )}
        </TabsContent>
        
        <TabsContent value="duplicates">
          {preview?.duplicates.length > 0 ? (
            <div className="space-y-2">
              {preview.duplicates.map((dup, index) => (
                <Alert key={index}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    "{dup.importGoal.title}" for {dup.importGoal.employeeId} already exists
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No duplicates found</p>
          )}
        </TabsContent>
      </Tabs>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="skip-duplicates"
            checked={importOptions.skipDuplicates}
            onCheckedChange={(checked) => 
              setImportOptions(prev => ({ ...prev, skipDuplicates: checked }))
            }
          />
          <Label htmlFor="skip-duplicates">Skip duplicate goals</Label>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('upload')}>
          Back
        </Button>
        <Button 
          onClick={handleImport}
          disabled={preview?.validGoals === 0}
        >
          Import {preview?.uniqueGoals || preview?.validGoals} Goals
        </Button>
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-6 text-center">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {importing ? 'Importing Goals...' : 'Import Complete'}
        </h3>
        {importing && (
          <p className="text-muted-foreground mb-4">
            Please wait while we import your goals
          </p>
        )}
      </div>

      <Progress value={importProgress} className="w-full" />

      {importResult && !importing && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.imported.length}
                </div>
                <div className="text-xs text-muted-foreground">Imported</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {importResult.skipped.length}
                </div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {importResult.failed.length}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center space-x-2">
            <Button onClick={handleReset}>
              Import More
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'upload':
        return renderUploadStep();
      case 'mapping':
        return renderMappingStep();
      case 'preview':
        return renderPreviewStep();
      case 'import':
        return renderImportStep();
      default:
        return renderUploadStep();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import Employee Goals</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {renderCurrentStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalImportDialog;