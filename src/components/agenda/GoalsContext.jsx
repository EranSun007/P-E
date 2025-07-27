// src/components/agenda/GoalsContext.jsx
// Component to display employee goals context in one-on-one meetings

import React, { useState, useEffect } from 'react';
import EmployeeGoalsService from '@/services/employeeGoalsService.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Target, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function GoalsContext({ employeeId, onAddAgendaItem }) {
  const [goalsContext, setGoalsContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedItems, setSuggestedItems] = useState([]);

  useEffect(() => {
    if (employeeId) {
      loadGoalsContext();
    }
  }, [employeeId]);

  const loadGoalsContext = async () => {
    try {
      setLoading(true);
      const [context, suggestions] = await Promise.all([
        EmployeeGoalsService.getGoalsForMeeting(employeeId),
        EmployeeGoalsService.suggestAgendaItems(employeeId)
      ]);
      
      setGoalsContext(context);
      setSuggestedItems(suggestions);
    } catch (error) {
      console.error('Error loading goals context:', error);
      setGoalsContext({
        activeGoals: [],
        goalsSummary: { total: 0, active: 0, completed: 0, paused: 0 },
        suggestedTopics: [],
        error: 'Failed to load goals context'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestion = (suggestion) => {
    if (onAddAgendaItem) {
      onAddAgendaItem({
        title: suggestion,
        type: 'goal-related',
        status: 'active'
      });
    }
    setShowSuggestions(false);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Goals Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!goalsContext || goalsContext.goalsSummary.total === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Goals Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No goals found for this team member. Consider discussing goal setting in this meeting.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Goals Context
          <div className="flex gap-1 ml-auto">
            <Badge variant="secondary">{goalsContext.goalsSummary.active} Active</Badge>
            <Badge variant="outline">{goalsContext.goalsSummary.total} Total</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goals Summary */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{goalsContext.goalsSummary.completed} Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>{goalsContext.goalsSummary.paused} Paused</span>
          </div>
        </div>

        {/* Active Goals */}
        {goalsContext.activeGoals.length > 0 && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="font-medium">Active Goals ({goalsContext.activeGoals.length})</span>
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {goalsContext.activeGoals.map((goal) => (
                <div key={goal.id} className="p-3 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm mb-1">{goal.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Focus:</strong> {goal.developmentNeed}
                  </p>
                  {goal.developmentActivity && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Current Activity:</strong> {goal.developmentActivity.substring(0, 100)}
                      {goal.developmentActivity.length > 100 && '...'}
                    </p>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Suggested Topics */}
        {goalsContext.suggestedTopics.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Suggested Discussion Topics:</h4>
            <ul className="space-y-1">
              {goalsContext.suggestedTopics.slice(0, 3).map((topic, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Agenda Items */}
        {suggestedItems.length > 0 && onAddAgendaItem && (
          <div className="flex gap-2">
            <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  Add Goal Items
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Suggested Agenda Items</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {suggestedItems.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                    >
                      <span className="text-sm">{suggestion}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddSuggestion(suggestion)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {goalsContext.error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {goalsContext.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}