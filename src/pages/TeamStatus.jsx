// src/pages/TeamStatus.jsx
// Team Status page - Weekly health and progress summaries

import { TeamStatusProvider, useTeamStatus, TEAM_DEPARTMENTS } from '@/contexts/TeamStatusContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Loader2 } from 'lucide-react';
import { MetricsBanner } from '@/components/team-status/MetricsBanner';
import { MemberCard } from '@/components/team-status/MemberCard';
import { TimelineNav } from '@/components/team-status/TimelineNav';
import { TeamHealthBadge } from '@/components/team-status/TeamHealthBadge';

function TeamStatusContent() {
  const {
    summaries,
    currentTeam,
    setCurrentTeam,
    currentWeek,
    setCurrentWeek,
    availableSprints,
    loading,
    error
  } = useTeamStatus();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team Status</h1>
          <p className="text-muted-foreground">Weekly health and progress summaries</p>
        </div>

        {/* Timeline Navigation */}
        <TimelineNav
          currentWeek={currentWeek}
          availableSprints={availableSprints}
          onWeekChange={setCurrentWeek}
        />
      </div>

      {/* Team Tabs with Health Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs value={currentTeam} onValueChange={setCurrentTeam}>
          <TabsList>
            {TEAM_DEPARTMENTS.map(dept => (
              <TabsTrigger key={dept.id} value={dept.id}>
                {dept.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Team Health Summary */}
        {!loading && summaries.length > 0 && (
          <TeamHealthBadge summaries={summaries} />
        )}
      </div>

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

      {/* Dashboard Content */}
      {!loading && !error && summaries.length > 0 && (
        <div className="space-y-6">
          {/* Aggregate Metrics Banner */}
          <MetricsBanner summaries={summaries} />

          {/* Member Cards */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Team Members</h2>
            <div className="grid gap-3">
              {summaries.map((summary, idx) => (
                <MemberCard
                  key={summary.memberId || idx}
                  member={summary.member || { name: summary.memberName || `Member ${idx + 1}` }}
                  summary={summary}
                />
              ))}
            </div>
          </div>
        </div>
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
