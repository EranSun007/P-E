// src/pages/TeamSync.jsx
// TeamSync page with Kanban board for tracking team goals, blockers, and dependencies

import { useState } from "react";
import { useSync } from "@/contexts/SyncContext";
import { TeamDepartmentTabs } from "@/components/sync/TeamDepartmentTabs";
import { KanbanBoard } from "@/components/sync/KanbanBoard";
import { SyncItemModal } from "@/components/sync/SyncItemModal";
import { ArchiveModal } from "@/components/sync/ArchiveModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Archive } from "lucide-react";

export default function TeamSync() {
  const {
    itemsByCategory,
    currentTeam,
    setCurrentTeam,
    archivedCount,
    loading,
    createItem,
    updateItem,
    deleteItem,
  } = useSync();

  // Modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  // Handle item click - open modal in view mode
  const handleItemClick = (item) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  // Handle create button click - open modal in edit mode for new item
  const handleCreateClick = () => {
    setSelectedItem(null);
    setModalOpen(true);
  };

  // Handle save - create or update item
  const handleSave = async (data) => {
    if (selectedItem) {
      await updateItem(selectedItem.id, data);
    } else {
      await createItem(data);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    await deleteItem(id);
    setModalOpen(false);
  };

  // Handle modal close
  const handleModalClose = (open) => {
    setModalOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setArchiveModalOpen(true)}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
            {archivedCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {archivedCount}
              </Badge>
            )}
          </Button>
          <TeamDepartmentTabs value={currentTeam} onValueChange={setCurrentTeam} />
          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <KanbanBoard itemsByCategory={itemsByCategory} onItemClick={handleItemClick} />

      <SyncItemModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        item={selectedItem}
        onSave={handleSave}
        onDelete={selectedItem ? handleDelete : undefined}
      />

      <ArchiveModal
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
      />
    </div>
  );
}
