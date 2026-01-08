import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { createRequire } from 'module';

// Load environment variables
dotenv.config({ path: '.env.development' });

const require = createRequire(import.meta.url);

// Database configuration
function getDatabaseConfig() {
  // For SAP BTP, read from VCAP_SERVICES
  if (process.env.VCAP_SERVICES) {
    try {
      const xsenv = require('@sap/xsenv');
      const services = xsenv.getServices({ postgres: { tag: 'postgresql' } });
      const dbConfig = services.postgres.credentials;

      return {
        host: dbConfig.hostname,
        port: dbConfig.port,
        // Allow override via DB_NAME env variable, otherwise use from credentials
        database: process.env.DB_NAME || dbConfig.dbname,
        user: dbConfig.username,
        password: dbConfig.password,
        ssl: dbConfig.sslrootcert ? {
          rejectUnauthorized: false,
          ca: dbConfig.sslrootcert
        } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    } catch (error) {
      console.warn('Failed to read VCAP_SERVICES, falling back to env variables');
    }
  }

  // For local development or direct env variables
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  // Individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'pe_manager',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    // For SAP BTP, enable SSL with certificate validation disabled
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false,
      // If you have the certificate, you can use it:
      // ca: process.env.DB_SSL_CERT
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

// Create connection pool
const config = getDatabaseConfig();
const pool = new Pool(config);

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Helper function to execute queries
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('Query executed:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Helper function to get a client from the pool (for transactions)
export async function getClient() {
  return await pool.connect();
}

// Helper function to check if database is connected
export async function checkConnection() {
  try {
    await query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database pool...');
  await pool.end();
  process.exit(0);
});

export default pool;
