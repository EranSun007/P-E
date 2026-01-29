import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, checkConnection } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS = [
  {
    version: '001_initial_schema',
    name: 'Initial database schema',
    file: 'schema.sql'
  },
  {
    version: '002_work_items',
    name: 'Create work_items table for team member work tracking',
    file: '002_work_items.sql'
  },
  {
    version: '003_work_items_sprint',
    name: 'Add sprint_name column to work_items',
    file: '003_work_items_sprint.sql'
  },
  {
    version: '004_developer_goals',
    name: 'Create developer_goals table for annual objectives tracking',
    file: '004_developer_goals.sql'
  },
  {
    version: '005_performance_evaluations',
    name: 'Create performance_evaluations table for yearly reviews',
    file: '005_performance_evaluations.sql'
  },
  {
    version: '006_add_self_ratings',
    name: 'Add self-assessment ratings to performance evaluations',
    file: '006_add_self_ratings.sql'
  },
  {
    version: '007_one_on_ones_extended',
    name: 'Add extended fields to one_on_ones (mood, topics, next meeting, action items)',
    file: '007_one_on_ones_extended.sql'
  },
  {
    version: '008_team_members_department_notes',
    name: 'Add department and notes columns to team_members',
    file: '008_team_members_department_notes.sql'
  },
  {
    version: '009_stakeholder_enhancements',
    name: 'Add influence, engagement, department, group to stakeholders and stakeholder_id to projects',
    file: '009_stakeholder_enhancements.sql'
  },
  {
    version: '010_users_table',
    name: 'Create users table for authentication',
    file: '010_users_table.sql'
  },
  {
    version: '011_peers_table',
    name: 'Create peers table for external collaborators',
    file: '011_peers_table.sql'
  },
  {
    version: '012_global_task_attributes',
    name: 'Add global task attributes support (statuses, priorities, tags, types)',
    file: '012_global_task_attributes.sql'
  },
  {
    version: '013_devops_duties',
    name: 'Create devops_duties table for tracking DevOps duty periods',
    file: '013_devops_duties.sql'
  },
  {
    version: '014_duty_schedule',
    name: 'Create duty_schedule table for upcoming duty rotation assignments',
    file: '014_duty_schedule.sql'
  },
  {
    version: '015_time_off',
    name: 'Create time_off table for tracking team member absences',
    file: '015_time_off.sql'
  },
  {
    version: '016_github_integration',
    name: 'Create tables for GitHub repository tracking and user settings',
    file: '016_github_integration.sql'
  },
  {
    version: '017_jira_integration',
    name: 'Create tables for Jira issue tracking and team mappings',
    file: '017_jira_integration.sql'
  },
  {
    version: '018_capture_framework',
    name: 'Create tables for capture rules, inbox, and entity mappings',
    file: '018_capture_framework.sql'
  },
  {
    version: '019_bug_dashboard',
    name: 'Create tables for DevOps Bug Dashboard (bug uploads, bugs, weekly KPIs)',
    file: '019_bug_dashboard.sql'
  },
  {
    version: '020_notification_types',
    name: 'Add notification type and metadata for KPI alerts',
    file: '020_notification_types.sql'
  },
  {
    version: '021_email_notifications',
    name: 'Email notification queue for failure logging',
    file: '021_email_notifications.sql'
  },
  {
    version: '022_sync_items',
    name: 'Add sync item schema for TeamSync Integration',
    file: '022_sync_items.sql'
  },
  {
    version: '023_team_summaries',
    name: 'Create team_summaries table for structured team status data',
    file: '023_team_summaries.sql'
  }
];

async function runMigration(migration) {
  console.log(`Running migration: ${migration.name}...`);

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, migration.file);
    const sql = readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    await query(sql);

    // Record the migration
    await query(
      'INSERT INTO migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
      [migration.version]
    );

    console.log(`✅ Migration ${migration.version} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Migration ${migration.version} failed:`, error);
    throw error;
  }
}

async function getExecutedMigrations() {
  try {
    const result = await query('SELECT version FROM migrations ORDER BY executed_at');
    return result.rows.map(row => row.version);
  } catch (error) {
    // If migrations table doesn't exist yet, return empty array
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }
}

async function runMigrations(exitOnComplete = true) {
  console.log('🚀 Starting database migrations...');

  // Check database connection
  const isConnected = await checkConnection();
  if (!isConnected) {
    const error = new Error('Cannot connect to database. Please check your connection settings.');
    console.error('❌', error.message);
    if (exitOnComplete) process.exit(1);
    throw error;
  }

  console.log('✅ Database connection established');

  try {
    // Get list of already executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`Found ${executedMigrations.length} executed migrations`);

    // Run pending migrations
    let ranCount = 0;
    for (const migration of MIGRATIONS) {
      if (!executedMigrations.includes(migration.version)) {
        await runMigration(migration);
        ranCount++;
      } else {
        console.log(`⏭️  Skipping already executed migration: ${migration.version}`);
      }
    }

    if (ranCount === 0) {
      console.log('✅ Database is up to date. No migrations needed.');
    } else {
      console.log(`✅ Successfully ran ${ranCount} migration(s)`);
    }

    console.log('🎉 Migration process completed!');
    if (exitOnComplete) process.exit(0);
    return { success: true, migrationsRan: ranCount };
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    if (exitOnComplete) process.exit(1);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations, getExecutedMigrations };
