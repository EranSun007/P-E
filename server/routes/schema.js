import express from 'express';
import SchemaService from '../services/SchemaService.js';

const router = express.Router();

/**
 * GET /api/schema/tables - Get complete database schema
 * Returns all tables with columns, indexes, constraints, foreign keys
 * No authentication required - schema metadata is not user-specific
 */
router.get('/tables', async (req, res) => {
  try {
    const schema = await SchemaService.getCompleteSchema();
    res.json(schema);
  } catch (error) {
    console.error('GET /api/schema/tables error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schema/tables/:schema/:table - Get specific table metadata
 * Returns single table with all metadata
 */
router.get('/tables/:schema/:table', async (req, res) => {
  try {
    const { schema: schemaName, table: tableName } = req.params;

    // Fetch all metadata for the specific schema
    const [columns, foreignKeys, indexes, constraints] = await Promise.all([
      SchemaService.getColumns(schemaName),
      SchemaService.getForeignKeys(),
      SchemaService.getIndexes(),
      SchemaService.getConstraints()
    ]);

    // Filter by requested table
    const tableColumns = columns.filter(col =>
      col.table_schema === schemaName && col.table_name === tableName
    );

    // If no columns found, table doesn't exist
    if (tableColumns.length === 0) {
      return res.status(404).json({
        error: 'Table not found',
        message: `Table ${schemaName}.${tableName} does not exist`
      });
    }

    const tableForeignKeys = foreignKeys.filter(fk =>
      fk.source_schema === schemaName && fk.source_table === tableName
    );

    const tableIndexes = indexes.filter(idx =>
      idx.schemaname === schemaName && idx.tablename === tableName
    );

    const tableConstraints = constraints.filter(c =>
      c.table_schema === schemaName && c.table_name === tableName
    );

    // Build response with camelCase transformation
    const response = {
      schema: schemaName,
      name: tableName,
      columns: tableColumns.map(col => ({
        columnName: col.column_name,
        ordinalPosition: col.ordinal_position,
        dataType: col.data_type,
        udtName: col.udt_name,
        isNullable: col.is_nullable === 'YES',
        columnDefault: col.column_default,
        characterMaximumLength: col.character_maximum_length,
        numericPrecision: col.numeric_precision,
        numericScale: col.numeric_scale
      })),
      foreignKeys: tableForeignKeys.map(fk => ({
        constraintName: fk.constraint_name,
        sourceSchema: fk.source_schema,
        sourceTable: fk.source_table,
        sourceColumn: fk.source_column,
        targetSchema: fk.target_schema,
        targetTable: fk.target_table,
        targetColumn: fk.target_column,
        updateRule: fk.update_rule,
        deleteRule: fk.delete_rule
      })),
      indexes: tableIndexes.map(idx => ({
        schema: idx.schemaname,
        table: idx.tablename,
        name: idx.indexname,
        definition: idx.indexdef
      })),
      constraints: SchemaService.groupConstraints(tableConstraints)
    };

    res.json(response);
  } catch (error) {
    console.error(`GET /api/schema/tables/${req.params.schema}/${req.params.table} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
