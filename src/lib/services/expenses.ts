/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase';
import type {
  Expense,
  ExpenseCategory,
  ExpenseWithCategory,
  MonthlyExpenseSummary,
  ProfitLossSummary,
} from '@/types/database';

// Custom error class for expense service errors
export class ExpenseServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ExpenseServiceError';
  }
}

// Service response types
export interface ExpenseServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Request types
export interface ExpenseFilters {
  month?: number;
  year?: number;
  /** When set with month_to, fetch expenses for a range of months (same year) */
  month_from?: number;
  month_to?: number;
}

export interface CreateExpenseRequest {
  category_id: string;
  name: string;
  amount: number;
  expense_date: string;
  period_month: number;
  period_year: number;
  is_recurring?: boolean;
  notes?: string;
  receipt_url?: string;
}

export interface CreateExpenseCategoryRequest {
  name: string;
  icon?: string;
  is_fixed?: boolean;
}

/**
 * Get expenses with optional month/year filter, joined with category
 */
export async function getExpenses(
  filters: ExpenseFilters = {}
): Promise<ExpenseServiceResponse<ExpenseWithCategory[]>> {
  try {
    let query = supabaseAdmin
      .from('expenses')
      .select(`
        *,
        category:expenses_categories(*)
      `)
      .order('expense_date', { ascending: false });

    if (filters.year !== undefined && filters.year !== null) {
      query = query.eq('period_year', filters.year);
    }
    if (
      filters.month_from !== undefined &&
      filters.month_to !== undefined &&
      filters.month_from <= filters.month_to
    ) {
      query = query
        .gte('period_month', filters.month_from)
        .lte('period_month', filters.month_to);
    } else if (filters.month !== undefined && filters.month !== null) {
      query = query.eq('period_month', filters.month);
    }

    const { data, error } = await query;

    if (error) {
      throw new ExpenseServiceError(
        `Failed to fetch expenses: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    const expenses = (data || []).map((row: any) => ({
      ...row,
      category: row.category || null,
    }));

    return {
      data: expenses,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Get a single expense by ID with category
 */
export async function getExpenseById(
  id: string
): Promise<ExpenseServiceResponse<ExpenseWithCategory>> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ExpenseServiceError('Invalid expense ID format', 'INVALID_ID', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select(`
        *,
        category:expenses_categories(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ExpenseServiceError('Expense not found', 'NOT_FOUND', 404);
      }
      throw new ExpenseServiceError(
        `Failed to fetch expense: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    return {
      data: { ...data, category: data.category || null },
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Create a new expense
 */
export async function createExpense(
  data: CreateExpenseRequest
): Promise<ExpenseServiceResponse<Expense>> {
  try {
    const validation = validateExpenseData(data);
    if (!validation.isValid) {
      throw new ExpenseServiceError(
        `Validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    const { data: created, error } = await (supabaseAdmin as any)
      .from('expenses')
      .insert({
        category_id: data.category_id,
        name: data.name.trim(),
        amount: Number(data.amount),
        expense_date: data.expense_date,
        period_month: data.period_month,
        period_year: data.period_year,
        is_recurring: data.is_recurring ?? false,
        notes: data.notes?.trim() || null,
        receipt_url: data.receipt_url || null,
      })
      .select()
      .single();

    if (error) {
      throw new ExpenseServiceError(
        `Failed to create expense: ${error.message}`,
        'CREATE_ERROR',
        500
      );
    }

    return {
      data: created,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Update an existing expense
 */
export async function updateExpense(
  id: string,
  data: Partial<CreateExpenseRequest>
): Promise<ExpenseServiceResponse<Expense>> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ExpenseServiceError('Invalid expense ID format', 'INVALID_ID', 400);
    }

    const validation = validateExpenseData(data, true);
    if (!validation.isValid) {
      throw new ExpenseServiceError(
        `Validation failed: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (data.category_id !== undefined) updatePayload.category_id = data.category_id;
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.amount !== undefined) updatePayload.amount = Number(data.amount);
    if (data.expense_date !== undefined) updatePayload.expense_date = data.expense_date;
    if (data.period_month !== undefined) updatePayload.period_month = data.period_month;
    if (data.period_year !== undefined) updatePayload.period_year = data.period_year;
    if (data.is_recurring !== undefined) updatePayload.is_recurring = data.is_recurring;
    if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null;
    if (data.receipt_url !== undefined) updatePayload.receipt_url = data.receipt_url || null;

    const { data: updated, error } = await (supabaseAdmin as any)
      .from('expenses')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ExpenseServiceError('Expense not found', 'NOT_FOUND', 404);
      }
      throw new ExpenseServiceError(
        `Failed to update expense: ${error.message}`,
        'UPDATE_ERROR',
        500
      );
    }

    return {
      data: updated,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Delete an expense
 */
export async function deleteExpense(
  id: string
): Promise<ExpenseServiceResponse<null>> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ExpenseServiceError('Invalid expense ID format', 'INVALID_ID', 400);
    }

    const { error } = await supabaseAdmin.from('expenses').delete().eq('id', id);

    if (error) {
      throw new ExpenseServiceError(
        `Failed to delete expense: ${error.message}`,
        'DELETE_ERROR',
        500
      );
    }

    return {
      data: null,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Get all expense categories
 */
export async function getExpenseCategories(): Promise<
  ExpenseServiceResponse<ExpenseCategory[]>
> {
  try {
    const { data, error } = await supabaseAdmin
      .from('expenses_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new ExpenseServiceError(
        `Failed to fetch categories: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    return {
      data: data || [],
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Create a custom expense category
 */
export async function createExpenseCategory(
  data: CreateExpenseCategoryRequest
): Promise<ExpenseServiceResponse<ExpenseCategory>> {
  try {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new ExpenseServiceError('Category name is required', 'VALIDATION_ERROR', 400);
    }

    const { data: created, error } = await (supabaseAdmin as any)
      .from('expenses_categories')
      .insert({
        name: data.name.trim(),
        icon: data.icon || null,
        is_fixed: data.is_fixed ?? false,
      })
      .select()
      .single();

    if (error) {
      throw new ExpenseServiceError(
        `Failed to create category: ${error.message}`,
        'CREATE_ERROR',
        500
      );
    }

    return {
      data: created,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Get monthly expense summary
 */
export async function getMonthlyExpenseSummary(
  month: number,
  year: number
): Promise<ExpenseServiceResponse<MonthlyExpenseSummary>> {
  try {
    const { data: expenses, error } = await supabaseAdmin
      .from('expenses')
      .select(`
        amount,
        category:expenses_categories(name, is_fixed)
      `)
      .eq('period_month', month)
      .eq('period_year', year);

    if (error) {
      throw new ExpenseServiceError(
        `Failed to fetch expenses: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    const items = expenses || [];
    let total = items.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

    const byCategoryMap = new Map<
      string,
      { category_name: string; total: number; count: number; is_fixed?: boolean }
    >();
    for (const e of items) {
      const cat = e.category;
      const name = cat?.name || 'Other';
      const existing = byCategoryMap.get(name) || {
        category_name: name,
        total: 0,
        count: 0,
        is_fixed: cat?.is_fixed,
      };
      existing.total += Number(e.amount || 0);
      existing.count += 1;
      byCategoryMap.set(name, existing);
    }

    const { data: salaryPayments } = await supabaseAdmin
      .from('salary_payments')
      .select('net_amount')
      .eq('period_month', month)
      .eq('period_year', year)
      .eq('status', 'paid');

    const wageTotal =
      (salaryPayments || []).reduce((sum: number, p: any) => sum + Number(p.net_amount || 0), 0) || 0;
    if (wageTotal > 0) {
      total += wageTotal;
      const wageCount = (salaryPayments || []).length;
      byCategoryMap.set('Staff Wages', {
        category_name: 'Staff Wages',
        total: wageTotal,
        count: wageCount,
        is_fixed: true,
      });
    }

    const by_category = Array.from(byCategoryMap.values()).sort(
      (a, b) => b.total - a.total
    );

    return {
      data: {
        month,
        year,
        total,
        by_category,
      },
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/** Options for P&L by period (single month or range in one year) */
export interface ProfitLossPeriodOptions {
  year: number;
  month?: number;
  month_from?: number;
  month_to?: number;
}

async function fetchOneMonthProfitLoss(
  year: number,
  month: number
): Promise<ProfitLossSummary> {
  const periodLabel = new Date(year, month - 1, 1).toLocaleDateString('en-ZA', {
    month: 'short',
    year: 'numeric',
  });
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: batches, error: batchesError } = await supabaseAdmin
    .from('batches')
    .select('total_amount')
    .in('status', ['completed', 'delivered'])
    .gte('pickup_date', startDate)
    .lte('pickup_date', endDate);

  if (batchesError) {
    throw new ExpenseServiceError(
      `Failed to fetch revenue: ${batchesError.message}`,
      'FETCH_ERROR',
      500
    );
  }

  const revenue =
    (batches || []).reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0) || 0;

  const { data: expenses, error: expensesError } = await supabaseAdmin
    .from('expenses')
    .select('amount')
    .eq('period_month', month)
    .eq('period_year', year);

  if (expensesError) {
    throw new ExpenseServiceError(
      `Failed to fetch expenses: ${expensesError.message}`,
      'FETCH_ERROR',
      500
    );
  }

  let expensesTotal =
    (expenses || []).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) || 0;

  const { data: salaryPayments } = await supabaseAdmin
    .from('salary_payments')
    .select('net_amount')
    .eq('period_month', month)
    .eq('period_year', year)
    .eq('status', 'paid');

  const wageExpense =
    (salaryPayments || []).reduce((sum: number, p: any) => sum + Number(p.net_amount || 0), 0) || 0;
  expensesTotal += wageExpense;
  const gross_profit = revenue;
  const net_profit = revenue - expensesTotal;
  const margin_percentage =
    revenue > 0 ? (net_profit / revenue) * 100 : expensesTotal > 0 ? -100 : 0;

  return {
    period: periodLabel,
    revenue,
    expenses: expensesTotal,
    gross_profit,
    net_profit,
    margin_percentage,
  };
}

/**
 * Get profit/loss summary for the last N months, or for a specific month/range
 */
export async function getProfitLoss(
  monthsOrOptions: number | ProfitLossPeriodOptions = 6
): Promise<ExpenseServiceResponse<ProfitLossSummary[]>> {
  try {
    const options =
      typeof monthsOrOptions === 'object'
        ? monthsOrOptions
        : null;
    const months = typeof monthsOrOptions === 'number' ? monthsOrOptions : 6;

    if (options?.year != null && options.month != null) {
      const row = await fetchOneMonthProfitLoss(options.year, options.month);
      return { data: [row], error: null, success: true };
    }

    if (
      options?.year != null &&
      options.month_from != null &&
      options.month_to != null &&
      options.month_from <= options.month_to
    ) {
      const results: ProfitLossSummary[] = [];
      for (let m = options.month_from; m <= options.month_to; m++) {
        const row = await fetchOneMonthProfitLoss(options.year, m);
        results.push(row);
      }
      return { data: results, error: null, success: true };
    }

    const now = new Date();
    const results: ProfitLossSummary[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const row = await fetchOneMonthProfitLoss(year, month);
      results.push(row);
    }

    return {
      data: results,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

/**
 * Get recurring expenses
 */
export async function getRecurringExpenses(): Promise<
  ExpenseServiceResponse<ExpenseWithCategory[]>
> {
  try {
    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select(`
        *,
        category:expenses_categories(*)
      `)
      .eq('is_recurring', true)
      .order('expense_date', { ascending: false });

    if (error) {
      throw new ExpenseServiceError(
        `Failed to fetch recurring expenses: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    const expenses = (data || []).map((row: any) => ({
      ...row,
      category: row.category || null,
    }));

    return {
      data: expenses,
      error: null,
      success: true,
    };
  } catch (error) {
    if (error instanceof ExpenseServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
      };
    }
    return {
      data: null,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
    };
  }
}

function validateExpenseData(
  data: Partial<CreateExpenseRequest>,
  isUpdate: boolean = false
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Description (name) is required');
    }
  }

  if (!isUpdate || data.amount !== undefined) {
    if (data.amount === undefined || data.amount === null) {
      errors.push('Amount is required');
    } else if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount < 0) {
      errors.push('Amount must be a valid non-negative number');
    }
  }

  if (!isUpdate || data.category_id !== undefined) {
    if (!data.category_id || typeof data.category_id !== 'string') {
      errors.push('Category is required');
    }
  }

  if (!isUpdate || data.expense_date !== undefined) {
    if (!data.expense_date || typeof data.expense_date !== 'string') {
      errors.push('Expense date is required');
    }
  }

  if (!isUpdate || (data.period_month !== undefined && data.period_year !== undefined)) {
    const pm = data.period_month;
    const py = data.period_year;
    if (pm !== undefined && (pm < 1 || pm > 12)) {
      errors.push('Period month must be 1-12');
    }
    if (py !== undefined && (py < 2000 || py > 2100)) {
      errors.push('Period year must be valid');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
