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

/** Split monthly salary into two payments that always sum exactly to monthly. */
export function splitMonthlySalary(monthly: number): [number, number] {
  const payment1 = Math.round((monthly / 2) * 100) / 100;
  const payment2 = Math.round((monthly - payment1) * 100) / 100;
  return [payment1, payment2];
}

function resolveMonthlySalary(emp: {
  monthly_salary?: number | null;
  bi_weekly_salary?: number | null;
}): number {
  return emp.monthly_salary ?? (emp.bi_weekly_salary != null ? emp.bi_weekly_salary * 2 : 0);
}

/**
 * Sync pending salary payment amounts for an employee to match their current monthly salary.
 * Paid/skipped payments are left unchanged.
 */
export async function syncPendingSalaryPaymentsForEmployee(
  employeeId: string,
  monthlySalary: number
): Promise<void> {
  validateUuid(employeeId);
  if (monthlySalary < 0) return;

  const [amount1, amount2] = splitMonthlySalary(monthlySalary);

  const { data: pending } = await supabaseAdmin
    .from('salary_payments')
    .select('id, payment_number, deductions')
    .eq('employee_id', employeeId)
    .eq('status', 'pending');

  for (const row of (pending || []) as { id: string; payment_number: number; deductions: number }[]) {
    const gross = row.payment_number === 1 ? amount1 : amount2;
    const deductions = row.deductions ?? 0;
    await (supabaseAdmin as any)
      .from('salary_payments')
      .update({
        gross_amount: gross,
        net_amount: Math.max(0, gross - deductions),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
  }
}

/**
 * GET salary payments for a month/year with employee details.
 * Pending payment amounts are refreshed to match each employee's current monthly salary.
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

    let list = (payments || []) as SalaryPayment[];
    const employeeIds = [...new Set(list.map((p) => p.employee_id))];
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('*')
      .in('id', employeeIds);

    const empMap = new Map<string, Employee>();
    (employees || []).forEach((e: Employee) => empMap.set(e.id, e));

    // Keep pending payment amounts in sync with current monthly salary (including R0)
    for (const p of list) {
      if (p.status !== 'pending') continue;
      const emp = empMap.get(p.employee_id);
      if (!emp) continue;
      const monthly = Math.max(0, resolveMonthlySalary(emp));
      const [amount1, amount2] = splitMonthlySalary(monthly);
      const expectedGross = p.payment_number === 1 ? amount1 : amount2;
      if (p.gross_amount === expectedGross) continue;

      const deductions = p.deductions ?? 0;
      const net = Math.max(0, expectedGross - deductions);
      const { error: syncError } = await (supabaseAdmin as any)
        .from('salary_payments')
        .update({
          gross_amount: expectedGross,
          net_amount: net,
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.id);
      if (!syncError) {
        p.gross_amount = expectedGross;
        p.net_amount = net;
      }
    }

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
 * salary_payments per active employee. For employees that already have
 * pending payments, refresh amounts so Payment 1 + Payment 2 = monthly salary.
 * Paid/skipped payments are left unchanged.
 */
export async function generateSalarySchedule(
  month: number,
  year: number
): Promise<StaffServiceResponse<{ created: number; updated: number }>> {
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
      .select('id, employee_id, payment_number, status, deductions, gross_amount')
      .eq('period_month', month)
      .eq('period_year', year);

    type ExistingPayment = {
      id: string;
      employee_id: string;
      payment_number: number;
      status: string;
      deductions: number;
      gross_amount: number;
    };

    const existingByEmployee = new Map<string, ExistingPayment[]>();
    for (const row of (existing.data || []) as ExistingPayment[]) {
      const list = existingByEmployee.get(row.employee_id) ?? [];
      list.push(row);
      existingByEmployee.set(row.employee_id, list);
    }

    const daysInMonth = getDaysInMonth(year, month);
    let created = 0;
    let updated = 0;

    for (const emp of employees || []) {
      const e = emp as {
        id: string;
        monthly_salary: number | null;
        bi_weekly_salary: number;
        salary_payment_day_1: number;
        salary_payment_day_2: number;
      };

      const monthly = Math.max(0, resolveMonthlySalary(e));
      const [amount1, amount2] = splitMonthlySalary(monthly);
      const existingPayments = existingByEmployee.get(e.id);

      if (existingPayments && existingPayments.length > 0) {
        for (const payment of existingPayments) {
          if (payment.status !== 'pending') continue;
          const gross = payment.payment_number === 1 ? amount1 : amount2;
          if (payment.gross_amount === gross) continue;
          const deductions = payment.deductions ?? 0;
          const { error: updateError } = await (supabaseAdmin as any)
            .from('salary_payments')
            .update({
              gross_amount: gross,
              net_amount: Math.max(0, gross - deductions),
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);
          if (!updateError) updated += 1;
        }
        continue;
      }

      // Don't create new schedule rows for employees with no salary
      if (monthly <= 0) continue;

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
          gross_amount: amount1,
          deductions: 0,
          net_amount: amount1,
          status: 'pending',
          payment_method: 'bank_transfer',
        },
        {
          employee_id: e.id,
          payment_date: date2,
          payment_number: 2,
          period_month: month,
          period_year: year,
          gross_amount: amount2,
          deductions: 0,
          net_amount: amount2,
          status: 'pending',
          payment_method: 'bank_transfer',
        },
      ];

      const { error: insertError } = await (supabaseAdmin as any)
        .from('salary_payments')
        .insert(rows);

      if (!insertError) created += 2;
    }

    return { data: { created, updated }, error: null, success: true };
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
      } else {
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
      const monthly = resolveMonthlySalary(row.employee);
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
