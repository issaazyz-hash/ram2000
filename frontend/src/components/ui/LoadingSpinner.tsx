/**
 * LoadingSpinner Component
 * 
 * Reusable loading spinner for async operations.
 * Accessible with proper ARIA attributes.
 * 
 * @component
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" />
 * ```
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`inline-block ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div className="animate-spin rounded-full border-4 border-gray-300 border-t-transparent" />
      <span className="sr-only">Loading...</span>
    </div>
  );
};
export default LoadingSpinner;


