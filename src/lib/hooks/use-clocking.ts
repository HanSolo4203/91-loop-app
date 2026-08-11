'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import type { ClockStats } from '@/types/database';

interface ClockStatsResponse {
  success: boolean;
  data: ClockStats[] | null;
  error?: string;
  month?: number;
  year?: number;
}

async function fetchClockStats(month: number, year: number): Promise<ClockStatsResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be logged in to view clock stats');
  }

  const response = await fetch(`/api/clocking/stats?month=${month}&year=${year}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch clock stats');
  }
  return response.json();
}

export function useClockStats(month: number, year: number) {
  const { isAdmin, loading } = useAuth();

  return useQuery({
    queryKey: ['clocking', 'stats', month, year],
    queryFn: () => fetchClockStats(month, year),
    enabled: !loading && isAdmin && month >= 1 && month <= 12 && year > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
