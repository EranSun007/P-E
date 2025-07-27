/**
 * Goal Import Service
 * Service layer for importing employee goals from CSV/JSON files
 * Provides parsing, validation, and bulk import functionality
 */

import EmployeeGoalsService from './employeeGoalsService.js';
import { validateEmployeeGoal } from '../api/schemas/employeeGoalSchema.js';

class GoalImportService {
  /**
   * Parse CSV data into goal objects
   * @param {string} csvData - Raw CSV content
   * @returns {Promise<Array>} Array of parsed goal objects
   */
  static async parseCSV(csvData) {
    try {
      if (!csvData || csvData.trim() === '') {
        return [];
      }

      const lines = csvData.trim().split('\n');
      if (lines.length === 0) {
        return [];
      }

      // Parse headers
      const headers = this._parseCSVLine(lines[0]);
      if (lines.length === 1) {
        return []; // Only headers, no data
      }

      // Parse data rows
      const results = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = this._parseCSVLine(lines[i]);
          const rowData = {};
          
          // Map values to headers, filling missing fields with empty strings
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          // Ensure all required fields exist with empty string defaults
          const goalData = {
            employeeId: rowData.employeeId || '',
            title: rowData.title || '',
            developmentNeed: rowData.developmentNeed || '',
            developmentActivity: rowData.developmentActivity || '',
            developmentGoalDescription: rowData.developmentGoalDescription || ''
          };

          results.push(goalData);
        }
      }

