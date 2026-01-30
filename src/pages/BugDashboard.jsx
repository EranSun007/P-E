// src/pages/BugDashboard.jsx
// Bug Dashboard page with KPI cards, filters, and CSV upload

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Bug, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/api/apiClient';
import CSVUploadDialog from '@/components/bugs/CSVUploadDialog';
import { KPIGrid } from '@/components/bugs/KPIGrid';
import { CriticalAlertBanner } from '@/components/bugs/CriticalAlertBanner';
import { AgingBugsTable } from '@/components/bugs/AgingBugsTable';
import { MTTRBarChart } from '@/components/bugs/MTTRBarChart';
import { BugCategoryChart } from '@/components/bugs/BugCategoryChart';
import { KPITrendChart } from '@/components/bugs/KPITrendChart';
import { WeeklyInflowChart } from '@/components/bugs/WeeklyInflowChart';
import { Badge } from '@/components/ui/badge';
import {
  getCurrentCycle,
  getPreviousCycleId,
  listSprints,
  formatDateRange,
} from '@/utils/releaseCycles';

/**
 * BugDashboard Page
 *
 * Main dashboard for DevOps bug metrics analysis.
 * Features:
 * - Week filter (from uploaded CSVs)
 * - Component filter (extracted from bug data)
 * - 9 KPI cards with status colors
 * - Critical alert banner for red zone KPIs
 * - CSV upload for importing JIRA data
 */
