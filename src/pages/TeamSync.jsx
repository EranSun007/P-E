// src/pages/TeamSync.jsx
// TeamSync page with Kanban board for tracking team goals, blockers, and dependencies

import { useSync } from "@/contexts/SyncContext";
import { TeamDepartmentTabs } from "@/components/sync/TeamDepartmentTabs";
import { KanbanBoard } from "@/components/sync/KanbanBoard";
import { Loader2 } from "lucide-react";

export default function TeamSync() {
  const {
    itemsByCategory,
    currentTeam,
    setCurrentTeam,
    loading
  } = useSync();

  // Handle item click (placeholder for future detail modal)
  const handleItemClick = (item) => {
    console.log('Item clicked:', item.id);
    // Future: Open detail modal
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Sync</h1>
          <p className="text-gray-500 mt-1">Track team goals, blockers, and dependencies</p>
        </div>
        <TeamDepartmentTabs value={currentTeam} onValueChange={setCurrentTeam} />
      </div>

      <KanbanBoard itemsByCategory={itemsByCategory} onItemClick={handleItemClick} />
    </div>
  );
}
