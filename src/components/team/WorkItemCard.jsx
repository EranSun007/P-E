import { useState } from 'react';
import { format, parseISO } from 'date-fns';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileText,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Plus,
  ArrowUpCircle,
  Folder,
  Calendar,
  Pencil,
} from 'lucide-react';

const WorkItemCard = ({
  workItem,
  onAddInsight,
  onMarkComplete,
  onReactivate,
  onEdit,
  isLoading = false,
}) => {
  const [showInsightForm, setShowInsightForm] = useState(false);
  const [insightText, setInsightText] = useState('');
  const [insightType, setInsightType] = useState('keep');
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Parse insights from JSONB
  const insights = Array.isArray(workItem.insights)
    ? workItem.insights
    : typeof workItem.insights === 'string'
      ? JSON.parse(workItem.insights || '[]')
      : [];

  // Get latest insight
  const latestInsight = insights.length > 0 ? insights[insights.length - 1] : null;

  const handleSubmitInsight = async () => {
    if (!insightText.trim()) return;

    await onAddInsight(workItem.id, { text: insightText.trim(), type: insightType });
    setInsightText('');
    setInsightType('keep');
    setShowInsightForm(false);
  };

  const getInsightTypeStyles = (type) => {
    return type === 'keep'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const getInsightIcon = (type) => {
    return type === 'keep'
      ? <CheckCircle2 className="h-3 w-3" />
      : <ArrowUpCircle className="h-3 w-3" />;
  };

  const isCompleted = workItem.status === 'completed';

  return (
    <Card className={isCompleted ? 'opacity-75' : ''}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-gray-500" />
              {workItem.name}
            </CardTitle>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              {workItem.project_name && (
                <span className="flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  {workItem.project_name}
                </span>
              )}
              {workItem.sprint_name && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {workItem.sprint_name}
                </span>
              )}
              {workItem.effort_estimation && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Est: {workItem.effort_estimation}
                </span>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={isCompleted ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
          >
            {isCompleted ? 'Completed' : 'Active'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Latest Insight */}
        {latestInsight && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">{latestInsight.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getInsightTypeStyles(latestInsight.type)}`}
                  >
                    {getInsightIcon(latestInsight.type)}
                    <span className="ml-1">{latestInsight.type}</span>
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {format(parseISO(latestInsight.date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Insight Form */}
        {showInsightForm && (
          <div className="p-3 border rounded-lg space-y-2">
            <Input
              placeholder="What did you learn or observe?"
              value={insightText}
              onChange={(e) => setInsightText(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex items-center gap-2">
              <Select value={insightType} onValueChange={setInsightType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Keep
                    </div>
                  </SelectItem>
                  <SelectItem value="improve">
                    <div className="flex items-center gap-1">
                      <ArrowUpCircle className="h-3 w-3 text-amber-600" />
                      Improve
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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

        {/* Insight History Collapsible */}
        {insights.length > 1 && (
          <Collapsible open={historyExpanded} onOpenChange={setHistoryExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                {historyExpanded ? (
                  <ChevronUp className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}
                View History ({insights.length} insights)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {insights
                .slice(0, -1)
                .reverse()
                .map((insight, idx) => (
                  <div
                    key={insight.id || idx}
                    className="p-2 bg-gray-50 rounded text-sm"
                  >
                    <p className="text-gray-700">{insight.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getInsightTypeStyles(insight.type)}`}
                      >
                        {insight.type}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {format(parseISO(insight.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
            </CollapsibleContent>
          </Collapsible>
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
                  onClick={() => onEdit(workItem)}
                  disabled={isLoading}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkComplete(workItem.id)}
                disabled={isLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark Complete
              </Button>
            </>
          )}
          {isCompleted && onReactivate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReactivate(workItem.id)}
              disabled={isLoading}
            >
              Reactivate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkItemCard;
