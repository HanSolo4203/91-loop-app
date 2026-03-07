import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DayRoster } from '@/types/database';
import type { CreateAbsenceRequest } from '@/lib/services/staff/absences';

interface ScheduleResponse {
  success: boolean;
  data: DayRoster[] | null;
  error: string | null;
}

async function fetchSchedule(week: string): Promise<ScheduleResponse> {
  const response = await fetch(`/api/staff/schedule?week=${encodeURIComponent(week)}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch schedule');
  }
  return response.json();
}

async function seedSchedule(): Promise<{ success: boolean; data: unknown; error: string | null }> {
  const response = await fetch('/api/staff/schedule', {
    method: 'POST',
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to seed schedule');
  }
  return data;
}

async function createAbsence(payload: CreateAbsenceRequest): Promise<{ success: boolean; data: unknown; error: string | null }> {
  const response = await fetch('/api/staff/absences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to create absence');
  }
  return data;
}

export function useSchedule(week: string) {
  return useQuery({
    queryKey: ['staff', 'schedule', week],
    queryFn: () => fetchSchedule(week),
    enabled: !!week && /^\d{4}-\d{2}-\d{2}$/.test(week),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSeedSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: seedSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'schedule'] });
    },
  });
}

export function useCreateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAbsence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'schedule'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'absences'] });
    },
  });
}
