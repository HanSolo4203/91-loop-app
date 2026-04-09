/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase';
import type { Employee, PayrollRun, PayrollEntry } from '@/types/database';
import type { PayrollRunWithEntries, PayrollEntryWithEmployee } from '@/types/database';

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

export async function getAllPayrollRuns(): Promise<StaffServiceResponse<PayrollRun[]>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('payroll_runs')
      .select('*')
      .order('period_start', { ascending: false });

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data || [], error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      success: false,
    };
  }
}

export async function getPayrollRunById(
  id: string
): Promise<StaffServiceResponse<PayrollRunWithEntries>> {
  try {
    validateUuid(id);

    const { data: run, error: runError } = await supabaseAdmin
      .from('payroll_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (runError || !run) {
      return { data: null, error: runError?.message || 'not found', success: false };
    }

    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('payroll_entries')
      .select('*')
      .eq('payroll_run_id', id)
      .order('id', { ascending: true });

    if (entriesError) {
      return { data: null, error: entriesError.message, success: false };
    }

    const employeeIds = [...new Set((entries || []).map((e: PayrollEntry) => e.employee_id))];
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('*')
      .in('id', employeeIds);

    const empMap = new Map<string, Employee>();
    (employees || []).forEach((e: Employee) => empMap.set(e.id, e));

    const entriesWithEmployee: PayrollEntryWithEmployee[] = (entries || []).map(
      (e: PayrollEntry) => ({
        ...e,
        employee: empMap.get(e.employee_id)!,
      })
    );

    return {
      data: { ...run, entries: entriesWithEmployee },
      error: null,
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Invalid ID format',
      success: false,
    };
  }
}

export interface CreatePayrollRunRequest {
  period_start: string;
  period_end: string;
}

export async function createPayrollRun(
  payload: CreatePayrollRunRequest
): Promise<StaffServiceResponse<PayrollRun>> {
  try {
    if (!payload.period_start || !/^\d{4}-\d{2}-\d{2}$/.test(payload.period_start)) {
      return { data: null, error: 'period_start must be YYYY-MM-DD', success: false };
    }
    if (!payload.period_end || !/^\d{4}-\d{2}-\d{2}$/.test(payload.period_end)) {
      return { data: null, error: 'period_end must be YYYY-MM-DD', success: false };
    }

    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, monthly_salary, bi_weekly_salary')
      .eq('status', 'active');

    const { data: run, error: runError } = await (supabaseAdmin as any)
      .from('payroll_runs')
      .insert({
        period_start: payload.period_start,
        period_end: payload.period_end,
        status: 'draft',
        total_amount: 0,
      })
      .select()
      .single();

    if (runError || !run) {
      return { data: null, error: runError?.message || 'Failed to create run', success: false };
    }

    const halfMonthly = (e: { monthly_salary?: number | null; bi_weekly_salary?: number }) => {
      const monthly = e.monthly_salary ?? (e.bi_weekly_salary != null ? e.bi_weekly_salary * 2 : 0);
      return Math.round((monthly / 2) * 100) / 100;
    };

    const entries: Array<{
      payroll_run_id: string;
      employee_id: string;
      bi_weekly_salary: number;
      deductions: number;
      net_pay: number;
    }> = [];
    for (const e of employees || []) {
      const emp = e as { id: string; monthly_salary?: number | null; bi_weekly_salary?: number };
      const amount = halfMonthly(emp);
      if (amount <= 0) continue;
      entries.push({
        payroll_run_id: run.id,
        employee_id: emp.id,
        bi_weekly_salary: amount,
        deductions: 0,
        net_pay: amount,
      });
      entries.push({
        payroll_run_id: run.id,
        employee_id: emp.id,
        bi_weekly_salary: amount,
        deductions: 0,
        net_pay: amount,
      });
    }

    const totalAmount = entries.reduce((sum: number, e: { net_pay: number }) => sum + e.net_pay, 0);

    if (entries.length > 0) {
      await (supabaseAdmin as any).from('payroll_entries').insert(entries);
    }

    await (supabaseAdmin as any)
      .from('payroll_runs')
      .update({ total_amount: totalAmount })
      .eq('id', run.id);

    return {
      data: { ...run, total_amount: totalAmount },
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

export interface UpdatePayrollRunRequest {
  status?: 'draft' | 'approved' | 'paid';
  entries?: Array<{
    id: string;
    deductions?: number;
    notes?: string | null;
  }>;
}

export async function updatePayrollRun(
  id: string,
  payload: UpdatePayrollRunRequest
): Promise<StaffServiceResponse<PayrollRun>> {
  try {
    validateUuid(id);

    if (payload.status) {
      const { data: run, error } = await (supabaseAdmin as any)
        .from('payroll_runs')
        .update({ status: payload.status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }
      if (payload.entries?.length === 0) {
        return { data: run, error: null, success: true };
      }
    }

    if (payload.entries && payload.entries.length > 0) {
      for (const entry of payload.entries) {
        validateUuid(entry.id);
        const updates: Record<string, unknown> = {};
        if (entry.deductions !== undefined) updates.deductions = entry.deductions;
        if (entry.notes !== undefined) updates.notes = entry.notes;

        if (entry.deductions !== undefined) {
          const { data: current } = await supabaseAdmin
            .from('payroll_entries')
            .select('bi_weekly_salary')
            .eq('id', entry.id)
            .single();

          if (current) {
            const salary = (current as { bi_weekly_salary: number }).bi_weekly_salary ?? 0;
            (updates as Record<string, number>).net_pay = Math.max(
              0,
              salary - (entry.deductions ?? 0)
            );
          }
        }

        if (Object.keys(updates).length > 0) {
          await (supabaseAdmin as any)
            .from('payroll_entries')
            .update(updates)
            .eq('id', entry.id);
        }
      }

      const { data: run } = await supabaseAdmin
        .from('payroll_runs')
        .select('*')
        .eq('id', id)
        .single();

      const { data: entries } = await supabaseAdmin
        .from('payroll_entries')
        .select('net_pay')
        .eq('payroll_run_id', id);

      const totalAmount = (entries || []).reduce((s: number, e: { net_pay: number }) => s + e.net_pay, 0);
      await (supabaseAdmin as any)
        .from('payroll_runs')
        .update({ total_amount: totalAmount })
        .eq('id', id);

      const { data: updatedRun } = await supabaseAdmin
        .from('payroll_runs')
        .select('*')
        .eq('id', id)
        .single();

      return { data: updatedRun, error: null, success: true };
    }

    const { data: run } = await supabaseAdmin
      .from('payroll_runs')
      .select('*')
      .eq('id', id)
      .single();

    return { data: run, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Invalid ID format',
      success: false,
    };
  }
}
