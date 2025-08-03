import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { RotateCcw, Users, Clock, Calendar, Settings, ArrowRight, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import DutyRotationService from '../../services/dutyRotationService';
import { Duty } from '../../api/entities';
import RotationStatusIndicator from './RotationStatusIndicator';

/**
 * TeamMemberRotationDisplay Component
 * Shows rotation information for a specific team member
 */
export default function TeamMemberRotationDisplay({ 
  teamMemberId, 
  teamMemberName,
  onManageRotation 
}) {
  const [rotations, setRotations] = useState([]);
  const [rotationDetails, setRotationDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedRotationSchedule, setSelectedRotationSchedule] = useState([]);

  useEffect(() => {
    loadRotationData();
  }, [teamMemberId]);

  const loadRotationData = async () => {
    if (!teamMemberId) return;
    
    setLoading(true);
    try {
      // Get all duties for this team member that are part of rotations
      const memberDuties = await Duty.getByTeamMember(teamMemberId);
      const rotationDuties = memberDuties.filter(duty => duty.is_rotation && duty.rotation_id);
      
      // Get unique rotation IDs
      const rotationIds = [...new Set(rotationDuties.map(duty => duty.rotation_id))];
      
      // Load rotation details for each rotation
      const rotationData = [];
      const detailsData = {};
      
      for (const rotationId of rotationIds) {
        try {
          const [rotation, currentAssignee, nextAssignee] = await Promise.all([
            DutyRotationService.getActiveRotations().then(rotations => 
              rotations.find(r => r.id === rotationId)
            ),
            DutyRotationService.getCurrentAssignee(rotationId),
            DutyRotationService.getNextAssignee(rotationId)
          ]);
          
          if (rotation) {
            rotationData.push(rotation);
            detailsData[rotationId] = {
              currentAssignee,
              nextAssignee,
              duties: rotationDuties.filter(duty => duty.rotation_id === rotationId)
            };
          }
        } catch (error) {
          console.error(`Failed to load rotation ${rotationId}:`, error);
        }
      }
      
      setRotations(rotationData);
      setRotationDetails(detailsData);
    } catch (error) {
      console.error('Failed to load rotation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSchedule = async (rotationId) => {
    try {
      const schedule = await DutyRotationService.getRotationSchedule(rotationId, 3);
      setSelectedRotationSchedule(schedule);
      setShowScheduleDialog(true);
    } catch (error) {
      console.error('Failed to load rotation schedule:', error);
    }
  };

  const getRotationStatus = (rotation, details) => {
    if (!rotation.is_active) return 'Inactive';
    
    const isCurrentAssignee = details.currentAssignee?.assignee_id === teamMemberId;
    const isNextAssignee = details.nextAssignee?.assignee_id === teamMemberId;
    
    if (isCurrentAssignee) return 'Current';
    if (isNextAssignee) return 'Next';
    return 'Participant';
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Current': return 'default';
      case 'Next': return 'secondary';
      case 'Participant': return 'outline';
      case 'Inactive': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading rotation information...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rotations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RotateCcw className="h-5 w-5" />
            <span>Duty Rotations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <RotateCcw className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No rotation assignments found</p>
            <p className="text-sm">This team member is not currently part of any duty rotations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-5 w-5" />
              <span>Duty Rotations</span>
              <Badge variant="outline">{rotations.length}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rotations.map(rotation => {
            const details = rotationDetails[rotation.id];
            const status = getRotationStatus(rotation, details);
            
            return (
              <div key={rotation.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{rotation.name}</h4>
                      <Badge variant={getStatusBadgeVariant(status)}>
                        {status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewSchedule(rotation.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                    {onManageRotation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onManageRotation(rotation.id)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Type</p>
                    <p className="font-medium">{rotation.type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Cycle Length</p>
                    <p className="font-medium">
                      {rotation.cycle_weeks} week{rotation.cycle_weeks !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {details && (
                  <RotationStatusIndicator
                    rotation={rotation}
                    currentAssignee={details.currentAssignee}
                    nextAssignee={details.nextAssignee}
                    size="sm"
                    showDetails={true}
                  />
                )}

                {/* Show upcoming duties for this team member */}
                {details?.duties && details.duties.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Upcoming Assignments
                    </p>
                    <div className="space-y-2">
                      {details.duties
                        .filter(duty => new Date(duty.end_date) >= new Date())
                        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
                        .slice(0, 2)
                        .map(duty => (
                          <div key={duty.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>{formatDate(duty.start_date)} - {formatDate(duty.end_date)}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {new Date(duty.start_date) <= new Date() ? 'Active' : 'Upcoming'}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Rotation Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rotation Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRotationSchedule.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Showing next 3 cycles of the rotation
                </p>
                {selectedRotationSchedule.map((assignment, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      assignment.participant_id === teamMemberId 
                        ? 'bg-purple-50 border-purple-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{assignment.participant_name}</span>
                        {assignment.participant_id === teamMemberId && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(assignment.start_date)} - {formatDate(assignment.end_date)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Cycle {assignment.cycle}
                      </Badge>
                      {assignment.is_current && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}