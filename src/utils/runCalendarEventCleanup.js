// src/utils/runCalendarEventCleanup.js
// Utility script to run calendar event deduplication cleanup

import { CalendarEventDeduplicationService } from '../services/calendarEventDeduplicationService.js';

/**
 * Run calendar event cleanup with command line options
 */
async function runCleanup() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const fix = args.includes('--fix') || args.includes('-f');
  const stats = args.includes('--stats') || args.includes('-s');

  try {
    if (stats) {
      console.log('📊 Getting cleanup statistics...\n');
      const statistics = await CalendarEventDeduplicationService.getCleanupStatistics();
      
      console.log('CLEANUP STATISTICS');
      console.log('==================');
      console.log(`Duplicates found: ${statistics.duplicatesFound}`);
      console.log(`Consistency issues: ${statistics.consistencyIssues}`);
      console.log(`Would resolve: ${statistics.wouldResolve} issues`);
      console.log(`Timestamp: ${statistics.timestamp}`);
      
      if (Object.keys(statistics.issuesByType).length > 0) {
        console.log('\nIssues by type:');
        Object.entries(statistics.issuesByType).forEach(([type, issues]) => {
          console.log(`  ${type}: ${issues.length}`);
        });
      }
      
      return;
    }

    console.log('🧹 Calendar Event Deduplication Cleanup');
    console.log('========================================\n');

    // Run the main cleanup
    const result = await CalendarEventDeduplicationService.runCleanup({
      dryRun,
      verbose: true
    });

    // If fix flag is provided and there are consistency issues, attempt to fix them
    if (fix && result.consistency.totalIssues > 0 && !dryRun) {
      console.log('\n🔧 Attempting to fix consistency issues...');
      
      const fixResult = await CalendarEventDeduplicationService.fixConsistencyIssues(
        result.consistency.details,
        { dryRun: false, verbose: true }
      );
      
      console.log('\nFIX RESULTS:');
      console.log(`Fixed: ${fixResult.fixed.length}`);
      console.log(`Failed: ${fixResult.failed.length}`);
      console.log(`Skipped: ${fixResult.skipped.length}`);
      
      if (fixResult.failed.length > 0) {
        console.log('\nFailed fixes:');
        fixResult.failed.forEach((failure, index) => {
          console.log(`  ${index + 1}. ${failure.type}: ${failure.error}`);
        });
      }
    }

    // Provide recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (result.deduplication.duplicatesFound > 0) {
      if (dryRun) {
        console.log('  • Run without --dry-run to remove duplicate events');
      } else {
        console.log('  ✅ Duplicate events have been cleaned up');
      }
    }
    
    if (result.consistency.totalIssues > 0) {
      console.log('  • Review consistency issues and consider running with --fix flag');
      console.log('  • Some issues may require manual intervention');
    }
    
    if (result.deduplication.duplicatesFound === 0 && result.consistency.totalIssues === 0) {
      console.log('  ✅ No issues found - your calendar events are clean!');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log('Calendar Event Deduplication Cleanup Utility');
  console.log('============================================\n');
  console.log('Usage: node runCalendarEventCleanup.js [options]\n');
  console.log('Options:');
  console.log('  --dry-run, -d    Perform dry run (show what would be cleaned up)');
  console.log('  --verbose, -v    Enable verbose logging');
  console.log('  --fix, -f        Attempt to fix consistency issues');
  console.log('  --stats, -s      Show cleanup statistics only');
  console.log('  --help, -h       Show this help message\n');
  console.log('Examples:');
  console.log('  node runCalendarEventCleanup.js --dry-run --verbose');
  console.log('  node runCalendarEventCleanup.js --fix');
  console.log('  node runCalendarEventCleanup.js --stats');
}

// Handle command line execution
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printUsage();
} else {
  runCleanup().catch(console.error);
}

export { runCleanup, printUsage };