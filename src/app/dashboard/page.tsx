'use client';

import { useState, useEffect } from 'react';
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

// Remove metadata export since this is now a client component


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
  const [selectedMonth, setSelectedMonth] = useState({
    month: new Date().getMonth(), // Current month (0-based index)
    year: new Date().getFullYear() // Current year
  });
  const [metrics, setMetrics] = useState({
    totalBatches: 0,
    totalRevenue: 0,
    totalItems: 0,
    avgBatchValue: 0,
    completedBatches: 0,
    discrepancies: 0
  });
  const [batches, setBatches] = useState([]);
  
  // Simple loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = async (month: number, year: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // Format month for API (convert from 0-based to 1-based and format as YYYY-MM)
      const formattedMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      console.log('🔍 Fetching data for:', formattedMonth);
      
      // Calculate date range for the selected month
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]; // Last day of the month
      
      console.log('📅 Date range:', { startDate, endDate });
      
      // Fetch metrics and batches in parallel
      const [metricsResponse, batchesResponse] = await Promise.all([
        fetch(`/api/dashboard/stats?month=${formattedMonth}&type=monthly`),
        fetch(`/api/dashboard/batches?limit=20&date_from=${startDate}&date_to=${endDate}`)
      ]);

      console.log('📊 Responses:', {
        metrics: metricsResponse.status,
        batches: batchesResponse.status
      });

      // Check for HTTP errors
      if (!metricsResponse.ok || !batchesResponse.ok) {
        throw new Error('Failed to fetch dashboard data from server');
      }

      const [metricsResult, batchesResult] = await Promise.all([
        metricsResponse.json(),
        batchesResponse.json()
      ]);

      console.log('📊 Data:', { metricsResult, batchesResult });

      if (!metricsResult.success) {
        throw new Error(metricsResult.error || 'Failed to fetch metrics');
      }

      if (!batchesResult.success) {
        throw new Error(batchesResult.error || 'Failed to fetch batches');
      }

      // Update metrics
      if (metricsResult.data) {
        const data = metricsResult.data;
        console.log('📊 Setting metrics:', data);
        setMetrics({
          totalBatches: data.totalBatches || 0,
          totalRevenue: data.totalRevenue || 0,
          totalItems: data.totalItemsProcessed || 0,
          avgBatchValue: data.averageBatchValue || 0,
          completedBatches: data.completedBatches || 0,
          discrepancies: data.discrepancyCount || 0
        });
      }

      // Update batches
      if (batchesResult.data) {
        const transformedBatches = batchesResult.data.batches?.map((batch: { id: string; paper_batch_id: string; client_name: string; pickup_date: string; status: string; total_amount: number; created_at: string }) => ({
          id: batch.id,
          paper_batch_id: batch.paper_batch_id,
          client: {
            name: batch.client_name
          },
          pickup_date: batch.pickup_date,
          status: batch.status,
          total_amount: batch.total_amount,
          created_at: batch.created_at
        })) || [];
        console.log('📦 Setting batches:', transformedBatches);
        setBatches(transformedBatches);
      }
    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when month changes
  useEffect(() => {
    fetchDashboardData(selectedMonth.month, selectedMonth.year);
  }, [selectedMonth.month, selectedMonth.year]);

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth({ month, year });
  };

  const handleRefresh = () => {
    setError(null);
    fetchDashboardData(selectedMonth.month, selectedMonth.year);
  };

  const handleBatchClick = (batch: { id: string }) => {
    // Navigate to batch details
    window.location.href = `/batch/${batch.id}`;
  };

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />
          <EmptyState
            icon={<AlertTriangle className="w-full h-full" />}
            title="Failed to load dashboard"
            description={error || 'Something went wrong while loading the dashboard data.'}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
                <LayoutDashboard className="w-8 h-8 text-blue-600" />
                <span>Dashboard</span>
              </h1>
              <p className="text-slate-600 mt-2">
                Overview of your linen tracking operations and key performance metrics
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              <Link href="/batch/new">
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>New Batch</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Viewing data for:</span>
            <MonthSelector
              value={selectedMonth}
              onChange={handleMonthChange}
              loading={loading}
            />
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
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
