import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, FileText } from 'lucide-react';
import AgendaItemForm from './AgendaItemForm';
import PersonalFileItemForm from './PersonalFileItemForm';
import { toast } from 'sonner';

/**
 * AgendaContextActions - Component for adding context-aware actions to add to 1:1 agenda or personal file
 * 
 * @param {Object} props
 * @param {string} props.teamMemberId - ID of the team member
 * @param {string} props.teamMemberName - Name of the team member
 * @param {Object} props.sourceItem - Source item data to use for pre-filling forms
 * @param {string} props.variant - Button variant ('default', 'outline', 'ghost', etc.)
 * @param {string} props.size - Button size ('default', 'sm', 'lg', etc.)
 * @param {boolean} props.showAgendaAction - Whether to show the "Add to 1:1 Agenda" action
 * @param {boolean} props.showPersonalFileAction - Whether to show the "Save to Personal File" action
 * @param {Function} props.onActionComplete - Callback when an action is completed
 */
const AgendaContextActions = ({
  teamMemberId,
  teamMemberName,
  sourceItem,
  variant = 'outline',
  size = 'sm',
  showAgendaAction = true,
  showPersonalFileAction = true,
  onActionComplete
}) => {
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [showPersonalFileForm, setShowPersonalFileForm] = useState(false);

  const handleAgendaItemSubmit = (result) => {
    setShowAgendaForm(false);
    toast.success(`Item added to ${teamMemberName}'s 1:1 agenda`);
    if (onActionComplete) {
      onActionComplete('agenda', result);
    }
  };

  const handlePersonalFileItemSubmit = (result) => {
    setShowPersonalFileForm(false);
    toast.success(`Item saved to ${teamMemberName}'s personal file`);
    if (onActionComplete) {
      onActionComplete('personalFile', result);
    }
  };

  if (!showAgendaAction && !showPersonalFileAction) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        {showAgendaAction && (
          <Button 
            variant={variant} 
            size={size}
            onClick={() => setShowAgendaForm(true)}
            title={`Add to ${teamMemberName}'s 1:1 agenda`}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to 1:1
          </Button>
        )}
        
        {showPersonalFileAction && (
          <Button 
            variant={variant} 
            size={size}
            onClick={() => setShowPersonalFileForm(true)}
            title={`Save to ${teamMemberName}'s personal file`}
          >
            <FileText className="h-4 w-4 mr-1" />
            Save to File
          </Button>
        )}
      </div>

      {/* Add to 1:1 Agenda Dialog */}
      <Dialog open={showAgendaForm} onOpenChange={setShowAgendaForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to {teamMemberName}'s 1:1 Agenda</DialogTitle>
          </DialogHeader>
          <AgendaItemForm
            teamMemberId={teamMemberId}
            onSubmit={handleAgendaItemSubmit}
            onCancel={() => setShowAgendaForm(false)}
            sourceItem={sourceItem}
          />
        </DialogContent>
      </Dialog>

      {/* Save to Personal File Dialog */}
      <Dialog open={showPersonalFileForm} onOpenChange={setShowPersonalFileForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to {teamMemberName}'s Personal File</DialogTitle>
          </DialogHeader>
          <PersonalFileItemForm
            teamMemberId={teamMemberId}
            onSubmit={handlePersonalFileItemSubmit}
            onCancel={() => setShowPersonalFileForm(false)}
            sourceItem={sourceItem}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgendaContextActions;