/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase';
import type { Absence } from '@/types/database';

export interface StaffServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface CreateAbsenceRequest {
  employee_id: string;
  absence_date: string;
  shift_type: 'day' | 'night';
  cover_employee_id?: string | null;
  reason?: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUuid(id: string): void {
  if (!id || !UUID_REGEX.test(id)) {
    throw new Error('Invalid ID format');
  }
}

export async function getAbsences(params?: {
  employee_id?: string;
  from?: string;
  to?: string;
}): Promise<StaffServiceResponse<Absence[]>> {
  try {
    let query = supabaseAdmin
      .from('absences')
      .select('*')
      .order('absence_date', { ascending: false });

    if (params?.employee_id) {
      validateUuid(params.employee_id);
      query = query.eq('employee_id', params.employee_id);
    }
    if (params?.from) {
      query = query.gte('absence_date', params.from);
    }
    if (params?.to) {
      query = query.lte('absence_date', params.to);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data || [], error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Invalid ID format',
      success: false,
    };
  }
}

export async function createAbsence(
  payload: CreateAbsenceRequest
): Promise<StaffServiceResponse<Absence>> {
  try {
    validateUuid(payload.employee_id);

    if (!payload.absence_date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.absence_date)) {
      return { data: null, error: 'absence_date must be YYYY-MM-DD', success: false };
    }
    if (!payload.shift_type || !['day', 'night'].includes(payload.shift_type)) {
      return { data: null, error: 'shift_type must be day or night', success: false };
    }

    if (payload.cover_employee_id) {
      validateUuid(payload.cover_employee_id);
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('absences')
      .insert({
        employee_id: payload.employee_id,
        absence_date: payload.absence_date,
        shift_type: payload.shift_type,
        cover_employee_id: payload.cover_employee_id || null,
        reason: payload.reason?.trim() || null,
      })
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
