import { useState, useEffect } from "react";
import { GitHub, UserSettings } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import {
  Github,
  GitPullRequest,
  GitCommit,
  CircleDot,
  Star,
  GitFork,
  RefreshCw,
  Plus,
  Search,
  Loader2,
  ExternalLink,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GitHubReposPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [githubStatus, setGithubStatus] = useState(null);
  const [error, setError] = useState(null);

  // Add repo dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  // Selected repo for details
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoDetails, setRepoDetails] = useState({ pulls: [], issues: [], commits: [] });
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState(null);

  useEffect(() => {
    checkGitHubConnection();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      const status = await UserSettings.getGitHubStatus();
      setGithubStatus(status);
      if (status.connected) {
        loadRepos();
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to check GitHub status:", err);
      setError("Failed to check GitHub connection");
      setLoading(false);
    }
  };

  const loadRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await GitHub.listRepos();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load repos:", err);
      setError(err.message || "Failed to load repositories");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await GitHub.syncAllRepos();
      await loadRepos();
    } catch (err) {
      console.error("Sync failed:", err);
      setError("Failed to sync repositories");
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = async () => {
    if (!repoInput.trim()) return;

    // If it looks like owner/repo format, try to add directly
    if (repoInput.includes("/")) {
      handleAddRepo(repoInput);
      return;
    }

    setSearching(true);
    try {
      const results = await GitHub.searchRepos(repoInput);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
      setError("Failed to search repositories");
    } finally {
      setSearching(false);
    }
  };

  const handleAddRepo = async (fullName) => {
    setAdding(true);
    try {
      await GitHub.addRepo(fullName);
      await loadRepos();
      setShowAddDialog(false);
      setRepoInput("");
      setSearchResults([]);
    } catch (err) {
      console.error("Failed to add repo:", err);
      setError(err.message || "Failed to add repository");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRepo = async () => {
    if (!repoToDelete) return;
    try {
      await GitHub.removeRepo(repoToDelete.id);
      await loadRepos();
      setShowDeleteDialog(false);
      setRepoToDelete(null);
      if (selectedRepo?.id === repoToDelete.id) {
        setSelectedRepo(null);
      }
    } catch (err) {
      console.error("Failed to delete repo:", err);
      setError("Failed to remove repository");
    }
  };

  const handleSelectRepo = async (repo) => {
    setSelectedRepo(repo);
    setLoadingDetails(true);
    try {
      const [pulls, issues, commits] = await Promise.all([
        GitHub.getPullRequests(repo.id),
        GitHub.getIssues(repo.id),
        GitHub.getCommits(repo.id, 20)
      ]);
      setRepoDetails({ pulls, issues, commits });
    } catch (err) {
      console.error("Failed to load repo details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSyncRepo = async (repo) => {
    try {
      await GitHub.syncRepo(repo.id);
      await loadRepos();
      if (selectedRepo?.id === repo.id) {
        handleSelectRepo(repo);
      }
    } catch (err) {
      console.error("Sync failed:", err);
      setError("Failed to sync repository");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  // Not connected state
  if (!loading && !githubStatus?.connected) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-6 w-6" />
                GitHub Integration
              </CardTitle>
              <CardDescription>
                Connect your GitHub account to track repository progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>GitHub Not Connected</AlertTitle>
                <AlertDescription>
                  You need to connect your GitHub account before you can track repositories.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Go to Settings to Connect GitHub
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Github className="h-8 w-8" />
              GitHub Repositories
            </h1>
            <p className="text-gray-500 mt-1">
              Track your repositories progress, PRs, issues, and commits
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncAll} disabled={syncing}>
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync All
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Repository
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading repositories...</span>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{summary.total_repos}</div>
                    <p className="text-sm text-gray-500">Repositories</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold flex items-center gap-1">
                      <Star className="h-5 w-5 text-yellow-500" />
                      {summary.total_stars}
                    </div>
                    <p className="text-sm text-gray-500">Total Stars</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold flex items-center gap-1">
                      <GitPullRequest className="h-5 w-5 text-green-500" />
                      {summary.total_open_prs}
                    </div>
                    <p className="text-sm text-gray-500">Open PRs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold flex items-center gap-1">
                      <CircleDot className="h-5 w-5 text-blue-500" />
                      {summary.total_open_issues}
                    </div>
                    <p className="text-sm text-gray-500">Open Issues</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-purple-600">
                      {summary.merged_prs_last_30_days}
                    </div>
                    <p className="text-sm text-gray-500">Merged PRs (30d)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-indigo-600">
                      {summary.commits_last_30_days}
                    </div>
                    <p className="text-sm text-gray-500">Commits (30d)</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Repository List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Tracked Repositories</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary?.repos?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Github className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No repositories tracked yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setShowAddDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Repo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {summary?.repos?.map((repo) => (
                        <div
                          key={repo.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedRepo?.id === repo.id
                              ? "bg-blue-50 border-blue-200"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => handleSelectRepo(repo)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{repo.full_name}</div>
                              <div className="text-sm text-gray-500 truncate">
                                {repo.description || "No description"}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {repo.stars_count}
                                </span>
                                <span className="flex items-center gap-1">
                                  <GitPullRequest className="h-3 w-3" />
                                  {repo.open_prs_count}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CircleDot className="h-3 w-3" />
                                  {repo.open_issues_count}
                                </span>
                              </div>
                            </div>
                            {repo.sync_error && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Repository Details */}
              <Card className="lg:col-span-2">
                {selectedRepo ? (
                  <>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {selectedRepo.full_name}
                            <a
                              href={selectedRepo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </CardTitle>
                          <CardDescription>{selectedRepo.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncRepo(selectedRepo)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setRepoToDelete(selectedRepo);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {selectedRepo.last_synced_at && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-2">
                          <Clock className="h-3 w-3" />
                          Last synced: {formatTimeAgo(selectedRepo.last_synced_at)}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {loadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <Tabs defaultValue="pulls">
                          <TabsList>
                            <TabsTrigger value="pulls" className="flex items-center gap-1">
                              <GitPullRequest className="h-4 w-4" />
                              PRs ({repoDetails.pulls.length})
                            </TabsTrigger>
                            <TabsTrigger value="issues" className="flex items-center gap-1">
                              <CircleDot className="h-4 w-4" />
                              Issues ({repoDetails.issues.length})
                            </TabsTrigger>
                            <TabsTrigger value="commits" className="flex items-center gap-1">
                              <GitCommit className="h-4 w-4" />
                              Commits ({repoDetails.commits.length})
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="pulls" className="mt-4">
                            {repoDetails.pulls.length === 0 ? (
                              <p className="text-center text-gray-500 py-4">No pull requests</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>PR</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Updated</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {repoDetails.pulls.slice(0, 10).map((pr) => (
                                    <TableRow key={pr.id}>
                                      <TableCell>
                                        <a
                                          href={pr.html_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          #{pr.pr_number}
                                        </a>
                                        <div className="text-sm text-gray-500 truncate max-w-xs">
                                          {pr.title}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {pr.author_avatar_url && (
                                            <img
                                              src={pr.author_avatar_url}
                                              alt={pr.author}
                                              className="w-5 h-5 rounded-full"
                                            />
                                          )}
                                          <span className="text-sm">{pr.author}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          className={
                                            pr.state === "merged"
                                              ? "bg-purple-100 text-purple-800"
                                              : pr.state === "open"
                                              ? "bg-green-100 text-green-800"
                                              : "bg-red-100 text-red-800"
                                          }
                                        >
                                          {pr.state}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-sm text-gray-500">
                                        {formatTimeAgo(pr.updated_at)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </TabsContent>

                          <TabsContent value="issues" className="mt-4">
                            {repoDetails.issues.length === 0 ? (
                              <p className="text-center text-gray-500 py-4">No issues</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Issue</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Updated</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {repoDetails.issues.slice(0, 10).map((issue) => (
                                    <TableRow key={issue.id}>
                                      <TableCell>
                                        <a
                                          href={issue.html_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          #{issue.issue_number}
                                        </a>
                                        <div className="text-sm text-gray-500 truncate max-w-xs">
                                          {issue.title}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {issue.author_avatar_url && (
                                            <img
                                              src={issue.author_avatar_url}
                                              alt={issue.author}
                                              className="w-5 h-5 rounded-full"
                                            />
                                          )}
                                          <span className="text-sm">{issue.author}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          className={
                                            issue.state === "open"
                                              ? "bg-green-100 text-green-800"
                                              : "bg-gray-100 text-gray-800"
                                          }
                                        >
                                          {issue.state}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-sm text-gray-500">
                                        {formatTimeAgo(issue.updated_at)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </TabsContent>

                          <TabsContent value="commits" className="mt-4">
                            {repoDetails.commits.length === 0 ? (
                              <p className="text-center text-gray-500 py-4">No commits</p>
                            ) : (
                              <div className="space-y-2">
                                {repoDetails.commits.slice(0, 15).map((commit) => (
                                  <div
                                    key={commit.id}
                                    className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded"
                                  >
                                    {commit.author_avatar_url && (
                                      <img
                                        src={commit.author_avatar_url}
                                        alt={commit.author_name}
                                        className="w-6 h-6 rounded-full mt-1"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <a
                                        href={commit.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm hover:text-blue-600 line-clamp-2"
                                      >
                                        {commit.message?.split("\n")[0]}
                                      </a>
                                      <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                        <span>{commit.author_name}</span>
                                        <span>·</span>
                                        <span>{formatTimeAgo(commit.committed_at)}</span>
                                        <span>·</span>
                                        <code className="bg-gray-100 px-1 rounded">
                                          {commit.sha?.substring(0, 7)}
                                        </code>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      )}
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex items-center justify-center py-20 text-gray-400">
                    <div className="text-center">
                      <Github className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Select a repository to view details</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </>
        )}

        {/* Add Repository Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Repository</DialogTitle>
              <DialogDescription>
                Enter a repository name (owner/repo) or search for repositories
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., facebook/react or search term"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching || !repoInput.trim()}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {searchResults.map((repo) => (
                    <div
                      key={repo.full_name}
                      className="p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                      onClick={() => handleAddRepo(repo.full_name)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{repo.full_name}</div>
                          <div className="text-sm text-gray-500 truncate">
                            {repo.description || "No description"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Star className="h-4 w-4" />
                          {repo.stars}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {adding && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Adding repository...
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Repository?</DialogTitle>
              <DialogDescription>
                This will stop tracking {repoToDelete?.full_name} and remove all cached data.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteRepo}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
