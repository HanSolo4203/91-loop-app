import { useQuery } from '@tanstack/react-query';

interface DashboardStatsParams {
  month?: string | null;
  year?: string | null;
  type?: 'overview' | 'monthly' | 'yearly' | 'revenue' | 'clients' | 'discrepancies';
}

interface DashboardStatsResponse {
  success: boolean;
  data: unknown;
  error: string | null;
}

async function fetchDashboardStats(params: DashboardStatsParams): Promise<DashboardStatsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.month) searchParams.set('month', params.month);
  if (params.year) searchParams.set('year', params.year);
  if (params.type) searchParams.set('type', params.type);
  
  const response = await fetch(`/api/dashboard/stats?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }
  return response.json();
}

export function useDashboardStats(params: DashboardStatsParams = {}) {
  return useQuery({
    queryKey: ['dashboard-stats', params.month, params.year, params.type],
    queryFn: () => fetchDashboardStats(params),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

