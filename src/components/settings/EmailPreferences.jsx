import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";

/**
 * KPI configuration matching ThresholdService on backend
 */
const KPI_CONFIG = [
  {
    key: "bug_inflow_rate",
    label: "Bug Inflow Rate",
    description: "Weekly bug creation rate",
  },
  {
    key: "median_ttfr_hours",
    label: "Time to First Response",
    description: "Median hours to first response",
  },
  {
    key: "sla_vh_percent",
    label: "SLA Compliance (VH)",
    description: "Very High priority SLA compliance",
  },
  {
    key: "sla_high_percent",
    label: "SLA Compliance (High)",
    description: "High priority SLA compliance",
  },
  {
    key: "backlog_health_score",
    label: "Backlog Health Score",
    description: "Overall backlog health metric",
  },
];

export default function EmailPreferences() {
  // State
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // kpi_key being saved
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [globalEmail, setGlobalEmail] = useState("");
  const [emailDirty, setEmailDirty] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.emailPreferences.list();

      // Build preferences object keyed by kpi_key
      const prefsMap = {};
      let foundEmail = "";

      data.forEach((pref) => {
        prefsMap[pref.kpi_key] = {
          enabled: pref.enabled,
          email: pref.email,
        };
        // Extract first email found for global email field
        if (pref.email && !foundEmail) {
          foundEmail = pref.email;
        }
      });

      setPreferences(prefsMap);
      setGlobalEmail(foundEmail);
    } catch (err) {
      console.error("Failed to load email preferences:", err);
      setError("Failed to load email preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (kpiKey, enabled) => {
    // Clear any previous messages
    setError(null);
    setSuccess(null);

    // Validate email is set before enabling
    if (enabled && !globalEmail) {
      setError("Please enter an email address before enabling notifications.");
      return;
    }

    setSaving(kpiKey);

    try {
      await apiClient.emailPreferences.update(kpiKey, {
        enabled,
        email: globalEmail,
      });

      // Update local state
      setPreferences((prev) => ({
        ...prev,
        [kpiKey]: {
          enabled,
          email: globalEmail,
        },
      }));

      setSuccess(
        `${enabled ? "Enabled" : "Disabled"} notifications for ${KPI_CONFIG.find((k) => k.key === kpiKey)?.label || kpiKey}`
      );

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to update preference:", err);
      setError("Failed to update notification preference. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const handleEmailChange = (email) => {
    setGlobalEmail(email);
    setEmailDirty(true);
    setError(null);
    setSuccess(null);
  };

  const handleEmailSave = async () => {
    if (!globalEmail) {
      setError("Please enter a valid email address.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(globalEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSavingEmail(true);
    setError(null);
    setSuccess(null);

    try {
      // Update all enabled preferences with the new email
      const enabledKpis = Object.entries(preferences)
        .filter(([_, pref]) => pref.enabled)
        .map(([key]) => key);

      for (const kpiKey of enabledKpis) {
        await apiClient.emailPreferences.update(kpiKey, {
          enabled: true,
          email: globalEmail,
        });
      }

      // Update local state
      setPreferences((prev) => {
        const updated = { ...prev };
        enabledKpis.forEach((key) => {
          if (updated[key]) {
            updated[key].email = globalEmail;
          }
        });
        return updated;
      });

      setEmailDirty(false);
      setSuccess(
        enabledKpis.length > 0
          ? `Email updated for ${enabledKpis.length} notification(s).`
          : "Email saved."
      );

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to save email:", err);
      setError("Failed to save email address. Please try again.");
    } finally {
      setSavingEmail(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading preferences...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Receive email alerts when KPIs cross into red zone thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Global email input */}
        <div className="space-y-3">
          <Label
            htmlFor="notification-email"
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Notification Email
          </Label>
          <div className="flex gap-3">
            <Input
              id="notification-email"
              type="email"
              placeholder="you@example.com"
              value={globalEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleEmailSave}
              disabled={!emailDirty || savingEmail}
              variant={emailDirty ? "default" : "outline"}
            >
              {savingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            All KPI alert emails will be sent to this address.
          </p>
        </div>

        <hr />

        {/* KPI toggles */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">
            KPI Alert Preferences
          </h3>
          <p className="text-sm text-gray-500">
            Enable or disable email notifications for individual KPIs when they
            enter red zone status.
          </p>

          <div className="space-y-3">
            {KPI_CONFIG.map((kpi) => {
              const pref = preferences[kpi.key];
              const isEnabled = pref?.enabled || false;
              const isSaving = saving === kpi.key;

              return (
                <div
                  key={kpi.key}
                  className="flex items-center justify-between py-3 px-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{kpi.label}</p>
                    <p className="text-sm text-gray-500">{kpi.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSaving && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle(kpi.key, checked)
                      }
                      disabled={isSaving}
                      aria-label={`Enable email notifications for ${kpi.label}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info section */}
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">How it works</p>
          <p>
            When you upload a CSV with KPI data, the system automatically checks
            thresholds. If any enabled KPI crosses into the red zone,
            you&apos;ll receive an email alert with details and a link to the
            dashboard.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
