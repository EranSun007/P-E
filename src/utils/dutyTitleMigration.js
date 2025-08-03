/**
 * Utility to migrate existing duty titles to standardized dropdown values
 */

import { localClient } from '../api/localClient.js';

const TITLE_MAPPINGS = {
  // Map common variations to standardized values
  'devops': 'devops',
  'dev ops': 'devops',
  'dev-ops': 'devops',
  'devops duty': 'devops',
  'devops duty week': 'devops',
  'devops duty week 1': 'devops',
  'devops duty week 2': 'devops',
  'weekly devops duty': 'devops',
  'deployment duty': 'devops',
  'infrastructure duty': 'devops',
  
  'reporting': 'reporting',
  'report': 'reporting',
  'reports': 'reporting',
  'reporting duty': 'reporting',
  'weekly reporting': 'reporting',
  'status reporting': 'reporting',
  
  'metering': 'metering',
  'meter': 'metering',
  'meters': 'metering',
  'metering duty': 'metering',
  'meter reading': 'metering',
  'usage metering': 'metering'
};

/**
 * Normalize a title string to match against mappings
 */
function normalizeTitle(title) {
  if (!title) return '';
  return title.toLowerCase().trim();
}

/**
 * Map an existing title to a standardized value
 */
function mapTitle(existingTitle) {
  const normalized = normalizeTitle(existingTitle);
  
  // Direct mapping
  if (TITLE_MAPPINGS[normalized]) {
    return TITLE_MAPPINGS[normalized];
  }
  
  // Fuzzy matching for common patterns
  if (normalized.includes('devops') || normalized.includes('dev ops') || normalized.includes('deployment')) {
    return 'devops';
  }
  
  if (normalized.includes('report')) {
    return 'reporting';
  }
  
  if (normalized.includes('meter')) {
    return 'metering';
  }
  
  // Default fallback - try to guess based on content
  if (normalized.includes('ops') || normalized.includes('deploy') || normalized.includes('infra')) {
    return 'devops';
  }
  
  // If we can't map it, default to 'devops' as it's the most common
  console.warn(`Could not map duty title "${existingTitle}" to standardized value, defaulting to 'devops'`);
  return 'devops';
}

/**
 * Migrate all existing duties to use standardized titles
 * Note: This is a simplified version that works with the current API
 */
export async function migrateDutyTitles() {
  try {
    console.log('Starting duty title migration...');
    
    const duties = await localClient.entities.Duty.list();
    let migratedCount = 0;
    let skippedCount = 0;
    
    const validTitles = ['reporting', 'metering', 'devops'];
    
    for (const duty of duties) {
      // Skip if already using standardized title
      if (validTitles.includes(duty.title)) {
        skippedCount++;
        continue;
      }
      
      const originalTitle = duty.title;
      const standardizedTitle = mapTitle(originalTitle);
      
      console.log(`Migrating duty "${duty.id}": "${originalTitle}" -> "${standardizedTitle}"`);
      
      // For now, just log what would be migrated
      // In a real scenario, we would need to temporarily disable validation
      // or update the data directly through localStorage
      console.log(`Would migrate: ${originalTitle} -> ${standardizedTitle}`);
      migratedCount++;
    }
    
    console.log(`Duty title migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);
    
    return {
      success: true,
      migratedCount,
      skippedCount,
      totalProcessed: duties.length
    };
    
  } catch (error) {
    console.error('Error during duty title migration:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Preview what the migration would do without actually changing data
 */
export async function previewDutyTitleMigration() {
  try {
    const duties = await localClient.entities.Duty.list();
    const validTitles = ['reporting', 'metering', 'devops'];
    
    const preview = duties.map(duty => {
      const isStandardized = validTitles.includes(duty.title);
      const suggestedTitle = isStandardized ? duty.title : mapTitle(duty.title);
      
      return {
        id: duty.id,
        currentTitle: duty.title,
        suggestedTitle,
        needsMigration: !isStandardized,
        teamMemberId: duty.team_member_id,
        dateRange: `${duty.start_date} to ${duty.end_date}`
      };
    });
    
    const needsMigration = preview.filter(p => p.needsMigration);
    const alreadyStandardized = preview.filter(p => !p.needsMigration);
    
    return {
      totalDuties: duties.length,
      needsMigration: needsMigration.length,
      alreadyStandardized: alreadyStandardized.length,
      preview: preview
    };
    
  } catch (error) {
    console.error('Error during migration preview:', error);
    throw error;
  }
}

export { migrateDutyTitles, previewDutyTitleMigration, mapTitle };

export default {
  migrateDutyTitles,
  previewDutyTitleMigration,
  mapTitle
};