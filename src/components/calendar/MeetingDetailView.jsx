import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  MessageSquare, 
  Plus,
  CheckCircle2,
  Circle,
  ArrowRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgendaIndicatorService } from '@/services/agendaIndicatorService';
import { AgendaItem } from '@/api/oneOnOneAgenda';
import AgendaItemForm from '@/components/agenda/AgendaItemForm';
import { CalendarAgendaIndicator } from './CalendarAgendaIndicator';

/**
 * MeetingDetailView - Expandable view for calendar meeting details with agenda management
 * 
 * @param {Object} props
 * @param {Object} props.event - Calendar event object
 * @param {Object} props.teamMember - Team member object
 * @param {boolean} props.isOpen - Whether the detail view is open
 * @param {Function} props.onClose - Callback when closing the detail view
 * @param {Function} props.onNavigateToProfile - Callback to navigate to team member profile
 * @param {string} props.className - Additional CSS classes
 */
export default function MeetingDetailView({
  event,
  teamMember,
  isOpen = false,
  onClose,
  onNavigateToProfile,
  className = ''
}) {
  const [agendaItems, setAgendaItems] = useState([]);
  const [agendaCounts, setAgendaCounts] = useState({ count: 0, unresolvedCount: 0, hasUnresolved: false });
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);

  // Load agenda items when component opens
  useEffect(() => {
    if (isOpen && event && event.event_type === 'one_on_one' && event.team_member_id) {
      loadAgendaItems();
    }
  }, [isOpen, event]);

  const loadAgendaItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [items, counts] = await Promise.all([
        AgendaIndicatorService.getAgendaItemsForNextMeeting(event.team_member_id),
        AgendaIndicatorService.getAgendaCountsForTeamMember(event.team_member_id)
      ]);
      
      setAgendaItems(items);
      setAgendaCounts(counts);
    } catch (err) {
      console.error('Error loading agenda items:', err);
      setError('Failed to load agenda items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAgendaItem = async (agendaItemData) => {
    try {
      if (!agendaItemData) {
        setShowAddForm(false);
        return;
      }

      await AgendaItem.create({
        ...agendaItemData,
        teamMemberId: event.team_member_id,
        status: 'pending',
        targetMeetingDate: event.start_date
      });

      // Reload agenda items
      await loadAgendaItems();
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding agenda item:', err);
      setError('Failed to add agenda item');
    }
  };

  const handleToggleAgendaItem = async (itemId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await AgendaItem.update(itemId, { status: newStatus });
      await loadAgendaItems();
    } catch (err) {
      console.error('Error updating agenda item:', err);
      setError('Failed to update agenda item');
    }
  };

  const handleMoveToNextMeeting = async (itemId) => {
    try {
      await AgendaItem.update(itemId, { 
        status: 'moved',
        targetMeetingDate: null // Will be set to next meeting when scheduled
      });
      await loadAgendaItems();
    } catch (err) {
      console.error('Error moving agenda item:', err);
      setError('Failed to move agenda item');
    }
  };

  if (!isOpen || !event) {
    return null;
  }

  const isOneOnOne = event.event_type === 'one_on_one';
  const startTime = event.start_date ? format(parseISO(event.start_date), "h:mm a") : "";
  const endTime = event.end_date ? format(parseISO(event.end_date), "h:mm a") : "";
  const eventDate = event.start_date ? format(parseISO(event.start_date), "EEEE, MMMM d, yyyy") : "";

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{event.title}</CardTitle>
            {isOneOnOne && agendaCounts.count > 0 && (
              <CalendarAgendaIndicator
                count={agendaCounts.count}
                unresolvedCount={agendaCounts.unresolvedCount}
                hasUnresolved={agendaCounts.hasUnresolved}
                size="sm"
              />
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Meeting Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{eventDate}</span>
            {startTime && (
              <>
                <span>•</span>
                <span>{endTime && endTime !== startTime ? `${startTime} - ${endTime}` : startTime}</span>
              </>
            )}
          </div>

          {teamMember && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{teamMember.name}</span>
            </div>
          )}

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          )}

          {event.description && event.description !== event.title && (
            <p className="text-sm text-gray-700 mt-2">{event.description}</p>
          )}
        </div>

        {/* Agenda Section - Only for 1:1 meetings */}
        {isOneOnOne && teamMember && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <h3 className="font-medium">Meeting Agenda</h3>
                  {agendaCounts.count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {agendaCounts.count} items
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              {/* Add Agenda Item Form */}
              {showAddForm && (
                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <AgendaItemForm
                      teamMemberId={event.team_member_id}
                      onSubmit={handleAddAgendaItem}
                      onCancel={() => setShowAddForm(false)}
                      initialData={{
                        targetMeetingDate: event.start_date
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Agenda Items List */}
              {isLoading ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  Loading agenda items...
                </div>
              ) : agendaItems.length > 0 ? (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {agendaItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                          item.status === 'completed' 
                            ? "bg-green-50 border-green-200" 
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 mt-0.5"
                          onClick={() => handleToggleAgendaItem(item.id, item.status)}
                        >
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>

                        <div className="flex-1 min-w-0">
                          <h4 className={cn(
                            "font-medium text-sm",
                            item.status === 'completed' && "line-through text-gray-500"
                          )}>
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className={cn(
                              "text-xs text-gray-600 mt-1",
                              item.status === 'completed' && "line-through"
                            )}>
                              {item.description}
                            </p>
                          )}
                          {item.priority && item.priority !== 'medium' && (
                            <Badge 
                              variant={item.priority === 'high' ? 'destructive' : 'secondary'}
                              className="text-xs mt-1"
                            >
                              {item.priority} priority
                            </Badge>
                          )}
                        </div>

                        {item.status !== 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleMoveToNextMeeting(item.id)}
                            title="Move to next meeting"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-6 text-sm text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No agenda items yet</p>
                  <p className="text-xs mt-1">Add items to prepare for this meeting</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {teamMember && onNavigateToProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToProfile(teamMember.id)}
              >
                <User className="h-4 w-4 mr-1" />
                View Profile
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}