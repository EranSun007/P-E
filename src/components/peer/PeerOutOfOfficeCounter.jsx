/**
 * PeerOutOfOfficeCounter Component
 * Displays total out of office days for a peer for the current calendar year
 * with real-time updates and optional breakdown by reason type
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Clock, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import OutOfOfficeService from '../../services/outOfOfficeService';

/**
 * PeerOutOfOfficeCounter Component
 * @param {Object} props - Component props
 * @param {string} props.peerId - ID of the peer
 * @param {number} props.year - Year to display (defaults to current year)
 * @param {boolean} props.showBreakdown - Whether to show breakdown by reason type
 * @param {boolean} props.showYearSelector - Whether to show year selector
 * @param {Function} props.onStatsChange - Callback when stats change (for real-time updates)
 * @param {string} props.className - Additional CSS classes
 */
const PeerOutOfOfficeCounter = ({
  peerId,
  year: propYear,
  showBreakdown = false,
  showYearSelector = false,
  onStatsChange,
  className = ''
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(propYear || currentYear);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generate year options for selector (current year and 2 years back)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 0; i < 3; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, [currentYear]);

  // Load stats for the selected year
  const loadStats = async (year) => {
    if (!peerId) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const yearlyStats = await OutOfOfficeService.getYearlyStatsForPeer(peerId, year);
      setStats(yearlyStats);
      
      // Notify parent component of stats change
      if (onStatsChange) {
        onStatsChange(yearlyStats);
      }
    } catch (err) {
      console.error('Failed to load peer out of office stats:', err);
      setError(err.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Load stats when component mounts or dependencies change
  useEffect(() => {
    loadStats(selectedYear);
  }, [peerId, selectedYear]);

  // Handle year selection change
  const handleYearChange = (year) => {
    setSelectedYear(parseInt(year));
  };

  // Get reason type display info
  const getReasonDisplay = (reasonValue) => {
    const reasonType = OutOfOfficeService.getReasonType(reasonValue);
    return reasonType || { name: reasonValue, color: '#6b7280' };
  };

  // Format breakdown data for display
  const breakdownData = useMemo(() => {
    if (!stats || !stats.reasonBreakdown) return [];
    
    return Object.entries(stats.reasonBreakdown)
      .map(([reason, days]) => ({
        reason,
        days,
        display: getReasonDisplay(reason)
      }))
      .sort((a, b) => b.days - a.days); // Sort by days descending
  }, [stats]);

  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Out of Office Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Out of Office Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load stats</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadStats(selectedYear)}
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalDays = stats?.totalDays || 0;
  const isCurrentYear = selectedYear === currentYear;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Out of Office Days
          </CardTitle>
          {showYearSelector && (
            <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main counter display */}
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-primary">
              {totalDays}
            </div>
            <div className="text-sm text-muted-foreground">
              {totalDays === 1 ? 'day' : 'days'} in {selectedYear}
              {isCurrentYear && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Current
                </Badge>
              )}
            </div>
          </div>

          {/* Breakdown by reason type */}
          {showBreakdown && breakdownData.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Breakdown
              </div>
              <div className="space-y-1">
                {breakdownData.map(({ reason, days, display }) => (
                  <div key={reason} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: display.color }}
                      />
                      <span>{display.name}</span>
                    </div>
                    <span className="font-medium">
                      {days} {days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No data message */}
          {totalDays === 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              No out of office periods in {selectedYear}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PeerOutOfOfficeCounter;