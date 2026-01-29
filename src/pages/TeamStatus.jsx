// src/pages/TeamStatus.jsx
// Team Status page - Weekly health and progress summaries

import { TeamStatusProvider, useTeamStatus, TEAM_DEPARTMENTS } from '@/contexts/TeamStatusContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Loader2 } from 'lucide-react';

function TeamStatusContent() {
  const { summaries, currentTeam, setCurrentTeam, currentWeek, loading, error } = useTeamStatus();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Status</h1>
          <p className="text-muted-foreground">Weekly health and progress summaries</p>
        </div>
      </div>

      {/* Team Tabs */}
      <Tabs value={currentTeam} onValueChange={setCurrentTeam}>
        <TabsList>
          {TEAM_DEPARTMENTS.map(dept => (
            <TabsTrigger key={dept.id} value={dept.id}>
              {dept.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading team summaries...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load summaries: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && summaries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No team summaries for this week</p>
            <p className="text-sm text-muted-foreground">
              Data will appear once daily summaries are stored via MCP
            </p>
          </CardContent>
        </Card>
      )}

      {/* Content placeholder for Plan 02 */}
      {!loading && !error && summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Summaries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {summaries.length} summaries loaded - UI components coming in next plan
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TeamStatus() {
  return (
    <TeamStatusProvider>
      <TeamStatusContent />
    </TeamStatusProvider>
  );
}
