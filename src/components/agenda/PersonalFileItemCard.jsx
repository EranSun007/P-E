import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Star, FileText, Tag } from 'lucide-react';

/**
 * PersonalFileItemCard - Component to display individual personal file items with action buttons
 * 
 * @param {Object} props
 * @param {Object} props.item - The personal file item data
 * @param {string} props.item.id - Unique identifier for the personal file item
 * @param {string} props.item.title - Title of the personal file item
 * @param {string} props.item.notes - Notes/content of the personal file item
 * @param {string} props.item.category - Category ('achievement', 'feedback', 'concern', etc.)
 * @param {number} props.item.importance - Importance level (1-5)
 * @param {Array<string>} props.item.tags - Array of tags
 * @param {string} props.item.sourceType - Source type ('manual', 'task', 'meeting', etc.)
 * @param {string} props.item.createdAt - Creation timestamp
 * @param {string} props.item.updatedAt - Last update timestamp
 * @param {Function} props.onEdit - Callback when editing an item
 * @param {Function} props.onDelete - Callback when deleting an item
 * @param {boolean} props.showActions - Whether to show action buttons (default: true)
 * @param {string} props.className - Additional CSS classes
 */
const PersonalFileItemCard = ({ 
  item, 
  onEdit, 
  onDelete,
  showActions = true,
  className = ''
}) => {
  const getCategoryColor = (category) => {
    switch (category) {
      case 'achievement': return 'bg-green-100 text-green-800 border-green-200';
      case 'feedback': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'concern': return 'bg-red-100 text-red-800 border-red-200';
      case 'goal': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'improvement': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'other': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'achievement': return 'Achievement';
      case 'feedback': return 'Feedback';
      case 'concern': return 'Concern';
      case 'goal': return 'Goal';
      case 'improvement': return 'Improvement';
      case 'other': return 'Other';
      default: return 'Other';
    }
  };

  const getImportanceColor = (importance) => {
    switch (importance) {
      case 5: return 'text-red-600';
      case 4: return 'text-orange-600';
      case 3: return 'text-yellow-600';
      case 2: return 'text-blue-600';
      case 1: return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getImportanceLabel = (importance) => {
    switch (importance) {
      case 5: return 'High';
      case 4: return 'Medium-High';
      case 3: return 'Medium';
      case 2: return 'Medium-Low';
      case 1: return 'Low';
      default: return 'Medium';
    }
  };

  const renderImportanceStars = (importance) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-3 w-3 ${
          index < importance 
            ? `fill-current ${getImportanceColor(importance)}` 
            : 'text-gray-300'
        }`}
      />
    ));
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
          {/* Header with title and category */}
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-foreground leading-tight flex-1 mr-3">
              {item.title}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge 
                variant="outline"
                className={getCategoryColor(item.category)}
              >
                <FileText className="h-3 w-3 mr-1" />
                {getCategoryLabel(item.category)}
              </Badge>
            </div>
          </div>

          {/* Importance rating */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Importance:</span>
            <div className="flex items-center gap-1">
              {renderImportanceStars(item.importance)}
              <span className={`text-xs font-medium ${getImportanceColor(item.importance)}`}>
                {getImportanceLabel(item.importance)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="text-sm text-muted-foreground leading-relaxed">
              <p className="whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <Tag className="h-2 w-2 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Source information */}
          {item.sourceType && item.sourceType !== 'manual' && (
            <div className="text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Source: {item.sourceType}
              </span>
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

export default PersonalFileItemCard;