import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Bug,
  User,
  Target,
  Calendar,
  Tag,
  FileText,
  Layers,
  Clock
} from "lucide-react";

export default function JiraIssueDetailDialog({ issue, open, onOpenChange }) {
  if (!issue) return null;

  // Helper: format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Helper: get status badge color
  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || "";
    if (s === "done" || s === "closed" || s === "resolved") {
      return "bg-green-100 text-green-800 border-green-200";
    }
    if (s.includes("progress")) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    if (s === "blocked" || s === "impediment") {
      return "bg-red-100 text-red-800 border-red-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Helper: get priority color
  const getPriorityColor = (priority) => {
    const p = priority?.toLowerCase() || "";
    if (p.includes("highest") || p.includes("critical")) {
      return "bg-red-100 text-red-800";
    }
    if (p.includes("high")) {
      return "bg-orange-100 text-orange-800";
    }
    if (p.includes("medium")) {
      return "bg-yellow-100 text-yellow-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Bug className="h-5 w-5 text-blue-600" />
            <span className="text-blue-600 font-mono">{issue.issue_key}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {issue.summary || "Untitled"}
            </h3>
          </div>

          {/* Status & Type Row */}
          <div className="flex flex-wrap gap-3">
            {issue.status && (
              <Badge variant="outline" className={getStatusColor(issue.status)}>
                {issue.status}
              </Badge>
            )}
            {issue.issue_type && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {issue.issue_type}
              </Badge>
            )}
            {issue.priority && (
              <Badge variant="outline" className={getPriorityColor(issue.priority)}>
                {issue.priority}
              </Badge>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <User className="h-4 w-4" />
                Assignee
              </div>
              <div className="font-medium">
                {issue.assignee_name || "-"}
              </div>
            </div>

            {/* Story Points */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Target className="h-4 w-4" />
                Story Points
              </div>
              <div className="font-medium">
                {issue.story_points != null ? issue.story_points : "-"}
              </div>
            </div>

            {/* Sprint */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                Sprint
              </div>
              <div className="font-medium">
                {issue.sprint_name || issue.sprint || "-"}
              </div>
            </div>

            {/* Epic */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Layers className="h-4 w-4" />
                Epic
              </div>
              <div className="font-medium font-mono text-sm">
                {issue.epic_key || "-"}
              </div>
            </div>

            {/* Last Synced */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                Last Synced
              </div>
              <div className="font-medium text-sm">
                {formatDate(issue.synced_at)}
              </div>
            </div>

            {/* Created Date */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                Captured
              </div>
              <div className="font-medium text-sm">
                {formatDate(issue.created_date)}
              </div>
            </div>
          </div>

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Tag className="h-4 w-4" />
                Labels
              </div>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(issue.labels) ? issue.labels : [issue.labels]).map((label, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {issue.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FileText className="h-4 w-4" />
                Description
              </div>
              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {issue.description}
              </div>
            </div>
          )}

          {/* Open in Jira Button */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(issue.jira_url || issue.url, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Jira
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
