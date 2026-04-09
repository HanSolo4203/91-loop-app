/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase';
import type { Employee, SalaryPayment } from '@/types/database';
import type { SalaryPaymentWithEmployee } from '@/types/database';

export interface StaffServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUuid(id: string): void {
  if (!id || !UUID_REGEX.test(id)) {
    throw new Error('Invalid ID format');
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * GET salary payments for a month/year with employee details.
 */
export async function getSalaryPaymentsForPeriod(
  month: number,
  year: number
): Promise<StaffServiceResponse<SalaryPaymentWithEmployee[]>> {
  try {
    const { data: payments, error: payError } = await supabaseAdmin
      .from('salary_payments')
      .select('*')
      .eq('period_month', month)
      .eq('period_year', year)
      .order('employee_id', { ascending: true })
      .order('payment_number', { ascending: true });

    if (payError) {
      return { data: null, error: payError.message, success: false };
    }

    const list = (payments || []) as SalaryPayment[];
    const employeeIds = [...new Set(list.map((p) => p.employee_id))];
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('*')
      .in('id', employeeIds);

    const empMap = new Map<string, Employee>();
    (employees || []).forEach((e: Employee) => empMap.set(e.id, e));

    const withEmployee: SalaryPaymentWithEmployee[] = list.map((p) => ({
      ...p,
      employee: empMap.get(p.employee_id)!,
    }));

    return { data: withEmployee, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      success: false,
    };
  }
}

/**
 * Generate salary payment schedule for a month/year: create two pending
 * salary_payments per active employee. Skip employees that already have
 * records for that period.
 */
export async function generateSalarySchedule(
  month: number,
  year: number
): Promise<StaffServiceResponse<{ created: number }>> {
  try {
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, monthly_salary, bi_weekly_salary, salary_payment_day_1, salary_payment_day_2')
      .eq('status', 'active');

    if (empError) {
      return { data: null, error: empError.message, success: false };
    }

    const existing = await supabaseAdmin
      .from('salary_payments')
      .select('employee_id')
      .eq('period_month', month)
      .eq('period_year', year);

    const existingSet = new Set(
      ((existing.data || []) as { employee_id: string }[]).map((r) => r.employee_id)
    );

    const daysInMonth = getDaysInMonth(year, month);
    let created = 0;

    for (const emp of employees || []) {
      const e = emp as {
        id: string;
        monthly_salary: number | null;
        bi_weekly_salary: number;
        salary_payment_day_1: number;
        salary_payment_day_2: number;
      };
      if (existingSet.has(e.id)) continue;

      const monthly = e.monthly_salary ?? (e.bi_weekly_salary != null ? e.bi_weekly_salary * 2 : 0);
      if (monthly <= 0) continue;

      const half = Math.round((monthly / 2) * 100) / 100;
      const day1 = Math.min(Math.max(1, e.salary_payment_day_1 ?? 1), daysInMonth);
      const day2 = Math.min(Math.max(1, e.salary_payment_day_2 ?? 15), daysInMonth);

      const date1 = `${year}-${String(month).padStart(2, '0')}-${String(day1).padStart(2, '0')}`;
      const date2 = `${year}-${String(month).padStart(2, '0')}-${String(day2).padStart(2, '0')}`;

      const rows = [
        {
          employee_id: e.id,
          payment_date: date1,
          payment_number: 1,
          period_month: month,
          period_year: year,
          gross_amount: half,
          deductions: 0,
          net_amount: half,
          status: 'pending',
          payment_method: 'bank_transfer',
        },
        {
          employee_id: e.id,
          payment_date: date2,
          payment_number: 2,
          period_month: month,
          period_year: year,
          gross_amount: half,
          deductions: 0,
          net_amount: half,
          status: 'pending',
          payment_method: 'bank_transfer',
        },
      ];

      const { error: insertError } = await (supabaseAdmin as any)
        .from('salary_payments')
        .insert(rows);

      if (!insertError) created += 2;
    }

    return { data: { created }, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      success: false,
    };
  }
}

/**
 * Update a salary payment (mark paid, deductions, notes).
 */
export async function updateSalaryPayment(
  id: string,
  payload: {
    status?: 'pending' | 'paid' | 'skipped';
    deductions?: number;
    notes?: string | null;
  }
): Promise<StaffServiceResponse<SalaryPayment>> {
  try {
    validateUuid(id);

    const { data: current, error: fetchError } = await supabaseAdmin
      .from('salary_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { data: null, error: fetchError?.message || 'not found', success: false };
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.status !== undefined) {
      updates.status = payload.status;
      if (payload.status === 'paid') {
        updates.paid_at = new Date().toISOString();
      } else if (payload.status !== 'paid') {
        updates.paid_at = null;
      }
    }
    if (payload.deductions !== undefined) updates.deductions = payload.deductions;
    if (payload.notes !== undefined) updates.notes = payload.notes;

    const gross = (current as SalaryPayment).gross_amount ?? 0;
    const deductions = (payload.deductions ?? (current as SalaryPayment).deductions) ?? 0;
    updates.net_amount = Math.max(0, gross - deductions);

    const { data: updated, error: updateError } = await (supabaseAdmin as any)
      .from('salary_payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError.message, success: false };
    }
    return { data: updated, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Invalid ID format',
      success: false,
    };
  }
}

/**
 * Delete a salary payment only if status is pending.
 */
export async function deleteSalaryPayment(id: string): Promise<StaffServiceResponse<null>> {
  try {
    validateUuid(id);

    const { data: row, error: fetchError } = await supabaseAdmin
      .from('salary_payments')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !row) {
      return { data: null, error: fetchError?.message || 'not found', success: false };
    }
    if ((row as { status: string }).status !== 'pending') {
      return { data: null, error: 'Can only delete pending payments', success: false };
    }

    const { error: deleteError } = await supabaseAdmin.from('salary_payments').delete().eq('id', id);
    if (deleteError) {
      return { data: null, error: deleteError.message, success: false };
    }
    return { data: null, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Invalid ID format',
      success: false,
    };
  }
}

export interface SalarySummary {
  total_monthly_payroll: number;
  total_paid: number;
  total_pending: number;
  payment_1_total: number;
  payment_2_total: number;
  per_employee: Array<{
    employee_id: string;
    employee_name: string;
    monthly_salary: number;
    payment_1: { amount: number; status: string };
    payment_2: { amount: number; status: string };
    total: number;
  }>;
}

/**
 * GET salary summary for a month/year.
 */
export async function getSalarySummary(
  month: number,
  year: number
): Promise<StaffServiceResponse<SalarySummary>> {
  try {
    const result = await getSalaryPaymentsForPeriod(month, year);
    if (!result.success || !result.data) {
      return { data: null, error: result.error, success: false };
    }

    const payments = result.data;
    const byEmployee = new Map<
      string,
      {
        employee: Employee;
        payment_1: SalaryPaymentWithEmployee | null;
        payment_2: SalaryPaymentWithEmployee | null;
      }
    >();

    for (const p of payments) {
      if (!byEmployee.has(p.employee_id)) {
        byEmployee.set(p.employee_id, {
          employee: p.employee,
          payment_1: null,
          payment_2: null,
        });
      }
      const row = byEmployee.get(p.employee_id)!;
      if (p.payment_number === 1) row.payment_1 = p;
      else row.payment_2 = p;
    }

    let total_monthly_payroll = 0;
    let total_paid = 0;
    let total_pending = 0;
    let payment_1_total = 0;
    let payment_2_total = 0;
    const per_employee: SalarySummary['per_employee'] = [];

    for (const [, row] of byEmployee) {
      const p1Amount = row.payment_1?.net_amount ?? 0;
      const p2Amount = row.payment_2?.net_amount ?? 0;
      const monthly = row.payment_1?.gross_amount != null && row.payment_2?.gross_amount != null
        ? (row.payment_1.gross_amount + row.payment_2.gross_amount)
        : (row.employee.monthly_salary ?? (row.employee.bi_weekly_salary ?? 0) * 2);
      const total = p1Amount + p2Amount;

      total_monthly_payroll += monthly;
      payment_1_total += p1Amount;
      payment_2_total += p2Amount;
      if (row.payment_1?.status === 'paid') total_paid += row.payment_1.net_amount;
      else if (row.payment_1?.status === 'pending') total_pending += row.payment_1.net_amount;
      if (row.payment_2?.status === 'paid') total_paid += row.payment_2.net_amount;
      else if (row.payment_2?.status === 'pending') total_pending += row.payment_2.net_amount;

      per_employee.push({
        employee_id: row.employee.id,
        employee_name: row.employee.full_name,
        monthly_salary: monthly,
        payment_1: {
          amount: p1Amount,
          status: row.payment_1?.status ?? 'pending',
        },
        payment_2: {
          amount: p2Amount,
          status: row.payment_2?.status ?? 'pending',
        },
        total,
      });
    }

    return {
      data: {
        total_monthly_payroll,
        total_paid,
        total_pending,
        payment_1_total,
        payment_2_total,
        per_employee,
      },
      error: null,
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      success: false,
    };
  }
}
