import { useState, useEffect, useMemo } from "react";
import { CaptureInbox } from "@/api/entities";
import {
  Inbox,
  RefreshCw,
  Search,
  Filter,
  X,
  Clock,
  Loader2,
  AlertTriangle,
  Eye,
  Check,
  XCircle,
  Globe
} from "lucide-react";
import InboxItemDetail from "@/components/capture/InboxItemDetail";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export default function CaptureInboxPage() {
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data state
  const [items, setItems] = useState([]);

  // Filter state
  const [filters, setFilters] = useState({
    status: "pending",
    source: null,
    search: ""
  });

  // Detail dialog state
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Action loading states
  const [actionLoading, setActionLoading] = useState({});

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CaptureInbox.list();
      setItems(data || []);
    } catch (err) {
      console.error("Failed to load capture inbox:", err);
      setError(err.message || "Failed to load capture inbox");
    } finally {
      setLoading(false);
    }
  };

  // Extract unique sources from items
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

  // Client-side filtering with useMemo
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Status filter
      if (filters.status !== "all" && item.status !== filters.status) {
        return false;
      }

      // Source filter
      if (filters.source) {
        try {
          const itemHostname = item.source_url ? new URL(item.source_url).hostname : "";
          if (itemHostname !== filters.source) return false;
        } catch {
          return false;
        }
      }

      // Search filter (source_identifier or rule_name)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesIdentifier = item.source_identifier?.toLowerCase().includes(searchLower);
        const matchesRule = item.rule_name?.toLowerCase().includes(searchLower);
        if (!matchesIdentifier && !matchesRule) return false;
      }

      return true;
    });
  }, [items, filters]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter(i => i.status === 'pending').length;
    const accepted = items.filter(i => i.status === 'accepted').length;
    const rejected = items.filter(i => i.status === 'rejected').length;
    return { total, pending, accepted, rejected };
  }, [items]);

  // Helper: format time ago
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Helper: get status badge color
  const getStatusColor = (status) => {
    if (status === "accepted") return "bg-green-100 text-green-800";
    if (status === "rejected") return "bg-red-100 text-red-800";
    if (status === "pending") return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  // Helper: get hostname from URL
  const getHostname = (url) => {
    if (!url) return "Unknown";
    try {
      return new URL(url).hostname;
    } catch {
      return "Unknown";
    }
  };

  // Check if any filters are active (besides status)
  const hasActiveFilters = filters.source !== null || filters.search !== "";

  // Clear all filters
  const clearFilters = () => {
    setFilters({ status: "pending", source: null, search: "" });
  };

  // Handle accept action
  const handleAccept = async (itemId, e) => {
    e?.stopPropagation();
    setActionLoading(prev => ({ ...prev, [itemId]: 'accept' }));
    try {
      await CaptureInbox.accept(itemId);
      // Update local state
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, status: 'accepted', processed_at: new Date().toISOString() } : item
      ));
    } catch (err) {
      console.error("Failed to accept item:", err);
      setError(err.message || "Failed to accept item");
    } finally {
      setActionLoading(prev => ({ ...prev, [itemId]: null }));
    }
  };

  // Handle reject action
  const handleReject = async (itemId, e) => {
    e?.stopPropagation();
    setActionLoading(prev => ({ ...prev, [itemId]: 'reject' }));
    try {
      await CaptureInbox.reject(itemId);
      // Update local state
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, status: 'rejected', processed_at: new Date().toISOString() } : item
      ));
    } catch (err) {
      console.error("Failed to reject item:", err);
      setError(err.message || "Failed to reject item");
    } finally {
      setActionLoading(prev => ({ ...prev, [itemId]: null }));
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
              Review and process captured data from web pages
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
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
            <span className="ml-2 text-gray-500">Loading inbox items...</span>
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
                      placeholder="Search by identifier or rule..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-9"
                    />
                  </div>

                  {/* Status filter */}
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Source filter */}
                  <Select
                    value={filters.source || "all"}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      source: value === "all" ? null : value
                    }))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <Globe className="h-4 w-4 mr-2" />
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

            {/* Items Table */}
            <Card>
              <CardContent className="p-0">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Inbox className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No inbox items found</p>
                    {hasActiveFilters && (
                      <Button variant="link" onClick={clearFilters}>
                        Clear filters to see all items
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
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
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDetailDialog(true);
                          }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1 text-gray-600">
                              <Globe className="h-4 w-4" />
                              <span className="text-sm">{getHostname(item.source_url)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate font-medium">
                            {item.source_identifier || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {item.rule_name || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              {formatTimeAgo(item.captured_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(item.status)}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.status === 'pending' && (
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItem(item);
                                    setShowDetailDialog(true);
                                  }}
                                  title="Preview"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={(e) => handleAccept(item.id, e)}
                                  disabled={actionLoading[item.id]}
                                  title="Accept"
                                >
                                  {actionLoading[item.id] === 'accept' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => handleReject(item.id, e)}
                                  disabled={actionLoading[item.id]}
                                  title="Reject"
                                >
                                  {actionLoading[item.id] === 'reject' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
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

        {/* Item Detail Dialog */}
        <InboxItemDetail
          item={selectedItem}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
        />
      </div>
    </div>
  );
}
