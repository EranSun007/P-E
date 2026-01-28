import { useState, useEffect } from "react";
import { UserSettings } from "@/api/entities";
import {
  Github,
  Check,
  X,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  AlertTriangle,
  Unlink
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export default function GitHubSettings() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  useEffect(() => {
    loadGitHubStatus();
  }, []);

  const loadGitHubStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await UserSettings.getGitHubStatus();
      setStatus(result);
    } catch (err) {
      console.error("Failed to load GitHub status:", err);
      setError("Failed to check GitHub connection status");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError("Please enter a GitHub Personal Access Token");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await UserSettings.setGitHubToken(token.trim());
      setStatus({
        connected: true,
        user: result.user
      });
      setToken("");
      setSuccess(`Connected to GitHub as ${result.user.login}`);
    } catch (err) {
      console.error("Failed to connect GitHub:", err);
      setError(err.message || "Failed to connect to GitHub. Please check your token.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    setError(null);
    try {
      await UserSettings.deleteGitHubToken();
      setStatus({ connected: false });
      setShowDisconnectDialog(false);
      setSuccess("Disconnected from GitHub");
    } catch (err) {
      console.error("Failed to disconnect GitHub:", err);
      setError("Failed to disconnect from GitHub");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading GitHub status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Integration
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to track repository progress, pull requests, issues, and commits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {status?.connected ? (
          // Connected state
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                {status.user?.avatar_url && (
                  <img
                    src={status.user.avatar_url}
                    alt={status.user.login}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{status.user?.name || status.user?.login}</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                  <a
                    href={`https://github.com/${status.user?.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    @{status.user?.login}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDisconnectDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>

            <div className="text-sm text-gray-500">
              <p>
                Your GitHub Personal Access Token is securely stored. You can now:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Track repositories from the GitHub page</li>
                <li>View pull requests, issues, and commits</li>
                <li>Monitor repository metrics and progress</li>
              </ul>
            </div>
          </div>
        ) : (
          // Not connected state
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github-token">Personal Access Token</Label>
              <div className="relative">
                <Input
                  id="github-token"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Create a token at{" "}
                <a
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub Settings → Developer Settings → Personal Access Tokens
                </a>
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Required token permissions:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <code className="bg-gray-200 px-1 rounded">repo</code> - Read access to repositories
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <code className="bg-gray-200 px-1 rounded">read:user</code> - Read your profile
                </li>
              </ul>
            </div>

            <Button type="submit" disabled={saving || !token.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Github className="h-4 w-4 mr-2" />
                  Connect GitHub
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect GitHub?</DialogTitle>
            <DialogDescription>
              This will remove your GitHub token and stop syncing repository data.
              Your tracked repositories will be kept, but metrics won't update until you reconnect.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisconnectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
