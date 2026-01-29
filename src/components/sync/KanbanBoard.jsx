// src/components/sync/KanbanBoard.jsx
// 4-column Kanban board for sync items grouped by category

import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/contexts/SyncContext";
import { SyncItemCard } from "./SyncItemCard";

export function KanbanBoard({ itemsByCategory, onItemClick }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {CATEGORIES.map(category => (
        <div key={category.id} className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-600">
              {category.label}
            </h3>
            <Badge variant="secondary">
              {(itemsByCategory[category.id] || []).length}
            </Badge>
          </div>
          <div className="space-y-3 flex-1 min-h-[200px] bg-gray-50 rounded-lg p-3">
            {(itemsByCategory[category.id] || []).map(item => (
              <SyncItemCard
                key={item.id}
                item={item}
                onClick={onItemClick}
              />
            ))}
            {(itemsByCategory[category.id] || []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                No items
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
