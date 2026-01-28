// src/components/bugs/KPIGrid.jsx
// Grid layout for displaying all 9 KPI cards with sparklines and trend arrows

import { useState, useEffect } from 'react';
import { KPICard, getKPIStatus, calculateTrend } from './KPICard';
import { apiClient } from '@/api/apiClient';
import {
  Bug,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart2,
  Activity,
  PieChart,
  Users,
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
 * Renders all 9 KPIs in a responsive grid layout with sparklines and trend arrows
 *
 * @param {Object} props
 * @param {Object} props.kpis - KPI data object from API
 * @param {string|null} props.component - Component filter (null for all)
 */
export function KPIGrid({ kpis, component = null }) {
  const [historyData, setHistoryData] = useState({});

  // Fetch 4-week KPI history for sparklines
  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await apiClient.bugs.getKPIHistory(4, component);

        // Transform history into per-KPI arrays
        // history is sorted DESC (newest first), reverse for sparkline (oldest to newest)
        const kpiHistory = {};
        const reversedHistory = [...history].reverse();

        for (const config of KPI_CONFIG) {
          kpiHistory[config.key] = reversedHistory.map(
            (h) => h.kpi_data?.[config.key] ?? null
          );
        }

        setHistoryData(kpiHistory);
      } catch (error) {
        console.error('Failed to load KPI history:', error);
        setHistoryData({});
      }
    }

    loadHistory();
  }, [component]);

  if (!kpis) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {KPI_CONFIG.map((config) => {
        const value = kpis[config.key];
        const formattedValue = formatValue(value, config.key);
        const status = getKPIStatus(config.key, value);
        const kpiHistoryData = historyData[config.key] || [];
        const trend = calculateTrend(kpiHistoryData, config.key);

        return (
          <KPICard
            key={config.key}
            title={config.title}
            value={formattedValue}
            unit={config.unit}
            status={status}
            description={config.description}
            icon={config.icon}
            historyData={kpiHistoryData}
            trend={trend}
          />
        );
      })}
    </div>
  );
}

export default KPIGrid;
