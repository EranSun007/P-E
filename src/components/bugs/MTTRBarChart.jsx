// src/components/bugs/MTTRBarChart.jsx
// Horizontal bar chart showing Mean Time To Resolution by priority

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Priority-specific colors matching the design system
const PRIORITY_COLORS = {
  'Very High': '#ef4444', // red-500
  High: '#f97316', // orange-500
  Medium: '#eab308', // yellow-500
  Low: '#22c55e', // green-500
};

// Priority order for consistent sorting
const PRIORITY_ORDER = ['Very High', 'High', 'Medium', 'Low'];

/**
 * MTTRBarChart Component
 *
 * Displays a horizontal bar chart showing Mean Time To Resolution
 * by priority level. Bars are color-coded by priority.
 *
 * @param {Object} props
 * @param {Object} props.mttrByPriority - MTTR data keyed by priority
 *   Each entry has { median, count } properties
 */
export function MTTRBarChart({ mttrByPriority }) {
  // Transform data for Recharts
  const data = Object.entries(mttrByPriority || {})
    .filter(([, values]) => values.count > 0)
    .map(([priority, values]) => ({
      priority,
      mttr: values.median || 0,
      count: values.count,
    }))
    .sort((a, b) => {
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>MTTR by Priority</CardTitle>
        <p className="text-sm text-muted-foreground">
          Mean Time to Resolution (hours)
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No resolved bugs to analyze
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
              >
                <XAxis type="number" unit="h" />
                <YAxis dataKey="priority" type="category" width={80} />
                <Tooltip
                  formatter={(value, _name, props) => [
                    `${value.toFixed(1)}h - ${props.payload.count} bugs`,
                    'MTTR',
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="mttr" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={PRIORITY_COLORS[entry.priority] || '#6b7280'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MTTRBarChart;
