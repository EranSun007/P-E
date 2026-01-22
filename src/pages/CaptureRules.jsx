// src/pages/CaptureRules.jsx
import { useState, useEffect } from "react";
import { CaptureRule } from "@/api/entities";
import { format } from "date-fns";
import {
  FileCode,
  Plus,
  RefreshCw,
  Search,
  Loader2,
  AlertTriangle,
  Globe,
  Power,
  PowerOff,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import RuleBuilderDialog from "@/components/capture/RuleBuilderDialog";

export default function CaptureRulesPage() {
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data state
  const [rules, setRules] = useState([]);

  // Search state
  const [search, setSearch] = useState("");

  // Dialog states
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Delete confirmation state
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false);

  // Load rules on mount
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CaptureRule.list();
      setRules(data || []);
    } catch (err) {
      console.error("Failed to load capture rules:", err);
      setError(err.message || "Failed to load capture rules");
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleCreate = () => {
    setEditingRule(null);
    setShowRuleDialog(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setShowRuleDialog(true);
  };

  const handleSave = async (ruleData) => {
    try {
      if (editingRule) {
        // Update existing rule
        const updated = await CaptureRule.update(editingRule.id, ruleData);
        setRules(rules.map(r => r.id === editingRule.id ? updated : r));
      } else {
        // Create new rule
        const created = await CaptureRule.create(ruleData);
        setRules([...rules, created]);
      }
      setShowRuleDialog(false);
      setEditingRule(null);
    } catch (err) {
      console.error("Failed to save rule:", err);
      throw err; // Let RuleBuilderDialog handle the error display
    }
  };

  const handleToggleEnabled = async (rule) => {
    try {
      const updated = await CaptureRule.update(rule.id, { enabled: !rule.enabled });
      setRules(rules.map(r => r.id === rule.id ? updated : r));
    } catch (err) {
      console.error("Failed to update rule:", err);
      setError("Failed to update rule status");
    }
  };

  const confirmDelete = (rule) => {
    setRuleToDelete(rule);
    setConfirmDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!ruleToDelete) return;

    try {
      await CaptureRule.delete(ruleToDelete.id);
      setRules(rules.filter(r => r.id !== ruleToDelete.id));
      setConfirmDeleteDialog(false);
      setRuleToDelete(null);
    } catch (err) {
      console.error("Failed to delete rule:", err);
      setError("Failed to delete rule");
    }
  };

  // Filter rules by search
  const filteredRules = rules.filter(rule => {
    if (!search) return true;

    const searchLower = search.toLowerCase();
    const matchesName = rule.name?.toLowerCase().includes(searchLower);
    const matchesPattern = rule.url_pattern?.toLowerCase().includes(searchLower);

    return matchesName || matchesPattern;
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileCode className="h-8 w-8" />
            Capture Rules
          </h1>
          <p className="text-muted-foreground mt-1">
            Define URL patterns and CSS selectors to extract data from web pages
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRules} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name or URL pattern..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRules.length === 0 ? (
            <EmptyState
              icon={search ? Search : FileCode}
              title={search ? "No rules found" : "No capture rules yet"}
              description={
                search
                  ? "Try adjusting your search terms"
                  : "Create your first capture rule to start extracting data from web pages"
              }
              action={
                !search && (
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Rule
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL Pattern</TableHead>
                  <TableHead className="text-center">Selectors</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id}>
                    {/* Name */}
                    <TableCell className="font-medium">{rule.name}</TableCell>

                    {/* URL Pattern */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {rule.url_pattern}
                        </code>
                      </div>
                    </TableCell>

                    {/* Selectors Count */}
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {rule.selectors?.length || 0} selector{rule.selectors?.length !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {rule.enabled ? (
                          <>
                            <Power className="h-4 w-4 text-green-600" />
                            <Badge variant="default" className="bg-green-600">Enabled</Badge>
                          </>
                        ) : (
                          <>
                            <PowerOff className="h-4 w-4 text-gray-400" />
                            <Badge variant="secondary">Disabled</Badge>
                          </>
                        )}
                      </div>
                    </TableCell>

                    {/* Created Date */}
                    <TableCell className="text-sm text-muted-foreground">
                      {rule.created_date ? format(new Date(rule.created_date), "MMM d, yyyy") : "—"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Enable/Disable Toggle */}
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => handleToggleEnabled(rule)}
                          title={rule.enabled ? "Disable rule" : "Enable rule"}
                        />

                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(rule)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rule Builder Dialog */}
      <RuleBuilderDialog
        open={showRuleDialog}
        onOpenChange={setShowRuleDialog}
        rule={editingRule}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteDialog} onOpenChange={setConfirmDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{ruleToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
