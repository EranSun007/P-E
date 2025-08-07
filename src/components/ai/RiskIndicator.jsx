import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react';

/**
 * Risk Indicator Component
 * Visual representation of risk scores with color coding and icons
 */
export default function RiskIndicator({ score, size = 'medium', showLabel = true, className = '' }) {
  // Determine risk level based on score
  const getRiskLevel = (score) => {
    if (score <= 25) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'critical';
  };

  // Get color scheme based on risk level
  const getRiskColors = (level) => {
    switch (level) {
      case 'low':
        return {
          bg: 'bg-green-100',
          border: 'border-green-300',
          text: 'text-green-800',
          progress: 'bg-green-500',
          icon: CheckCircle
        };
      case 'medium':
        return {
          bg: 'bg-yellow-100',
          border: 'border-yellow-300',
          text: 'text-yellow-800',
          progress: 'bg-yellow-500',
          icon: Info
        };
      case 'high':
        return {
          bg: 'bg-orange-100',
          border: 'border-orange-300',
          text: 'text-orange-800',
          progress: 'bg-orange-500',
          icon: AlertTriangle
        };
      case 'critical':
        return {
          bg: 'bg-red-100',
          border: 'border-red-300',
          text: 'text-red-800',
          progress: 'bg-red-500',
          icon: AlertCircle
        };
      default:
        return {
          bg: 'bg-gray-100',
          border: 'border-gray-300',
          text: 'text-gray-800',
          progress: 'bg-gray-500',
          icon: Info
        };
    }
  };

  // Get size classes
  const getSizeClasses = (size) => {
    switch (size) {
      case 'small':
        return {
          container: 'w-16 h-16',
          text: 'text-xs',
          icon: 'h-3 w-3',
          progress: 'h-1'
        };
      case 'large':
        return {
          container: 'w-24 h-24',
          text: 'text-lg font-bold',
          icon: 'h-5 w-5',
          progress: 'h-3'
        };
      default: // medium
        return {
          container: 'w-20 h-20',
          text: 'text-sm font-semibold',
          icon: 'h-4 w-4',
          progress: 'h-2'
        };
    }
  };

  const riskLevel = getRiskLevel(score);
  const colors = getRiskColors(riskLevel);
  const sizes = getSizeClasses(size);
  const IconComponent = colors.icon;

  // Circular progress indicator
  const CircularProgress = ({ score, size, colors }) => {
    const radius = size === 'small' ? 24 : size === 'large' ? 40 : 32;
    const strokeWidth = size === 'small' ? 3 : size === 'large' ? 5 : 4;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="relative">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className={colors.text}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`${sizes.text} ${colors.text}`}>
              {score}
            </div>
            {size !== 'small' && (
              <div className="text-xs text-gray-500">
                Risk
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Circular Risk Indicator */}
      <div className={`relative ${sizes.container} flex items-center justify-center`}>
        <CircularProgress score={score} size={size} colors={colors} />
      </div>

      {/* Risk Level Badge and Details */}
      {showLabel && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <IconComponent className={`${sizes.icon} ${colors.text}`} />
            <Badge 
              variant="outline" 
              className={`${colors.bg} ${colors.border} ${colors.text} border`}
            >
              {riskLevel.toUpperCase()} RISK
            </Badge>
          </div>
          {size !== 'small' && (
            <div className="text-xs text-muted-foreground">
              Score: {score}/100
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Risk Level Badge Component
 * Simple badge showing just the risk level
 */
export function RiskLevelBadge({ score, className = '' }) {
  const getRiskLevel = (score) => {
    if (score <= 25) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'critical';
  };

  const getRiskColors = (level) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const riskLevel = getRiskLevel(score);
  const colors = getRiskColors(riskLevel);

  return (
    <Badge variant="outline" className={`${colors} border ${className}`}>
      {riskLevel.toUpperCase()}
    </Badge>
  );
}

/**
 * Mini Risk Indicator Component
 * Compact version for use in lists or tables
 */
export function MiniRiskIndicator({ score, className = '' }) {
  const getRiskLevel = (score) => {
    if (score <= 25) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'critical';
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const riskLevel = getRiskLevel(score);
  const color = getRiskColor(riskLevel);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-xs font-medium">{score}</span>
    </div>
  );
}
