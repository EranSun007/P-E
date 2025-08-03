/**
 * Script to run duty title migration
 * This can be run manually or integrated into the application startup
 */

import { migrateDutyTitles, previewDutyTitleMigration } from './dutyTitleMigration.js';

async function runMigration() {
  console.log('=== Duty Title Migration ===');
  
  try {
    // First, preview what will be changed
    console.log('\n1. Previewing migration...');
    const preview = await previewDutyTitleMigration();
    
    console.log(`Total duties: ${preview.totalDuties}`);
    console.log(`Need migration: ${preview.needsMigration}`);
    console.log(`Already standardized: ${preview.alreadyStandardized}`);
    
    if (preview.needsMigration > 0) {
      console.log('\nDuties that will be migrated:');
      preview.preview
        .filter(p => p.needsMigration)
        .forEach(duty => {
          console.log(`  - "${duty.currentTitle}" -> "${duty.suggestedTitle}" (${duty.dateRange})`);
        });
      
      // Run the actual migration
      console.log('\n2. Running migration...');
      const result = await migrateDutyTitles();
      
      if (result.success) {
        console.log(`✅ Migration completed successfully!`);
        console.log(`   - ${result.migratedCount} duties migrated`);
        console.log(`   - ${result.skippedCount} duties already standardized`);
      } else {
        console.error(`❌ Migration failed: ${result.error}`);
      }
    } else {
      console.log('✅ No migration needed - all duties already use standardized titles');
    }
    
  } catch (error) {
    console.error('❌ Migration script failed:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { runMigration };