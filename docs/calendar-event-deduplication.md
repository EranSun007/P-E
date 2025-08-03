# Calendar Event Deduplication Cleanup

This document describes the calendar event deduplication cleanup functionality implemented to resolve duplicate calendar events and data consistency issues in the duty management system.

## Overview

The calendar event deduplication system addresses two main issues:

1. **Duplicate Calendar Events**: Multiple calendar events created for the same duty assignment
2. **Data Consistency Issues**: Mismatches between duties and their corresponding calendar events

## Components

### CalendarEventDeduplicationService

The main service class that provides comprehensive cleanup and validation functionality.

#### Key Methods

- `runCleanup(options)` - Performs complete cleanup with detailed reporting
- `getCleanupStatistics()` - Returns statistics about potential cleanup without making changes
- `fixConsistencyIssues(inconsistencies, options)` - Fixes specific data consistency issues

### CalendarEvent Entity Methods

Enhanced methods in the CalendarEvent entity:

- `cleanupDuplicateEvents()` - Removes duplicate calendar events for the same duty
- `validateDutyEventConsistency()` - Validates data consistency between duties and calendar events
- `createDutyEvent()` - Idempotent calendar event creation (prevents duplicates)

## Usage

### Command Line Utility

Use the command line utility for manual cleanup operations:

```bash
# Get cleanup statistics
node src/utils/runCalendarEventCleanup.js --stats

# Perform dry run (see what would be cleaned up)
node src/utils/runCalendarEventCleanup.js --dry-run --verbose

# Perform live cleanup
node src/utils/runCalendarEventCleanup.js --verbose

# Perform cleanup and fix consistency issues
node src/utils/runCalendarEventCleanup.js --fix --verbose
```

### Programmatic Usage

```javascript
import { CalendarEventDeduplicationService } from '../services/calendarEventDeduplicationService.js';

// Get statistics
const stats = await CalendarEventDeduplicationService.getCleanupStatistics();
console.log(`Found ${stats.duplicatesFound} duplicates and ${stats.consistencyIssues} consistency issues`);

// Perform cleanup
const result = await CalendarEventDeduplicationService.runCleanup({
  dryRun: false,
  verbose: true
});

// Fix consistency issues
if (result.consistency.totalIssues > 0) {
  const fixResult = await CalendarEventDeduplicationService.fixConsistencyIssues(
    result.consistency.details,
    { dryRun: false, verbose: true }
  );
  console.log(`Fixed ${fixResult.fixed.length} issues`);
}
```

## Cleanup Process

The cleanup process follows these steps:

1. **Identification**: Scan all calendar events to identify duplicates
2. **Deduplication**: Remove duplicate events, keeping the first occurrence
3. **Validation**: Check data consistency between duties and calendar events
4. **Reporting**: Generate detailed report of actions taken
5. **Audit Logging**: Log all cleanup operations for audit trail

## Types of Issues Detected

### Duplicate Events
- Multiple calendar events with the same `duty_id`
- Only the first event is kept, others are removed

### Consistency Issues
- **Orphaned Calendar Events**: Calendar events referencing non-existent duties
- **Missing Calendar Events**: Duties without corresponding calendar events
- **Multiple Calendar Events**: Duties with more than one calendar event

## Cleanup Results

The cleanup service provides detailed reporting:

```javascript
{
  timestamp: "2025-01-30T12:00:00.000Z",
  duration: "150ms",
  dryRun: false,
  deduplication: {
    duplicatesFound: 3,
    duplicateEvents: [...],
    success: true
  },
  consistency: {
    totalIssues: 2,
    issuesByType: {
      "orphaned_calendar_event": [...],
      "missing_calendar_event": [...]
    },
    details: [...]
  },
  summary: {
    duplicatesProcessed: 3,
    consistencyIssuesFound: 2,
    totalIssuesResolved: 3,
    status: "completed"
  }
}
```

## Safety Features

### Dry Run Mode
- Preview changes without making modifications
- Identify issues before performing cleanup
- Safe way to understand impact

### Idempotent Operations
- `createDutyEvent()` method prevents duplicate creation
- Safe to run cleanup multiple times
- No risk of data loss from repeated operations

### Audit Logging
- All cleanup operations are logged
- Includes user, timestamp, and operation details
- Supports compliance and troubleshooting

## Best Practices

1. **Always run dry run first** to understand the scope of changes
2. **Use verbose logging** to monitor cleanup progress
3. **Review consistency issues** before applying automatic fixes
4. **Run cleanup during maintenance windows** for large datasets
5. **Monitor audit logs** for cleanup operations

## Error Handling

The service includes comprehensive error handling:

- **Graceful degradation**: Continues processing even if individual operations fail
- **Detailed error reporting**: Specific error messages for troubleshooting
- **Rollback safety**: Operations are designed to be safe and reversible
- **Audit trail**: All errors are logged for investigation

## Integration

The cleanup functionality integrates with:

- **Duty Management System**: Validates duty-calendar event relationships
- **Audit Service**: Logs all cleanup operations
- **Calendar Event Generation**: Prevents future duplicates
- **Error Handling Service**: Provides retry logic for transient failures

## Monitoring

Key metrics to monitor:

- Number of duplicate events found
- Consistency issues detected
- Cleanup operation success rate
- Performance metrics (duration, throughput)
- Error rates and types

## Troubleshooting

Common issues and solutions:

### High Number of Duplicates
- Check duty creation workflows for duplicate event generation
- Review calendar event generation service logic
- Consider implementing additional validation

### Consistency Issues
- Orphaned events: Usually result from duty deletion without cleanup
- Missing events: May indicate calendar event generation failures
- Multiple events: Often caused by retry logic or concurrent operations

### Performance Issues
- Large datasets may require batched processing
- Consider running cleanup during off-peak hours
- Monitor memory usage for large cleanup operations