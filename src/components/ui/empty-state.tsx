'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Package, 
  Search, 
  Plus, 
  FileText, 
  Users, 
  Calendar,
  AlertCircle,
  RefreshCw,
  Filter,
  Database,
  Inbox,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  };
  suggestions?: string[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'card';
}

/**
 * Empty state component for when there's no data to display
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  suggestions,
  className,
  size = 'md',
  variant = 'default'
}: EmptyStateProps) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const content = (
    <div className={cn('text-center', className)}>
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className={cn(
          'text-slate-400',
          iconSizes[size]
        )}>
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className={cn(
        'font-medium text-slate-900 mb-2',
        size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
      )}>
        {title}
      </h3>

      {/* Description */}
      <p className={cn(
        'text-slate-600 mb-6',
        size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
      )}>
        {description}
      </p>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-2">Try these steps:</p>
          <ul className="text-sm text-slate-600 space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{action.label}</span>
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'outline'}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{secondaryAction.label}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardContent className="py-12">
          {content}
        </CardContent>
      </Card>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="py-8">
        {content}
      </div>
    );
  }

  return (
    <div className="py-12">
      {content}
    </div>
  );
}

/**
 * Empty state for batches
 */
interface EmptyBatchesProps {
  onCreateBatch?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function EmptyBatches({
  onCreateBatch,
  onRefresh,
  className
}: EmptyBatchesProps) {
  return (
    <EmptyState
      icon={<Package className="w-full h-full" />}
      title="No batches found"
      description="Get started by creating your first batch to track linen items."
      action={onCreateBatch ? {
        label: 'Create Batch',
        onClick: onCreateBatch
      } : undefined}
      secondaryAction={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh
      } : undefined}
      suggestions={[
        'Create a new batch to start tracking linen items',
        'Import existing data from your current system',
        'Set up your first client and linen categories'
      ]}
      className={className}
    />
  );
}

/**
 * Empty state for search results
 */
interface EmptySearchProps {
  searchTerm: string;
  onClearSearch?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function EmptySearch({
  searchTerm,
  onClearSearch,
  onRefresh,
  className
}: EmptySearchProps) {
  return (
    <EmptyState
      icon={<Search className="w-full h-full" />}
      title="No results found"
      description={`No items match "${searchTerm}". Try adjusting your search terms.`}
      action={onClearSearch ? {
        label: 'Clear Search',
        onClick: onClearSearch,
        variant: 'outline'
      } : undefined}
      secondaryAction={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh
      } : undefined}
      suggestions={[
        'Check your spelling and try again',
        'Use more general search terms',
        'Try different keywords or filters',
        'Make sure all filters are set correctly'
      ]}
      className={className}
    />
  );
}

/**
 * Empty state for clients
 */
interface EmptyClientsProps {
  onCreateClient?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function EmptyClients({
  onCreateClient,
  onRefresh,
  className
}: EmptyClientsProps) {
  return (
    <EmptyState
      icon={<Users className="w-full h-full" />}
      title="No clients found"
      description="Add your first client to start managing linen batches."
      action={onCreateClient ? {
        label: 'Add Client',
        onClick: onCreateClient
      } : undefined}
      secondaryAction={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh
      } : undefined}
      suggestions={[
        'Add your hotel or restaurant clients',
        'Import client data from existing systems',
        'Set up contact information and billing details'
      ]}
      className={className}
    />
  );
}

/**
 * Empty state for categories
 */
interface EmptyCategoriesProps {
  onCreateCategory?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function EmptyCategories({
  onCreateCategory,
  onRefresh,
  className
}: EmptyCategoriesProps) {
  return (
    <EmptyState
      icon={<Archive className="w-full h-full" />}
      title="No linen categories found"
      description="Create categories to organize your linen items by type."
      action={onCreateCategory ? {
        label: 'Create Category',
        onClick: onCreateCategory
      } : undefined}
      secondaryAction={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh
      } : undefined}
      suggestions={[
        'Create categories like "Bath Towels", "Hand Towels", etc.',
        'Set pricing for each category',
        'Organize items for easier batch management'
      ]}
      className={className}
    />
  );
}

/**
 * Empty state for reports
 */