      return results;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw new Error('Invalid CSV format: ' + error.message);
    }
  }

  /**
   * Parse JSON data into goal objects
   * @param {string} jsonData - Raw JSON content
   * @returns {Promise<Array>} Array of parsed goal objects
   */
  static async parseJSON(jsonData) {
    try {
      if (!jsonData || jsonData.trim() === '') {
        return [];
      }

      const parsed = JSON.parse(jsonData);
      
      if (!Array.isArray(parsed)) {
        throw new Error('JSON data must be an array');
      }

      return parsed;
    } catch (error) {
      console.error('Error parsing JSON:', error);
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format: ' + error.message);
      }
      throw error;
    }
  }

  /**
   * Map fields from external format to internal format
   * @param {Array} rawData - Array of raw data objects
   * @param {Object} fieldMapping - Mapping configuration
   * @returns {Array} Array of mapped goal objects
   */
  static mapFields(rawData, fieldMapping = null) {
    if (!fieldMapping) {
      return rawData; // No mapping needed, assume data is already in correct format
    }

    return rawData.map(row => {
      const mappedRow = {};
      
      // Map each field according to the field mapping
      Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
        mappedRow[targetField] = row[sourceField] || '';
      });

      return mappedRow;
    });
  }

  /**
   * Validate import data and separate valid/invalid records
   * @param {Array} goalData - Array of goal data objects
   * @returns {Promise<Object>} Object with valid and invalid arrays
   */
  static async validateImportData(goalData) {
    const result = {
      valid: [],
      invalid: []
    };

    for (let i = 0; i < goalData.length; i++) {
      try {
        const validatedGoal = validateEmployeeGoal(goalData[i]);
        result.valid.push(validatedGoal);
      } catch (error) {
        result.invalid.push({
          data: goalData[i],
          error: this._formatValidationError(error),
          index: i
        });
      }
    }

    return result;
  }

  /**
   * Detect duplicate goals based on employeeId and title
   * @param {Array} goalData - Array of goal data objects
   * @returns {Promise<Object>} Object with duplicates and unique arrays
   */
  static async detectDuplicates(goalData) {
    try {
      const existingGoals = await EmployeeGoalsService.getAllGoals();
      
      const result = {
        duplicates: [],
        unique: []
      };

      goalData.forEach(goal => {
        const duplicate = existingGoals.find(existing => 
          existing.employeeId === goal.employeeId && 
          existing.title.toLowerCase() === goal.title.toLowerCase()
        );

        if (duplicate) {
          result.duplicates.push({
            importGoal: goal,
            existingGoal: duplicate
          });
        } else {
          result.unique.push(goal);
        }
      });

      return result;
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      throw error;
    }
  }

  /**
   * Import goals with validation and duplicate detection
   * @param {Array} goalData - Array of goal data objects
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  static async importGoals(goalData, options = {}) {
    try {
      const {
        source = 'Import',
        skipDuplicates = true
      } = options;

      // Validate data
      const validation = await this.validateImportData(goalData);
      
      if (validation.invalid.length > 0 && validation.valid.length === 0) {
        return {
          imported: [],
          skipped: [],
          failed: validation.invalid.map(item => ({
            data: item.data,
            error: item.error,
            reason: 'validation_error'
          }))
        };
      }

      // Check for duplicates
      const duplicateCheck = await this.detectDuplicates(validation.valid);
      
      const result = {
        imported: [],
        skipped: [],
        failed: validation.invalid.map(item => ({
          data: item.data,
          error: item.error,
          reason: 'validation_error'
        }))
      };

      // Handle duplicates
      if (skipDuplicates) {
        result.skipped = duplicateCheck.duplicates.map(dup => ({
          data: dup.importGoal,
          existingGoal: dup.existingGoal,
          reason: 'duplicate'
        }));
      }

      // Import unique goals
      if (duplicateCheck.unique.length > 0) {
        const goalsToImport = duplicateCheck.unique.map(goal => ({
          ...goal,
          importSource: source
        }));

        const bulkResult = await EmployeeGoalsService.bulkCreateGoals(goalsToImport);
        
        result.imported = bulkResult.successful;
        result.failed.push(...bulkResult.failed.map(item => ({
          data: item.data,
          error: item.error,
          reason: 'creation_error'
        })));
      }

      return result;
    } catch (error) {
      console.error('Error importing goals:', error);
      throw error;
    }
  }

  /**
   * Generate field mapping suggestions based on header names
   * @param {Array} headers - Array of header names
   * @returns {Object} Suggested field mappings
   */
  static getFieldSuggestions(headers) {
    const suggestions = {};
    
    const fieldMappings = {
      employeeId: ['employee id', 'empid', 'employee_id', 'id', 'userid', 'user_id'],
      title: ['title', 'goal title', 'goal_title', 'name', 'goal name', 'goal_name'],
      developmentNeed: ['development need', 'need', 'skill', 'area', 'development_need', 'dev_need'],
      developmentActivity: ['activity', 'activities', 'development activity', 'development_activity', 'dev_activity', 'action'],
      developmentGoalDescription: ['description', 'goal description', 'details', 'goal_description', 'dev_description']
    };

    headers.forEach(header => {
      const headerLower = header.toLowerCase().trim();
      
      Object.entries(fieldMappings).forEach(([field, variations]) => {
        if (variations.some(variation => headerLower.includes(variation))) {
          suggestions[field] = header;
        }
      });
    });

    return suggestions;
  }

  /**
   * Generate import preview with statistics
   * @param {Array} goalData - Array of goal data objects
   * @returns {Promise<Object>} Preview statistics and sample data
   */
  static async generateImportPreview(goalData) {
    try {
      const validation = await this.validateImportData(goalData);
      const duplicateCheck = await this.detectDuplicates(validation.valid);

      const preview = {
        totalGoals: goalData.length,
        validGoals: validation.valid.length,
        invalidGoals: validation.invalid.length,
        duplicateGoals: duplicateCheck.duplicates.length,
        uniqueGoals: duplicateCheck.unique.length,
        sampleGoals: goalData.slice(0, 10), // First 10 goals as sample
        validationErrors: validation.invalid.slice(0, 5), // First 5 errors
        duplicates: duplicateCheck.duplicates.slice(0, 5) // First 5 duplicates
      };

      return preview;
    } catch (error) {
      console.error('Error generating preview:', error);
      throw error;
    }
  }

  /**
   * Parse a single CSV line handling quoted fields
   * @private
   * @param {string} line - CSV line to parse
   * @returns {Array} Array of field values
   */
  static _parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add final field
    result.push(current.trim());
    
    // Check for unclosed quotes
    if (inQuotes) {
      throw new Error('Unclosed quote in CSV line');
    }
    
    return result;
  }

  /**
   * Format validation error message
   * @private
   * @param {Error} error - Validation error
   * @returns {string} Formatted error message
   */
  static _formatValidationError(error) {
    if (error.name === 'ZodError') {
      const firstError = error.issues[0];
      if (firstError && firstError.path.length > 0) {
        return `${firstError.path[0]} is required`;
      }
      return firstError?.message || 'Validation error';
    }
    return error.message;
  }
}

export default GoalImportService;