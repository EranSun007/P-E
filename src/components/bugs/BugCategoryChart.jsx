// src/components/bugs/BugCategoryChart.jsx
// Donut chart showing bug distribution by component/category

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Component-specific colors for visual distinction
const COMPONENT_COLORS = {
  deployment: '#3b82f6', // blue-500
  'foss-vulnerabilities': '#8b5cf6', // violet-500
  'service-broker': '#06b6d4', // cyan-500
  'cm-metering': '#f59e0b', // amber-500
  'sdm-metering': '#10b981', // emerald-500
  other: '#6b7280', // gray-500
};

/**
 * BugCategoryChart Component
 *
 * Displays a donut chart showing the distribution of bugs
 * across different components/categories.
 *
 * @param {Object} props
 * @param {Object} props.categoryDistribution - Bug counts keyed by category name
 */
export function BugCategoryChart({ categoryDistribution }) {
  // Transform data for Recharts
  const data = Object.entries(categoryDistribution || {})
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: COMPONENT_COLORS[name] || COMPONENT_COLORS.other,
    }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bug Distribution by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-muted-foreground">
            No category data available
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${value} bugs (${((value / total) * 100).toFixed(1)}%)`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BugCategoryChart;
