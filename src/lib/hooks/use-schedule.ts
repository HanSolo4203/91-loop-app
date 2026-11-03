import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authFetch } from '@/lib/auth-fetch';
import type { CreateAbsenceRequest } from '@/lib/services/staff/absences';
import type { ScheduleShift, WeekSchedule } from '@/lib/services/staff/schedule';

interface ScheduleResponse {
  success: boolean;
  data: WeekSchedule | null;
  error: string | null;
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success || data.data == null) {
    throw new Error(data.error || fallback);
  }
  return data.data as T;
}

async function fetchSchedule(week: string): Promise<ScheduleResponse> {
  const response = await authFetch(`/api/staff/schedule?week=${encodeURIComponent(week)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch schedule');
  }
  return data;
}

async function saveSchedule(payload: { week: string; shifts: ScheduleShift[] }): Promise<WeekSchedule> {
  const response = await authFetch('/api/staff/schedule', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJson<WeekSchedule>(response, 'Failed to save schedule');
}

async function copySchedule(payload: { from_week: string; to_week: string }): Promise<WeekSchedule> {
  const response = await authFetch('/api/staff/schedule/copy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJson<WeekSchedule>(response, 'Failed to copy schedule');
}

async function createAbsence(
  payload: CreateAbsenceRequest
): Promise<{ success: boolean; data: unknown; error: string | null }> {
  const response = await authFetch('/api/staff/absences', {
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
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSaveSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'schedule'] });
    },
  });
}

export function useCopySchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: copySchedule,
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
