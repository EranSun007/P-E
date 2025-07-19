import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, User, Calendar } from 'lucide-react';

/**
 * AgendaItemCard - Component to display individual agenda items with meeting context
 * 
 * @param {Object} props
 * @param {Object} props.agendaItem - The agenda item data
 * @param {string} props.agendaItem.id - Unique identifier for the agenda item
 * @param {string} props.agendaItem.noteText - The text content of the agenda item
 * @param {Date} props.agendaItem.meetingDate - Date of the meeting
 * @param {string} props.agendaItem.meetingOwner - ID of the meeting owner
 * @param {string} props.agendaItem.createdBy - ID of who created the note
 * @param {boolean} props.agendaItem.isDiscussed - Whether the item has been discussed
 * @param {string} props.agendaItem.discussedAt - When the item was marked as discussed
 * @param {string} props.meetingOwnerName - Display name of the meeting owner
 * @param {Function} props.onMarkDiscussed - Callback when marking item as discussed
 * @param {boolean} props.showActions - Whether to show action buttons (default: true)
 * @param {string} props.className - Additional CSS classes
 */
export function AgendaItemCard({
  agendaItem,
  meetingOwnerName,
  onMarkDiscussed,
  showActions = true,
  className = ''
}) {
  const {
    id,
    noteText,
    meetingDate,
    meetingOwner,
    createdBy,
    isDiscussed,
    discussedAt,
    timestamp
  } = agendaItem;

  const handleMarkDiscussed = () => {
    if (onMarkDiscussed && !isDiscussed) {
      onMarkDiscussed(agendaItem);
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with meeting info and status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(meetingDate, 'MMM d, yyyy')}</span>
              {meetingOwnerName && (
                <>
                  <span>•</span>
                  <User className="h-4 w-4" />
                  <span>{meetingOwnerName}</span>
                </>
              )}
            </div>
            
            {/* Status badge */}
            <Badge 
              variant={isDiscussed ? "secondary" : "outline"}
              className={isDiscussed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
            >
              {isDiscussed ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Discussed
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </>
              )}
            </Badge>
          </div>

          {/* Agenda item text */}
          <div className="text-sm leading-relaxed">
            <p className="text-foreground">{noteText}</p>
          </div>

          {/* Footer with actions and metadata */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground">
              {isDiscussed && discussedAt && (
                <span>Discussed {format(new Date(discussedAt), 'MMM d, yyyy')}</span>
              )}
            </div>
            
            {showActions && !isDiscussed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkDiscussed}
                className="h-7 px-3 text-xs"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Mark as Discussed
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * AgendaItemList - Component to display a list of agenda items
 * 
 * @param {Object} props
 * @param {Array} props.agendaItems - Array of agenda item objects
 * @param {Object} props.teamMembers - Object mapping team member IDs to names
 * @param {Function} props.onMarkDiscussed - Callback when marking item as discussed
 * @param {boolean} props.showActions - Whether to show action buttons
 * @param {string} props.emptyMessage - Message to show when no items exist
 */
export function AgendaItemList({
  agendaItems = [],
  teamMembers = {},
  onMarkDiscussed,
  showActions = true,
  emptyMessage = "No agenda items found"
}) {
  if (agendaItems.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {agendaItems.map((item) => (
        <AgendaItemCard
          key={item.id}
          agendaItem={item}
          meetingOwnerName={teamMembers[item.meetingOwner]?.name || 'Unknown'}
          onMarkDiscussed={onMarkDiscussed}
          showActions={showActions}
        />
      ))}
    </div>
  );
}