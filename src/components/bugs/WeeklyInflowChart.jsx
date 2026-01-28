// src/components/bugs/WeeklyInflowChart.jsx
// Bar chart showing weekly bug inflow trend

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/api/apiClient';

/**
 * WeeklyInflowChart Component
 *
 * Displays a bar chart showing weekly bug inflow rate over time.
 * Requires at least 2 weeks of data to display the chart.
 *
 * @param {Object} props
 * @param {string|null} props.component - Optional component filter
 */
export function WeeklyInflowChart({ component = null }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const history = await apiClient.bugs.getKPIHistory(12, component);

        const transformed = history
          .map(record => ({
            weekEnding: record.week_ending,
            value: record.kpi_data?.bug_inflow_rate ?? null,
            label: format(new Date(record.week_ending), 'MMM d'),
          }))
          .filter(record => record.value !== null)
          .sort((a, b) => new Date(a.weekEnding) - new Date(b.weekEnding));

        setData(transformed);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch weekly inflow data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [component]);

  // Only show chart if we have 2+ weeks of data
  const showChart = data.length >= 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Bug Inflow</CardTitle>
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
        ) : !showChart ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Upload more weeks of data to see inflow trends
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} width={40} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-md p-3 shadow-md">
                        <p className="text-sm font-medium">
                          Week of {format(new Date(d.weekEnding), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Inflow: <span className="font-semibold text-foreground">{d.value}</span> bugs
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WeeklyInflowChart;
