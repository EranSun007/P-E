import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Key, Link2, Database, List } from 'lucide-react';

/**
 * EntityDetailsPanel - Sidebar showing full table schema details
 *
 * Displays comprehensive information about a selected table:
 * - Columns with types and constraints
 * - Primary keys
 * - Foreign key relationships
 * - Indexes
 * - Check constraints
 */
export default function EntityDetailsPanel({ node, onClose }) {
  if (!node || !node.data) return null;

  const { tableName, columns, foreignKeys, constraints } = node.data;
  const primaryKeyColumns = constraints?.primaryKey?.columns || [];
  const indexes = node.data.indexes || [];
  const checkConstraints = constraints?.check || [];

  return (
    <div className="w-96 bg-white border-l shadow-lg h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">{tableName}</h2>
          <Badge variant="secondary">{columns.length} cols</Badge>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Close panel"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Columns Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <List className="h-4 w-4" />
                Columns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {columns.map(col => (
                  <div
                    key={col.columnName}
                    className="flex items-start justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {col.isPrimaryKey && (
                        <Key className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                      )}
                      <span className={col.isPrimaryKey ? 'font-bold' : ''}>
                        {col.columnName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {col.dataType}
                      </Badge>
                      {col.isNullable && (
                        <span className="text-xs text-gray-500">nullable</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Primary Key Section */}
          {primaryKeyColumns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="h-4 w-4" />
                  Primary Key
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {primaryKeyColumns.map(col => (
                    <Badge key={col} variant="default">
                      {col}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Foreign Keys Section */}
          {foreignKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4" />
                  Foreign Keys
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {foreignKeys.map(fk => (
                    <div key={fk.constraintName} className="text-sm">
                      <div className="font-medium text-gray-700 mb-1">
                        {fk.constraintName}
                      </div>
                      <div className="text-gray-600 flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {fk.columns.join(', ')}
                        </span>
                        <span>→</span>
                        <span className="font-mono text-xs">
                          {fk.referencedTable}.{fk.referencedColumns.join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Indexes Section */}
          {indexes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <List className="h-4 w-4" />
                  Indexes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {indexes.map(idx => (
                    <div key={idx.indexName} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">
                          {idx.indexName}
                        </span>
                        {idx.isUnique && (
                          <Badge variant="secondary" className="text-xs">
                            unique
                          </Badge>
                        )}
                      </div>
                      <div className="text-gray-600 font-mono text-xs mt-1">
                        ({idx.columns.join(', ')})
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Check Constraints Section */}
          {checkConstraints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Check Constraints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checkConstraints.map(check => (
                    <div key={check.constraintName} className="text-sm">
                      <div className="font-medium text-gray-700">
                        {check.constraintName}
                      </div>
                      <div className="text-gray-600 font-mono text-xs mt-1 bg-gray-50 p-2 rounded">
                        {check.definition}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
