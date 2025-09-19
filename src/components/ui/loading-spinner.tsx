'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const variantClasses = {
  default: 'text-slate-600',
  primary: 'text-blue-600',
  secondary: 'text-slate-500',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600'
};

/**
 * Loading spinner component with various sizes and variants
 */
export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  className,
  text,
  fullScreen = false,
  overlay = false
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex flex-col items-center space-y-3">
        <div
          className={cn(
            'animate-spin rounded-full border-2 border-solid border-current border-t-transparent',
            sizeClasses[size],
            variantClasses[variant]
          )}
          role="status"
          aria-label="Loading"
        >
          <span className="sr-only">Loading...</span>
        </div>
        {text && (
          <p className={cn('text-sm font-medium', variantClasses[variant])}>
            {text}
          </p>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {spinnerElement}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
}

/**
 * Loading skeleton component for content placeholders
 */
interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
  width?: string;
  height?: string;
}

export function LoadingSkeleton({
  className,
  lines = 1,
  width = 'w-full',
  height = 'h-4'
}: LoadingSkeletonProps) {
  if (lines === 1) {
    return (
      <div
        className={cn(
          'animate-pulse bg-slate-200 rounded',
          width,
          height,
          className
        )}
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse bg-slate-200 rounded',
            index === lines - 1 ? 'w-3/4' : 'w-full',
            height
          )}
        />
      ))}
    </div>
  );
}

/**
 * Loading skeleton for cards
 */
interface LoadingCardProps {
  className?: string;
  showAvatar?: boolean;
  showActions?: boolean;
}

export function LoadingCard({
  className,
  showAvatar = false,
  showActions = false
}: LoadingCardProps) {
  return (
    <div className={cn('p-6 border border-slate-200 rounded-lg animate-pulse', className)}>
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <div className="w-10 h-10 bg-slate-200 rounded-full" />
        )}
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-5/6" />
          {showActions && (
            <div className="flex space-x-2 pt-2">
              <div className="h-8 bg-slate-200 rounded w-16" />
              <div className="h-8 bg-slate-200 rounded w-20" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for tables
 */
interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingTable({
  rows = 5,
  columns = 4,
  className
}: LoadingTableProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Table header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }, (_, index) => (
          <div
            key={index}
            className="h-4 bg-slate-200 rounded animate-pulse"
            style={{ width: `${100 / columns}%` }}
          />
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }, (_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-slate-200 rounded animate-pulse"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for form fields
 */
interface LoadingFormProps {
  fields?: number;
  className?: string;
}

export function LoadingForm({
  fields = 3,
  className
}: LoadingFormProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse" />
          <div className="h-10 bg-slate-200 rounded w-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * Loading state component that shows spinner with optional text
 */
interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingState({
  size = 'md',
  text = 'Loading...',
  className,
  fullScreen = false
}: LoadingStateProps) {
  return (
    <LoadingSpinner
      size={size}
      text={text}
      className={className}
      fullScreen={fullScreen}
    />
  );
}

/**
 * Inline loading component for buttons and small elements
 */
interface InlineLoadingProps {
  size?: 'sm' | 'md';
  text?: string;
  className?: string;
}

export function InlineLoading({
  size = 'sm',
  text,
  className
}: InlineLoadingProps) {
  return (
    <div className={cn('inline-flex items-center space-x-2', className)}>
      <LoadingSpinner size={size} />
      {text && <span className="text-sm text-slate-600">{text}</span>}
    </div>
  );
}

/**
 * Loading overlay component
 */
interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({
  isVisible,
  text = 'Loading...',
  children,
  className
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isVisible && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <LoadingSpinner text={text} />
        </div>
      )}
    </div>
  );
}

/**
 * Pulse animation for loading states
 */
interface PulseProps {
  className?: string;
  children?: React.ReactNode;
}

export function Pulse({ className, children }: PulseProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      {children}
    </div>
  );
}

export default LoadingSpinner;
