import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { realTimeUpdateService } from '../../services/realTimeUpdateService';

/**
 * Connection status indicator component for real-time updates
 * Shows current connection status and provides manual refresh option
 */
export function ConnectionStatusIndicator({ 
  showLabel = false, 
  onRefresh,
  className = "" 
}) {
  const [status, setStatus] = useState(realTimeUpdateService.getConnectionStatus());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Subscribe to connection status updates
    const unsubscribe = realTimeUpdateService.onUpdate((updates) => {
      if (updates.has('connection_status')) {
        setStatus(realTimeUpdateService.getConnectionStatus());
      }
    });

    // Update status periodically
    const statusInterval = setInterval(() => {
      setStatus(realTimeUpdateService.getConnectionStatus());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await realTimeUpdateService.forceRefresh();
      if (onRefresh) {
        onRefresh(result);
      }
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'retrying':
        return <RotateCcw className="h-4 w-4 text-yellow-600 animate-spin" />;
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'connected':
        return status.isPolling ? 'Live updates active' : 'Connected';
      case 'retrying':
        return `Reconnecting... (${status.retryCount}/3)`;
      case 'error':
        return 'Connection failed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusVariant = () => {
    switch (status.status) {
      case 'connected':
        return 'default';
      case 'retrying':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              {showLabel && (
                <Badge variant={getStatusVariant()} className="text-xs">
                  {getStatusText()}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">{getStatusText()}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {status.isPolling ? (
                  `Checking every ${status.pollInterval / 1000}s`
                ) : (
                  'Real-time updates paused'
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RotateCcw 
                className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <span className="text-sm">Manual refresh</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default ConnectionStatusIndicator;