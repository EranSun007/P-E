import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Key } from 'lucide-react';

/**
 * EntityNode - Custom ReactFlow node for displaying database tables
 *
 * Displays a table with:
 * - Header: table name
 * - Body: column list with data types
 * - Primary key indicators
 * - Connection handles for foreign key edges
 */
const EntityNode = memo(({ data }) => {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-md min-w-[200px]">
      {/* Table header */}
      <div className="bg-blue-600 text-white px-3 py-2 font-semibold rounded-t-md">
        {data.tableName}
      </div>

      {/* Column list */}
      <div className="p-2 max-h-[250px] overflow-y-auto">
        {data.columns?.map((col) => (
          <div
            key={col.columnName}
            className="flex items-center text-sm py-1 px-2 hover:bg-gray-50"
          >
            <div className="flex items-center flex-1 min-w-0">
              {col.isPrimaryKey && (
                <Key className="h-3 w-3 text-yellow-500 mr-1 flex-shrink-0" />
              )}
              <span className={col.isPrimaryKey ? 'font-bold' : ''}>
                {col.columnName}
              </span>
            </div>
            <span className="text-gray-500 text-xs ml-auto flex-shrink-0">
              {col.dataType}
            </span>
          </div>
        ))}
      </div>

      {/* Connection handles for foreign key edges */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

EntityNode.displayName = 'EntityNode';

export default EntityNode;
