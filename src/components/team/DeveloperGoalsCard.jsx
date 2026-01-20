import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { DeveloperGoal } from '@/api/entities';
import { logger } from '@/utils/logger';
import GoalFormDialog from './GoalFormDialog';

const DeveloperGoalsCard = ({ teamMemberId }) => {
  const currentYear = new Date().getFullYear();

  const [goals, setGoals] = useState([]);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [progressUpdates, setProgressUpdates] = useState({});

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const loadGoals = async () => {
    if (!teamMemberId) return;

    try {
      setLoading(true);
      const data = await DeveloperGoal.list(teamMemberId, parseInt(selectedYear, 10));
      setGoals(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Error loading developer goals', { error: String(error) });
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [teamMemberId, selectedYear]);

  const handleCreate = async (data) => {
    try {
      setActionLoading(true);
      await DeveloperGoal.create({
        ...data,
        team_member_id: teamMemberId,
      });
      await loadGoals();
      setShowFormDialog(false);
    } catch (error) {
      logger.error('Error creating goal', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    if (!editingGoal) return;

    try {
      setActionLoading(true);
      await DeveloperGoal.update(editingGoal.id, data);
      await loadGoals();
      setShowFormDialog(false);
      setEditingGoal(null);
    } catch (error) {
      logger.error('Error updating goal', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      setActionLoading(true);
      await DeveloperGoal.delete(goalId);
      await loadGoals();
    } catch (error) {
      logger.error('Error deleting goal', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProgressChange = (goalId, progress) => {
    setProgressUpdates((prev) => ({
      ...prev,
      [goalId]: progress,
    }));
  };

  const handleProgressCommit = async (goalId) => {
    const newProgress = progressUpdates[goalId];
    if (newProgress === undefined) return;

    try {
      setActionLoading(true);
      await DeveloperGoal.update(goalId, { progress: newProgress });
      await loadGoals();
      setProgressUpdates((prev) => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
    } catch (error) {
      logger.error('Error updating progress', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = (goal) => {
    setEditingGoal(goal);
    setShowFormDialog(true);
  };

  const openCreateDialog = () => {
    setEditingGoal(null);
    setShowFormDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Developer Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Developer Goals
            </CardTitle>
            <Select
              value={selectedYear}
              onValueChange={setSelectedYear}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="text-center py-6">
              <Target className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No goals for {selectedYear}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const displayProgress = progressUpdates[goal.id] ?? goal.progress;
                return (
                  <div key={goal.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{goal.title}</h4>
                        {goal.description && (
                          <p className="text-xs text-gray-500 mt-1">{goal.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(goal)}
                          disabled={actionLoading}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(goal.id)}
                          disabled={actionLoading}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Progress value={displayProgress} className="flex-1 h-2" />
                        <span className="text-xs font-medium w-10 text-right">
                          {displayProgress}%
                        </span>
                      </div>
                      <Slider
                        value={[displayProgress]}
                        onValueChange={(value) => handleProgressChange(goal.id, value[0])}
                        onValueCommit={() => handleProgressCommit(goal.id)}
                        max={100}
                        step={5}
                        disabled={actionLoading}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={openCreateDialog}
            disabled={actionLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </CardContent>
      </Card>

      <GoalFormDialog
        open={showFormDialog}
        onOpenChange={(open) => {
          setShowFormDialog(open);
          if (!open) setEditingGoal(null);
        }}
        onSubmit={editingGoal ? handleUpdate : handleCreate}
        initialData={editingGoal}
        isLoading={actionLoading}
      />
    </>
  );
};

export default DeveloperGoalsCard;
