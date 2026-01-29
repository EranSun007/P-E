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

  /**
   * Get complete schema for all tables with nested structure
   * @returns {Promise<Object>} Complete schema with nested structure
   */
  async getCompleteSchema() {
    // Fetch all data in parallel
    const [tables, columns, foreignKeys, indexes, constraints] = await Promise.all([
      this.getTables(),
      this.getColumns(),
      this.getForeignKeys(),
      this.getIndexes(),
      this.getConstraints()
    ]);

    // Group columns by table
    const columnsByTable = this.groupByTable(columns);
    const indexesByTable = this.groupByTable(indexes, 'tablename', 'schemaname');
    const constraintsByTable = this.groupByTable(constraints);
    const foreignKeysByTable = this.groupByTable(foreignKeys, 'source_table', 'source_schema');

    // Build nested structure with camelCase keys
    const tablesWithMetadata = tables.map(table => ({
      schema: table.table_schema,
      name: table.table_name,
      type: table.table_type,
      columns: (columnsByTable[`${table.table_schema}.${table.table_name}`] || []).map(this.transformColumn),
      indexes: (indexesByTable[`${table.table_schema}.${table.table_name}`] || []).map(this.transformIndex),
      constraints: this.groupConstraints(constraintsByTable[`${table.table_schema}.${table.table_name}`] || []),
      foreignKeys: (foreignKeysByTable[`${table.table_schema}.${table.table_name}`] || []).map(this.transformForeignKey)
    }));

    return { tables: tablesWithMetadata };
  }

  /**
   * Helper: Group array items by table
   * @private
   */
  groupByTable(items, tableKey = 'table_name', schemaKey = 'table_schema') {
    return items.reduce((acc, item) => {
      const key = `${item[schemaKey]}.${item[tableKey]}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  /**
   * Helper: Transform column from snake_case to camelCase
   * @private
   */
  transformColumn(col) {
    return {
      columnName: col.column_name,
      ordinalPosition: col.ordinal_position,
      dataType: col.data_type,
      udtName: col.udt_name,
      isNullable: col.is_nullable === 'YES',
      columnDefault: col.column_default,
      characterMaximumLength: col.character_maximum_length,
      numericPrecision: col.numeric_precision,
      numericScale: col.numeric_scale
    };
  }

  /**
   * Helper: Transform index from snake_case to camelCase
   * @private
   */
  transformIndex(idx) {
    return {
      schema: idx.schemaname,
      table: idx.tablename,
      name: idx.indexname,
      definition: idx.indexdef
    };
  }

  /**
   * Helper: Transform foreign key from snake_case to camelCase
   * @private
   */
  transformForeignKey(fk) {
    return {
      constraintName: fk.constraint_name,
      sourceSchema: fk.source_schema,
      sourceTable: fk.source_table,
      sourceColumn: fk.source_column,
      targetSchema: fk.target_schema,
      targetTable: fk.target_table,
      targetColumn: fk.target_column,
      updateRule: fk.update_rule,
      deleteRule: fk.delete_rule
    };
  }

  /**
   * Helper: Group constraints by name and aggregate columns
   * @private
   */
  groupConstraints(constraints) {
    // Group by constraint_name since multi-column constraints have multiple rows
    const grouped = constraints.reduce((acc, constraint) => {
      const key = constraint.constraint_name;
      if (!acc[key]) {
        acc[key] = {
          name: constraint.constraint_name,
          schema: constraint.table_schema,
          table: constraint.table_name,
          type: constraint.constraint_type,
          columns: [],
          isDeferrable: constraint.is_deferrable === 'YES',
          initiallyDeferred: constraint.initially_deferred === 'YES'
        };
      }
      if (constraint.column_name) {
        acc[key].columns.push(constraint.column_name);
      }
      return acc;
    }, {});

    return Object.values(grouped);
  }
}

export default new SchemaService();
