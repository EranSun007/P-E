// src/components/data/ImportDialog.jsx
// Import Dialog Component for Data Export/Import Feature

import React, { useState, useEffect } from 'react';
import { DataImportService } from '../../services/dataImportService.js';

const ImportDialog = ({ isOpen, onClose, onImportComplete }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importData, setImportData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [mergeStrategy, setMergeStrategy] = useState(DataImportService.MERGE_STRATEGIES.MERGE);
  const [conflicts, setConflicts] = useState([]);
  const [conflictResolutions, setConflictResolutions] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('upload'); // upload, preview, conflicts, importing, complete

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setImportData(null);
      setValidation(null);
      setImportPreview(null);
      setMergeStrategy(DataImportService.MERGE_STRATEGIES.MERGE);
      setConflicts([]);
      setConflictResolutions({});
      setStep('upload');
      setError(null);
    }
  }, [isOpen]);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setIsValidating(true);

    try {
      // Validate file
      const validationResult = await DataImportService.validateImportFile(file);
      setValidation(validationResult);

      if (validationResult.valid && validationResult.importCompatible) {
        // Parse file content
        const fileContent = await readFileContent(file);
        const parsedData = JSON.parse(fileContent);
        setImportData(parsedData);

        // Generate preview
        const preview = await DataImportService.previewImport(parsedData, mergeStrategy);
        setImportPreview(preview);

        // Extract conflicts if any
        const allConflicts = Object.values(preview.conflicts).flat();
        setConflicts(allConflicts);

        setStep(allConflicts.length > 0 ? 'conflicts' : 'preview');
      } else {
        setError(`File validation failed: ${validationResult.errors.join(', ')}`);
      }
    } catch (err) {
      setError(`Failed to process file: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleStrategyChange = async (newStrategy) => {
    setMergeStrategy(newStrategy);
    
    if (importData) {
      try {
        const preview = await DataImportService.previewImport(importData, newStrategy);
        setImportPreview(preview);
        
        const allConflicts = Object.values(preview.conflicts).flat();
        setConflicts(allConflicts);
        
        if (allConflicts.length > 0 && newStrategy === DataImportService.MERGE_STRATEGIES.PROMPT) {
          setStep('conflicts');
        } else {
          setStep('preview');
        }
      } catch (err) {
        setError(`Failed to update preview: ${err.message}`);
      }
    }
  };

  const handleConflictResolution = (conflictId, resolution) => {
    setConflictResolutions(prev => ({
      ...prev,
      [conflictId]: resolution
    }));
  };

  const handleImport = async () => {
    if (!importData) {
      setError('No import data available');
      return;
    }

    setIsImporting(true);
    setStep('importing');
    setError(null);

    try {
      // Resolve conflicts if needed
      if (conflicts.length > 0 && mergeStrategy === DataImportService.MERGE_STRATEGIES.PROMPT) {
        await DataImportService.resolveConflicts(conflicts, conflictResolutions);
      }

      // Perform import
      const result = await DataImportService.importData(importData, mergeStrategy);
      
      setStep('complete');
      
      if (onImportComplete) {
        onImportComplete({
          success: true,
          importId: result.importId,
          summary: result.summary,
          canRollback: result.canRollback
        });
      }
    } catch (err) {
      setError(`Import failed: ${err.message}`);
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatEntityName = (entityType) => {
    return entityType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Import Data</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isImporting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-4 flex items-center space-x-4">
            <div className={`flex items-center ${step === 'upload' ? 'text-blue-600' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'upload' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Upload File</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className={`flex items-center ${step === 'preview' || step === 'conflicts' ? 'text-blue-600' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'preview' || step === 'conflicts' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Preview</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className={`flex items-center ${step === 'importing' || step === 'complete' ? 'text-blue-600' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'importing' || step === 'complete' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Import</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Import File</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="import-file-input"
                  />
                  <label htmlFor="import-file-input" className="cursor-pointer">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div className="text-lg font-medium text-gray-900 mb-2">
                      Choose a file to import
                    </div>
                    <div className="text-sm text-gray-500">
                      Select a JSON export file from P&E Team Management
                    </div>
                  </label>
                </div>

                {selectedFile && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{selectedFile.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(selectedFile.size)} • {new Date(selectedFile.lastModified).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isValidating && (
                  <div className="mt-4 flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Validating file...</span>
                  </div>
                )}

                {validation && !validation.valid && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {(step === 'preview' || step === 'conflicts') && importPreview && (
            <div className="space-y-6">
              {/* Import Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Import Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{importPreview.summary.totalRecords}</div>
                    <div className="text-sm text-gray-600">Total Records</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{importPreview.summary.totalChanges}</div>
                    <div className="text-sm text-gray-600">Changes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{importPreview.summary.totalConflicts}</div>
                    <div className="text-sm text-gray-600">Conflicts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{importPreview.summary.entities.length}</div>
                    <div className="text-sm text-gray-600">Entity Types</div>
                  </div>
                </div>
              </div>

              {/* Merge Strategy */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Merge Strategy</h3>
                <div className="space-y-3">
                  {Object.entries(DataImportService.MERGE_STRATEGIES).map(([key, value]) => (
                    <label key={value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="mergeStrategy"
                        value={value}
                        checked={mergeStrategy === value}
                        onChange={(e) => handleStrategyChange(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {key.charAt(0) + key.slice(1).toLowerCase()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {value === 'replace' && 'Overwrite existing data completely'}
                          {value === 'merge' && 'Combine data, updating existing records'}
                          {value === 'skip' && 'Keep existing data, ignore imports'}
                          {value === 'prompt' && 'Ask for each conflict'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Entity Statistics */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Import Details</h3>
                <div className="space-y-3">
                  {Object.entries(importPreview.statistics).map(([entityType, stats]) => (
                    <div key={entityType} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {formatEntityName(entityType)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {stats.total} total records
                        </div>
                      </div>
                      <div className="flex space-x-4 text-xs">
                        <span className="text-green-600">{stats.new} new</span>
                        <span className="text-blue-600">{stats.updated} updated</span>
                        <span className="text-orange-600">{stats.conflicts} conflicts</span>
                        <span className="text-gray-600">{stats.skipped} skipped</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conflicts Resolution */}
              {step === 'conflicts' && conflicts.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Resolve Conflicts</h3>
                  <div className="space-y-4">
                    {conflicts.slice(0, 5).map((conflict) => (
                      <div key={conflict.id} className="p-4 border border-orange-200 rounded-md bg-orange-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatEntityName(conflict.entityType)} Conflict
                            </div>
                            <div className="text-xs text-gray-600">{conflict.message}</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`conflict-${conflict.id}`}
                              value="use_import"
                              onChange={() => handleConflictResolution(conflict.id, { action: 'use_import' })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Use imported data</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`conflict-${conflict.id}`}
                              value="use_existing"
                              onChange={() => handleConflictResolution(conflict.id, { action: 'use_existing' })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Keep existing data</span>
                          </label>
                        </div>
                      </div>
                    ))}
                    
                    {conflicts.length > 5 && (
                      <div className="text-sm text-gray-600 text-center">
                        ... and {conflicts.length - 5} more conflicts
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Data</h3>
              <p className="text-gray-600">Please wait while we import your data...</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete!</h3>
              <p className="text-gray-600">Your data has been successfully imported.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isImporting}
          >
            {step === 'complete' ? 'Close' : 'Cancel'}
          </button>
          
          {(step === 'preview' || step === 'conflicts') && (
            <button
              onClick={handleImport}
              disabled={!importData || (step === 'conflicts' && Object.keys(conflictResolutions).length < conflicts.length)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
