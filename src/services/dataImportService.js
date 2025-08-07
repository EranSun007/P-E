// src/services/dataImportService.js
// Data Import Service for P&E Team Management Application

import { localClient } from '../api/localClient.js';
import { DataExportService } from './dataExportService.js';

/**
 * Service for importing data into local storage with validation and conflict resolution
 */
export class DataImportService {
  // Supported import strategies
  static MERGE_STRATEGIES = {
    REPLACE: 'replace',
    MERGE: 'merge', 
    SKIP: 'skip',
    PROMPT: 'prompt'
  };

  // Import operation status
  static IMPORT_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    ROLLED_BACK: 'rolled_back'
  };

  // Store active import operations for rollback
  static activeImports = new Map();

  /**
   * Validate import file structure and content
   * @param {File|Object} file - File object or parsed JSON data
   * @returns {Promise<Object>} Validation result
   */
  static async validateImportFile(file) {
    try {
      let importData;
      
      // Handle File object vs parsed data
      if (file instanceof File) {
        const fileContent = await this._readFileContent(file);
        importData = JSON.parse(fileContent);
      } else {
        importData = file;
      }

      // Use export service validation
      const validation = DataExportService.validateExportData(importData);
      
      // Additional import-specific validations
      const importValidation = this._validateImportCompatibility(importData);
      
      return {
        ...validation,
        importCompatible: importValidation.compatible,
        importErrors: importValidation.errors,
        importWarnings: importValidation.warnings,
        fileInfo: file instanceof File ? {
          name: file.name,
          size: file.size,
          lastModified: new Date(file.lastModified)
        } : null
      };
    } catch (error) {
      return {
        valid: false,
        importCompatible: false,
        errors: [`File validation failed: ${error.message}`],
        warnings: [],
        importErrors: [],
        importWarnings: [],
        summary: {}
      };
    }
  }

  /**
   * Preview import data and analyze conflicts
   * @param {Object} importData - Parsed import data
   * @param {string} strategy - Merge strategy to use
   * @returns {Promise<Object>} Import preview with conflict analysis
   */
  static async previewImport(importData, strategy = this.MERGE_STRATEGIES.MERGE) {
    try {
      const preview = {
        summary: {
          totalRecords: importData.metadata?.totalRecords || 0,
          entities: importData.metadata?.entities || [],
          importDate: new Date().toISOString(),
          strategy: strategy
        },
        conflicts: {},
        changes: {},
        statistics: {}
      };

      // Analyze each entity type for conflicts
      for (const [entityType, entityData] of Object.entries(importData.data || {})) {
        if (!Array.isArray(entityData)) continue;

        const analysis = await this._analyzeEntityConflicts(entityType, entityData, strategy);
        
        preview.conflicts[entityType] = analysis.conflicts;
        preview.changes[entityType] = analysis.changes;
        preview.statistics[entityType] = {
          total: entityData.length,
          new: analysis.changes.new,
          updated: analysis.changes.updated,
          conflicts: analysis.conflicts.length,
          skipped: analysis.changes.skipped
        };
      }

      // Calculate overall statistics
      preview.summary.totalConflicts = Object.values(preview.conflicts)
        .reduce((sum, conflicts) => sum + conflicts.length, 0);
      
      preview.summary.totalChanges = Object.values(preview.statistics)
        .reduce((sum, stats) => sum + stats.new + stats.updated, 0);

      return preview;
    } catch (error) {
      console.error('Error generating import preview:', error);
      throw new Error(`Failed to generate import preview: ${error.message}`);
    }
  }

  /**
   * Import data with specified strategy
   * @param {Object} importData - Parsed import data
   * @param {string} strategy - Merge strategy
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import result
   */
  static async importData(importData, strategy = this.MERGE_STRATEGIES.MERGE, options = {}) {
    const importId = this._generateImportId();
    
    try {
      console.log(`Starting import operation ${importId} with strategy: ${strategy}`);
      
      // Create backup before import
      const backup = await this._createBackup();
      
      // Initialize import operation tracking
      const importOperation = {
        id: importId,
        status: this.IMPORT_STATUS.IN_PROGRESS,
        startTime: new Date().toISOString(),
        strategy: strategy,
        backup: backup,
        results: {
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          errors: []
        }
      };
      
      this.activeImports.set(importId, importOperation);

      // Validate import data first
      const validation = await this.validateImportFile(importData);
      if (!validation.valid || !validation.importCompatible) {
        throw new Error(`Import validation failed: ${validation.errors.join(', ')}`);
      }

      // Process each entity type
      const entityResults = {};
      
      for (const [entityType, entityData] of Object.entries(importData.data || {})) {
        if (!Array.isArray(entityData)) continue;

        try {
          console.log(`Importing ${entityData.length} ${entityType} records...`);
          
          const entityResult = await this._importEntityType(
            entityType, 
            entityData, 
            strategy, 
            options
          );
          
          entityResults[entityType] = entityResult;
          
          // Update operation results
          importOperation.results.processed += entityResult.processed;
          importOperation.results.successful += entityResult.successful;
          importOperation.results.failed += entityResult.failed;
          importOperation.results.skipped += entityResult.skipped;
          importOperation.results.errors.push(...entityResult.errors);
          
          console.log(`Completed ${entityType}: ${entityResult.successful} successful, ${entityResult.failed} failed`);
        } catch (error) {
          console.error(`Failed to import ${entityType}:`, error);
          entityResults[entityType] = {
            processed: entityData.length,
            successful: 0,
            failed: entityData.length,
            skipped: 0,
            errors: [error.message]
          };
          importOperation.results.errors.push(`${entityType}: ${error.message}`);
        }
      }

      // Update import operation status
      importOperation.status = this.IMPORT_STATUS.COMPLETED;
      importOperation.endTime = new Date().toISOString();
      importOperation.entityResults = entityResults;

      console.log(`Import operation ${importId} completed successfully`);
      
      return {
        importId: importId,
        status: this.IMPORT_STATUS.COMPLETED,
        summary: importOperation.results,
        entityResults: entityResults,
        canRollback: true
      };
      
    } catch (error) {
      console.error(`Import operation ${importId} failed:`, error);
      
      // Update operation status
      const importOperation = this.activeImports.get(importId);
      if (importOperation) {
        importOperation.status = this.IMPORT_STATUS.FAILED;
        importOperation.endTime = new Date().toISOString();
        importOperation.error = error.message;
      }
      
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Resolve conflicts with user-provided resolutions
   * @param {Array} conflicts - Array of conflicts to resolve
   * @param {Object} resolutions - User resolutions for conflicts
   * @returns {Promise<Object>} Resolution result
   */
  static async resolveConflicts(conflicts, resolutions) {
    try {
      const resolvedConflicts = [];
      const unresolvedConflicts = [];

      for (const conflict of conflicts) {
        const resolution = resolutions[conflict.id];
        
        if (resolution) {
          try {
            await this._applyConflictResolution(conflict, resolution);
            resolvedConflicts.push({
              ...conflict,
              resolution: resolution,
              resolved: true
            });
          } catch (error) {
            unresolvedConflicts.push({
              ...conflict,
              error: error.message
            });
          }
        } else {
          unresolvedConflicts.push(conflict);
        }
      }

      return {
        resolved: resolvedConflicts.length,
        unresolved: unresolvedConflicts.length,
        resolvedConflicts,
        unresolvedConflicts
      };
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      throw new Error(`Conflict resolution failed: ${error.message}`);
    }
  }

  /**
   * Rollback a completed import operation
   * @param {string} importId - Import operation ID
   * @returns {Promise<Object>} Rollback result
   */
  static async rollbackImport(importId) {
    try {
      const importOperation = this.activeImports.get(importId);
      
      if (!importOperation) {
        throw new Error(`Import operation ${importId} not found`);
      }

      if (importOperation.status !== this.IMPORT_STATUS.COMPLETED) {
        throw new Error(`Cannot rollback import ${importId}: status is ${importOperation.status}`);
      }

      console.log(`Starting rollback for import operation ${importId}`);

      // Restore from backup
      await this._restoreFromBackup(importOperation.backup);

      // Update operation status
      importOperation.status = this.IMPORT_STATUS.ROLLED_BACK;
      importOperation.rollbackTime = new Date().toISOString();

      console.log(`Rollback completed for import operation ${importId}`);

      return {
        importId: importId,
        status: this.IMPORT_STATUS.ROLLED_BACK,
        rollbackTime: importOperation.rollbackTime
      };
    } catch (error) {
      console.error(`Rollback failed for import ${importId}:`, error);
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  /**
   * Get import operation history
   * @returns {Array} List of import operations
   */
  static getImportHistory() {
    return Array.from(this.activeImports.values())
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  /**
   * Clean up old import operations
   * @param {number} maxAge - Maximum age in milliseconds
   */
  static cleanupOldImports(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoffTime = Date.now() - maxAge;
    
    for (const [importId, operation] of this.activeImports.entries()) {
      const operationTime = new Date(operation.startTime).getTime();
      if (operationTime < cutoffTime) {
        this.activeImports.delete(importId);
      }
    }
  }

  // Private helper methods

  /**
   * Read file content as text
   * @private
   */
  static async _readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Validate import compatibility
   * @private
   */
  static _validateImportCompatibility(importData) {
    const errors = [];
    const warnings = [];

    // Check version compatibility
    if (importData.metadata?.version) {
      const importVersion = importData.metadata.version;
      const currentVersion = DataExportService.EXPORT_VERSION;
      
      if (importVersion !== currentVersion) {
        warnings.push(`Version mismatch: import is ${importVersion}, current is ${currentVersion}`);
      }
    }

    // Check for unknown entity types
    if (importData.data) {
      const unknownEntities = Object.keys(importData.data)
        .filter(entityType => !DataExportService.ENTITY_TYPES.includes(entityType));
      
      if (unknownEntities.length > 0) {
        warnings.push(`Unknown entity types will be skipped: ${unknownEntities.join(', ')}`);
      }
    }

    return {
      compatible: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Analyze conflicts for a specific entity type
   * @private
   */
  static async _analyzeEntityConflicts(entityType, entityData, strategy) {
    const conflicts = [];
    const changes = { new: 0, updated: 0, skipped: 0 };

    try {
      // Get existing data
      const existingData = await this._getExistingEntityData(entityType);
      const existingIds = new Set(existingData.map(item => item.id));

      for (const importRecord of entityData) {
        if (!importRecord.id) {
          conflicts.push({
            id: `${entityType}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'missing_id',
            entityType: entityType,
            record: importRecord,
            message: 'Record missing required ID field'
          });
          continue;
        }

        if (existingIds.has(importRecord.id)) {
          // Record exists - check for conflicts
          const existingRecord = existingData.find(item => item.id === importRecord.id);
          const hasChanges = this._recordsAreDifferent(existingRecord, importRecord);

          if (hasChanges) {
            if (strategy === this.MERGE_STRATEGIES.PROMPT) {
              conflicts.push({
                id: `${entityType}_${importRecord.id}`,
                type: 'update_conflict',
                entityType: entityType,
                existingRecord: existingRecord,
                importRecord: importRecord,
                message: `Record ${importRecord.id} exists with different data`
              });
            } else {
              changes.updated++;
            }
          } else {
            changes.skipped++;
          }
        } else {
          // New record
          changes.new++;
        }
      }
    } catch (error) {
      console.warn(`Failed to analyze conflicts for ${entityType}:`, error);
    }

    return { conflicts, changes };
  }

  /**
   * Import data for a specific entity type
   * @private
   */
  static async _importEntityType(entityType, entityData, strategy, options) {
    const result = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const entityClient = this._getEntityClient(entityType);
    if (!entityClient) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    for (const record of entityData) {
      result.processed++;

      try {
        if (!record.id) {
          result.errors.push(`${entityType}: Record missing ID`);
          result.failed++;
          continue;
        }

        // Check if record exists
        const existingRecord = await this._getExistingRecord(entityType, record.id);

        if (existingRecord) {
          // Handle existing record based on strategy
          switch (strategy) {
            case this.MERGE_STRATEGIES.REPLACE:
              await entityClient.update(record.id, record);
              result.successful++;
              break;
              
            case this.MERGE_STRATEGIES.MERGE:
              const mergedRecord = { ...existingRecord, ...record };
              await entityClient.update(record.id, mergedRecord);
              result.successful++;
              break;
              
            case this.MERGE_STRATEGIES.SKIP:
              result.skipped++;
              break;
              
            default:
              result.skipped++;
              break;
          }
        } else {
          // Create new record
          await entityClient.create(record);
          result.successful++;
        }
      } catch (error) {
        result.errors.push(`${entityType}[${record.id}]: ${error.message}`);
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Get entity client for CRUD operations
   * @private
   */
  static _getEntityClient(entityType) {
    const entityMap = {
      'tasks': localClient.entities.Task,
      'projects': localClient.entities.Project,
      'team_members': localClient.entities.TeamMember,
      'duties': localClient.entities.Duty,
      'calendar_events': localClient.entities.CalendarEvent,
      'one_on_ones': localClient.entities.OneOnOne,
      'stakeholders': localClient.entities.Stakeholder,
      'meetings': localClient.entities.Meeting,
      'notifications': localClient.entities.Notification,
      'reminders': localClient.entities.Reminder,
      'comments': localClient.entities.Comment,
      'out_of_office': localClient.entities.OutOfOffice,
      'peers': localClient.entities.Peer,
      'duty_rotations': localClient.entities.DutyRotation,
      'agenda_items': localClient.entities.AgendaItem,
      'personal_file_items': localClient.entities.PersonalFileItem,
      'employee_goals': localClient.entities.EmployeeGoal
    };

    return entityMap[entityType];
  }

  /**
   * Get existing data for entity type
   * @private
   */
  static async _getExistingEntityData(entityType) {
    const entityClient = this._getEntityClient(entityType);
    if (!entityClient) return [];
    
    try {
      return await entityClient.list();
    } catch (error) {
      console.warn(`Failed to get existing data for ${entityType}:`, error);
      return [];
    }
  }

  /**
   * Get existing record by ID
   * @private
   */
  static async _getExistingRecord(entityType, recordId) {
    const entityClient = this._getEntityClient(entityType);
    if (!entityClient) return null;
    
    try {
      if (entityClient.get) {
        return await entityClient.get(recordId);
      } else {
        const allRecords = await entityClient.list();
        return allRecords.find(record => record.id === recordId) || null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if two records are different
   * @private
   */
  static _recordsAreDifferent(record1, record2) {
    // Simple comparison - could be enhanced for deep comparison
    const json1 = JSON.stringify(record1, Object.keys(record1).sort());
    const json2 = JSON.stringify(record2, Object.keys(record2).sort());
    return json1 !== json2;
  }

  /**
   * Create backup of current data
   * @private
   */
  static async _createBackup() {
    try {
      const backup = await DataExportService.exportAll();
      const backupId = this._generateImportId();
      
      // Store backup in sessionStorage for rollback
      sessionStorage.setItem(`import_backup_${backupId}`, JSON.stringify(backup));
      
      return {
        id: backupId,
        timestamp: new Date().toISOString(),
        records: backup.metadata.totalRecords
      };
    } catch (error) {
      console.warn('Failed to create backup:', error);
      return null;
    }
  }

  /**
   * Restore from backup
   * @private
   */
  static async _restoreFromBackup(backup) {
    if (!backup || !backup.id) {
      throw new Error('Invalid backup information');
    }

    const backupData = sessionStorage.getItem(`import_backup_${backup.id}`);
    if (!backupData) {
      throw new Error('Backup data not found');
    }

    const parsedBackup = JSON.parse(backupData);
    
    // Clear current data and restore backup
    for (const [entityType, entityData] of Object.entries(parsedBackup.data)) {
      if (!Array.isArray(entityData)) continue;
      
      try {
        // Clear existing data
        const storageKey = this._getStorageKey(entityType);
        localStorage.setItem(storageKey, JSON.stringify(entityData));
      } catch (error) {
        console.warn(`Failed to restore ${entityType}:`, error);
      }
    }

    // Clean up backup
    sessionStorage.removeItem(`import_backup_${backup.id}`);
  }

  /**
   * Get localStorage key for entity type
   * @private
   */
  static _getStorageKey(entityType) {
    // Map entity types to localStorage keys
    const keyMap = {
      'tasks': 'tasks',
      'projects': 'projects',
      'team_members': 'team_members',
      'duties': 'duties',
      'calendar_events': 'calendar_events',
      'one_on_ones': 'one_on_ones',
      'stakeholders': 'stakeholders',
      'meetings': 'meetings',
      'notifications': 'notifications',
      'reminders': 'reminders',
      'comments': 'comments',
      'out_of_office': 'out_of_office',
      'peers': 'peers',
      'duty_rotations': 'duty_rotations',
      'agenda_items': 'agenda_items',
      'personal_file_items': 'personal_file_items',
      'employee_goals': 'employee_goals'
    };

    return keyMap[entityType] || entityType;
  }

  /**
   * Apply conflict resolution
   * @private
   */
  static async _applyConflictResolution(conflict, resolution) {
    const entityClient = this._getEntityClient(conflict.entityType);
    if (!entityClient) {
      throw new Error(`Unknown entity type: ${conflict.entityType}`);
    }

    switch (resolution.action) {
      case 'use_import':
        await entityClient.update(conflict.importRecord.id, conflict.importRecord);
        break;
        
      case 'use_existing':
        // Do nothing - keep existing record
        break;
        
      case 'merge':
        const mergedRecord = { ...conflict.existingRecord, ...resolution.mergedData };
        await entityClient.update(conflict.importRecord.id, mergedRecord);
        break;
        
      default:
        throw new Error(`Unknown resolution action: ${resolution.action}`);
    }
  }

  /**
   * Generate unique import ID
   * @private
   */
  static _generateImportId() {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default DataImportService;
