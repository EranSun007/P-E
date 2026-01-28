// src/components/bugs/KPISparkline.jsx
// Mini sparkline component for KPI cards showing trend visualization

import { ResponsiveContainer, LineChart, Line } from 'recharts';

/**
 * KPISparkline Component
 * Renders a minimal sparkline visualization for KPI trend data.
 *
 * @param {Object} props
 * @param {number[]} props.data - Array of numeric values (typically 4 weeks)
 * @param {string} props.color - Line color (default: gray-500)
 */
export function KPISparkline({ data = [], color = '#6b7280' }) {
  // Transform array to Recharts format
  const chartData = data
    .filter((value) => value !== null && value !== undefined)
    .map((value, index) => ({ value, index }));

  // Need at least 2 points for a line
  if (chartData.length < 2) {
    return null;
  }

  return (
    <div className="w-[60px] h-[24px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default KPISparkline;
