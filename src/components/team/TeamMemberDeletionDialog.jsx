import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, FileText, Calendar, Archive, Trash2 } from 'lucide-react';
import { PersonalFileItem } from '@/api/oneOnOneAgenda';
import { AgendaItem } from '@/api/oneOnOneAgenda';
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from '@/services/auditService';
import { toast } from 'sonner';

/**
 * TeamMemberDeletionDialog - Handles team member deletion with data management options
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onOpenChange - Callback when dialog open state changes
 * @param {Object} props.teamMember - Team member to delete
 * @param {Function} props.onConfirm - Callback when deletion is confirmed
 * @param {Function} props.onCancel - Callback when deletion is cancelled
 */
const TeamMemberDeletionDialog = ({ 
  open, 
  onOpenChange, 
  teamMember, 
  onConfirm, 
  onCancel 
}) => {
  const [personalFileItems, setPersonalFileItems] = useState([]);
  const [agendaItems, setAgendaItems] = useState([]);
  const [dataHandlingOption, setDataHandlingOption] = useState('archive');
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (open && teamMember) {
      loadRelatedData();
    }
  }, [open, teamMember]);

  const loadRelatedData = async () => {
    setDataLoading(true);
    try {
      const [personalFiles, agendas] = await Promise.all([
        PersonalFileItem.getByTeamMember(teamMember.id),
        AgendaItem.getByTeamMember(teamMember.id)
      ]);
      
      setPersonalFileItems(personalFiles);
      setAgendaItems(agendas);
    } catch (error) {
      console.error('Error loading related data:', error);
      toast.error('Failed to load related data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmDeletion) {
      toast.error('Please confirm that you want to delete this team member');
      return;
    }

    setLoading(true);
    try {
      // Handle data based on selected option
      if (dataHandlingOption === 'delete') {
        // Delete all related data
        await Promise.all([
          ...personalFileItems.map(item => PersonalFileItem.delete(item.id)),
          ...agendaItems.map(item => AgendaItem.delete(item.id))
        ]);
        
        // Log audit events for data deletion
        logAuditEvent(AUDIT_ACTIONS.DELETE, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, 'bulk_delete', {
          operation: 'team_member_deletion',
          teamMemberId: teamMember.id,
          teamMemberName: teamMember.name,
          deletedItemsCount: personalFileItems.length,
          dataHandling: 'delete'
        });
        
        logAuditEvent(AUDIT_ACTIONS.DELETE, AUDIT_RESOURCES.AGENDA_ITEM, 'bulk_delete', {
          operation: 'team_member_deletion',
          teamMemberId: teamMember.id,
          teamMemberName: teamMember.name,
          deletedItemsCount: agendaItems.length,
          dataHandling: 'delete'
        });
        
      } else if (dataHandlingOption === 'archive') {
        // Archive data by marking it as archived
        const archiveUpdates = { archived: true, archivedAt: new Date().toISOString() };
        
        await Promise.all([
          ...personalFileItems.map(item => PersonalFileItem.update(item.id, archiveUpdates)),
          ...agendaItems.map(item => AgendaItem.update(item.id, archiveUpdates))
        ]);
        
        // Log audit events for data archiving
        logAuditEvent(AUDIT_ACTIONS.UPDATE, AUDIT_RESOURCES.PERSONAL_FILE_ITEM, 'bulk_archive', {
          operation: 'team_member_deletion',
          teamMemberId: teamMember.id,
          teamMemberName: teamMember.name,
          archivedItemsCount: personalFileItems.length,
          dataHandling: 'archive'
        });
        
        logAuditEvent(AUDIT_ACTIONS.UPDATE, AUDIT_RESOURCES.AGENDA_ITEM, 'bulk_archive', {
          operation: 'team_member_deletion',
          teamMemberId: teamMember.id,
          teamMemberName: teamMember.name,
          archivedItemsCount: agendaItems.length,
          dataHandling: 'archive'
        });
      }
      // If 'keep' is selected, we don't modify the data

      // Log team member deletion
      logAuditEvent(AUDIT_ACTIONS.DELETE, AUDIT_RESOURCES.TEAM_MEMBER, teamMember.id, {
        operation: 'delete_team_member',
        teamMemberName: teamMember.name,
        dataHandling: dataHandlingOption,
        personalFileItemsCount: personalFileItems.length,
        agendaItemsCount: agendaItems.length
      });

      // Call the onConfirm callback with the data handling option
      await onConfirm(teamMember.id, dataHandlingOption);
      
      toast.success(`Team member deleted successfully. Data was ${dataHandlingOption === 'delete' ? 'deleted' : dataHandlingOption === 'archive' ? 'archived' : 'preserved'}.`);
      
      // Reset state
      setConfirmDeletion(false);
      setDataHandlingOption('archive');
      
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast.error('Failed to delete team member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setConfirmDeletion(false);
    setDataHandlingOption('archive');
    onCancel();
  };

  if (!teamMember) return null;

  const hasRelatedData = personalFileItems.length > 0 || agendaItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Team Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are about to delete <strong>{teamMember.name}</strong>. This action cannot be undone.
            </AlertDescription>
          </Alert>

          {dataLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading related data...</span>
            </div>
          ) : hasRelatedData ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">Related Data Found</h3>
                <div className="space-y-2 text-sm text-yellow-700">
                  {personalFileItems.length > 0 && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{personalFileItems.length} personal file item(s)</span>
                    </div>
                  )}
                  {agendaItems.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{agendaItems.length} agenda item(s)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">What should happen to this data?</Label>
                <RadioGroup value={dataHandlingOption} onValueChange={setDataHandlingOption}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="archive" id="archive" />
                    <Label htmlFor="archive" className="flex items-center gap-2 cursor-pointer">
                      <Archive className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium">Archive data</div>
                        <div className="text-sm text-gray-500">
                          Keep data but mark it as archived (recommended)
                        </div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep" id="keep" />
                    <Label htmlFor="keep" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium">Keep data active</div>
                        <div className="text-sm text-gray-500">
                          Preserve all data in its current state
                        </div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="delete" id="delete" />
                    <Label htmlFor="delete" className="flex items-center gap-2 cursor-pointer">
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <div>
                        <div className="font-medium">Delete all data</div>
                        <div className="text-sm text-gray-500">
                          Permanently remove all related data (cannot be undone)
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">No related personal file items or agenda items found.</p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="confirm" 
              checked={confirmDeletion} 
              onCheckedChange={setConfirmDeletion}
            />
            <Label htmlFor="confirm" className="text-sm">
              I understand that this action cannot be undone and confirm the deletion of{' '}
              <strong>{teamMember.name}</strong>
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!confirmDeletion || loading}
          >
            {loading ? 'Deleting...' : 'Delete Team Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberDeletionDialog;