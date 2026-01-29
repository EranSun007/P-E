// src/components/sync/SubtaskSection.jsx
// Accordion wrapper for subtask management with CRUD operations

import { useState, useEffect, useCallback } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SubtaskList } from './SubtaskList';
import { SyncItem } from '@/api/entities';
import { ListChecks } from 'lucide-react';

export function SubtaskSection({ itemId, isNewItem }) {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load subtasks when itemId changes
  useEffect(() => {
    if (itemId && !isNewItem) {
      loadSubtasks();
    } else {
      setSubtasks([]);
    }
  }, [itemId, isNewItem]);

  const loadSubtasks = async () => {
    try {
      setLoading(true);
      const data = await SyncItem.listSubtasks(itemId);
      setSubtasks(data || []);
    } catch (error) {
      console.error('Failed to load subtasks:', error);
      setSubtasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = useCallback(async (subtaskId) => {
    const subtask = subtasks.find(s => s.id === subtaskId);
    if (!subtask) return;

    // Optimistic update
    setSubtasks(prev =>
      prev.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
    );

    try {
      await SyncItem.updateSubtask(itemId, subtaskId, {
        completed: !subtask.completed
      });
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
      // Revert on error
      setSubtasks(prev =>
        prev.map(s => s.id === subtaskId ? { ...s, completed: subtask.completed } : s)
      );
    }
  }, [itemId, subtasks]);

  const handleDelete = useCallback(async (subtaskId) => {
    // Optimistic update
    const deletedSubtask = subtasks.find(s => s.id === subtaskId);
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));

    try {
      await SyncItem.deleteSubtask(itemId, subtaskId);
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      // Revert on error
      if (deletedSubtask) {
        setSubtasks(prev => [...prev, deletedSubtask].sort((a, b) => a.sort_order - b.sort_order));
      }
    }
  }, [itemId, subtasks]);

  const handleReorder = useCallback(async (orderedIds) => {
    // Optimistic update - reorder local state
    const reorderedSubtasks = orderedIds.map((id, index) => {
      const subtask = subtasks.find(s => s.id === id);
      return { ...subtask, sort_order: index };
    });
    setSubtasks(reorderedSubtasks);

    try {
      await SyncItem.reorderSubtasks(itemId, orderedIds);
    } catch (error) {
      console.error('Failed to reorder subtasks:', error);
      // Reload on error to get correct order
      await loadSubtasks();
    }
  }, [itemId, subtasks]);

  const handleAdd = useCallback(async (title) => {
    try {
      const newSubtask = await SyncItem.createSubtask(itemId, { title });
      setSubtasks(prev => [...prev, newSubtask]);
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  }, [itemId]);

  // Count completed subtasks
  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;

  // Don't show section for new items
  if (isNewItem) {
    return (
      <div className="text-sm text-gray-500 italic py-4 border-t">
        Save the item first to add subtasks
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible defaultValue="subtasks" className="border-t">
      <AccordionItem value="subtasks" className="border-b-0">
        <AccordionTrigger className="py-3 hover:no-underline">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            <span>Subtasks</span>
            {totalCount > 0 && (
              <span className="text-xs text-gray-500">
                ({completedCount}/{totalCount})
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-2">Loading...</p>
          ) : (
            <SubtaskList
              subtasks={subtasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onReorder={handleReorder}
              onAdd={handleAdd}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default SubtaskSection;
