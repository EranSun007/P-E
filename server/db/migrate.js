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

async function runMigrations() {
  console.log('🚀 Starting database migrations...');

  // Check database connection
  const isConnected = await checkConnection();
  if (!isConnected) {
    console.error('❌ Cannot connect to database. Please check your connection settings.');
    process.exit(1);
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
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations, getExecutedMigrations };
