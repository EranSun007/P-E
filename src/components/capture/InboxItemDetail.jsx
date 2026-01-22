import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Clock, Tag, FileJson } from "lucide-react";

export default function InboxItemDetail({ item, open, onOpenChange }) {
  if (!item) return null;

  // Parse captured_data if it's a string
  const capturedData = typeof item.captured_data === 'string'
    ? JSON.parse(item.captured_data)
    : item.captured_data;

  const formatDate = (dateStr) => {
    if (!dateStr) return "Unknown";
    try {
      return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Captured Item Details
          </DialogTitle>
          <DialogDescription>
            Review the captured data before accepting or rejecting.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Status and metadata */}
            <div className="flex flex-wrap gap-4 text-sm">
              <Badge className={getStatusBadge(item.status)}>
                {item.status}
              </Badge>
              <div className="flex items-center gap-1 text-gray-500">
                <Globe className="h-4 w-4" />
                <span>{item.source_url ? new URL(item.source_url).hostname : "Unknown source"}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{formatDate(item.captured_at)}</span>
              </div>
            </div>

            {/* Source identifier */}
            {item.source_identifier && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Source Identifier</h4>
                <p className="text-sm">{item.source_identifier}</p>
              </div>
            )}

            {/* Rule name if available */}
            {item.rule_name && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Capture Rule</h4>
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{item.rule_name}</span>
                </div>
              </div>
            )}

            {/* Source URL */}
            {item.source_url && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Source URL</h4>
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {item.source_url}
                </a>
              </div>
            )}

            {/* Raw captured data */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Captured Data</h4>
              <div className="bg-gray-50 rounded-lg p-4 border">
                {Object.entries(capturedData || {}).length > 0 ? (
                  <dl className="space-y-3">
                    {Object.entries(capturedData).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {key.replace(/_/g, ' ')}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 break-words">
                          {typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-gray-500 italic">No data captured</p>
                )}
              </div>
            </div>

            {/* Processing timestamps if processed */}
            {item.processed_at && (
              <div className="text-xs text-gray-400 border-t pt-4">
                Processed: {formatDate(item.processed_at)}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
