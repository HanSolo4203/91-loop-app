import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ExpenseWithCategory,
  ExpenseCategory,
  MonthlyExpenseSummary,
  ProfitLossSummary,
} from '@/types/database';
import type { CreateExpenseRequest } from '@/lib/services/expenses';

interface ExpensesResponse {
  success: boolean;
  data: ExpenseWithCategory[] | null;
  error: string | null;
}

interface ExpenseResponse {
  success: boolean;
  data: ExpenseWithCategory | null;
  error: string | null;
}

interface CategoriesResponse {
  success: boolean;
  data: ExpenseCategory[] | null;
  error: string | null;
}

interface SummaryResponse {
  success: boolean;
  data: MonthlyExpenseSummary | null;
  error: string | null;
}

interface ProfitLossResponse {
  success: boolean;
  data: ProfitLossSummary[] | null;
  error: string | null;
}

async function fetchExpenses(params?: {
  month?: number;
  year?: number;
  month_from?: number;
  month_to?: number;
  recurring?: boolean;
}): Promise<ExpensesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.year !== undefined) searchParams.set('year', String(params.year));
  if (
    params?.month_from !== undefined &&
    params?.month_to !== undefined &&
    params.month_from <= params.month_to
  ) {
    const mFrom = Math.max(1, Math.min(12, params.month_from));
    const mTo = Math.max(1, Math.min(12, params.month_to));
    searchParams.set('month_from', String(mFrom));
    searchParams.set('month_to', String(mTo));
  } else if (params?.month !== undefined) {
    const m = Math.max(1, Math.min(12, Math.floor(params.month)));
    searchParams.set('month', String(m));
  }
  if (params?.recurring === true) searchParams.set('recurring', 'true');
  const qs = searchParams.toString();
  const response = await fetch(`/api/expenses${qs ? `?${qs}` : ''}`);
  if (!response.ok) throw new Error('Failed to fetch expenses');
  return response.json();
}

async function fetchExpense(id: string): Promise<ExpenseResponse> {
  const response = await fetch(`/api/expenses/${id}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error('Expense not found');
    throw new Error('Failed to fetch expense');
  }
  return response.json();
}

async function fetchExpenseCategories(): Promise<CategoriesResponse> {
  const response = await fetch('/api/expenses/categories');
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

async function fetchExpenseSummary(
  month: number,
  year: number
): Promise<SummaryResponse> {
  const response = await fetch(
    `/api/expenses/summary?month=${month}&year=${year}`
  );
  if (!response.ok) throw new Error('Failed to fetch summary');
  return response.json();
}

type ProfitLossParams =
  | { months: number }
  | { year: number; month: number }
  | { year: number; month_from: number; month_to: number };

function buildProfitLossQuery(params?: ProfitLossParams): string {
  if (!params) return '';
  if ('months' in params) return `?months=${params.months}`;
  if ('month' in params)
    return `?year=${params.year}&month=${params.month}`;
  return `?year=${params.year}&month_from=${params.month_from}&month_to=${params.month_to}`;
}

async function fetchProfitLoss(
  params?: ProfitLossParams
): Promise<ProfitLossResponse> {
  const qs = buildProfitLossQuery(params);
  const response = await fetch(`/api/expenses/profit-loss${qs}`);
  if (!response.ok) throw new Error('Failed to fetch profit/loss');
  return response.json();
}

export function useExpenses(params?: {
  month?: number;
  year?: number;
  month_from?: number;
  month_to?: number;
}) {
  return useQuery({
    queryKey: [
      'expenses',
      params?.month,
      params?.year,
      params?.month_from,
      params?.month_to,
    ],
    queryFn: () => fetchExpenses(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useExpense(id: string | null) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => fetchExpense(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useRecurringExpenses() {
  return useQuery({
    queryKey: ['expenses', 'recurring'],
    queryFn: () => fetchExpenses({ recurring: true }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expenses', 'categories'],
    queryFn: fetchExpenseCategories,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useExpenseSummary(month: number, year: number) {
  const safeMonth = Math.max(1, Math.min(12, Math.floor(month)));
  const safeYear = Math.max(2000, Math.min(2100, Math.floor(year)));
  return useQuery({
    queryKey: ['expenses', 'summary', safeMonth, safeYear],
    queryFn: () => fetchExpenseSummary(safeMonth, safeYear),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useProfitLoss(
  params: ProfitLossParams | number = { months: 6 }
) {
  const normalized =
    typeof params === 'number' ? { months: params } : params;
  const queryKey =
    'months' in normalized
      ? ['expenses', 'profit-loss', normalized.months]
      : 'month' in normalized
        ? ['expenses', 'profit-loss', normalized.year, normalized.month]
        : [
            'expenses',
            'profit-loss',
            normalized.year,
            normalized.month_from,
            normalized.month_to,
          ];
  return useQuery({
    queryKey,
    queryFn: () => fetchProfitLoss(normalized),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateExpenseRequest) => {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create expense');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<CreateExpenseRequest>;
    }) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update expense');
      }
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.id] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete expense');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
