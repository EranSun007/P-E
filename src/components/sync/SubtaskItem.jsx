// src/components/sync/SubtaskItem.jsx
// Individual draggable subtask row with completion toggle and delete

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2 } from 'lucide-react';

export function SubtaskItem({ subtask, onToggle, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-white border rounded hover:bg-gray-50"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600"
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={() => onToggle(subtask.id)}
        id={`subtask-${subtask.id}`}
      />
      <label
        htmlFor={`subtask-${subtask.id}`}
        className={`flex-1 text-sm cursor-pointer ${
          subtask.completed ? 'line-through text-gray-400' : ''
        }`}
      >
        {subtask.title}
      </label>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-gray-400 hover:text-red-500"
        onClick={() => onDelete(subtask.id)}
        type="button"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default SubtaskItem;
