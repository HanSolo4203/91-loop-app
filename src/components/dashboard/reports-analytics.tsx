'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Package, 
  DollarSign, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { formatCurrencySSR } from '@/lib/utils/formatters';
import { useReportsStats } from '@/lib/hooks/use-reports-stats';

interface ReportsAnalyticsProps {
  month: number | null;
  year: number;
}

const buildMonthParam = (monthValue: number | null, yearValue: number) => {
  if (monthValue === null) {
    return `${yearValue}-all`;
  }
  return `${yearValue}-${String(monthValue + 1).padStart(2, '0')}`;
};

export default function ReportsAnalytics({ month, year }: ReportsAnalyticsProps) {
  const monthParam = buildMonthParam(month, year);
  const { data: queryData, isLoading: loading, error: queryError } = useReportsStats({ month: monthParam });
  
  const data = queryData?.data || null;
  const error = queryError ? 'Failed to load analytics' : (queryData && !queryData.success ? queryData.error || 'Failed to load analytics' : null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-200 rounded w-32 mx-auto"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500 text-center">
            {error || 'Unable to load analytics'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-center">
            <Users className="w-4 h-4 mr-2" />
            Total Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 text-center">
            {summary.total_clients}
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-center">
            <Package className="w-4 h-4 mr-2" />
            Items Washed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 text-center">
            {summary.total_items_washed.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4 mr-2" />
            Total Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 text-center">
            {formatCurrencySSR(summary.total_revenue_incl_vat)}
          </div>
          <p className="text-xs text-slate-500 text-center mt-1">
            {formatCurrencySSR(summary.total_revenue_before_vat)} + VAT
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Discrepancy Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600 text-center">
            {summary.discrepancy_rate.toFixed(1)}%
          </div>
          <p className="text-xs text-slate-500 text-center mt-1">
            {summary.total_discrepancies} of {summary.total_batches} batches
          </p>
        </CardContent>
      </Card>

      {/* Additional metrics row */}
      <Card className="hover:shadow-md transition-shadow md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Total Batches</p>
              <p className="text-xl font-bold text-slate-700">{summary.total_batches}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Avg Batch Value</p>
              <p className="text-xl font-bold text-slate-700">
                {formatCurrencySSR(summary.average_batch_value)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Avg Items/Batch</p>
              <p className="text-xl font-bold text-slate-700">
                {summary.average_items_per_batch.toFixed(1)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">VAT Amount</p>
              <p className="text-xl font-bold text-slate-700">
                {formatCurrencySSR(summary.total_vat_amount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

