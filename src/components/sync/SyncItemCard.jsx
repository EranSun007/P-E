// src/components/sync/SyncItemCard.jsx
// Card component for displaying sync items in Kanban board

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  not_started: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  blocked: "bg-red-100 text-red-800",
  done: "bg-green-100 text-green-800",
};

const STATUS_LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

export function SyncItemCard({ item, onClick }) {
  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  return (
    <Card
      className={cn(
        "shadow-sm hover:shadow-md transition-shadow",
        onClick && "cursor-pointer"
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium line-clamp-2">
          {item.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Status Badge */}
        <div>
          <Badge
            className={cn(
              "text-xs",
              STATUS_COLORS[item.sync_status] || STATUS_COLORS.not_started
            )}
          >
            {STATUS_LABELS[item.sync_status] || STATUS_LABELS.not_started}
          </Badge>
        </div>

        {/* Assignee */}
        {item.assigned_to_name && (
          <div className="flex items-center text-xs text-gray-600">
            <User className="h-3 w-3 mr-1" />
            <span>{item.assigned_to_name}</span>
          </div>
        )}

        {/* Subtask Count */}
        {item.subtask_count > 0 && (
          <div className="flex items-center text-xs text-gray-600">
            <ListChecks className="h-3 w-3 mr-1" />
            <span>{item.subtask_count} subtask{item.subtask_count !== 1 ? 's' : ''}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
