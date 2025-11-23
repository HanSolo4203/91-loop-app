import { useQuery } from '@tanstack/react-query';

interface ReportData {
  client_id: string;
  client_name: string;
  logo_url: string | null;
  total_items_washed: number;
  total_amount: number;
  batch_count: number;
  discrepancy_batches: number;
}

interface ReportsResponse {
  success: boolean;
  data: ReportData[];
  error?: string;
}

interface ReportsParams {
  month?: string; // Format: YYYY-MM or YYYY-all
}

async function fetchReports(params: ReportsParams = {}): Promise<ReportsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.month) searchParams.set('month', params.month);
  
  const response = await fetch(`/api/dashboard/reports?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch reports');
  }
  return response.json();
}

export function useReports(params: ReportsParams = {}) {
  return useQuery({
    queryKey: ['reports', params.month],
    queryFn: () => fetchReports(params),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

