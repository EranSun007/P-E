import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Plus, ChevronDown, ChevronUp, Loader2, Shield } from 'lucide-react';
import { WorkItem, DevOpsDuty } from '@/api/entities';
import { logger } from '@/utils/logger';
import WorkItemCard from './WorkItemCard';
import WorkItemForm from './WorkItemForm';
import DevOpsDutyCard from './DevOpsDutyCard';
import DevOpsDutyForm from './DevOpsDutyForm';

const CurrentWorkSection = ({ teamMemberId }) => {
  const [workItems, setWorkItems] = useState([]);
  const [devOpsDuties, setDevOpsDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWorkItem, setEditingWorkItem] = useState(null);
  const [showAddDutyDialog, setShowAddDutyDialog] = useState(false);
  const [showEditDutyDialog, setShowEditDutyDialog] = useState(false);
  const [editingDuty, setEditingDuty] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCompletedDuties, setShowCompletedDuties] = useState(false);

  // Load work items for this team member
  const loadWorkItems = async () => {
    if (!teamMemberId) return;

    try {
      const items = await WorkItem.listByTeamMember(teamMemberId);
      setWorkItems(Array.isArray(items) ? items : []);
    } catch (error) {
      logger.error('Error loading work items', { error: String(error) });
      setWorkItems([]);
    }
  };

  // Load DevOps duties for this team member
  const loadDevOpsDuties = async () => {
    if (!teamMemberId) return;

    try {
      const duties = await DevOpsDuty.listByTeamMember(teamMemberId);
      setDevOpsDuties(Array.isArray(duties) ? duties : []);
    } catch (error) {
      logger.error('Error loading DevOps duties', { error: String(error) });
      setDevOpsDuties([]);
    }
  };

  // Load all data
  const loadAllData = async () => {
    if (!teamMemberId) return;

    try {
      setLoading(true);
      await Promise.all([loadWorkItems(), loadDevOpsDuties()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberId]);

  // Filter active vs completed work items
  const activeWorkItems = workItems.filter((item) => item.status === 'active');
  const completedWorkItems = workItems.filter((item) => item.status === 'completed');

  // Filter active vs completed DevOps duties
  const activeDevOpsDuties = devOpsDuties.filter((duty) => duty.status === 'active');
  const completedDevOpsDuties = devOpsDuties.filter((duty) => duty.status === 'completed');

  // Handle creating a new work item
  const handleCreateWorkItem = async (data, initialInsight) => {
    try {
      setActionLoading(true);
      const newWorkItem = await WorkItem.create(data);

      // If there's an initial insight, add it
      if (initialInsight && newWorkItem.id) {
        await WorkItem.addInsight(newWorkItem.id, initialInsight);
      }

      await loadWorkItems();
      setShowAddDialog(false);
    } catch (error) {
      logger.error('Error creating work item', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle adding an insight
  const handleAddInsight = async (workItemId, insight) => {
    try {
      setActionLoading(true);
      await WorkItem.addInsight(workItemId, insight);
      await loadWorkItems();
    } catch (error) {
      logger.error('Error adding insight', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle marking complete
  const handleMarkComplete = async (workItemId) => {
    try {
      setActionLoading(true);
      await WorkItem.update(workItemId, { status: 'completed' });
      await loadWorkItems();
    } catch (error) {
      logger.error('Error marking work item complete', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reactivating a completed item
  const handleReactivate = async (workItemId) => {
    try {
      setActionLoading(true);
      await WorkItem.update(workItemId, { status: 'active' });
      await loadWorkItems();
    } catch (error) {
      logger.error('Error reactivating work item', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle opening edit dialog for a work item
  const handleEditWorkItem = (workItem) => {
    setEditingWorkItem(workItem);
    setShowEditDialog(true);
  };

  // Handle updating a work item
  const handleUpdateWorkItem = async (data) => {
    if (!editingWorkItem) return;

    try {
      setActionLoading(true);
      await WorkItem.update(editingWorkItem.id, data);
      await loadWorkItems();
      setShowEditDialog(false);
      setEditingWorkItem(null);
    } catch (error) {
      logger.error('Error updating work item', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  // ========== DevOps Duty Handlers ==========

  // Handle creating a new DevOps duty
  const handleCreateDevOpsDuty = async (data) => {
    try {
      setActionLoading(true);
      await DevOpsDuty.create(data);
      await loadDevOpsDuties();
      setShowAddDutyDialog(false);
    } catch (error) {
      logger.error('Error creating DevOps duty', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle adding an insight to a DevOps duty
  const handleAddDutyInsight = async (dutyId, insight) => {
    try {
      setActionLoading(true);
      await DevOpsDuty.addInsight(dutyId, insight);
      await loadDevOpsDuties();
    } catch (error) {
      logger.error('Error adding insight to DevOps duty', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle completing a DevOps duty
  const handleCompleteDuty = async (dutyId, endData) => {
    try {
      setActionLoading(true);
      await DevOpsDuty.complete(dutyId, endData);
      await loadDevOpsDuties();
    } catch (error) {
      logger.error('Error completing DevOps duty', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle opening edit dialog for a DevOps duty
  const handleEditDuty = (duty) => {
    setEditingDuty(duty);
    setShowEditDutyDialog(true);
  };

  // Handle updating a DevOps duty
  const handleUpdateDuty = async (data) => {
    if (!editingDuty) return;

    try {
      setActionLoading(true);
      await DevOpsDuty.update(editingDuty.id, data);
      await loadDevOpsDuties();
      setShowEditDutyDialog(false);
      setEditingDuty(null);
    } catch (error) {
      logger.error('Error updating DevOps duty', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle deleting a DevOps duty
  const handleDeleteDuty = async (dutyId) => {
    try {
      setActionLoading(true);
      await DevOpsDuty.delete(dutyId);
      await loadDevOpsDuties();
    } catch (error) {
      logger.error('Error deleting DevOps duty', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Current Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
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
              <Briefcase className="h-5 w-5" />
              Current Work
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Work Item
              </Button>
              <Button onClick={() => setShowAddDutyDialog(true)} size="sm" variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Add DevOps Duty
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Active Work Items */}
          {activeWorkItems.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No active work items</p>
              <p className="text-sm text-gray-400 mt-1">
                Add work items to track current development tasks
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeWorkItems.map((item) => (
                <WorkItemCard
                  key={item.id}
                  workItem={item}
                  onAddInsight={handleAddInsight}
                  onMarkComplete={handleMarkComplete}
                  onEdit={handleEditWorkItem}
                  isLoading={actionLoading}
                />
              ))}
            </div>
          )}

          {/* Completed Work Items Toggle */}
          {completedWorkItems.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-500"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? (
                  <ChevronUp className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}
                {showCompleted ? 'Hide' : 'Show'} Completed Items ({completedWorkItems.length})
              </Button>

              {showCompleted && (
                <div className="space-y-4 mt-4">
                  {completedWorkItems.map((item) => (
                    <WorkItemCard
                      key={item.id}
                      workItem={item}
                      onAddInsight={handleAddInsight}
                      onMarkComplete={handleMarkComplete}
                      onReactivate={handleReactivate}
                      isLoading={actionLoading}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DevOps Duties Section */}
          {(activeDevOpsDuties.length > 0 || completedDevOpsDuties.length > 0) && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                DevOps Duties
              </h3>

              {/* Active DevOps Duties */}
              {activeDevOpsDuties.length > 0 && (
                <div className="space-y-4">
                  {activeDevOpsDuties.map((duty) => (
                    <DevOpsDutyCard
                      key={duty.id}
                      duty={duty}
                      onAddInsight={handleAddDutyInsight}
                      onComplete={handleCompleteDuty}
                      onEdit={handleEditDuty}
                      onDelete={handleDeleteDuty}
                      isLoading={actionLoading}
                    />
                  ))}
                </div>
              )}

              {/* Completed DevOps Duties Toggle */}
              {completedDevOpsDuties.length > 0 && (
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-500"
                    onClick={() => setShowCompletedDuties(!showCompletedDuties)}
                  >
                    {showCompletedDuties ? (
                      <ChevronUp className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    {showCompletedDuties ? 'Hide' : 'Show'} Completed Duties ({completedDevOpsDuties.length})
                  </Button>

                  {showCompletedDuties && (
                    <div className="space-y-4 mt-4">
                      {completedDevOpsDuties.map((duty) => (
                        <DevOpsDutyCard
                          key={duty.id}
                          duty={duty}
                          onAddInsight={handleAddDutyInsight}
                          onComplete={handleCompleteDuty}
                          onEdit={handleEditDuty}
                          onDelete={handleDeleteDuty}
                          isLoading={actionLoading}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Work Item Dialog */}
      <WorkItemForm
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleCreateWorkItem}
        teamMemberId={teamMemberId}
        isLoading={actionLoading}
      />

      {/* Edit Work Item Dialog */}
      <WorkItemForm
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingWorkItem(null);
        }}
        onSubmit={handleUpdateWorkItem}
        teamMemberId={teamMemberId}
        initialData={editingWorkItem}
        isLoading={actionLoading}
      />

      {/* Add DevOps Duty Dialog */}
      <DevOpsDutyForm
        open={showAddDutyDialog}
        onOpenChange={setShowAddDutyDialog}
        onSubmit={handleCreateDevOpsDuty}
        teamMemberId={teamMemberId}
        isLoading={actionLoading}
      />

      {/* Edit DevOps Duty Dialog */}
      <DevOpsDutyForm
        open={showEditDutyDialog}
        onOpenChange={(open) => {
          setShowEditDutyDialog(open);
          if (!open) setEditingDuty(null);
        }}
        onSubmit={handleUpdateDuty}
        teamMemberId={teamMemberId}
        initialData={editingDuty}
        isLoading={actionLoading}
      />
    </>
  );
};

export default CurrentWorkSection;
