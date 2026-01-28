// src/components/notifications/NotificationPanel.jsx
// Scrollable list of notifications with mark-as-read

import { formatDistanceToNow } from 'date-fns';
import { Bell, AlertTriangle, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function NotificationItem({ notification, onMarkRead }) {
  const isKPIAlert = notification.notification_type === 'kpi_alert';

  return (
    <div
      className={cn(
        'px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors',
        !notification.read && 'bg-blue-50/50'
      )}
      onClick={() => !notification.read && onMarkRead(notification.id)}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 mt-0.5',
          isKPIAlert ? 'text-red-500' : 'text-gray-400'
        )}>
          {isKPIAlert ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm',
            notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'
          )}>
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
          </p>
        </div>

        {/* Read indicator */}
        {!notification.read && (
          <div className="flex-shrink-0">
            <span className="h-2 w-2 rounded-full bg-blue-500 block" />
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationPanel({ notifications, onMarkRead, onMarkAllRead }) {
  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        {unreadNotifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-blue-600 hover:text-blue-700 h-auto py-1 px-2"
            onClick={onMarkAllRead}
          >
            <Check className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <ScrollArea className="h-[300px]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
