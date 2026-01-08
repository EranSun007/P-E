import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, ArrowUpDown, Edit, Trash2, AlertCircle } from 'lucide-react';

/**
 * AgendaItemCard - Component to display individual agenda items with action buttons
 * 
 * @param {Object} props
 * @param {Object} props.item - The agenda item data
 * @param {string} props.item.id - Unique identifier for the agenda item
 * @param {string} props.item.title - Title of the agenda item
 * @param {string} props.item.description - Description of the agenda item
 * @param {number} props.item.priority - Priority level (1=High, 2=Medium, 3=Low)
 * @param {string} props.item.status - Status ('pending', 'discussed', 'moved')
 * @param {Array<string>} props.item.tags - Array of tags
 * @param {string} props.item.createdAt - Creation timestamp
 * @param {string} props.item.updatedAt - Last update timestamp
 * @param {Function} props.onComplete - Callback when marking item as complete/discussed
 * @param {Function} props.onMove - Callback when moving item to next meeting
 * @param {Function} props.onEdit - Callback when editing an item
 * @param {Function} props.onDelete - Callback when deleting an item
 * @param {boolean} props.showActions - Whether to show action buttons (default: true)
 * @param {string} props.className - Additional CSS classes
 */
const AgendaItemCard = ({ 
  item, 
  onComplete, 
  onMove, 
  onEdit, 
  onDelete,
  showActions = true,
  className = ''
}) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 3: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Medium';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'discussed': return 'bg-green-100 text-green-800';
      case 'moved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleComplete = () => {
    if (onComplete && item.status === 'pending') {
      onComplete(item);
    }
  };

  const handleMove = () => {
    if (onMove && item.status === 'pending') {
      onMove(item);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(item);
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with title and status */}
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-foreground leading-tight flex-1 mr-3">
              {item.title}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge 
                variant="outline"
                className={getPriorityColor(item.priority)}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                {getPriorityLabel(item.priority)}
              </Badge>
              <Badge 
                variant={item.status === 'discussed' ? "secondary" : "outline"}
                className={getStatusColor(item.status)}
              >
                {item.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                {item.status === 'discussed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {item.status === 'moved' && <ArrowUpDown className="h-3 w-3 mr-1" />}
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="text-sm text-muted-foreground leading-relaxed">
              <p>{item.description}</p>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer with metadata and actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground">
              Created {format(new Date(item.createdAt), 'MMM d, yyyy')}
              {item.updatedAt !== item.createdAt && (
                <span> • Updated {format(new Date(item.updatedAt), 'MMM d, yyyy')}</span>
              )}
            </div>
            
            {showActions && (
              <div className="flex items-center gap-1">
                {item.status === 'pending' && onComplete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleComplete}
                    className="h-7 px-3 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                  </Button>
                )}
                {item.status === 'pending' && onMove && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMove}
                    className="h-7 px-3 text-xs"
                  >
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    Move
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="h-7 px-3 text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-7 px-3 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgendaItemCard;