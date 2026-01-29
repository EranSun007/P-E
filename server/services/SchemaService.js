import { query } from '../db/connection.js';

class SchemaService {
  /**
   * Get all tables with optional system table exclusion
   * @param {boolean} excludeSystem - Exclude pg_catalog and information_schema
   * @returns {Promise<Array>} Array of table objects
   */
  async getTables(excludeSystem = true) {
    const systemFilter = excludeSystem ? `
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_schema NOT LIKE 'pg_%'
    ` : '';

    const sql = `
      SELECT
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
      ${systemFilter}
      ORDER BY table_schema, table_name
    `;

    const result = await query(sql);
    return result.rows;
  }

  /**
   * Get columns for all tables (or specific schema)
   * @param {string} schemaName - Optional schema filter
   * @returns {Promise<Array>} Array of column objects
   */
  async getColumns(schemaName = null) {
    const schemaFilter = schemaName
      ? 'AND c.table_schema = $1'
      : `AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
         AND c.table_schema NOT LIKE 'pg_%'`;

    const sql = `
      SELECT
        c.table_schema,
        c.table_name,
        c.column_name,
        c.ordinal_position,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale
      FROM information_schema.columns c
      WHERE 1=1
      ${schemaFilter}
      ORDER BY c.table_schema, c.table_name, c.ordinal_position
    `;

    const params = schemaName ? [schemaName] : [];
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get all foreign key relationships
   * @returns {Promise<Array>} Array of foreign key objects
   */
  async getForeignKeys() {
    const sql = `
      SELECT
        rc.constraint_name,
        kcu.table_schema AS source_schema,
        kcu.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_schema AS target_schema,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu
        ON rc.constraint_name = kcu.constraint_name
        AND rc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
        AND rc.unique_constraint_schema = ccu.constraint_schema
      WHERE kcu.table_schema NOT IN ('pg_catalog', 'information_schema')
        AND kcu.table_schema NOT LIKE 'pg_%'
      ORDER BY kcu.table_schema, kcu.table_name, rc.constraint_name
    `;

    const result = await query(sql);
    return result.rows;
  }

  /**
   * Get all indexes
   * @returns {Promise<Array>} Array of index objects
   */
  async getIndexes() {
    const sql = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND schemaname NOT LIKE 'pg_%'
      ORDER BY schemaname, tablename, indexname
    `;

    const result = await query(sql);
    return result.rows;
  }

  /**
   * Get all constraints (PK, UNIQUE, CHECK, FK)
   * @returns {Promise<Array>} Array of constraint objects
   */
  async getConstraints() {
    const sql = `
      SELECT
        tc.constraint_name,
        tc.table_schema,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name,
        tc.is_deferrable,
        tc.initially_deferred
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema')
        AND tc.table_schema NOT LIKE 'pg_%'
      ORDER BY tc.table_schema, tc.table_name, tc.constraint_type, tc.constraint_name
    `;

    const result = await query(sql);
    return result.rows;
  }
}

export default new SchemaService();
