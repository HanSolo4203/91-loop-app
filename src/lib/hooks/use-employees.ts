import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Employee } from '@/types/database';
import type { CreateEmployeeRequest } from '@/lib/services/staff/employees';

interface EmployeesResponse {
  success: boolean;
  data: Employee[] | null;
  error: string | null;
}

interface EmployeeResponse {
  success: boolean;
  data: Employee | null;
  error: string | null;
}

async function fetchEmployees(): Promise<EmployeesResponse> {
  const response = await fetch('/api/staff/employees');
  if (!response.ok) {
    throw new Error('Failed to fetch employees');
  }
  return response.json();
}

async function fetchEmployee(id: string): Promise<EmployeeResponse> {
  const response = await fetch(`/api/staff/employees/${id}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error('Employee not found');
    throw new Error('Failed to fetch employee');
  }
  return response.json();
}

export function useEmployees() {
  return useQuery({
    queryKey: ['staff', 'employees'],
    queryFn: fetchEmployees,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useEmployee(id: string | null) {
  return useQuery({
    queryKey: ['staff', 'employees', id],
    queryFn: () => fetchEmployee(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateEmployeeRequest) => {
      const response = await fetch('/api/staff/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create employee');
      }
      return data.data as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateEmployeeRequest> }) => {
      const response = await fetch(`/api/staff/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update employee');
      }
      return data.data as Employee;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'employees', variables.id] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/staff/employees/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete employee');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'employees'] });
    },
  });
}
