import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET /api/clocking/active — public (anon), no auth required
export async function GET() {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .select(
        `
        id,
        employee_id,
        clocked_in_at,
        shift_date,
        shift_type,
        employees!inner (
          full_name,
          role,
          shift_type,
          photo_url
        )
      `
      )
      .is('clocked_out_at', null)
      .order('clocked_in_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const entries = (data || []).map((row: any) => ({
      session_id: row.id,
      employee_id: row.employee_id,
      full_name: row.employees?.full_name ?? '',
      role: row.employees?.role ?? null,
      shift_type: row.shift_type ?? row.employees?.shift_type ?? 'day',
      photo_url: row.employees?.photo_url ?? null,
      clocked_in_at: row.clocked_in_at,
      shift_date: row.shift_date,
    }));

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error('GET /api/clocking/active error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
