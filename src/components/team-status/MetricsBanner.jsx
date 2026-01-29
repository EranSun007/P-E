import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

export function MetricsBanner({ summaries = [] }) {
  // Calculate aggregate metrics
  const metrics = summaries.reduce((acc, summary) => ({
    completed: acc.completed + (summary.completedCount || 0),
    blockers: acc.blockers + (summary.blockerCount || 0),
    velocity: acc.velocity + (summary.completedCount || 0) // Simple count
  }), { completed: 0, blockers: 0, velocity: 0 });

  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-3 divide-x">
          <div className="text-center px-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{metrics.completed}</span>
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>

          <div className="text-center px-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className={`h-4 w-4 ${metrics.blockers > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
              <span className="text-2xl font-bold">{metrics.blockers}</span>
            </div>
            <div className="text-sm text-muted-foreground">Blockers</div>
          </div>

          <div className="text-center px-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{metrics.velocity}</span>
            </div>
            <div className="text-sm text-muted-foreground">Velocity</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
