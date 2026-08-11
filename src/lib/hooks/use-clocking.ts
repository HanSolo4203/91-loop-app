'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/auth-provider';
import { supabase } from '@/lib/supabase';
import type { ClockSession, ClockStats } from '@/types/database';

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

export interface EditSessionPayload {
  clocked_in_at?: string;
  clocked_out_at?: string;
  shift_type?: 'day' | 'night';
  notes?: string;
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

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be logged in');
  }
  return session.access_token;
}

async function fetchClockStats(month: number, year: number): Promise<ClockStatsResponse> {
  const token = await getAuthToken();

  const response = await fetch(`/api/clocking/stats?month=${month}&year=${year}`, {
    headers: {
      Authorization: `Bearer ${token}`,
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

async function editClockSession(
  id: string,
  payload: EditSessionPayload,
  token: string
): Promise<ClockSession> {
  const response = await fetch(`/api/clocking/sessions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to update session');
  }
  return data.data as ClockSession;
}

async function deleteClockSession(id: string, token: string): Promise<void> {
  const response = await fetch(`/api/clocking/sessions/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete session');
  }
}

async function forceClockOut(
  employee_id: string,
  clocked_out_at: string | null,
  notes: string | null,
  token: string
) {
  const response = await fetch('/api/clocking/sessions/force-clockout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify({
      employee_id,
      clocked_out_at: clocked_out_at || undefined,
      notes: notes || undefined,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to force clock-out');
  }
  return data.data;
}

function invalidateClockingQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['clocking', 'stats'] }),
    queryClient.invalidateQueries({ queryKey: ['clocking', 'active'] }),
  ]);
}

function removeSessionFromStatsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  sessionId: string
) {
  queryClient.setQueriesData<ClockStatsResponse>(
    { queryKey: ['clocking', 'stats'] },
    (old) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((emp) => {
          const sessions = emp.sessions.filter((s) => s.id !== sessionId);
          if (sessions.length === emp.sessions.length) return emp;

          const completed = sessions.filter((s) => s.duration_minutes != null);
          const totalMinutes = completed.reduce(
            (sum, s) => sum + (s.duration_minutes || 0),
            0
          );
          const totalRegularMinutes = completed.reduce(
            (sum, s) => sum + (s.regular_minutes || 0),
            0
          );
          const totalOvertimeMinutes = completed.reduce(
            (sum, s) => sum + (s.overtime_minutes || 0),
            0
          );
          const uniqueDays = new Set(sessions.map((s) => s.shift_date));

          return {
            ...emp,
            sessions,
            total_days: uniqueDays.size,
            total_minutes: totalMinutes,
            total_hours: Math.round((totalMinutes / 60) * 100) / 100,
            total_regular_minutes: totalRegularMinutes,
            total_overtime_minutes: totalOvertimeMinutes,
          };
        }),
      };
    }
  );
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
export function useActiveClockEntries(options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ['clocking', 'active'],
    queryFn: fetchActiveClockEntries,
    refetchInterval: options?.refetchInterval ?? 30000,
    staleTime: 20 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useEditClockSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: EditSessionPayload }) => {
      const token = await getAuthToken();
      return editClockSession(id, payload, token);
    },
    onSuccess: async () => {
      await invalidateClockingQueries(queryClient);
    },
  });
}

export function useDeleteClockSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAuthToken();
      await deleteClockSession(id, token);
      return id;
    },
    onSuccess: async (id) => {
      removeSessionFromStatsCache(queryClient, id);
      await invalidateClockingQueries(queryClient);
    },
  });
}

export function useForceClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employee_id,
      clocked_out_at,
      notes,
    }: {
      employee_id: string;
      clocked_out_at?: string | null;
      notes?: string | null;
    }) => {
      const token = await getAuthToken();
      return forceClockOut(
        employee_id,
        clocked_out_at ?? null,
        notes ?? null,
        token
      );
    },
    onSuccess: async () => {
      await invalidateClockingQueries(queryClient);
    },
  });
}
