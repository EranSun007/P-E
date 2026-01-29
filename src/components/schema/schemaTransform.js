/**
 * Schema Transformation Utility
 *
 * Transforms PostgreSQL schema data from /api/schema/tables
 * into ReactFlow graph format (nodes and edges).
 */

import { MarkerType } from '@xyflow/react';

/**
 * Enrich columns with constraint information
 * @param {Array} columns - Array of column objects from API
 * @param {Object} constraints - Constraints object from API
 * @returns {Array} - Enriched column objects with isPrimaryKey flag
 */
function enrichColumnsWithConstraints(columns, constraints) {
  const pkColumns = new Set(
    constraints?.primaryKey?.columns || []
  );

  return columns.map(col => ({
    ...col,
    isPrimaryKey: pkColumns.has(col.columnName),
    isNullable: col.isNullable,
    dataType: col.dataType
  }));
}

/**
 * Transform schema tables into ReactFlow graph format
 * @param {Array} tables - Array of table objects from /api/schema/tables
 * @returns {Object} - Object with nodes and edges arrays for ReactFlow
 */
export function transformSchemaToGraph(tables) {
  if (!Array.isArray(tables) || tables.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Create nodes from tables
  const nodes = tables.map((table, index) => {
    // Enrich columns with primary key information
    const enrichedColumns = enrichColumnsWithConstraints(
      table.columns || [],
      table.constraints || {}
    );

    // Calculate grid position (4 columns per row)
    const columnIndex = index % 4;
    const rowIndex = Math.floor(index / 4);

    return {
      id: table.tableName,
      type: 'entity',
      data: {
        tableName: table.tableName,
        columns: enrichedColumns,
        foreignKeys: table.foreignKeys || [],
        indexes: table.indexes || [],
        constraints: table.constraints || {}
      },
      position: {
        x: columnIndex * 280,
        y: rowIndex * 200
      }
    };
  });

  // Create edges from foreign keys
  const edges = [];
  tables.forEach(table => {
    const foreignKeys = table.foreignKeys || [];
    foreignKeys.forEach(fk => {
      edges.push({
        id: `${table.tableName}-${fk.constraintName}`,
        source: table.tableName,
        target: fk.referencedTable,
        type: 'smoothstep',
        label: fk.columns.join(', '),
        animated: false,
        style: { strokeWidth: 2, stroke: '#64748b' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        labelStyle: { fontSize: 10, fill: '#64748b' },
        labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.9 }
      });
    });
  });

  return { nodes, edges };
}
