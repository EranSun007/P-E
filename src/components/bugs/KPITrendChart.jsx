// src/components/bugs/KPITrendChart.jsx
// Line chart showing KPI trends over multiple weeks with threshold bands

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/api/apiClient';
import { KPI_THRESHOLDS } from './KPICard';

/**
 * KPI options for dropdown selector
 */
const KPI_OPTIONS = [
  { key: 'bug_inflow_rate', label: 'Bug Inflow Rate', unit: '/week' },
  { key: 'median_ttfr_hours', label: 'Time to First Response', unit: 'h' },
  { key: 'sla_vh_percent', label: 'SLA Compliance VH', unit: '%' },
  { key: 'sla_high_percent', label: 'SLA Compliance High', unit: '%' },
  { key: 'backlog_health_score', label: 'Backlog Health', unit: '' },
];

/**
 * Week range options for dropdown selector
 */
const WEEK_OPTIONS = [
  { value: '4', label: '4 weeks' },
  { value: '8', label: '8 weeks' },
  { value: '12', label: '12 weeks' },
];

/**
 * Threshold band colors
 */
const BAND_COLORS = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

/**
 * Custom tooltip for displaying KPI value and date
 */
function CustomTooltip({ active, payload, selectedKPI }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const kpiOption = KPI_OPTIONS.find(opt => opt.key === selectedKPI);
  const value = data.value;
  const formattedValue = value !== null && value !== undefined
    ? `${Number(value).toFixed(1)}${kpiOption?.unit || ''}`
    : 'N/A';

  return (
    <div className="bg-background border border-border rounded-md p-3 shadow-md">
      <p className="text-sm font-medium text-foreground mb-1">
        {format(new Date(data.weekEnding), 'MMM d, yyyy')}
      </p>
      <p className="text-sm text-muted-foreground">
        {kpiOption?.label}: <span className="font-semibold text-foreground">{formattedValue}</span>
      </p>
    </div>
  );
}

/**
 * KPITrendChart Component
 *
 * Displays a line chart showing KPI trends over multiple weeks.
 * Features:
 * - KPI selector dropdown
 * - Week range selector (4, 8, 12 weeks)
 * - Threshold bands (green/yellow/red zones)
 * - Custom tooltip with date and value
 *
 * @param {Object} props
 * @param {string|null} props.component - Optional component filter
 */
export function KPITrendChart({ component = null }) {
  const [selectedKPI, setSelectedKPI] = useState('bug_inflow_rate');
  const [selectedWeeks, setSelectedWeeks] = useState('12');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch historical data when KPI, weeks, or component changes
  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.bugs.getKPIHistory(parseInt(selectedWeeks, 10), component);

        // Transform data: extract selected KPI value from each record
        const transformed = data
          .map(record => ({
            weekEnding: record.week_ending,
            value: record.kpi_data?.[selectedKPI] ?? null,
          }))
          .filter(record => record.value !== null)
          .sort((a, b) => new Date(a.weekEnding) - new Date(b.weekEnding));

        setHistoryData(transformed);
      } catch (err) {
        console.error('Failed to fetch KPI history:', err);
        setError(err.message || 'Failed to load trend data');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [selectedKPI, selectedWeeks, component]);

  // Get threshold configuration for selected KPI
  const threshold = KPI_THRESHOLDS[selectedKPI];

  // Calculate Y-axis domain based on data and thresholds
  const calculateYDomain = () => {
    if (historyData.length === 0) return [0, 100];

    const values = historyData.map(d => d.value).filter(v => v !== null);
    const dataMax = Math.max(...values);
    const dataMin = Math.min(...values);

    // Include threshold values in the domain calculation
    const thresholdMax = threshold ? Math.max(threshold.green, threshold.yellow) : 0;
    const maxValue = Math.max(dataMax, thresholdMax) * 1.2; // 20% buffer
    const minValue = Math.min(0, dataMin);

    return [minValue, maxValue];
  };

  const [yMin, yMax] = calculateYDomain();

  // Render threshold bands as ReferenceArea components
  const renderThresholdBands = () => {
    if (!threshold) return null;

    const { type, green, yellow } = threshold;

    if (type === 'lower_is_better') {
      // Green: 0 to green threshold
      // Yellow: green to yellow threshold
      // Red: yellow to max
      return (
        <>
          <ReferenceArea
            y1={0}
            y2={green}
            fill={BAND_COLORS.green}
            fillOpacity={0.15}
          />
          <ReferenceArea
            y1={green}
            y2={yellow}
            fill={BAND_COLORS.yellow}
            fillOpacity={0.15}
          />
          <ReferenceArea
            y1={yellow}
            y2={yMax}
            fill={BAND_COLORS.red}
            fillOpacity={0.15}
          />
        </>
      );
    } else {
      // higher_is_better
      // Red: 0 to yellow threshold
      // Yellow: yellow to green threshold
      // Green: green to max
      return (
        <>
          <ReferenceArea
            y1={0}
            y2={yellow}
            fill={BAND_COLORS.red}
            fillOpacity={0.15}
          />
          <ReferenceArea
            y1={yellow}
            y2={green}
            fill={BAND_COLORS.yellow}
            fillOpacity={0.15}
          />
          <ReferenceArea
            y1={green}
            y2={yMax}
            fill={BAND_COLORS.green}
            fillOpacity={0.15}
          />
        </>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>KPI Trend</CardTitle>
          <div className="flex gap-2">
            {/* KPI selector */}
            <Select value={selectedKPI} onValueChange={setSelectedKPI}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select KPI" />
              </SelectTrigger>
              <SelectContent>
                {KPI_OPTIONS.map(option => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Week selector */}
            <Select value={selectedWeeks} onValueChange={setSelectedWeeks}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {WEEK_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-destructive">
            {error}
          </div>
        ) : historyData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No historical data available
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historyData}
                margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
              >
                {/* Threshold bands */}
                {renderThresholdBands()}

                <XAxis
                  dataKey="weekEnding"
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 12 }}
                  width={50}
                />
                <Tooltip
                  content={<CustomTooltip selectedKPI={selectedKPI} />}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default KPITrendChart;
