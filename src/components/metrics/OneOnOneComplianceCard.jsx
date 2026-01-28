import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import { logger } from '@/utils/logger';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  CalendarOff,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = {
  onTrack: '#22c55e',    // green-500
  overdue: '#ef4444',    // red-500
  excluded: '#9ca3af',   // gray-400
};

export default function OneOnOneComplianceCard() {
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rollingDays, setRollingDays] = useState('30');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadCompliance();
  }, [rollingDays]);

  const loadCompliance = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.metrics.getOneOnOneCompliance(parseInt(rollingDays, 10));
      setCompliance(data);
    } catch (err) {
      logger.error('Failed to load 1:1 compliance', { error: String(err) });
      setError('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-100 rounded w-32 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-gray-100 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            1:1 Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={loadCompliance}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!compliance || compliance.summary.total === 0) {
    return (
      <Card className="bg-gray-50 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            1:1 Compliance
          </CardTitle>
          <CardDescription>Track meeting frequency by role</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Users className="h-10 w-10 text-gray-400 mb-3" />
          <p className="text-gray-500 text-center">
            No team members to track
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary, members } = compliance;

  // Prepare pie chart data
  const pieData = [
    { name: 'On Track', value: summary.onTrack, color: COLORS.onTrack },
    { name: 'Overdue', value: summary.overdue, color: COLORS.overdue },
    { name: 'Excluded', value: summary.excluded, color: COLORS.excluded },
  ].filter(d => d.value > 0);

  // Get compliance status color
  const getComplianceColor = (percent) => {
    if (percent >= 80) return 'text-green-600';
    if (percent >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'on_track':
        return <Badge className="bg-green-100 text-green-700 border-green-200">On Track</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>;
      case 'excluded':
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200">On Leave</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              1:1 Compliance
            </CardTitle>
            <CardDescription>Meeting frequency by role cadence</CardDescription>
          </div>
          <Select value={rollingDays} onValueChange={setRollingDays}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pb-0">
        {/* Summary Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getComplianceColor(summary.compliancePercent)}`}>
              {summary.compliancePercent}%
            </div>
            <div className="text-xs text-gray-500">Compliance</div>
          </div>
          <div className="h-24 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} members`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="p-2 bg-green-50 rounded">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-700">{summary.onTrack}</span>
            </div>
            <div className="text-xs text-green-600">On Track</div>
          </div>
          <div className="p-2 bg-red-50 rounded">
            <div className="flex items-center justify-center gap-1">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-700">{summary.overdue}</span>
            </div>
            <div className="text-xs text-red-600">Overdue</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="flex items-center justify-center gap-1">
              <CalendarOff className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-gray-600">{summary.excluded}</span>
            </div>
            <div className="text-xs text-gray-500">On Leave</div>
          </div>
        </div>

        {/* Member List (Collapsible) */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-2">
              <span className="text-sm text-gray-600">
                {expanded ? 'Hide' : 'Show'} member details
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {members.map((member) => (
              <div
                key={member.id}
                className={`p-3 rounded-lg border ${
                  member.status === 'overdue'
                    ? 'bg-red-50 border-red-100'
                    : member.status === 'excluded'
                    ? 'bg-gray-50 border-gray-100'
                    : 'bg-green-50 border-green-100'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.role}</div>
                  </div>
                  {getStatusBadge(member.status)}
                </div>
                {member.status !== 'excluded' && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <Clock className="h-3 w-3" />
                    {member.lastMeetingDate ? (
                      <span>
                        Last: {member.lastMeetingDate}
                        {member.daysSinceLastMeeting !== null && (
                          <span className="ml-1">
                            ({member.daysSinceLastMeeting} days ago)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-red-600">No 1:1 recorded</span>
                    )}
                    <span className="text-gray-400">|</span>
                    <span>Cadence: {member.cadenceDays} days</span>
                  </div>
                )}
                {member.daysUntilDue !== null && member.status !== 'excluded' && (
                  <div className="text-xs mt-1">
                    {member.daysUntilDue > 0 ? (
                      <span className="text-green-600">Due in {member.daysUntilDue} days</span>
                    ) : (
                      <span className="text-red-600">
                        Overdue by {Math.abs(member.daysUntilDue)} days
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
