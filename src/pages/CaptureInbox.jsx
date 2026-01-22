import { useState, useEffect, useMemo } from "react";
import { CaptureInbox as CaptureInboxApi } from "@/api/entities";
import { format } from "date-fns";
import {
  Inbox,
  RefreshCw,
  Search,
  X,
  Clock,
  Loader2,
  AlertTriangle,
  Eye,
  XCircle,
  Globe,
  ExternalLink,
  Link2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/EmptyState";
import InboxItemDetail from "@/components/capture/InboxItemDetail";
import EntityMappingDialog from "@/components/capture/EntityMappingDialog";
import InboxBulkActions from "@/components/capture/InboxBulkActions";

export default function CaptureInboxPage() {
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data state
  const [items, setItems] = useState([]);

  // Filter state
  const [filters, setFilters] = useState({
    status: "pending",
    search: "",
    source: null,
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Preview dialog state
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Entity mapping dialog state
  const [mappingItem, setMappingItem] = useState(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CaptureInboxApi.list();
      setItems(data || []);
    } catch (err) {
      console.error("Failed to load capture inbox:", err);
      setError(err.message || "Failed to load capture inbox");
    } finally {
      setLoading(false);
    }
  };

  // Extract unique sources for filter dropdown
  const uniqueSources = useMemo(() => {
    const sources = new Set();
    items.forEach(item => {
      if (item.source_url) {
        try {
          sources.add(new URL(item.source_url).hostname);
        } catch {
          // Invalid URL, skip
        }
      }
    });
    return Array.from(sources).sort();
  }, [items]);

  // Client-side filtering
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Status filter
      if (filters.status && filters.status !== "all" && item.status !== filters.status) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesIdentifier = item.source_identifier?.toLowerCase().includes(searchLower);
        const matchesUrl = item.source_url?.toLowerCase().includes(searchLower);
        const matchesRule = item.rule_name?.toLowerCase().includes(searchLower);
        if (!matchesIdentifier && !matchesUrl && !matchesRule) {
          return false;
        }
      }

      // Source filter
      if (filters.source) {
        try {
          const itemHost = new URL(item.source_url).hostname;
          if (itemHost !== filters.source) return false;
        } catch {
          return false;
        }
      }

      return true;
    });
  }, [items, filters]);

  // Only pending items can be selected
  const selectableItems = useMemo(() => {
    return filteredItems.filter(item => item.status === "pending");
  }, [filteredItems]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter(i => i.status === "pending").length;
    const accepted = items.filter(i => i.status === "accepted").length;
    const rejected = items.filter(i => i.status === "rejected").length;
    return { total, pending, accepted, rejected };
  }, [items]);

  // Selection helpers
  const allSelected = selectableItems.length > 0 &&
    selectableItems.every(item => selectedIds.has(item.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(selectableItems.map(i => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id, checked) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  // Format timestamp
  const formatTime = (dateStr) => {
    if (!dateStr) return "Unknown";
    try {
      return format(new Date(dateStr), "MMM d, h:mm a");
    } catch {
      return dateStr;
    }
  };

  // Get hostname from URL
  const getHostname = (url) => {
    if (!url) return "Unknown";
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Status badge colors
  const getStatusBadge = (status) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  // Check if any filters are active
  const hasActiveFilters = filters.status !== "pending" ||
                           filters.search !== "" ||
                           filters.source !== null;

  // Clear all filters
  const clearFilters = () => {
    setFilters({ status: "pending", search: "", source: null });
  };

  // Handle accept with mapping dialog
  const handleAcceptWithMapping = (item) => {
    setMappingItem(item);
    setShowMappingDialog(true);
  };

  // Handle accept from mapping dialog
  const handleMappingAccept = async ({ inboxItemId, target_entity_type, target_entity_id, create_mapping }) => {
    setActionLoading(inboxItemId);
    try {
      await CaptureInboxApi.accept(inboxItemId, {
        target_entity_type,
        target_entity_id,
        create_mapping,
      });
      // Update local state
      setItems(prev => prev.map(i =>
        i.id === inboxItemId ? { ...i, status: "accepted" } : i
      ));
      // Remove from selection if selected
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(inboxItemId);
        return newSet;
      });
    } catch (err) {
      console.error("Failed to accept item:", err);
      throw err; // Re-throw to show error in dialog
    } finally {
      setActionLoading(null);
    }
  };

  // Handle quick reject (no mapping needed)
  const handleReject = async (item) => {
    setActionLoading(item.id);
    try {
      await CaptureInboxApi.reject(item.id, {});
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: "rejected" } : i
      ));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    } catch (err) {
      console.error("Failed to reject item:", err);
      setError("Failed to reject item");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle preview click
  const handlePreview = (item) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  // Handle bulk accept
  const handleBulkAccept = async (entityType) => {
    setBulkLoading(true);
    setError(null);
    try {
      const ids = Array.from(selectedIds);
      await CaptureInboxApi.bulkAccept(ids, { target_entity_type: entityType });
      // Update local state
      setItems(prev => prev.map(i =>
        selectedIds.has(i.id) ? { ...i, status: "accepted" } : i
      ));
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to bulk accept:", err);
      setError("Failed to accept selected items");
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle bulk reject
  const handleBulkReject = async () => {
    setBulkLoading(true);
    setError(null);
    try {
      const ids = Array.from(selectedIds);
      await CaptureInboxApi.bulkReject(ids);
      // Update local state
      setItems(prev => prev.map(i =>
        selectedIds.has(i.id) ? { ...i, status: "rejected" } : i
      ));
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to bulk reject:", err);
      setError("Failed to reject selected items");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Inbox className="h-8 w-8" />
              Capture Inbox
            </h1>
            <p className="text-gray-500 mt-1">
              Review and process captured data from websites
            </p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading capture inbox...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-sm text-gray-500">Total Items</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <p className="text-sm text-gray-500">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                  <p className="text-sm text-gray-500">Accepted</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                  <p className="text-sm text-gray-500">Rejected</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter Bar */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search input */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by identifier, URL, or rule..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-9"
                    />
                  </div>

                  {/* Status filter */}
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      status: value === "all" ? null : value
                    }))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Source filter */}
                  {uniqueSources.length > 0 && (
                    <Select
                      value={filters.source || "all"}
                      onValueChange={(value) => setFilters(prev => ({
                        ...prev,
                        source: value === "all" ? null : value
                      }))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        {uniqueSources.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
              <InboxBulkActions
                selectedCount={selectedIds.size}
                onBulkAccept={handleBulkAccept}
                onBulkReject={handleBulkReject}
                onClearSelection={() => setSelectedIds(new Set())}
                loading={bulkLoading}
              />
            )}

            {/* Items Table */}
            <Card>
              <CardContent className="p-0">
                {filteredItems.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="No Items Found"
                    description={hasActiveFilters
                      ? "No items match your current filters."
                      : "Your capture inbox is empty. Captured data will appear here."}
                    size="md"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allSelected}
                            // Note: Radix Checkbox uses data-state, not indeterminate prop
                            // We show partial state via different styling
                            onCheckedChange={handleSelectAll}
                            disabled={selectableItems.length === 0}
                            className={someSelected ? "data-[state=checked]:bg-blue-400" : ""}
                          />
                        </TableHead>
                        <TableHead className="w-[180px]">Source</TableHead>
                        <TableHead>Identifier</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Captured</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow
                          key={item.id}
                          className={selectedIds.has(item.id) ? "bg-blue-50" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                              disabled={item.status !== "pending"}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate max-w-[140px]" title={item.source_url}>
                                {getHostname(item.source_url)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium truncate max-w-[200px] block">
                              {item.source_identifier || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {item.rule_name || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-3 w-3" />
                              {formatTime(item.captured_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(item.status)}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {/* Preview button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(item)}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* Accept/Reject buttons only for pending items */}
                              {item.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAcceptWithMapping(item)}
                                    disabled={actionLoading === item.id}
                                    title="Accept with mapping"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    {actionLoading === item.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Link2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReject(item)}
                                    disabled={actionLoading === item.id}
                                    title="Reject"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {/* Link to source */}
                              {item.source_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  title="Open source"
                                >
                                  <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview Dialog */}
        <InboxItemDetail
          item={selectedItem}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
        />

        {/* Entity Mapping Dialog */}
        <EntityMappingDialog
          open={showMappingDialog}
          onOpenChange={setShowMappingDialog}
          inboxItem={mappingItem}
          onAccept={handleMappingAccept}
        />
      </div>
    </div>
  );
}
