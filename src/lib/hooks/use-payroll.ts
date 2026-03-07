import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PayrollRun, PayrollRunWithEntries } from '@/types/database';
import type { UpdatePayrollRunRequest } from '@/lib/services/staff/payroll';

interface PayrollRunsResponse {
  success: boolean;
  data: PayrollRun[] | null;
  error: string | null;
}

interface PayrollRunResponse {
  success: boolean;
  data: PayrollRunWithEntries | null;
  error: string | null;
}

async function fetchPayrollRuns(): Promise<PayrollRunsResponse> {
  const response = await fetch('/api/staff/payroll');
  if (!response.ok) {
    throw new Error('Failed to fetch payroll runs');
  }
  return response.json();
}

async function fetchPayrollRun(id: string): Promise<PayrollRunResponse> {
  const response = await fetch(`/api/staff/payroll/${id}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error('Payroll run not found');
    throw new Error('Failed to fetch payroll run');
  }
  return response.json();
}

export function usePayrollRuns() {
  return useQuery({
    queryKey: ['staff', 'payroll'],
    queryFn: fetchPayrollRuns,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function usePayrollRun(id: string | null) {
  return useQuery({
    queryKey: ['staff', 'payroll', id],
    queryFn: () => fetchPayrollRun(id!),
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreatePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { period_start: string; period_end: string }) => {
      const response = await fetch('/api/staff/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create payroll run');
      }
      return data.data as PayrollRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'payroll'] });
    },
  });
}

export function useUpdatePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdatePayrollRunRequest }) => {
      const response = await fetch(`/api/staff/payroll/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update payroll run');
      }
      return data.data as PayrollRun;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'payroll'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'payroll', variables.id] });
    },
  });
}
