import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Shield,
  Bug,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Plus,
  Pencil,
  CheckCircle2,
  Trash2,
  ArrowRight,
} from 'lucide-react';

const DevOpsDutyCard = ({
  duty,
  onAddInsight,
  onComplete,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const [showInsightForm, setShowInsightForm] = useState(false);
  const [insightText, setInsightText] = useState('');
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  const insights = duty.insights || [];
  const isCompleted = duty.status === 'completed';

  // Calculate duration
  const getDuration = () => {
    if (duty.duration_days) return duty.duration_days;
    if (duty.start_date) {
      const start = parseISO(duty.start_date);
      const end = duty.end_date ? parseISO(duty.end_date) : new Date();
      return differenceInDays(end, start) + 1;
    }
    return null;
  };

  const duration = getDuration();

  // Format date range
  const formatDateRange = () => {
    if (!duty.start_date) return 'No date';
    const start = format(parseISO(duty.start_date), 'MMM d');
    if (!duty.end_date) return `${start} - ongoing`;
    const end = format(parseISO(duty.end_date), 'MMM d, yyyy');
    return `${start} - ${end}`;
  };

  const handleSubmitInsight = async () => {
    if (!insightText.trim()) return;

    await onAddInsight(duty.id, insightText.trim());
    setInsightText('');
    setShowInsightForm(false);
  };

  const handleComplete = async () => {
    await onComplete(duty.id, {
      end_date: new Date().toISOString().split('T')[0],
      bugs_at_end: duty.bugs_at_end,
      bugs_solved: duty.bugs_solved,
      escalations: duty.escalations,
    });
  };

  return (
    <Card className={isCompleted ? 'opacity-75' : ''}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-indigo-600" />
              DevOps Duty
            </CardTitle>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateRange()}
              </span>
              {duration && (
                <Badge variant="outline" className="text-xs">
                  {duration} day{duration !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={isCompleted ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'}
          >
            {isCompleted ? 'Completed' : 'Active'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Bug Metrics */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Bug className="h-4 w-4 text-red-500" />
              Bugs
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">{duty.bugs_at_start || 0}</span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">{duty.bugs_at_end || 0}</span>
              {(duty.bugs_solved > 0 || (duty.bugs_at_start > duty.bugs_at_end)) && (
                <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                  {duty.bugs_solved || (duty.bugs_at_start - duty.bugs_at_end)} solved
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Escalations
            </div>
            <div className="text-sm text-gray-600">
              {duty.escalations || 0}
            </div>
          </div>
        </div>

        {/* Notes */}
        {duty.notes && (
          <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
            {duty.notes}
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <Collapsible open={insightsExpanded} onOpenChange={setInsightsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                {insightsExpanded ? (
                  <ChevronUp className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}
                <Lightbulb className="h-4 w-4 mr-1 text-amber-500" />
                {insights.length} Insight{insights.length !== 1 ? 's' : ''}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-amber-50 rounded text-sm text-gray-700 flex items-start gap-2"
                >
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  {insight}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Add Insight Form */}
        {showInsightForm && (
          <div className="p-3 border rounded-lg space-y-2">
            <Input
              placeholder="What did you learn from this duty?"
              value={insightText}
              onChange={(e) => setInsightText(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitInsight();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSubmitInsight}
                disabled={!insightText.trim() || isLoading}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowInsightForm(false);
                  setInsightText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {!isCompleted && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInsightForm(true)}
                disabled={showInsightForm || isLoading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Insight
              </Button>
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(duty)}
                  disabled={isLoading}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleComplete}
                disabled={isLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete
              </Button>
            </>
          )}
          {isCompleted && onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(duty)}
              disabled={isLoading}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete DevOps Duty?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this DevOps duty record and all associated insights.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(duty.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DevOpsDutyCard;
