/**
 * GoalsList Component
 * Displays a list of employee goals with filtering, search, and management capabilities
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, User, Calendar, Target, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import EmployeeGoalsService from '@/services/employeeGoalsService';
import GoalForm from './GoalForm';
import GoalStatusManager from './GoalStatusManager';

const GoalsList = ({ teamMembers = [] }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [createdAfter, setCreatedAfter] = useState('');
  const [createdBefore, setCreatedBefore] = useState('');
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Load goals on component mount
  useEffect(() => {
    loadGoals();
  }, []);

  /**
   * Load all goals from the service
   */
  const loadGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allGoals = await EmployeeGoalsService.getAllGoals();
      setGoals(allGoals);
    } catch (err) {
      console.error('Error loading goals:', err);
      setError('Error loading goals');
      toast({
        title: 'Error',
        description: 'Failed to load goals. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get employee name by ID
   */
  const getEmployeeName = (employeeId) => {
    const employee = teamMembers.find(tm => tm.id === employeeId);
    return employee ? employee.name : 'Unknown Employee';
  };

  /**
   * Get status badge styling
   */
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  /**
   * Check if we should use advanced search (multiple filters applied)
   */
  const shouldUseAdvancedSearch = useMemo(() => {
    return (
      searchText.trim() ||
      statusFilter !== 'all' ||
      employeeFilter !== 'all' ||
      dateFilter !== 'all' ||
      createdAfter ||
      createdBefore
    );
  }, [searchText, statusFilter, employeeFilter, dateFilter, createdAfter, createdBefore]);

  /**
   * Filter and search goals using advanced search when needed
   */
  const filteredGoals = useMemo(() => {
    if (!shouldUseAdvancedSearch) {
      // No filters applied, return all goals sorted by creation date
      const sorted = [...goals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return sorted;
    }

    // Use advanced search for complex filtering
    let filtered = [...goals];

    // Apply text search
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(goal => {
        return (
          goal.title?.toLowerCase().includes(searchLower) ||
          goal.developmentNeed?.toLowerCase().includes(searchLower) ||
          goal.developmentActivity?.toLowerCase().includes(searchLower) ||
          goal.developmentGoalDescription?.toLowerCase().includes(searchLower) ||
          getEmployeeName(goal.employeeId).toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(goal => goal.status === statusFilter);
    }

    // Apply employee filter
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(goal => goal.employeeId === employeeFilter);
    }

    // Apply date-based filtering
    if (dateFilter !== 'all' || createdAfter || createdBefore) {
      // Handle predefined date ranges
      if (dateFilter === 'last-week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filtered = filtered.filter(goal => {
          try {
            return new Date(goal.createdAt) >= oneWeekAgo;
          } catch {
            return false;
          }
        });
      } else if (dateFilter === 'last-month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        filtered = filtered.filter(goal => {
          try {
            return new Date(goal.createdAt) >= oneMonthAgo;
          } catch {
            return false;
          }
        });
      } else if (dateFilter === 'last-quarter') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        filtered = filtered.filter(goal => {
          try {
            return new Date(goal.createdAt) >= threeMonthsAgo;
          } catch {
            return false;
          }
        });
      }

      // Handle custom date ranges  
      if (createdAfter) {
        try {
          const afterDate = new Date(createdAfter);
          filtered = filtered.filter(goal => {
            try {
              return new Date(goal.createdAt) >= afterDate;
            } catch {
              return false;
            }
          });
        } catch (error) {
          console.warn('Invalid createdAfter date:', createdAfter);
        }
      }

      if (createdBefore) {
        try {
          const beforeDate = new Date(createdBefore);
          beforeDate.setHours(23, 59, 59, 999); // End of day
          filtered = filtered.filter(goal => {
            try {
              return new Date(goal.createdAt) <= beforeDate;
            } catch {
              return false;
            }
          });
        } catch (error) {
          console.warn('Invalid createdBefore date:', createdBefore);
        }
      }
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return filtered;
  }, [goals, statusFilter, employeeFilter, dateFilter, createdAfter, createdBefore, searchText, teamMembers, shouldUseAdvancedSearch]);

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setEmployeeFilter('all');
    setDateFilter('all');
    setCreatedAfter('');
    setCreatedBefore('');
  };

  /**
   * Handle create goal
   */
  const handleCreateGoal = async (goalData) => {
    try {
      setIsSubmitting(true);
      const newGoal = await EmployeeGoalsService.createGoal(goalData);
      setGoals(prev => [newGoal, ...prev]);
      setShowCreateDialog(false);
      
      toast({
        title: 'Success',
        description: 'Goal created successfully'
      });
    } catch (err) {
      console.error('Error creating goal:', err);
      toast({
        title: 'Error',
        description: 'Failed to create goal. Please try again.',
        variant: 'destructive'
      });
      throw err; // Re-throw to let form handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle edit goal
   */
  const handleEditGoal = async (goalData) => {
    try {
      setIsSubmitting(true);
      const updatedGoal = await EmployeeGoalsService.updateGoal(selectedGoal.id, goalData);
      setGoals(prev => prev.map(goal => 
        goal.id === selectedGoal.id ? updatedGoal : goal
      ));
      setShowEditDialog(false);
      setSelectedGoal(null);
      
      toast({
        title: 'Success',
        description: 'Goal updated successfully'
      });
    } catch (err) {
      console.error('Error updating goal:', err);
      toast({
        title: 'Error',
        description: 'Failed to update goal. Please try again.',
        variant: 'destructive'
      });
      throw err; // Re-throw to let form handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle delete goal
   */
  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;

    try {
      await EmployeeGoalsService.deleteGoal(goalToDelete.id);
      setGoals(prev => prev.filter(goal => goal.id !== goalToDelete.id));
      setShowDeleteDialog(false);
      setGoalToDelete(null);
      
      toast({
        title: 'Success',
        description: 'Goal deleted successfully'
      });
    } catch (err) {
      console.error('Error deleting goal:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete goal. Please try again.',
        variant: 'destructive'
      });
    }
  };

  /**
   * Handle status change
   */
  const handleStatusChange = (updatedGoal) => {
    setGoals(prev => prev.map(goal => 
      goal.id === updatedGoal.id ? updatedGoal : goal
    ));
  };

  /**
   * Show edit dialog
   */
  const showEditGoal = (goal) => {
    setSelectedGoal(goal);
    setShowEditDialog(true);
  };

  /**
   * Show delete dialog
   */
  const showDeleteGoal = (goal) => {
    setGoalToDelete(goal);
    setShowDeleteDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8" role="progressbar" aria-label="Loading goals">
        <LoadingSpinner />
        <span className="ml-2 text-muted-foreground">Loading goals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error loading goals</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Employee Goals</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Goal
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search goals..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9"
                  role="searchbox"
                  aria-label="Search goals"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-label="Filter by status">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employee Filter */}
            <div className="w-full md:w-48">
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger aria-label="Filter by employee">
                  <User className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="w-full md:w-48">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger aria-label="Filter by date">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {(searchText || statusFilter !== 'all' || employeeFilter !== 'all' || dateFilter !== 'all' || createdAfter || createdBefore) && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
          {/* Custom Date Range Inputs */}
          {dateFilter === 'custom' && (
            <div className="mt-4 flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <label htmlFor="created-after" className="block text-sm font-medium text-muted-foreground mb-1">
                  Created After
                </label>
                <Input
                  id="created-after"
                  type="date"
                  value={createdAfter}
                  onChange={(e) => setCreatedAfter(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="created-before" className="block text-sm font-medium text-muted-foreground mb-1">
                  Created Before
                </label>
                <Input
                  id="created-before"
                  type="date"
                  value={createdBefore}
                  onChange={(e) => setCreatedBefore(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals found"
          description={
            shouldUseAdvancedSearch
              ? "Try adjusting your filters to see more results."
              : "Get started by creating your first employee goal."
          }
          action={
            !shouldUseAdvancedSearch ? (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Goal
              </Button>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4" role="list" aria-label="Employee goals list">
          {filteredGoals.map((goal) => (
            <Card key={goal.id} role="listitem" className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold leading-tight">
                      {goal.title}
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{getEmployeeName(goal.employeeId)}</span>
                      <span>•</span>
                      <Calendar className="h-4 w-4" />
                      <span>Created {format(new Date(goal.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary" 
                      className={cn("capitalize", getStatusBadgeStyle(goal.status))}
                    >
                      {goal.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Development Need */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Development Need</h4>
                    <p className="text-sm">
                      {goal.developmentNeed || 'No development need specified'}
                    </p>
                  </div>

                  {/* Development Activity */}
                  {goal.developmentActivity && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Development Activity</h4>
                      <p className="text-sm">{goal.developmentActivity}</p>
                    </div>
                  )}

                  {/* Goal Description */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Goal Description</h4>
                    <p className="text-sm line-clamp-3">
                      {goal.developmentGoalDescription}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <GoalStatusManager 
                      goal={goal} 
                      onStatusChange={handleStatusChange}
                      compact={true}
                    />
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => showEditGoal(goal)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => showDeleteGoal(goal)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Goal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
          </DialogHeader>
          <GoalForm
            teamMembers={teamMembers}
            onSubmit={handleCreateGoal}
            onCancel={() => setShowCreateDialog(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <GoalForm
            teamMembers={teamMembers}
            initialData={selectedGoal}
            onSubmit={handleEditGoal}
            onCancel={() => {
              setShowEditDialog(false);
              setSelectedGoal(null);
            }}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this goal? This action cannot be undone.
              <br /><br />
              <strong>Goal:</strong> {goalToDelete?.title}
              <br />
              <strong>Employee:</strong> {goalToDelete && getEmployeeName(goalToDelete.employeeId)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteGoal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoalsList;