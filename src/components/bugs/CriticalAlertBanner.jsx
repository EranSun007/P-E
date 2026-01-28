// src/components/bugs/CriticalAlertBanner.jsx
// Alert banner displayed when any KPI is in red (critical) zone

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { getKPIStatus, KPI_THRESHOLDS } from './KPICard';

/**
 * Human-readable labels for KPIs with thresholds
 */
const KPI_LABELS = {
  bug_inflow_rate: 'Bug Inflow Rate',
  median_ttfr_hours: 'Time to First Response',
  sla_vh_percent: 'SLA Compliance (VH)',
  sla_high_percent: 'SLA Compliance (High)',
  backlog_health_score: 'Backlog Health',
};

/**
 * CriticalAlertBanner Component
 * Displays a prominent alert when any KPI is in the red zone
 *
 * @param {Object} props
 * @param {Object} props.kpis - KPI data object from API
 */
export function CriticalAlertBanner({ kpis }) {
  if (!kpis) {
    return null;
  }

  // Check only KPIs that have defined thresholds
  const criticalKPIs = Object.keys(KPI_THRESHOLDS)
    .filter((key) => {
      const value = kpis[key];
      const status = getKPIStatus(key, value);
      return status === 'red';
    })
    .map((key) => KPI_LABELS[key] || key);

  // Don't show banner if no KPIs are critical
  if (criticalKPIs.length === 0) {
    return null;
  }

  const isSingle = criticalKPIs.length === 1;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isSingle ? '1 KPI Needs Attention' : `${criticalKPIs.length} KPIs Need Attention`}
      </AlertTitle>
      <AlertDescription>
        The following metric{isSingle ? ' is' : 's are'} in the critical zone:{' '}
        <strong>{criticalKPIs.join(', ')}</strong>
      </AlertDescription>
    </Alert>
  );
}

export default CriticalAlertBanner;
