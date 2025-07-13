import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Loading spinner component with various sizes and styles
 */
export const LoadingSpinner = ({ 
  size = 'md', 
  className = '',
  text = '',
  showText = false,
  variant = 'primary'
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const variantClasses = {
    primary: 'text-indigo-600',
    secondary: 'text-gray-600',
    white: 'text-white',
    muted: 'text-gray-400'
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 
        className={cn(
          'animate-spin',
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {(showText || text) && (
        <span className={cn(
          'ml-2',
          textSizeClasses[size],
          variantClasses[variant]
        )}>
          {text || 'Loading...'}
        </span>
      )}
    </div>
  );
};

/**
 * Full screen loading overlay
 */
export const LoadingOverlay = ({ 
  isLoading = false, 
  text = 'Loading...',
  className = ''
}) => {
  if (!isLoading) return null;

  return (
    <div className={cn(
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
      className
    )}>
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <LoadingSpinner size="lg" text={text} showText />
      </div>
    </div>
  );
};

/**
 * Inline loading state for content areas
 */
export const LoadingContent = ({ 
  isLoading = false, 
  children, 
  text = 'Loading...',
  className = '',
  minHeight = '200px'
}) => {
  if (isLoading) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center text-center p-12',
          className
        )}
        style={{ minHeight }}
      >
        <div>
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">{text}</p>
        </div>
      </div>
    );
  }

  return children;
};

/**
 * Loading skeleton for cards
 */
export const LoadingSkeleton = ({ 
  lines = 3, 
  className = '',
  showAvatar = false,
  showButton = false
}) => {
  return (
    <div className={cn('animate-pulse', className)}>
      {showAvatar && (
        <div className="flex items-center space-x-3 mb-4">
          <div className="rounded-full bg-gray-300 h-10 w-10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        ))}
      </div>
      
      {showButton && (
        <div className="mt-4 h-10 bg-gray-300 rounded w-32"></div>
      )}
    </div>
  );
};

/**
 * Loading button state
 */
export const LoadingButton = ({ 
  isLoading = false, 
  children, 
  loadingText = 'Loading...',
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <button 
      disabled={isLoading || disabled}
      className={cn(
        'flex items-center justify-center',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * Loading table rows
 */
export const LoadingTableRows = ({ 
  rows = 5, 
  columns = 4,
  className = ''
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className={cn('animate-pulse', className)}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <div className="h-4 bg-gray-300 rounded w-full"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default LoadingSpinner;