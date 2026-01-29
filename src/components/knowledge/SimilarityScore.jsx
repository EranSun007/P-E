// src/components/knowledge/SimilarityScore.jsx
import PropTypes from 'prop-types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Visual similarity score indicator
 * Score: 0.0 to 1.0 scale from MCP search
 */
export function SimilarityScore({ score, showLabel = true, size = 'default' }) {
  if (score === undefined || score === null) return null;

  // Convert 0.0-1.0 to 0-100 percentage
  const percentage = Math.round(score * 100);

  // Color-coded thresholds
  const getVariant = () => {
    if (score >= 0.8) return 'default'; // High relevance (green)
    if (score >= 0.6) return 'secondary'; // Medium relevance (gray)
    return 'outline'; // Low relevance
  };

  const getColorClass = () => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getTextColorClass = () => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  if (size === 'compact') {
    return (
      <Badge variant={getVariant()} className="text-xs font-mono">
        {percentage}%
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-xs text-muted-foreground">Relevance:</span>
      )}
      <div className="flex items-center gap-2">
        <Progress
          value={percentage}
          className={cn('w-16 h-2', size === 'small' && 'w-12 h-1.5')}
          indicatorClassName={getColorClass()}
        />
        <span className={cn('text-xs font-mono', getTextColorClass())}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

SimilarityScore.propTypes = {
  score: PropTypes.number,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['default', 'small', 'compact']),
};

// Compact inline variant for tight spaces
export function SimilarityBadge({ score }) {
  if (score === undefined || score === null) return null;

  const percentage = Math.round(score * 100);

  const getVariant = () => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'outline';
  };

  return (
    <Badge variant={getVariant()} className="text-xs font-mono">
      {percentage}% match
    </Badge>
  );
}

SimilarityBadge.propTypes = {
  score: PropTypes.number,
};
