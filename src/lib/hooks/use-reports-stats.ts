import { useQuery } from '@tanstack/react-query';

interface ReportsStatsParams {
  month?: string; // Format: YYYY-MM or YYYY-all
}

interface ReportsStatsData {
  period: {
    year: number;
    month: number | null;
    month_name: string;
    is_all_months?: boolean;
  };
  summary: {
    total_clients: number;
    total_items_washed: number;
    total_revenue_before_vat: number;
    total_vat_amount: number;
    total_revenue_incl_vat: number;
    total_batches: number;
    total_discrepancies: number;
    discrepancy_rate: number;
    average_batch_value: number;
    average_items_per_batch: number;
  };
}

interface ReportsStatsResponse {
  success: boolean;
  data: ReportsStatsData;
  error?: string;
}

async function fetchReportsStats(params: ReportsStatsParams = {}): Promise<ReportsStatsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.month) searchParams.set('month', params.month);
  
  const response = await fetch(`/api/dashboard/reports/pdf-stats?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch reports stats');
  }
  return response.json();
}

export function useReportsStats(params: ReportsStatsParams = {}) {
  return useQuery({
    queryKey: ['reports-stats', params.month],
    queryFn: () => fetchReportsStats(params),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

