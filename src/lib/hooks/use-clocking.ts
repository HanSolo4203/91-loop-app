'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import type { ClockStats } from '@/types/database';

export interface ActiveClockEntry {
  session_id: string;
  employee_id: string;
  full_name: string;
  role: string | null;
  shift_type: string;
  photo_url: string | null;
  clocked_in_at: string;
  shift_date: string;
}

interface ClockStatsResponse {
  success: boolean;
  data: ClockStats[] | null;
  error?: string;
  month?: number;
  year?: number;
}

interface ActiveClockResponse {
  success: boolean;
  data: ActiveClockEntry[] | null;
  error?: string;
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

async function fetchActiveClockEntries(): Promise<ActiveClockResponse> {
  const response = await fetch('/api/clocking/active');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch active clock entries');
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

/** Public — works on kiosk without a logged-in session */
export function useActiveClockEntries() {
  return useQuery({
    queryKey: ['clocking', 'active'],
    queryFn: fetchActiveClockEntries,
    refetchInterval: 30000,
    staleTime: 20 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
