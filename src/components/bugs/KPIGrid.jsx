// src/components/bugs/KPIGrid.jsx
// Grid layout for displaying all 9 KPI cards

import { KPICard, getKPIStatus } from './KPICard';
import {
  Bug,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart2,
  Activity,
  PieChart,
  Users,
  Timer,
} from 'lucide-react';

/**
 * KPI configuration array defining all 9 KPIs
 * Each entry maps API field to display properties
 */
const KPI_CONFIG = [
  {
    key: 'bug_inflow_rate',
    title: 'Bug Inflow Rate',
    unit: '/week',
    icon: Bug,
    description: 'New bugs per week',
  },
  {
    key: 'median_ttfr_hours',
    title: 'Time to First Response',
    unit: 'h',
    icon: Clock,
    description: 'Median hours to first response',
  },
  {
    key: 'sla_vh_percent',
    title: 'SLA Compliance (VH)',
    unit: '%',
    icon: CheckCircle,
    description: 'Very High priority SLA met',
  },
  {
    key: 'sla_high_percent',
    title: 'SLA Compliance (High)',
    unit: '%',
    icon: CheckCircle,
    description: 'High priority SLA met',
  },
  {
    key: 'backlog_health_score',
    title: 'Backlog Health',
    unit: '',
    icon: Activity,
    description: 'Score 0-100, higher is better',
  },
  {
    key: 'open_bugs_count',
    title: 'Open Bugs',
    unit: '',
    icon: AlertTriangle,
    description: 'Currently open bugs',
  },
  {
    key: 'automated_percent',
    title: 'Automated Ratio',
    unit: '%',
    icon: BarChart2,
    description: 'Bugs with automation label',
  },
  {
    key: 'avg_bugs_per_week',
    title: 'Avg Bugs/Week',
    unit: '',
    icon: PieChart,
    description: 'Historical weekly average',
  },
  {
    key: 'total_bugs',
    title: 'Total Bugs',
    unit: '',
    icon: Users,
    description: 'Total bugs in dataset',
  },
];

/**
 * Format a KPI value for display
 * @param {any} value - Raw value from API
 * @param {string} key - KPI key for formatting rules
 * @returns {string} - Formatted display value
 */
function formatValue(value, key) {
  if (value === null || value === undefined) {
    return '-';
  }

  // Handle numeric values
  if (typeof value === 'number') {
    // Percentages should be whole numbers
    if (key.includes('percent')) {
      return Math.round(value).toString();
    }
    // Score values should be whole numbers
    if (key.includes('score') || key.includes('count') || key === 'total_bugs' || key === 'open_bugs_count') {
      return Math.round(value).toString();
    }
    // Other numeric values with decimals
    if (!Number.isInteger(value)) {
      return value.toFixed(1);
    }
    return value.toString();
  }

  return String(value);
}

/**
 * KPIGrid Component
 * Renders all 9 KPIs in a responsive grid layout
 *
 * @param {Object} props
 * @param {Object} props.kpis - KPI data object from API
 */
export function KPIGrid({ kpis }) {
  if (!kpis) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {KPI_CONFIG.map((config) => {
        const value = kpis[config.key];
        const formattedValue = formatValue(value, config.key);
        const status = getKPIStatus(config.key, value);

        return (
          <KPICard
            key={config.key}
            title={config.title}
            value={formattedValue}
            unit={config.unit}
            status={status}
            description={config.description}
            icon={config.icon}
          />
        );
      })}
    </div>
  );
}

export default KPIGrid;
