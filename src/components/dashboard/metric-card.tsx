'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
  };
  icon: LucideIcon;
  variant?: 'default' | 'revenue' | 'batches' | 'discrepancies';
  loading?: boolean;
}

const variantStyles = {
  default: {
    card: '',
    icon: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-800'
  },
  revenue: {
    card: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50',
    icon: 'text-green-600',
    badge: 'bg-green-100 text-green-800'
  },
  batches: {
    card: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-800'
  },
  discrepancies: {
    card: 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/50',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-800'
  }
};

export default function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  variant = 'default',
  loading = false
}: MetricCardProps) {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <Card className={`${styles.card} animate-pulse`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="h-8 w-8 bg-slate-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-slate-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-20"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={styles.card}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${styles.icon}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 mb-1">
          {value}
        </div>
        {change && (
          <div className="flex items-center space-x-2">
            <Badge 
              variant="secondary" 
              className={`${styles.badge} text-xs`}
            >
              {change.value > 0 ? '+' : ''}{change.value}%
            </Badge>
            <span className="text-xs text-slate-500">
              vs {change.period}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
