// src/services/dataExportService.js
// Data Export Service for P&E Team Management Application

import { localClient } from '../api/localClient.js';

/**
 * Service for exporting local storage data to standardized JSON format
 */
export class DataExportService {
  // Current export format version
  static EXPORT_VERSION = '1.0.0';
  
  // All available entity types for export
  static ENTITY_TYPES = [
    'tasks',
    'projects', 
    'team_members',
    'duties',
    'calendar_events',
    'one_on_ones',
    'stakeholders',
    'meetings',
    'notifications',
    'reminders',
    'comments',
    'out_of_office',
    'peers',
    'duty_rotations',
    'agenda_items',
    'personal_file_items',
    'employee_goals'
  ];

  /**
   * Export all data from local storage
   * @param {Object} options - Export options
   * @param {boolean} options.includeMetadata - Include metadata in export
   * @param {boolean} options.compress - Compress the export data
   * @param {string} options.filename - Custom filename for export
   * @returns {Promise<Object>} Export data object
   */
  static async exportAll(options = {}) {
    try {
      console.log('Starting full data export...');
      
      const exportData = await this.exportSelective(this.ENTITY_TYPES, options);
      
      console.log(`Full export completed: ${exportData.metadata.totalRecords} records`);
      return exportData;
    } catch (error) {
      console.error('Error during full export:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Export selected entity types from local storage
   * @param {Array<string>} entityTypes - Array of entity types to export
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export data object
   */
  static async exportSelective(entityTypes = [], options = {}) {
    try {
      console.log('Starting selective export for:', entityTypes);
      
      // Validate entity types
      const invalidTypes = entityTypes.filter(type => !this.ENTITY_TYPES.includes(type));
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid entity types: ${invalidTypes.join(', ')}`);
      }

      const exportData = {
        metadata: this._generateMetadata(entityTypes),
        data: {},
        relationships: {},
        checksum: null
      };

      let totalRecords = 0;

      // Export each entity type
      for (const entityType of entityTypes) {
        try {
          const entityData = await this._exportEntityType(entityType);
          exportData.data[entityType] = entityData;
          totalRecords += entityData.length;
          
          console.log(`Exported ${entityData.length} ${entityType} records`);
        } catch (error) {
          console.warn(`Failed to export ${entityType}:`, error);
          exportData.data[entityType] = [];
        }
      }

      // Update metadata with actual counts
      exportData.metadata.totalRecords = totalRecords;
      exportData.metadata.entities = entityTypes;

      // Generate relationships mapping
      exportData.relationships = this._generateRelationships(exportData.data);

      // Generate checksum for data integrity
      exportData.checksum = await this._generateChecksum(exportData.data);

      // Apply data sanitization if requested
      if (options.sanitize) {
        exportData.data = this._sanitizeExportData(exportData.data);
      }

      // Compress data if requested
      if (options.compress) {
        exportData.compressed = true;
        exportData.data = this._compressData(exportData.data);
      }

      console.log(`Selective export completed: ${totalRecords} total records`);
      return exportData;
    } catch (error) {
      console.error('Error during selective export:', error);
      throw new Error(`Selective export failed: ${error.message}`);
    }
  }

  /**
   * Generate and download export file
   * @param {Object} exportData - Export data object
   * @param {string} filename - Optional custom filename
   */
  static async generateExportFile(exportData, filename = null) {
    try {
      const defaultFilename = `pe-team-data-export-${new Date().toISOString().split('T')[0]}.json`;
      const exportFilename = filename || defaultFilename;

      // Convert to JSON string with formatting
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = exportFilename;
      downloadLink.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up URL
      URL.revokeObjectURL(url);
      
      console.log(`Export file generated: ${exportFilename}`);
      return {
        filename: exportFilename,
        size: blob.size,
        records: exportData.metadata.totalRecords
      };
    } catch (error) {
      console.error('Error generating export file:', error);
      throw new Error(`Failed to generate export file: ${error.message}`);
    }
  }

  /**
   * Validate export data structure and integrity
   * @param {Object} exportData - Export data to validate
   * @returns {Object} Validation result
   */
  static validateExportData(exportData) {
    const errors = [];
    const warnings = [];

    try {
      // Check required structure
      if (!exportData.metadata) {
        errors.push('Missing metadata section');
      }
      if (!exportData.data) {
        errors.push('Missing data section');
      }

      // Validate metadata
      if (exportData.metadata) {
        if (!exportData.metadata.exportDate) {
          errors.push('Missing export date in metadata');
        }
        if (!exportData.metadata.version) {
          errors.push('Missing version in metadata');
        }
        if (!Array.isArray(exportData.metadata.entities)) {
          errors.push('Invalid entities list in metadata');
        }
      }

      // Validate data structure
      if (exportData.data) {
        for (const [entityType, entityData] of Object.entries(exportData.data)) {
          if (!Array.isArray(entityData)) {
            errors.push(`Invalid data format for ${entityType}: expected array`);
          } else {
            // Check for required fields in each entity
            const validationResult = this._validateEntityData(entityType, entityData);
            errors.push(...validationResult.errors);
            warnings.push(...validationResult.warnings);
          }
        }
      }

      // Validate checksum if present
      if (exportData.checksum && exportData.data) {
        const calculatedChecksum = this._generateChecksum(exportData.data);
        if (calculatedChecksum !== exportData.checksum) {
          errors.push('Checksum validation failed - data may be corrupted');
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        summary: {
          totalEntities: exportData.metadata?.entities?.length || 0,
          totalRecords: exportData.metadata?.totalRecords || 0,
          hasChecksum: !!exportData.checksum
        }
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        summary: {}
      };
    }
  }

  /**
   * Get export statistics and preview
   * @param {Array<string>} entityTypes - Entity types to analyze
   * @returns {Promise<Object>} Export statistics
   */
  static async getExportPreview(entityTypes = this.ENTITY_TYPES) {
    try {
      const preview = {
        entities: {},
        totalRecords: 0,
        estimatedSize: 0,
        relationships: {}
      };

      for (const entityType of entityTypes) {
        try {
          const entityData = await this._exportEntityType(entityType);
          const entityStats = {
            count: entityData.length,
            sampleRecord: entityData[0] || null,
            fields: entityData.length > 0 ? Object.keys(entityData[0]) : [],
            estimatedSize: JSON.stringify(entityData).length
          };
          
          preview.entities[entityType] = entityStats;
          preview.totalRecords += entityStats.count;
          preview.estimatedSize += entityStats.estimatedSize;
        } catch (error) {
          console.warn(`Failed to preview ${entityType}:`, error);
          preview.entities[entityType] = {
            count: 0,
            error: error.message,
            estimatedSize: 0
          };
        }
      }

      // Analyze relationships
      preview.relationships = this._analyzeRelationships(preview.entities);

      return preview;
    } catch (error) {
      console.error('Error generating export preview:', error);
      throw new Error(`Failed to generate export preview: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Generate metadata for export
   * @private
   */
  static _generateMetadata(entityTypes) {
    return {
      exportDate: new Date().toISOString(),
      version: this.EXPORT_VERSION,
      source: 'P&E Team Management',
      totalRecords: 0, // Will be updated after export
      entities: entityTypes,
      exportedBy: 'local-user', // Could be enhanced with actual user info
      format: 'json',
      compressed: false
    };
  }

  /**
   * Export data for a specific entity type
   * @private
   */
  static async _exportEntityType(entityType) {
    const entityMap = {
      'tasks': () => localClient.entities.Task.list(),
      'projects': () => localClient.entities.Project.list(),
      'team_members': () => localClient.entities.TeamMember.list(),
      'duties': () => localClient.entities.Duty.list(),
      'calendar_events': () => localClient.entities.CalendarEvent.list(),
      'one_on_ones': () => localClient.entities.OneOnOne.list(),
      'stakeholders': () => localClient.entities.Stakeholder.list(),
      'meetings': () => localClient.entities.Meeting.list(),
      'notifications': () => localClient.entities.Notification.list(),
      'reminders': () => localClient.entities.Reminder.list(),
      'comments': () => localClient.entities.Comment.list(),
      'out_of_office': () => localClient.entities.OutOfOffice.list(),
      'peers': () => localClient.entities.Peer.list(),
      'duty_rotations': () => localClient.entities.DutyRotation.list(),
      'agenda_items': () => localClient.entities.AgendaItem.list(),
      'personal_file_items': () => localClient.entities.PersonalFileItem.list(),
      'employee_goals': () => localClient.entities.EmployeeGoal.list()
    };

    const exportFunction = entityMap[entityType];
    if (!exportFunction) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    return await exportFunction();
  }

  /**
   * Generate relationships mapping between entities
   * @private
   */
  static _generateRelationships(data) {
    const relationships = {};

    // Task-Project relationships
    if (data.tasks && data.projects) {
      relationships.task_project_mappings = data.tasks
        .filter(task => task.project_id)
        .map(task => ({
          task_id: task.id,
          project_id: task.project_id
        }));
    }

    // Duty-Calendar Event relationships
    if (data.duties && data.calendar_events) {
      relationships.duty_calendar_mappings = data.calendar_events
        .filter(event => event.duty_id)
        .map(event => ({
          duty_id: event.duty_id,
          calendar_event_id: event.id
        }));
    }

    // Team Member relationships
    if (data.team_members) {
      relationships.team_member_relationships = {
        duty_assignments: data.duties?.filter(d => d.team_member_id).map(d => ({
          team_member_id: d.team_member_id,
          duty_id: d.id
        })) || [],
        one_on_one_participants: data.one_on_ones?.filter(o => o.team_member_id).map(o => ({
          team_member_id: o.team_member_id,
          one_on_one_id: o.id
        })) || []
      };
    }

    return relationships;
  }

  /**
   * Generate checksum for data integrity
   * @private
   */
  static _generateChecksum(data) {
    // Simple checksum using JSON string hash
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Sanitize export data for privacy
   * @private
   */
  static _sanitizeExportData(data) {
    // Create deep copy to avoid modifying original data
    const sanitizedData = JSON.parse(JSON.stringify(data));

    // Remove sensitive fields if needed
    const sensitiveFields = ['password', 'token', 'secret'];
    
    for (const [entityType, entityData] of Object.entries(sanitizedData)) {
      if (Array.isArray(entityData)) {
        entityData.forEach(record => {
          sensitiveFields.forEach(field => {
            if (record[field]) {
              record[field] = '[REDACTED]';
            }
          });
        });
      }
    }

    return sanitizedData;
  }

  /**
   * Compress export data
   * @private
   */
  static _compressData(data) {
    // Simple compression by removing unnecessary whitespace
    // In a real implementation, you might use a compression library
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Validate entity data structure
   * @private
   */
  static _validateEntityData(entityType, entityData) {
    const errors = [];
    const warnings = [];

    // Define required fields for each entity type
    const requiredFields = {
      'tasks': ['id', 'title'],
      'projects': ['id', 'name'],
      'team_members': ['id', 'name'],
      'duties': ['id', 'team_member_id', 'type', 'title', 'start_date', 'end_date'],
      'calendar_events': ['id', 'title', 'start_date'],
      'one_on_ones': ['id', 'team_member_id'],
      // Add more as needed
    };

    const required = requiredFields[entityType] || ['id'];

    entityData.forEach((record, index) => {
      required.forEach(field => {
        if (!record[field]) {
          errors.push(`${entityType}[${index}]: Missing required field '${field}'`);
        }
      });

      // Check for valid ID format
      if (record.id && typeof record.id !== 'string') {
        warnings.push(`${entityType}[${index}]: ID should be a string`);
      }
    });

    return { errors, warnings };
  }

  /**
   * Analyze relationships between entities
   * @private
   */
  static _analyzeRelationships(entities) {
    const relationships = {};

    // Analyze common relationship patterns
    if (entities.tasks && entities.projects) {
      relationships.tasks_with_projects = entities.tasks.count > 0 ? 'Available' : 'None';
    }

    if (entities.duties && entities.team_members) {
      relationships.duty_assignments = entities.duties.count > 0 ? 'Available' : 'None';
    }

    return relationships;
  }
}

export default DataExportService;
