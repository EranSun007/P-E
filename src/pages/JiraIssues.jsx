import { useState, useEffect, useMemo } from "react";
import { JiraIssue } from "@/api/entities";
import {
  Bug,
  RefreshCw,
  Search,
  Filter,
  X,
  Clock,
  Loader2,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
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

export default function JiraIssuesPage() {
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data state
  const [issues, setIssues] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    statuses: [],
    assignees: [],
    sprints: []
  });

  // Filter state
  const [filters, setFilters] = useState({
    status: [],
    assignee: [],
    sprint: null,
    search: ""
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [issuesData, filterData, statusData] = await Promise.all([
        JiraIssue.list(),
        JiraIssue.getFilterOptions(),
        JiraIssue.getSyncStatus()
      ]);
      setIssues(issuesData || []);
      setFilterOptions(filterData || { statuses: [], assignees: [], sprints: [] });
      setSyncStatus(statusData);
    } catch (err) {
      console.error("Failed to load Jira issues:", err);
      setError(err.message || "Failed to load Jira issues");
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering with useMemo
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Search filter (issue_key or summary)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesKey = issue.issue_key?.toLowerCase().includes(searchLower);
        const matchesSummary = issue.summary?.toLowerCase().includes(searchLower);
        if (!matchesKey && !matchesSummary) return false;
      }

      // Status filter (multi-select)
      if (filters.status.length > 0 && !filters.status.includes(issue.status)) {
        return false;
      }

      // Assignee filter (multi-select)
      if (filters.assignee.length > 0 && !filters.assignee.includes(issue.assignee_name)) {
        return false;
      }

      // Sprint filter (single select)
      if (filters.sprint && issue.sprint !== filters.sprint) {
        return false;
      }

      return true;
    });
  }, [issues, filters]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = filteredIssues.length;
    const inProgress = filteredIssues.filter(i =>
      i.status?.toLowerCase().includes('progress') ||
      i.status?.toLowerCase() === 'in progress'
    ).length;
    const done = filteredIssues.filter(i =>
      i.status?.toLowerCase() === 'done' ||
      i.status?.toLowerCase() === 'closed'
    ).length;
    const totalPoints = filteredIssues.reduce((sum, i) => sum + (parseFloat(i.story_points) || 0), 0);
    return { total, inProgress, done, totalPoints };
  }, [filteredIssues]);

  // Helper: format time ago
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Never";
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
    const s = status?.toLowerCase() || "";
    if (s === "done" || s === "closed") return "bg-green-100 text-green-800";
    if (s.includes("progress")) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  // Check if any filters are active
  const hasActiveFilters = filters.status.length > 0 ||
                           filters.assignee.length > 0 ||
                           filters.sprint !== null ||
                           filters.search !== "";

  // Clear all filters
  const clearFilters = () => {
    setFilters({ status: [], assignee: [], sprint: null, search: "" });
  };

  // Toggle status filter
  const toggleStatus = (status) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  // Toggle assignee filter
  const toggleAssignee = (assignee) => {
    setFilters(prev => ({
      ...prev,
      assignee: prev.assignee.includes(assignee)
        ? prev.assignee.filter(a => a !== assignee)
        : [...prev.assignee, assignee]
    }));
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bug className="h-8 w-8" />
              Jira Issues
            </h1>
            <p className="text-gray-500 mt-1">
              View synced Jira issues from your team
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sync status */}
            {syncStatus && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Last synced: {formatTimeAgo(syncStatus.last_synced_at)}</span>
              </div>
            )}
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
            <span className="ml-2 text-gray-500">Loading Jira issues...</span>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-sm text-gray-500">Total Issues</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                  <p className="text-sm text-gray-500">In Progress</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{stats.done}</div>
                  <p className="text-sm text-gray-500">Done</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-purple-600">{stats.totalPoints}</div>
                  <p className="text-sm text-gray-500">Total Points</p>
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
                      placeholder="Search by key or summary..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-9"
                    />
                  </div>

                  {/* Status filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Status
                        {filters.status.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {filters.status.length}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {filterOptions.statuses.map((status) => (
                        <DropdownMenuCheckboxItem
                          key={status}
                          checked={filters.status.includes(status)}
                          onCheckedChange={() => toggleStatus(status)}
                        >
                          {status}
                        </DropdownMenuCheckboxItem>
                      ))}
                      {filterOptions.statuses.length === 0 && (
                        <div className="px-2 py-1 text-sm text-gray-500">No statuses</div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Assignee filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Assignee
                        {filters.assignee.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {filters.assignee.length}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {filterOptions.assignees.map((assignee) => (
                        <DropdownMenuCheckboxItem
                          key={assignee}
                          checked={filters.assignee.includes(assignee)}
                          onCheckedChange={() => toggleAssignee(assignee)}
                        >
                          {assignee}
                        </DropdownMenuCheckboxItem>
                      ))}
                      {filterOptions.assignees.length === 0 && (
                        <div className="px-2 py-1 text-sm text-gray-500">No assignees</div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Sprint filter */}
                  <Select
                    value={filters.sprint || "all"}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      sprint: value === "all" ? null : value
                    }))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Sprints" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sprints</SelectItem>
                      {filterOptions.sprints.map((sprint) => (
                        <SelectItem key={sprint} value={sprint}>
                          {sprint}
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

            {/* Issues Table */}
            <Card>
              <CardContent className="p-0">
                {filteredIssues.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bug className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No Jira issues found</p>
                    {hasActiveFilters && (
                      <Button variant="link" onClick={clearFilters}>
                        Clear filters to see all issues
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issue Key</TableHead>
                        <TableHead className="min-w-[250px]">Summary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Sprint</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.map((issue) => (
                        <TableRow key={issue.id}>
                          <TableCell>
                            <a
                              href={issue.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              {issue.issue_key}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {issue.summary}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(issue.status)}>
                              {issue.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{issue.assignee_name || "-"}</TableCell>
                          <TableCell>{issue.story_points || "-"}</TableCell>
                          <TableCell>{issue.sprint || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
