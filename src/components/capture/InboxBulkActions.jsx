// src/components/capture/InboxBulkActions.jsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  XCircle,
  X,
  Loader2,
  FolderKanban,
  User,
  Server,
} from "lucide-react";

// Entity type options for bulk accept
const ENTITY_TYPES = [
  { value: "project", label: "Project", icon: FolderKanban },
  { value: "team_member", label: "Team Member", icon: User },
  { value: "service", label: "Service", icon: Server },
];

export default function InboxBulkActions({
  selectedCount,
  onBulkAccept,
  onBulkReject,
  onClearSelection,
  loading = false,
}) {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [bulkEntityType, setBulkEntityType] = useState("project");

  const handleBulkAccept = async () => {
    setShowAcceptConfirm(false);
    await onBulkAccept(bulkEntityType);
  };

  const handleBulkReject = async () => {
    setShowRejectConfirm(false);
    await onBulkReject();
  };

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
        {/* Selection count */}
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {selectedCount} selected
        </Badge>

        {/* Entity type for bulk accept */}
        <Select value={bulkEntityType} onValueChange={setBulkEntityType}>
          <SelectTrigger className="w-[150px] h-8 text-sm">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Bulk accept button */}
        <Button
          size="sm"
          variant="default"
          onClick={() => setShowAcceptConfirm(true)}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}
          Accept All
        </Button>

        {/* Bulk reject button */}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowRejectConfirm(true)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4 mr-1" />
          )}
          Reject All
        </Button>

        {/* Clear selection */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          disabled={loading}
          className="ml-auto"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Bulk Accept Confirmation */}
      <AlertDialog open={showAcceptConfirm} onOpenChange={setShowAcceptConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept {selectedCount} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will accept {selectedCount} selected item{selectedCount !== 1 ? "s" : ""} and mark them as {" "}
              <strong>{ENTITY_TYPES.find(t => t.value === bulkEntityType)?.label}</strong> type.
              <br /><br />
              No entity mappings will be created. Use individual accept for specific mappings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAccept}
              className="bg-green-600 hover:bg-green-700"
            >
              Accept {selectedCount} Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Reject Confirmation */}
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {selectedCount} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject {selectedCount} selected item{selectedCount !== 1 ? "s" : ""}.
              Rejected items will be marked as rejected but not deleted.
              <br /><br />
              This action can be reviewed later but the items will no longer appear in pending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject {selectedCount} Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
