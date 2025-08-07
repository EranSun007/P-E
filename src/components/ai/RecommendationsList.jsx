import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  ChevronDown, 
  ChevronRight,
  Target,
  Lightbulb
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/**
 * Recommendations List Component
 * Displays AI-generated recommendations with priority, actions, and tracking
 */
export default function RecommendationsList({ recommendations = [], onRecommendationAction }) {
  const [completedRecommendations, setCompletedRecommendations] = useState(new Set());
  const [expandedRecommendations, setExpandedRecommendations] = useState(new Set());

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const handleRecommendationToggle = (index, completed) => {
    const newCompleted = new Set(completedRecommendations);
    if (completed) {
      newCompleted.add(index);
    } else {
      newCompleted.delete(index);
    }
    setCompletedRecommendations(newCompleted);

    // Notify parent component if callback provided
    if (onRecommendationAction) {
      onRecommendationAction({
        type: completed ? 'complete' : 'uncomplete',
        recommendation: recommendations[index],
        index
      });
    }
  };

  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRecommendations(newExpanded);
  };

  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const completedCount = completedRecommendations.size;
  const totalCount = recommendations.length;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recommendations available.</p>
            <p className="text-sm">Run a project analysis to get AI-powered recommendations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recommendations Progress
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {completedCount} of {totalCount} completed
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion Rate</span>
              <span>{Math.round(completionPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-3">
        {sortedRecommendations.map((recommendation, index) => {
          const isCompleted = completedRecommendations.has(index);
          const isExpanded = expandedRecommendations.has(index);
          const priorityColor = getPriorityColor(recommendation.priority);
          const PriorityIcon = getPriorityIcon(recommendation.priority);

          return (
            <Card key={index} className={`transition-all duration-200 ${isCompleted ? 'opacity-75 bg-muted/30' : ''}`}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={(checked) => handleRecommendationToggle(index, checked)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-medium text-sm leading-relaxed ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                          {recommendation.action}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={`${priorityColor} border text-xs`}>
                            <PriorityIcon />
                            <span className="ml-1">{recommendation.priority.toUpperCase()}</span>
                          </Badge>
                          {recommendation.timeframe && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {recommendation.timeframe}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Rationale Preview */}
                      <p className={`text-sm text-muted-foreground ${isCompleted ? 'line-through' : ''}`}>
                        {recommendation.rationale.length > 100 && !isExpanded
                          ? `${recommendation.rationale.substring(0, 100)}...`
                          : recommendation.rationale
                        }
                      </p>

                      {/* Expand/Collapse Button */}
                      {(recommendation.rationale.length > 100 || recommendation.estimatedImpact) && (
                        <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(index)}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
                              {isExpanded ? (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="h-3 w-3 mr-1" />
                                  Show More
                                </>
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent className="space-y-2 mt-2">
                            {recommendation.rationale.length > 100 && (
                              <p className="text-sm text-muted-foreground">
                                {recommendation.rationale}
                              </p>
                            )}
                            
                            {recommendation.estimatedImpact && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h5 className="text-xs font-medium text-blue-800 mb-1">Expected Impact</h5>
                                <p className="text-xs text-blue-700">{recommendation.estimatedImpact}</p>
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Actions */}
      {totalCount > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {completedCount === totalCount ? (
                  <span className="text-green-600 font-medium">
                    🎉 All recommendations completed!
                  </span>
                ) : (
                  <span>
                    {totalCount - completedCount} recommendations remaining
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allIndexes = new Set(Array.from({ length: totalCount }, (_, i) => i));
                    setCompletedRecommendations(allIndexes);
                  }}
                  disabled={completedCount === totalCount}
                >
                  Mark All Complete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompletedRecommendations(new Set())}
                  disabled={completedCount === 0}
                >
                  Reset All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Compact Recommendations List
 * Simplified version for use in smaller spaces
 */
export function CompactRecommendationsList({ recommendations = [], maxItems = 3 }) {
  const sortedRecommendations = [...recommendations]
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, maxItems);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No recommendations available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedRecommendations.map((recommendation, index) => (
        <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getPriorityColor(recommendation.priority).replace('text-', 'bg-')}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{recommendation.action}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {recommendation.rationale}
            </p>
          </div>
        </div>
      ))}
      
      {recommendations.length > maxItems && (
        <div className="text-center pt-2">
          <span className="text-xs text-muted-foreground">
            +{recommendations.length - maxItems} more recommendations
          </span>
        </div>
      )}
    </div>
  );
}