const BugDashboard = () => {
  console.log('[BugDashboard] Component rendering START');

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [lastUpload, setLastUpload] = useState(null);

  // Data state
  const [uploads, setUploads] = useState([]);
  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [selectedSprint, setSelectedSprint] = useState('all'); // 'all' or sprint ID like '2601a'
  const [selectedComponent, setSelectedComponent] = useState('all');
  const [kpis, setKPIs] = useState(null);
  const [bugs, setBugs] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Generate sprint options (6 sprints before and after current)
   */
  console.log('[BugDashboard] About to run sprintOptions useMemo');
  const sprintOptions = useMemo(() => {
    console.log('[BugDashboard] sprintOptions useMemo EXECUTING');
    try {
      console.log('[BugDashboard] Calling getCurrentCycle...');
      const currentCycle = getCurrentCycle();
      console.log('[BugDashboard] Current cycle:', currentCycle?.id);
      // Go back 3 cycles (6 sprints) from 2 cycles before current
      console.log('[BugDashboard] Calling getPreviousCycleId 3x...');
      const startCycleId = getPreviousCycleId(getPreviousCycleId(getPreviousCycleId(currentCycle.id)));
      console.log('[BugDashboard] Start cycle ID:', startCycleId);
      // Get 6 cycles (12 sprints total)
      console.log('[BugDashboard] Calling listSprints...');
      const sprints = listSprints(startCycleId, 6);
      console.log('[BugDashboard] Generated sprints:', sprints?.length);
      console.log('[BugDashboard] sprintOptions useMemo COMPLETE');
      return sprints;
    } catch (err) {
      console.error('[BugDashboard] Failed to generate sprint options:', err);
      return [];
    }
  }, []);
  console.log('[BugDashboard] sprintOptions useMemo done, continuing render');

  /**
   * Load uploads list on mount
   */
  useEffect(() => {
    async function loadUploads() {
      try {
        setLoading(true);
        const uploadList = await apiClient.bugs.listUploads();
        setUploads(uploadList);
        // Auto-select most recent upload
        if (uploadList.length > 0) {
          setSelectedUploadId(uploadList[0].id);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to load uploads:', err);
        setError(err.message || 'Failed to load uploads');
      } finally {
        setLoading(false);
      }
    }
    loadUploads();
  }, []);

  /**
   * Load KPIs and bugs when upload, sprint, or component changes
   */
  useEffect(() => {
    // Need either an upload selected (for "All Time") or a sprint selected
    if (selectedSprint === 'all' && !selectedUploadId) {
      setKPIs(null);
      setBugs([]);
      return;
    }

    async function loadData() {
      try {
        setKpisLoading(true);
        const componentFilter = selectedComponent === 'all' ? null : selectedComponent;

        let kpiData, bugData;

        if (selectedSprint !== 'all') {
          // Sprint selected - use date range queries
          const sprint = sprintOptions.find((s) => s.id === selectedSprint);
          if (!sprint) {
            setKPIs(null);
            setBugs([]);
            return;
          }

          const startDate = format(sprint.startDate, 'yyyy-MM-dd');
          const endDate = format(sprint.endDate, 'yyyy-MM-dd');

          [kpiData, bugData] = await Promise.all([
            apiClient.bugs.getKPIsByDateRange(startDate, endDate, componentFilter),
            apiClient.bugs.listBugsByDateRange(startDate, endDate, {
              component: componentFilter,
              limit: 100,
            }),
          ]);
        } else {
          // "All Time" - use upload-based queries (most recent upload)
          if (!selectedUploadId) {
            setKPIs(null);
            setBugs([]);
            return;
          }

          [kpiData, bugData] = await Promise.all([
            apiClient.bugs.getKPIs(selectedUploadId, componentFilter),
            apiClient.bugs.listBugs(selectedUploadId, {
              component: componentFilter,
              limit: 100,
            }),
          ]);
        }

        setKPIs(kpiData);
        setBugs(bugData);
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setKpisLoading(false);
      }
    }
    loadData();
  }, [selectedUploadId, selectedSprint, selectedComponent, sprintOptions]);

  /**
   * Extract components list dynamically from KPIs data
   * Components are derived from actual uploaded bug data
   */
  const components = useMemo(() => {
    if (!kpis?.category_distribution) return [];
    return Object.keys(kpis.category_distribution).sort();
  }, [kpis]);

  /**
   * Handle successful upload
   * Refreshes uploads list and selects the new upload
   */
  const handleUploadComplete = (result) => {
    setLastUpload(result);
    // Refresh uploads list and select new upload
    apiClient.bugs.listUploads().then((uploadList) => {
      setUploads(uploadList);
      if (uploadList.length > 0) {
        setSelectedUploadId(uploadList[0].id);
      }
    });
  };

  /**
   * Handle week filter change
   */
  const handleWeekChange = (value) => {
    setSelectedUploadId(value);
    // Reset component filter when changing week
    setSelectedComponent('all');
  };

  /**
   * Handle sprint filter change
   */
  const handleSprintChange = (value) => {
    setSelectedSprint(value);
    // Reset component filter when changing sprint
    setSelectedComponent('all');
  };

  console.log('[BugDashboard] State:', { loading, error, uploadsCount: uploads.length, selectedUploadId, selectedSprint });
  console.log('[BugDashboard] Component rendering END - about to return JSX');

  // Initial loading state
  if (loading) {
    console.log('[BugDashboard] Rendering loading state - returning JSX');
    return (
      <div className="space-y-6">
        <PageHeader onUploadClick={() => setUploadDialogOpen(true)} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <CSVUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    );
  }

  // Error state
  if (error && uploads.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader onUploadClick={() => setUploadDialogOpen(true)} />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
        <CSVUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    );
  }

  // Empty state - no uploads yet
  if (uploads.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader onUploadClick={() => setUploadDialogOpen(true)} />
        <Card>
          <CardContent className="py-12 text-center">
            <Bug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No bug data uploaded yet.
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First CSV
            </Button>
          </CardContent>
        </Card>
        <CSVUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="space-y-6">
      <PageHeader onUploadClick={() => setUploadDialogOpen(true)} />

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4">
        {/* Sprint/Takt Filter */}
        <Select value={selectedSprint} onValueChange={handleSprintChange}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Select sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time (Latest Upload)</SelectItem>
            {sprintOptions.map((sprint) => sprint?.id && (
              <SelectItem key={sprint.id} value={sprint.id}>
                Sprint {sprint.id} ({formatDateRange(sprint.startDate, sprint.endDate)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Week Filter - only show when "All Time" is selected */}
        {selectedSprint === 'all' && (
          <Select value={selectedUploadId || ''} onValueChange={handleWeekChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {uploads.map((upload) => (
                <SelectItem key={upload.id} value={upload.id}>
                  Week of {format(new Date(upload.week_ending), 'MMM d, yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Component Filter with Badge */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedComponent}
            onValueChange={setSelectedComponent}
            disabled={components.length === 0}
          >
            <SelectTrigger className="w-[220px]">
              <span className="text-xs text-muted-foreground mr-1">Component:</span>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Components</SelectItem>
              {components.map((comp) => (
                <SelectItem key={comp} value={comp}>
                  {comp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Active filter badge */}
          {selectedComponent !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {selectedComponent}
            </Badge>
          )}
        </div>

        {/* Loading indicator for KPIs */}
        {kpisLoading && (
          <div className="flex items-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading...
          </div>
        )}
      </div>

      {/* Critical Alert Banner */}
      <CriticalAlertBanner kpis={kpis} />

      {/* KPI Grid */}
      {kpis ? (
        <>
          <KPIGrid
            kpis={kpis}
            component={selectedComponent === 'all' ? null : selectedComponent}
          />

          {/* KPI Trend Chart */}
          <KPITrendChart
            component={selectedComponent === 'all' ? null : selectedComponent}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MTTRBarChart mttrByPriority={kpis?.mttr_by_priority} />
            <BugCategoryChart categoryDistribution={kpis?.category_distribution} />
            <WeeklyInflowChart
              component={selectedComponent === 'all' ? null : selectedComponent}
            />
          </div>

          {/* Aging Bugs Table */}
          <AgingBugsTable bugs={bugs} />
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Select a week to view KPIs
          </CardContent>
        </Card>
      )}

      {/* Last Upload Info */}
      {lastUpload && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Last upload:</span>{' '}
              {lastUpload.bugCount} bugs,{' '}
              {lastUpload.components?.length || 0} components detected
            </p>
          </CardContent>
        </Card>
      )}

      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};

/**
 * Page Header Component
 * Extracted for reuse across different states
 */
function PageHeader({ onUploadClick }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bug Dashboard</h1>
        <p className="text-muted-foreground">
          Track and analyze DevOps bug metrics from weekly JIRA exports
        </p>
      </div>
      <Button onClick={onUploadClick}>
        <Upload className="h-4 w-4 mr-2" />
        Upload CSV
      </Button>
    </div>
  );
}

export default BugDashboard;
