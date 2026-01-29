// src/components/sync/SubtaskList.jsx
// Sortable subtask list with dnd-kit drag-and-drop

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { SubtaskItem } from './SubtaskItem';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

export function SubtaskList({ subtasks, onToggle, onDelete, onReorder, onAdd }) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = subtasks.findIndex(s => s.id === active.id);
      const newIndex = subtasks.findIndex(s => s.id === over.id);
      const newOrder = arrayMove(subtasks, oldIndex, newIndex);
      onReorder(newOrder.map(s => s.id));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
      e.preventDefault();
      onAdd(newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    }
  };

  return (
    <div className="space-y-2">
      {subtasks.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={subtasks.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {subtasks.map(subtask => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-gray-500 py-2">No subtasks yet</p>
      )}

      {/* Add subtask input - always visible */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Plus className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <Input
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add subtask and press Enter..."
          className="border-0 shadow-none focus-visible:ring-0 h-8"
        />
      </div>
    </div>
  );
}

export default SubtaskList;
