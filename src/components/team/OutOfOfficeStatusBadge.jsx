/**
 * OutOfOfficeStatusBadge Component
 * Displays current out of office status with return date and reason color coding
 */

import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Calendar, Clock } from 'lucide-react';
import OutOfOfficeService from '../../services/outOfOfficeService';

/**
 * OutOfOfficeStatusBadge Component
 * @param {Object} props - Component props
 * @param {string} props.teamMemberId - ID of the team member
 * @param {string} props.currentDate - Current date (ISO string, defaults to today)
 * @param {boolean} props.showReturnDate - Whether to show return date (default: true)
 * @param {boolean} props.showReason - Whether to show reason (default: false)
 * @param {string} props.size - Badge size: 'sm', 'md', 'lg' (default: 'md')
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onStatusChange - Callback when status changes
 */
const OutOfOfficeStatusBadge = ({
  teamMemberId,
  currentDate,
  showReturnDate = true,
  showReason = false,
  size = 'md',
  className = '',
  onStatusChange
}) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load current status
  const loadStatus = async () => {
    if (!teamMemberId) {
      setStatus(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const currentStatus = await OutOfOfficeService.getCurrentStatus(teamMemberId, currentDate);
      setStatus(currentStatus);
      
      // Notify parent component of status change
      if (onStatusChange) {
        onStatusChange(currentStatus);
      }
    } catch (err) {
      console.error('Failed to load out of office status:', err);
      setError(err.message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Load status when component mounts or dependencies change
  useEffect(() => {
    loadStatus();
  }, [teamMemberId, currentDate]);

  // Get reason type display info
  const getReasonDisplay = (reasonValue) => {
    const reasonType = OutOfOfficeService.getReasonType(reasonValue);
    return reasonType || { name: reasonValue, color: '#6b7280' };
  };

  // Format return date for display
  const formatReturnDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if return date is today or tomorrow
    if (date.toDateString() === today.toDateString()) {
      return 'Returns today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Returns tomorrow';
    } else {
      // Format as short date
      return `Returns ${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })}`;
    }
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'lg':
        return 'text-sm px-3 py-1';
      default:
        return 'text-xs px-2.5 py-0.5';
    }
  };

  // Don't render anything if loading or no status
  if (loading || !status) {
    return null;
  }

  // Don't render if there's an error
  if (error) {
    return null;
  }

  const reasonDisplay = getReasonDisplay(status.reason);
  const returnDateText = formatReturnDate(status.returnDate);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Main status badge */}
      <Badge
        className={`${getSizeClasses()} border-0 text-white font-medium`}
        style={{ backgroundColor: reasonDisplay.color }}
      >
        <Clock className="h-3 w-3 mr-1" />
        Out of Office
        {showReason && (
          <span className="ml-1">
            • {reasonDisplay.name}
          </span>
        )}
      </Badge>

      {/* Return date badge */}
      {showReturnDate && (
        <Badge
          variant="outline"
          className={`${getSizeClasses()} text-muted-foreground border-muted-foreground/30`}
        >
          <Calendar className="h-3 w-3 mr-1" />
          {returnDateText}
        </Badge>
      )}
    </div>
  );
};

export default OutOfOfficeStatusBadge;