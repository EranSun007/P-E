// src/components/data/ExportDialog.jsx
// Export Dialog Component for Data Export/Import Feature

import React, { useState, useEffect } from 'react';
import { DataExportService } from '../../services/dataExportService.js';

const ExportDialog = ({ isOpen, onClose, onExportComplete }) => {
  const [selectedEntities, setSelectedEntities] = useState(new Set());
  const [exportOptions, setExportOptions] = useState({
    sanitize: false,
    compress: false,
    filename: ''
  });
  const [exportPreview, setExportPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('selection'); // selection, preview, exporting, complete

  // Initialize with all entities selected
  useEffect(() => {
    if (isOpen) {
      setSelectedEntities(new Set(DataExportService.ENTITY_TYPES));
      setExportOptions({
        sanitize: false,
        compress: false,
        filename: ''
      });
      setStep('selection');
      setError(null);
      setExportPreview(null);
    }
  }, [isOpen]);

  // Generate preview when entities change
  useEffect(() => {
    if (selectedEntities.size > 0 && step === 'selection') {
      generatePreview();
    }
  }, [selectedEntities]);

  const generatePreview = async () => {
    if (selectedEntities.size === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const entityTypes = Array.from(selectedEntities);
      const preview = await DataExportService.getExportPreview(entityTypes);
      setExportPreview(preview);
    } catch (err) {
      setError(`Failed to generate preview: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntityToggle = (entityType) => {
    const newSelected = new Set(selectedEntities);
    if (newSelected.has(entityType)) {
      newSelected.delete(entityType);
    } else {
      newSelected.add(entityType);
    }
    setSelectedEntities(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedEntities(new Set(DataExportService.ENTITY_TYPES));
  };

  const handleSelectNone = () => {
    setSelectedEntities(new Set());
  };

  const handleExport = async () => {
    if (selectedEntities.size === 0) {
      setError('Please select at least one entity type to export');
      return;
    }

    setIsExporting(true);
    setStep('exporting');
    setError(null);

    try {
      const entityTypes = Array.from(selectedEntities);
      const exportData = await DataExportService.exportSelective(entityTypes, exportOptions);
      
      const filename = exportOptions.filename || 
        `pe-team-data-export-${new Date().toISOString().split('T')[0]}.json`;
      
      const result = await DataExportService.generateExportFile(exportData, filename);
      
      setStep('complete');
      
      if (onExportComplete) {
        onExportComplete({
          success: true,
          filename: result.filename,
          size: result.size,
          records: result.records
        });
      }
    } catch (err) {
      setError(`Export failed: ${err.message}`);
      setStep('selection');
    } finally {
      setIsExporting(false);
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
            <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isExporting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-4 flex items-center space-x-4">
            <div className={`flex items-center ${step === 'selection' ? 'text-blue-600' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'selection' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Select Data</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className={`flex items-center ${step === 'preview' ? 'text-blue-600' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'preview' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Preview</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className={`flex items-center ${step === 'exporting' || step === 'complete' ? 'text-blue-600' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'exporting' || step === 'complete' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Export</span>
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

          {step === 'selection' && (
            <div className="space-y-6">
              {/* Entity Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Data Types</h3>
                  <div className="space-x-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleSelectNone}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Select None
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {DataExportService.ENTITY_TYPES.map((entityType) => (
                    <label key={entityType} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEntities.has(entityType)}
                        onChange={() => handleEntityToggle(entityType)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {formatEntityName(entityType)}
                        </div>
                        {exportPreview?.entities[entityType] && (
                          <div className="text-xs text-gray-500">
                            {exportPreview.entities[entityType].count} records
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Export Options */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Filename (optional)
                    </label>
                    <input
                      type="text"
                      value={exportOptions.filename}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, filename: e.target.value }))}
                      placeholder="pe-team-data-export-2025-01-08.json"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportOptions.sanitize}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, sanitize: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Sanitize sensitive data</div>
                        <div className="text-xs text-gray-500">Remove or redact sensitive information</div>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportOptions.compress}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, compress: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Compress export data</div>
                        <div className="text-xs text-gray-500">Reduce file size for large datasets</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview Summary */}
              {exportPreview && !isLoading && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Export Preview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{exportPreview.totalRecords}</div>
                      <div className="text-sm text-gray-600">Total Records</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{selectedEntities.size}</div>
                      <div className="text-sm text-gray-600">Entity Types</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatFileSize(exportPreview.estimatedSize)}
                      </div>
                      <div className="text-sm text-gray-600">Estimated Size</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {Object.keys(exportPreview.relationships).length}
                      </div>
                      <div className="text-sm text-gray-600">Relationships</div>
                    </div>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Generating preview...</span>
                </div>
              )}
            </div>
          )}

          {step === 'exporting' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Exporting Data</h3>
              <p className="text-gray-600">Please wait while we prepare your export file...</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Export Complete!</h3>
              <p className="text-gray-600">Your data has been successfully exported and downloaded.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isExporting}
          >
            {step === 'complete' ? 'Close' : 'Cancel'}
          </button>
          
          {step === 'selection' && (
            <button
              onClick={handleExport}
              disabled={selectedEntities.size === 0 || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
