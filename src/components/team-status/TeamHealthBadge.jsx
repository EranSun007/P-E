import { Badge } from '@/components/ui/badge';
import { calculateHealth, getHealthTextClass } from '@/utils/healthCalculation';

export function TeamHealthBadge({ summaries = [] }) {
  // Count health statuses
  const healthCounts = summaries.reduce((acc, summary) => {
    const health = calculateHealth(summary);
    acc[health.status] = (acc[health.status] || 0) + 1;
    return acc;
  }, {});

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {healthCounts.green > 0 && (
        <Badge variant="outline" className={getHealthTextClass('green')}>
          {healthCounts.green} green
        </Badge>
      )}
      {healthCounts.yellow > 0 && (
        <Badge variant="outline" className={getHealthTextClass('yellow')}>
          {healthCounts.yellow} yellow
        </Badge>
      )}
      {healthCounts.red > 0 && (
        <Badge variant="outline" className={getHealthTextClass('red')}>
          {healthCounts.red} red
        </Badge>
      )}
    </div>
  );
}