interface EmptyReportsProps {
  onGenerateReport?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function EmptyReports({
  onGenerateReport,
  onRefresh,
  className
}: EmptyReportsProps) {
  return (
    <EmptyState
      icon={<FileText className="w-full h-full" />}
      title="No reports available"
      description="Generate reports to analyze your linen tracking data."
      action={onGenerateReport ? {
        label: 'Generate Report',
        onClick: onGenerateReport
      } : undefined}
      secondaryAction={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh
      } : undefined}
      suggestions={[
        'Create batches to generate data for reports',
        'Set up clients and categories first',
        'Use filters to find specific data'
      ]}
      className={className}
    />
  );
}

/**
 * Empty state for calendar/events
 */
interface EmptyCalendarProps {
  onAddEvent?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function EmptyCalendar({
  onAddEvent,
  onRefresh,
  className
}: EmptyCalendarProps) {
  return (
    <EmptyState
      icon={<Calendar className="w-full h-full" />}
      title="No events scheduled"
      description="Schedule pickup and delivery events for your batches."
      action={onAddEvent ? {
        label: 'Schedule Event',
        onClick: onAddEvent
      } : undefined}
      secondaryAction={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh
      } : undefined}
      suggestions={[
        'Schedule regular pickup times with clients',
        'Set up delivery reminders',
        'Track batch processing timelines'
      ]}
      className={className}
    />
  );
}

/**
 * Empty state for filtered results
 */
interface EmptyFilterProps {
  filterName: string;
  onClearFilter?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function EmptyFilter({
  filterName,
  onClearFilter,
  onRefresh,
  className
}: EmptyFilterProps) {
  return (
    <EmptyState
      icon={<Filter className="w-full h-full" />}
      title="No results match your filter"
      description={`No items match the "${filterName}" filter. Try adjusting your filters.`}
      action={onClearFilter ? {
        label: 'Clear Filters',
        onClick: onClearFilter,
        variant: 'outline'
      } : undefined}
      secondaryAction={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh
      } : undefined}
      suggestions={[
        'Try removing some filters',
        'Use broader date ranges',
        'Check if the filter criteria are correct'
      ]}
      className={className}
    />
  );
}

/**
 * Empty state for error scenarios
 */
interface EmptyErrorProps {
  error?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function EmptyError({
  error,
  onRetry,
  onGoHome,
  className
}: EmptyErrorProps) {
  return (
    <EmptyState
      icon={<AlertCircle className="w-full h-full" />}
      title="Something went wrong"
      description={error || 'We encountered an error while loading the data.'}
      action={onRetry ? {
        label: 'Try Again',
        onClick: onRetry
      } : undefined}
      secondaryAction={onGoHome ? {
        label: 'Go Home',
        onClick: onGoHome,
        variant: 'outline'
      } : undefined}
      suggestions={[
        'Check your internet connection',
        'Try refreshing the page',
        'Contact support if the problem persists'
      ]}
      className={className}
    />
  );
}

/**
 * Empty state for database/data issues
 */
interface EmptyDataProps {
  onRefresh?: () => void;
  onSetup?: () => void;
  className?: string;
}

export function EmptyData({
  onRefresh,
  onSetup,
  className
}: EmptyDataProps) {
  return (
    <EmptyState
      icon={<Database className="w-full h-full" />}
      title="No data available"
      description="The database appears to be empty or not properly configured."
      action={onSetup ? {
        label: 'Setup Data',
        onClick: onSetup
      } : undefined}
      secondaryAction={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh
      } : undefined}
      suggestions={[
        'Run database migrations',
        'Import sample data',
        'Check database connection',
        'Verify environment configuration'
      ]}
      className={className}
    />
  );
}

/**
 * Empty inbox state
 */
interface EmptyInboxProps {
  onRefresh?: () => void;
  className?: string;
}

export function EmptyInbox({
  onRefresh,
  className
}: EmptyInboxProps) {
  return (
    <EmptyState
      icon={<Inbox className="w-full h-full" />}
      title="No notifications"
      description="You're all caught up! No new notifications or messages."
      secondaryAction={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh
      } : undefined}
      suggestions={[
        'Check back later for new notifications',
        'Enable email notifications for important updates',
        'Review your notification preferences'
      ]}
      className={className}
    />
  );
}

export default EmptyState;
