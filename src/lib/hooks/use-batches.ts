import { useQuery } from '@tanstack/react-query';

interface Batch {
  id: string;
  paper_batch_id: string;
  client_name: string;
  pickup_date: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface BatchesResponse {
  success: boolean;
  data: {
    batches: Batch[];
    total: number;
    page: number;
    pageSize: number;
  };
  error?: string;
}

interface BatchesParams {
  limit?: number;
  offset?: number;
  status?: string;
  client_id?: string;
  has_discrepancy?: boolean;
  date_from?: string;
  date_to?: string;
}

async function fetchBatches(params: BatchesParams = {}): Promise<BatchesResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));
  if (params.status) searchParams.set('status', params.status);
  if (params.client_id) searchParams.set('client_id', params.client_id);
  if (params.has_discrepancy !== undefined) searchParams.set('has_discrepancy', String(params.has_discrepancy));
  if (params.date_from) searchParams.set('date_from', params.date_from);
  if (params.date_to) searchParams.set('date_to', params.date_to);
  
  const response = await fetch(`/api/dashboard/batches?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch batches');
  }
  return response.json();
}

export function useBatches(params: BatchesParams = {}) {
  return useQuery({
    queryKey: ['batches', params],
    queryFn: () => fetchBatches(params),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

