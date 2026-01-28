// src/pages/BugDashboard.jsx
// Bug Dashboard page with CSV upload trigger for JIRA bug metrics

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Bug } from 'lucide-react';
import CSVUploadDialog from '@/components/bugs/CSVUploadDialog';

/**
 * BugDashboard Page
 *
 * Main dashboard for DevOps bug metrics analysis.
 * Phase 11: Upload CSV functionality
 * Phase 12: KPI cards, charts, and aging bug analysis
 */
const BugDashboard = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [lastUpload, setLastUpload] = useState(null);

  /**
   * Handle successful upload
   * Stores result for display and future dashboard refresh
   */
  const handleUploadComplete = (result) => {
    setLastUpload(result);
    // Dashboard refresh with KPI cards coming in Phase 12
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bug Dashboard</h1>
          <p className="text-muted-foreground">
            Track and analyze DevOps bug metrics from weekly JIRA exports
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload CSV
        </Button>
      </div>

      {/* Placeholder card - KPI dashboard coming in Phase 12 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Coming Soon: KPI Dashboard
          </CardTitle>
          <CardDescription>
            Phase 12 will add KPI cards, charts, and aging bug analysis.
            For now, you can upload JIRA CSV exports to populate the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lastUpload ? (
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Last upload:</p>
              <p>Total bugs: {lastUpload.bugCount}</p>
              <p>Components: {lastUpload.components?.join(', ') || 'None detected'}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No uploads yet. Click &quot;Upload CSV&quot; to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};

export default BugDashboard;
