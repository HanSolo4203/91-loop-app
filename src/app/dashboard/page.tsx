'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/navigation';
import MetricCard from '@/components/dashboard/metric-card';
import MonthSelector from '@/components/dashboard/month-selector';
import BatchesTable from '@/components/dashboard/batches-table';
import { EmptyState, EmptyBatches } from '@/components/ui/empty-state';
import { AuthGuard } from '@/components/auth/auth-guard';
import {
  LayoutDashboard,
  Package,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Plus,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { BatchStatus } from '@/types/database';
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats';
import { useBatches } from '@/lib/hooks/use-batches';
import { useQueryClient } from '@tanstack/react-query';

type DashboardMetrics = {
  totalBatches: number;
  totalRevenue: number;
  totalItems: number;
  avgBatchValue: number;
  completedBatches: number;
  discrepancies: number;
};

type DashboardBatch = {
  id: string;
  paper_batch_id: string;
  client: { name: string };
  pickup_date: string;
  status: BatchStatus;
  total_amount: number;
  created_at: string;
};

// Breadcrumb component
function Breadcrumb() {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-8">
      <LayoutDashboard className="w-4 h-4" />
      <span>/</span>
      <span className="text-slate-900 font-medium">Dashboard</span>
    </nav>
  );
}

// Main dashboard content
function DashboardContent() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<{ month: number | null; year: number }>({
    month: new Date().getMonth(), // Current month (0-based index)
    year: new Date().getFullYear() // Current year
  });

  const isYearlyView = selectedMonth.month === null;
  
  // Prepare query parameters
  const statsParams = useMemo(() => {
    if (isYearlyView) {
      return {
        year: String(selectedMonth.year),
        type: 'yearly' as const
      };
    } else {
      const monthNum = selectedMonth.month! + 1; // Convert to 1-indexed
      return {
        month: `${selectedMonth.year}-${String(monthNum).padStart(2, '0')}`,
        type: 'monthly' as const
      };
    }
  }, [selectedMonth, isYearlyView]);

  const dateRange = useMemo(() => {
    if (isYearlyView) {
      return {
        date_from: `${selectedMonth.year}-01-01`,
        date_to: `${selectedMonth.year}-12-31`
      };
    } else {
      const monthNum = selectedMonth.month! + 1;
      const lastDayOfMonth = new Date(selectedMonth.year, selectedMonth.month! + 1, 0).getDate();
      return {
        date_from: `${selectedMonth.year}-${String(monthNum).padStart(2, '0')}-01`,
        date_to: `${selectedMonth.year}-${String(monthNum).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`
      };
    }
  }, [selectedMonth, isYearlyView]);

  // Use React Query hooks for data fetching with caching
  const { data: statsData, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats(statsParams);
  const { data: batchesData, isLoading: batchesLoading, error: batchesError, refetch: refetchBatches } = useBatches({
    limit: 200,
    ...dateRange
  });

  const loading = statsLoading || batchesLoading;
  const error = statsError || batchesError;

  // Transform metrics data
  const metrics = useMemo<DashboardMetrics>(() => {
    if (!statsData?.success || !statsData.data) {
      return {
        totalBatches: 0,
        totalRevenue: 0,
        totalItems: 0,
        avgBatchValue: 0,
        completedBatches: 0,
        discrepancies: 0
      };
    }

    const data = statsData.data as any;
    return {
      totalBatches: data.totalBatches || 0,
      totalRevenue: data.totalRevenue || 0,
      totalItems: data.totalItemsProcessed || 0,
      avgBatchValue: data.averageBatchValue || 0,
      completedBatches: data.completedBatches || 0,
      discrepancies: data.discrepancyCount || 0
    };
  }, [statsData]);

  // Transform batches data
  const batches = useMemo<DashboardBatch[]>(() => {
    if (!batchesData?.success || !batchesData.data?.batches) {
      return [];
    }

    return batchesData.data.batches.map((batch) => ({
      id: batch.id,
      paper_batch_id: batch.paper_batch_id,
      client: {
        name: batch.client_name
      },
      pickup_date: batch.pickup_date,
      status: batch.status as BatchStatus,
      total_amount: batch.total_amount,
      created_at: batch.created_at
    }));
  }, [batchesData]);

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['batches'] });
    refetchStats();
    refetchBatches();
  };
  
  const handleMonthChange = (month: number | null, year: number) => {
    setSelectedMonth({ month, year });
  };

  const handleBatchClick = (batch: { id: string }) => {
    // Navigate to batch details
    window.location.href = `/batch/${batch.id}`;
  };

  // Show error state if there's an error
  const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Something went wrong while loading the dashboard data.');
  
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />
          <EmptyState
            icon={<AlertTriangle className="w-full h-full" />}
            title="Failed to load dashboard"
            description={errorMessage}
            action={{
              label: 'Try Again',
              onClick: handleRefresh
            }}
            suggestions={[
              'Check your internet connection',
              'Refresh the page',
              'Contact support if the problem persists'
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Breadcrumb />

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center space-x-3">
                <LayoutDashboard className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                <span>Dashboard</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Overview of your linen tracking operations and key performance metrics
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              <Link href="/batch/new">
                <Button className="flex items-center justify-center space-x-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  <span>New Batch</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Viewing data for:</span>
            </div>
            <MonthSelector
              value={selectedMonth}
              onChange={handleMonthChange}
              loading={loading}
            />
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
          <MetricCard
            title="Total Batches"
            value={metrics.totalBatches}
            change={{ value: 12, period: "last month" }}
            icon={Package}
            variant="batches"
            loading={loading}
          />
          <MetricCard
            title="Total Revenue"
            value={`R${metrics.totalRevenue.toLocaleString()}`}
            change={{ value: 8, period: "last month" }}
            icon={DollarSign}
            variant="revenue"
            loading={loading}
          />
          <MetricCard
            title="Total Items"
            value={metrics.totalItems.toLocaleString()}
            change={{ value: 15, period: "last month" }}
            icon={TrendingUp}
            variant="default"
            loading={loading}
          />
          <MetricCard
            title="Avg Batch Value"
            value={`R${metrics.avgBatchValue.toLocaleString()}`}
            change={{ value: -3, period: "last month" }}
            icon={DollarSign}
            variant="default"
            loading={loading}
          />
          <MetricCard
            title="Completed Batches"
            value={metrics.completedBatches}
            change={{ value: 5, period: "last month" }}
            icon={CheckCircle}
            variant="batches"
            loading={loading}
          />
          <MetricCard
            title="Discrepancies"
            value={metrics.discrepancies}
            change={{ value: -25, period: "last month" }}
            icon={AlertTriangle}
            variant="discrepancies"
            loading={loading}
          />
        </div>

        {/* Recent Batches Table */}
        {batches.length === 0 && !loading ? (
          <EmptyBatches
            onCreateBatch={() => window.location.href = '/batch/new'}
            onRefresh={handleRefresh}
          />
        ) : (
          <BatchesTable
            batches={batches}
            loading={loading}
            onBatchClick={handleBatchClick}
            selectedMonth={selectedMonth}
          />
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
