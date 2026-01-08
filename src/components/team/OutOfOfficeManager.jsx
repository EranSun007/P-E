/**
 * OutOfOfficeManager Component
 * Manages out of office periods with list view, create, edit, and delete functionality.
 * Includes period sorting and filtering capabilities.
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Calendar, Filter, SortAsc, SortDesc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import OutOfOfficeForm from './OutOfOfficeForm';
import OutOfOfficeService from '@/services/outOfOfficeService';
import { OutOfOffice } from '@/api/entities';

const OutOfOfficeManager = ({ teamMemberId, teamMemberName }) => {
  const [periods, setPeriods] = useState([]);
  const [filteredPeriods, setFilteredPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('start_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterReason, setFilterReason] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [deletingPeriod, setDeletingPeriod] = useState(null);

  // Get available reason types
  const reasonTypes = OutOfOfficeService.getReasonTypes();

  /**
   * Loads out of office periods for the team member
   */
  const loadPeriods = async () => {
    try {
      setLoading(true);
      setError('');
      
      const allPeriods = await OutOfOffice.list();
      const memberPeriods = allPeriods.filter(period => period.team_member_id === teamMemberId);
      
      setPeriods(memberPeriods);
    } catch (err) {
      console.error('Error loading periods:', err);
      setError('Failed to load out of office periods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Determines if a period is currently active
   */
  const isPeriodActive = (period) => {
    const today = new Date();
    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);
    
    return today >= startDate && today <= endDate;
  };

  /**
   * Determines if a period is in the future
   */
  const isPeriodFuture = (period) => {
    const today = new Date();
    const startDate = new Date(period.start_date);
    
    return startDate > today;
  };

  /**
   * Gets the status of a period
   */
  const getPeriodStatus = (period) => {
    if (isPeriodActive(period)) return 'active';
    if (isPeriodFuture(period)) return 'upcoming';
    return 'past';
  };

  /**
   * Sorts and filters periods based on current settings
   */
  const sortAndFilterPeriods = () => {
    let filtered = [...periods];

    // Apply reason filter
    if (filterReason !== 'all') {
      filtered = filtered.filter(period => period.reason === filterReason);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(period => getPeriodStatus(period) === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'start_date':
          aValue = new Date(a.start_date);
          bValue = new Date(b.start_date);
          break;
        case 'end_date':
          aValue = new Date(a.end_date);
          bValue = new Date(b.end_date);
          break;
        case 'reason':
          aValue = a.reason;
          bValue = b.reason;
          break;
        case 'duration':
          aValue = OutOfOfficeService.calculateDaysInPeriod(a.start_date, a.end_date);
          bValue = OutOfOfficeService.calculateDaysInPeriod(b.start_date, b.end_date);
          break;
        default:
          aValue = new Date(a.start_date);
          bValue = new Date(b.start_date);
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredPeriods(filtered);
  };

  /**
   * Handles creating a new period
   */
  const handleCreatePeriod = async (periodData) => {
    try {
      await OutOfOffice.create(periodData);
      await loadPeriods();
      setShowCreateDialog(false);
    } catch (err) {
      console.error('Error creating period:', err);
      throw new Error('Failed to create out of office period');
    }
  };

  /**
   * Handles updating an existing period
   */
  const handleUpdatePeriod = async (periodData) => {
    try {
      await OutOfOffice.update(periodData.id, periodData);
      await loadPeriods();
      setEditingPeriod(null);
    } catch (err) {
      console.error('Error updating period:', err);
      throw new Error('Failed to update out of office period');
    }
  };

  /**
   * Handles deleting a period
   */
  const handleDeletePeriod = async (periodId) => {
    try {
      await OutOfOffice.delete(periodId);
      await loadPeriods();
      setDeletingPeriod(null);
    } catch (err) {
      console.error('Error deleting period:', err);
      setError('Failed to delete out of office period. Please try again.');
    }
  };

  /**
   * Gets the appropriate badge variant for period status
   */
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active':
        return 'destructive';
      case 'upcoming':
        return 'default';
      case 'past':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  /**
   * Gets the reason type configuration
   */
  const getReasonType = (reasonValue) => {
    return OutOfOfficeService.getReasonType(reasonValue);
  };

  // Load periods on component mount
  useEffect(() => {
    if (teamMemberId) {
      loadPeriods();
    }
  }, [teamMemberId]);

  // Update filtered periods when periods or filters change
  useEffect(() => {
    sortAndFilterPeriods();
  }, [periods, sortBy, sortOrder, filterReason, filterStatus]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading out of office periods...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Out of Office Periods</span>
            {teamMemberName && <span className="text-muted-foreground">- {teamMemberName}</span>}
          </CardTitle>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Period
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Out of Office Period</DialogTitle>
              </DialogHeader>
              <OutOfOfficeForm
                teamMemberId={teamMemberId}
                onSubmit={handleCreatePeriod}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters and Sorting */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm">Reason:</span>
            <Select value={filterReason} onValueChange={setFilterReason}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {reasonTypes.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm">Status:</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start_date">Start Date</SelectItem>
                <SelectItem value="end_date">End Date</SelectItem>
                <SelectItem value="reason">Reason</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>

        {/* Periods List */}
        {filteredPeriods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {periods.length === 0 
              ? 'No out of office periods found. Click "Add Period" to create one.'
              : 'No periods match the current filters.'
            }
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPeriods.map((period) => {
              const reasonType = getReasonType(period.reason);
              const status = getPeriodStatus(period);
              const duration = OutOfOfficeService.calculateDaysInPeriod(period.start_date, period.end_date);

              return (
                <Card key={period.id} className="border-l-4" style={{ borderLeftColor: reasonType?.color || '#6b7280' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: reasonType?.color || '#6b7280' }}
                            />
                            <span className="font-medium">{reasonType?.name || period.reason}</span>
                          </div>
                          <Badge variant={getStatusBadgeVariant(status)}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Start:</span> {format(new Date(period.start_date), 'MMM dd, yyyy')}
                          </div>
                          <div>
                            <span className="font-medium">End:</span> {format(new Date(period.end_date), 'MMM dd, yyyy')}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {duration} day{duration !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {period.notes && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <span className="font-medium">Notes:</span> {period.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Dialog open={editingPeriod?.id === period.id} onOpenChange={(open) => !open && setEditingPeriod(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPeriod(period)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Out of Office Period</DialogTitle>
                            </DialogHeader>
                            <OutOfOfficeForm
                              teamMemberId={teamMemberId}
                              initialData={editingPeriod}
                              onSubmit={handleUpdatePeriod}
                              onCancel={() => setEditingPeriod(null)}
                            />
                          </DialogContent>
                        </Dialog>

                        <AlertDialog open={deletingPeriod?.id === period.id} onOpenChange={(open) => !open && setDeletingPeriod(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingPeriod(period)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Out of Office Period</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this {reasonType?.name || period.reason} period 
                                from {format(new Date(period.start_date), 'MMM dd, yyyy')} to {format(new Date(period.end_date), 'MMM dd, yyyy')}?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePeriod(period.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OutOfOfficeManager;