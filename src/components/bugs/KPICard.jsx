// src/components/bugs/KPICard.jsx
// Reusable KPI card component with status-based color coding

import { Card } from '@/components/ui/card';

/**
 * Status color configurations for KPI cards
 * Each status has background, border, text, and icon color classes
 */
export const STATUS_COLORS = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-500',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: 'text-yellow-500',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-500',
  },
  neutral: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    icon: 'text-gray-500',
  },
};

/**
 * KPI threshold definitions for status determination
 * Each KPI has thresholds for green/yellow/red zones
 *
 * Types:
 * - lower_is_better: green when value <= threshold
 * - higher_is_better: green when value >= threshold
 */
export const KPI_THRESHOLDS = {
  bug_inflow_rate: {
    type: 'lower_is_better',
    green: 6,    // <= 6 is green
    yellow: 8,   // <= 8 is yellow
    // > 8 is red
  },
  median_ttfr_hours: {
    type: 'lower_is_better',
    green: 24,   // < 24 is green
    yellow: 48,  // < 48 is yellow
    // >= 48 is red
  },
  sla_vh_percent: {
    type: 'higher_is_better',
    green: 80,   // >= 80 is green
    yellow: 60,  // >= 60 is yellow
    // < 60 is red
  },
  sla_high_percent: {
    type: 'higher_is_better',
    green: 80,   // >= 80 is green
    yellow: 60,  // >= 60 is yellow
    // < 60 is red
  },
  backlog_health_score: {
    type: 'higher_is_better',
    green: 70,   // >= 70 is green
    yellow: 50,  // >= 50 is yellow
    // < 50 is red
  },
};

/**
 * Determine KPI status based on value and thresholds
 * @param {string} kpiKey - The KPI identifier (e.g., 'bug_inflow_rate')
 * @param {number} value - The current KPI value
 * @returns {'green' | 'yellow' | 'red' | 'neutral'} - Status color
 */
export function getKPIStatus(kpiKey, value) {
  const threshold = KPI_THRESHOLDS[kpiKey];

  // KPIs without defined thresholds use neutral status
  if (!threshold) {
    return 'neutral';
  }

  // Handle null/undefined values
  if (value === null || value === undefined || isNaN(value)) {
    return 'neutral';
  }

  if (threshold.type === 'lower_is_better') {
    // For lower is better: green <= threshold, yellow <= threshold, else red
    if (value <= threshold.green) return 'green';
    if (value <= threshold.yellow) return 'yellow';
    return 'red';
  } else {
    // For higher is better: green >= threshold, yellow >= threshold, else red
    if (value >= threshold.green) return 'green';
    if (value >= threshold.yellow) return 'yellow';
    return 'red';
  }
}

/**
 * KPICard Component
 * Displays a single KPI metric with status-based color coding
 *
 * @param {Object} props
 * @param {string} props.title - KPI display name
 * @param {number|string} props.value - Current KPI value
 * @param {string} props.unit - Unit suffix (e.g., '%', '/week', 'h')
 * @param {'green'|'yellow'|'red'|'neutral'} props.status - Status for color coding
 * @param {string} props.description - Optional description text
 * @param {React.ComponentType} props.icon - Lucide icon component
 */
export function KPICard({ title, value, unit, status = 'neutral', description, icon: Icon }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.neutral;

  // Format the display value
  const displayValue = value === null || value === undefined || value === '-'
    ? '-'
    : value;

  return (
    <Card className={`${colors.bg} ${colors.border} border-2 p-4 relative`}>
      {/* Icon in top-right */}
      {Icon && (
        <div className="absolute top-4 right-4">
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
      )}

      {/* KPI Title */}
      <p className={`text-sm font-medium ${colors.text} opacity-80 mb-1 pr-8`}>
        {title}
      </p>

      {/* Value Display */}
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${colors.text}`}>
          {displayValue}
        </span>
        {unit && displayValue !== '-' && (
          <span className={`text-sm ${colors.text} opacity-70`}>
            {unit}
          </span>
        )}
      </div>

      {/* Optional Description */}
      {description && (
        <p className={`text-xs ${colors.text} opacity-60 mt-2`}>
          {description}
        </p>
      )}
    </Card>
  );
}

export default KPICard;
