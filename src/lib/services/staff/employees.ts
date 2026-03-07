/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase';
import type {
  Employee,
  EmployeeInsert,
  EmployeeUpdate,
} from '@/types/database';

export interface StaffServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface CreateEmployeeRequest {
  full_name: string;
  phone?: string;
  email?: string;
  role?: string;
  shift_type: 'day' | 'night' | 'both';
  bi_weekly_salary?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch_code?: string;
  account_type?: 'cheque' | 'savings';
  id_number?: string;
  id_document_url?: string;
  status?: 'active' | 'inactive';
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUuid(id: string): void {
  if (!id || !UUID_REGEX.test(id)) {
    throw new Error('Invalid ID format');
  }
}

export async function getAllEmployees(): Promise<StaffServiceResponse<Employee[]>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      // Table may not exist yet if migration hasn't been run
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { data: [], error: null, success: true };
      }
      return { data: null, error: error.message, success: false };
    }

    return { data: data || [], error: null, success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('does not exist') || msg.includes('relation')) {
      return { data: [], error: null, success: true };
    }
    return { data: null, error: msg, success: false };
  }
}

export async function getEmployeeById(id: string): Promise<StaffServiceResponse<Employee>> {
  try {
    validateUuid(id);

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: 'not found', success: false };
      }
      return { data: null, error: error.message, success: false };
    }

    return { data, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Invalid ID format',
      success: false,
    };
  }
}

export async function createEmployee(
  payload: CreateEmployeeRequest
): Promise<StaffServiceResponse<Employee>> {
  try {
    if (!payload.full_name?.trim()) {
      return { data: null, error: 'full_name is required', success: false };
    }
    if (!payload.shift_type || !['day', 'night', 'both'].includes(payload.shift_type)) {
      return { data: null, error: 'shift_type must be day, night, or both', success: false };
    }

    const insert: EmployeeInsert = {
      full_name: payload.full_name.trim(),
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      role: payload.role?.trim() || null,
      shift_type: payload.shift_type,
      bi_weekly_salary: payload.bi_weekly_salary ?? 0,
      bank_name: payload.bank_name?.trim() || null,
      bank_account_number: payload.bank_account_number?.trim() || null,
      bank_branch_code: payload.bank_branch_code?.trim() || null,
      account_type: payload.account_type || null,
      id_number: payload.id_number?.trim() || null,
      id_document_url: payload.id_document_url?.trim() || null,
      status: payload.status ?? 'active',
    };

    const { data, error } = await (supabaseAdmin as any)
      .from('employees')
      .insert(insert)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      success: false,
    };
  }
}

export async function updateEmployee(
  id: string,
  payload: Partial<CreateEmployeeRequest>
): Promise<StaffServiceResponse<Employee>> {
  try {
    validateUuid(id);

    const { data: existing } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return { data: null, error: 'not found', success: false };
    }

    if (payload.shift_type && !['day', 'night', 'both'].includes(payload.shift_type)) {
      return { data: null, error: 'shift_type must be day, night, or both', success: false };
    }

    const update: EmployeeUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (payload.full_name !== undefined) update.full_name = payload.full_name.trim();
    if (payload.phone !== undefined) update.phone = payload.phone?.trim() || null;
    if (payload.email !== undefined) update.email = payload.email?.trim() || null;
    if (payload.role !== undefined) update.role = payload.role?.trim() || null;
    if (payload.shift_type !== undefined) update.shift_type = payload.shift_type;
    if (payload.bi_weekly_salary !== undefined) update.bi_weekly_salary = payload.bi_weekly_salary;
    if (payload.bank_name !== undefined) update.bank_name = payload.bank_name?.trim() || null;
    if (payload.bank_account_number !== undefined)
      update.bank_account_number = payload.bank_account_number?.trim() || null;
    if (payload.bank_branch_code !== undefined)
      update.bank_branch_code = payload.bank_branch_code?.trim() || null;
    if (payload.account_type !== undefined) update.account_type = payload.account_type || null;
    if (payload.id_number !== undefined) update.id_number = payload.id_number?.trim() || null;
    if (payload.id_document_url !== undefined)
      update.id_document_url = payload.id_document_url?.trim() || null;
    if (payload.status !== undefined) update.status = payload.status;

    const { data, error } = await (supabaseAdmin as any)
      .from('employees')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Invalid ID format',
      success: false,
    };
  }
}

export async function deleteEmployee(id: string): Promise<StaffServiceResponse<null>> {
  try {
    validateUuid(id);

    const { error } = await supabaseAdmin.from('employees').delete().eq('id', id);

    if (error) {
      return { data: null, error: error.message, success: false };
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
