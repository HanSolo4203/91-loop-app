import { useQuery } from '@tanstack/react-query';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
}

interface ClientsResponse {
  success: boolean;
  data: Client[];
  error?: string;
}

interface ClientsParams {
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

async function fetchClients(params: ClientsParams = {}): Promise<ClientsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.search) searchParams.set('search', params.search);
  if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  
  const response = await fetch(`/api/clients?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch clients');
  }
  return response.json();
}

export function useClients(params: ClientsParams = {}) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => fetchClients(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useActiveClients() {
  return useClients({ is_active: true });
}

