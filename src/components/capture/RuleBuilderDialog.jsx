// src/components/capture/RuleBuilderDialog.jsx
import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2, AlertCircle, Info, TestTube } from "lucide-react";
import { PRESET_TEMPLATES, TEMPLATE_OPTIONS } from './PresetTemplates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Selector types from generic-extractor.js
const SELECTOR_TYPES = [
  { value: 'text', label: 'Text Content' },
  { value: 'html', label: 'HTML' },
  { value: 'attribute', label: 'Attribute' },
  { value: 'href', label: 'Link (href)' },
  { value: 'src', label: 'Source (src)' },
];

export default function RuleBuilderDialog({ open, onOpenChange, rule, onSave }) {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url_pattern: '',
    enabled: true,
  });

  const [selectors, setSelectors] = useState([]);

  // New selector form state
  const [newSelector, setNewSelector] = useState({
    field_name: '',
    selector: '',
    type: 'text',
    attribute: '',
    required: false,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when rule changes or dialog opens
  useEffect(() => {
    if (open) {
      if (rule) {
        // Edit mode - populate from existing rule
        setFormData({
          name: rule.name || '',
          url_pattern: rule.url_pattern || '',
          enabled: rule.enabled ?? true,
        });
        setSelectors(Array.isArray(rule.selectors) ? rule.selectors : []);
      } else {
        // Create mode - reset to defaults
        setFormData({
          name: '',
          url_pattern: '',
          enabled: true,
        });
        setSelectors([]);
      }
      setNewSelector({
        field_name: '',
        selector: '',
        type: 'text',
        attribute: '',
        required: false,
      });
      setError(null);
    }
  }, [rule, open]);

  // Template application function
  const applyTemplate = (templateKey) => {
    if (!templateKey || templateKey === 'none') return;

    const template = PRESET_TEMPLATES[templateKey];
    if (!template) return;

    setFormData({
      name: template.name,
      url_pattern: template.url_pattern,
      enabled: true
    });
    setSelectors([...template.selectors]);
  };

  // Selector management functions
  const addSelector = () => {
    // Validate required fields
    if (!newSelector.field_name.trim()) {
      setError('Field name is required');
      return;
    }
    if (!newSelector.selector.trim()) {
      setError('CSS selector is required');
      return;
    }

    // Validate attribute is provided when type is 'attribute'
    if (newSelector.type === 'attribute' && !newSelector.attribute.trim()) {
      setError('Attribute name is required for type "attribute"');
      return;
    }

    // Add to selectors array
    const selectorToAdd = {
      field_name: newSelector.field_name.trim(),
      selector: newSelector.selector.trim(),
      type: newSelector.type,
      required: newSelector.required,
    };

    // Include attribute only if type is 'attribute'
    if (newSelector.type === 'attribute') {
      selectorToAdd.attribute = newSelector.attribute.trim();
    }

    setSelectors([...selectors, selectorToAdd]);

    // Reset new selector form
    setNewSelector({
      field_name: '',
      selector: '',
      type: 'text',
      attribute: '',
      required: false,
    });
    setError(null);
  };

  const removeSelector = (index) => {
    setSelectors(selectors.filter((_, i) => i !== index));
  };

  // Form handlers
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewSelectorChange = (field, value) => {
    setNewSelector((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }

    if (!formData.url_pattern.trim()) {
      setError('URL pattern is required');
      return;
    }

    if (selectors.length === 0) {
      setError('At least one selector is required');
      return;
    }

    setSaving(true);
    try {
      const ruleData = {
        ...formData,
        name: formData.name.trim(),
        url_pattern: formData.url_pattern.trim(),
        selectors,
      };

      await onSave(ruleData);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit' : 'Create'} Capture Rule</DialogTitle>
          <DialogDescription>
            Define a URL pattern and CSS selectors to extract data from matching pages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Template Selection - only show for new rules */}
          {!rule && (
            <div className="space-y-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Label className="text-sm font-medium text-blue-800">
                Start from Template (Optional)
              </Label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select a preset template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {TEMPLATE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-blue-600">
                Templates provide starting selectors. Customize them for your specific site.
              </p>
            </div>
          )}

          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Grafana Build Status"
            />
          </div>

          {/* URL Pattern */}
          <div className="space-y-2">
            <Label htmlFor="url_pattern">URL Pattern (glob)</Label>
            <Input
              id="url_pattern"
              value={formData.url_pattern}
              onChange={(e) => handleInputChange('url_pattern', e.target.value)}
              placeholder="e.g., *grafana.sap/* or *jenkins.io/job/*"
            />
            <p className="text-xs text-muted-foreground">
              Use * as wildcard. Example: *grafana.sap/* matches any page on grafana.sap domain.
            </p>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enabled</Label>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => handleInputChange('enabled', checked)}
            />
          </div>

          {/* Existing Selectors */}
          <div className="space-y-2">
            <Label>Selectors ({selectors.length})</Label>
            {selectors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No selectors added yet.</p>
            ) : (
              <div className="space-y-2">
                {selectors.map((sel, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 border rounded-md bg-muted/50"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sel.field_name}</span>
                        <Badge variant="outline">{sel.type}</Badge>
                        {sel.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{sel.selector}</p>
                      {sel.type === 'attribute' && sel.attribute && (
                        <p className="text-xs text-muted-foreground">
                          Attribute: <span className="font-mono">{sel.attribute}</span>
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSelector(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Selector Form */}
          <div className="space-y-3 p-4 border rounded-md bg-background">
            <Label className="text-base">Add Selector</Label>

            <div className="grid grid-cols-2 gap-3">
              {/* Field Name */}
              <div className="space-y-2">
                <Label htmlFor="new_field_name" className="text-xs">Field Name</Label>
                <Input
                  id="new_field_name"
                  value={newSelector.field_name}
                  onChange={(e) => handleNewSelectorChange('field_name', e.target.value)}
                  placeholder="e.g., build_status"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="new_type" className="text-xs">Type</Label>
                <Select
                  value={newSelector.type}
                  onValueChange={(value) => handleNewSelectorChange('type', value)}
                >
                  <SelectTrigger id="new_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SELECTOR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CSS Selector */}
            <div className="space-y-2">
              <Label htmlFor="new_selector" className="text-xs">CSS Selector</Label>
              <Input
                id="new_selector"
                value={newSelector.selector}
                onChange={(e) => handleNewSelectorChange('selector', e.target.value)}
                placeholder="e.g., .build-row .status"
                className="font-mono text-xs"
              />
              <p className="text-xs text-gray-500">
                CSS selector (e.g., ".class", "#id", "[data-attr]")
              </p>
            </div>

            {/* Attribute (shown only when type is 'attribute') */}
            {newSelector.type === 'attribute' && (
              <div className="space-y-2">
                <Label htmlFor="new_attribute" className="text-xs">Attribute Name</Label>
                <Input
                  id="new_attribute"
                  value={newSelector.attribute}
                  onChange={(e) => handleNewSelectorChange('attribute', e.target.value)}
                  placeholder="e.g., data-status"
                  className="font-mono text-xs"
                />
              </div>
            )}

            {/* Required Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="new_required"
                checked={newSelector.required}
                onCheckedChange={(checked) => handleNewSelectorChange('required', checked)}
              />
              <Label htmlFor="new_required" className="text-xs cursor-pointer">
                Required (validation will fail if not found)
              </Label>
            </div>

            {/* Add Button */}
            <Button
              type="button"
              onClick={addSelector}
              size="sm"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Selector
            </Button>
          </div>

          {/* Testing Instructions */}
          <Alert className="bg-amber-50 border-amber-200">
            <TestTube className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>To test your selectors:</strong>
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>Save this rule first</li>
                <li>Navigate to a page matching the URL pattern</li>
                <li>Click the P&E extension icon</li>
                <li>Click "Capture This Page" to test extraction</li>
                <li>Check Capture Inbox for results</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {rule ? 'Update' : 'Create'} Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
