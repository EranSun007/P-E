// src/utils/oneOnOneScheduleMigration.js
// Migration utilities for OneOnOne schedule feature

import { localClient } from '../api/localClient.js';

/**
 * Migration utility to add schedule-related fields to existing OneOnOne records
 * This is safe to run multiple times - it only updates records missing the new fields
 */
export async function migrateOneOnOneScheduleFields() {
  try {
    console.log('Starting OneOnOne schedule fields migration...');

    const oneOnOnes = await localClient.entities.OneOnOne.list();
    let updatedCount = 0;
    let skippedCount = 0;

    for (const oneOnOne of oneOnOnes) {
      // Check if migration is needed
      const needsMigration =
        oneOnOne.schedule_id === undefined ||
        oneOnOne.is_recurring === undefined ||
        oneOnOne.recurrence_instance === undefined;

      if (needsMigration) {
        await localClient.entities.OneOnOne.update(oneOnOne.id, {
          schedule_id: oneOnOne.schedule_id || null,
          is_recurring: oneOnOne.is_recurring || false,
          recurrence_instance: oneOnOne.recurrence_instance || null
        });
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`Migration complete: ${updatedCount} records updated, ${skippedCount} already migrated`);

    return {
      success: true,
      updated: updatedCount,
      skipped: skippedCount,
      total: oneOnOnes.length
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initialize the one_on_one_schedules localStorage key if it doesn't exist
 */
export function initializeSchedulesStorage() {
  const key = 'one_on_one_schedules';
  const existing = localStorage.getItem(key);

  if (!existing) {
    console.log('Initializing one_on_one_schedules storage...');
    localStorage.setItem(key, JSON.stringify([]));
    return { initialized: true };
  }

  return { initialized: false, message: 'Storage already exists' };
}

/**
 * Validate all existing schedules for data integrity
 */
export async function validateSchedules() {
  try {
    const schedules = await localClient.entities.OneOnOneSchedule.list();
    const issues = [];

    for (const schedule of schedules) {
      // Check for required fields
      if (!schedule.team_member_id) {
        issues.push({ schedule: schedule.id, issue: 'Missing team_member_id' });
      }
      if (!schedule.frequency) {
        issues.push({ schedule: schedule.id, issue: 'Missing frequency' });
      }
      if (schedule.day_of_week === undefined || schedule.day_of_week === null) {
        issues.push({ schedule: schedule.id, issue: 'Missing day_of_week' });
      }
      if (!schedule.time) {
        issues.push({ schedule: schedule.id, issue: 'Missing time' });
      }
      if (!schedule.duration_minutes) {
        issues.push({ schedule: schedule.id, issue: 'Missing duration_minutes' });
      }

      // Verify team member exists
      const teamMembers = await localClient.entities.TeamMember.list();
      const memberExists = teamMembers.some(tm => tm.id === schedule.team_member_id);
      if (!memberExists) {
        issues.push({
          schedule: schedule.id,
          issue: `Team member ${schedule.team_member_id} not found`
        });
      }
    }

    return {
      valid: issues.length === 0,
      scheduleCount: schedules.length,
      issues
    };
  } catch (error) {
    console.error('Validation failed:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Run all migrations in sequence
 */
export async function runAllMigrations() {
  console.log('Running all OneOnOne schedule migrations...');

  const results = {
    storage: initializeSchedulesStorage(),
    fieldMigration: await migrateOneOnOneScheduleFields(),
    validation: await validateSchedules()
  };

  console.log('All migrations complete:', results);
  return results;
}

export default {
  migrateOneOnOneScheduleFields,
  initializeSchedulesStorage,
  validateSchedules,
  runAllMigrations
};
