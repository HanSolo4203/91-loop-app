import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSastDateString, stripPinHash } from '@/lib/clocking';

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET /api/clocking/status?employee_id=
export async function GET(request: NextRequest) {
  try {
    const employeeId = request.nextUrl.searchParams.get('employee_id');

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required' },
        { status: 400 }
      );
    }

    const { data: employee, error: empError } = await (supabaseAdmin as any)
      .from('employees')
      .select('id, full_name, role, shift_type, status, clock_pin')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const today = getSastDateString();

    const { data: openSession } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .select('*')
      .eq('employee_id', employeeId)
      .is('clocked_out_at', null)
      .order('clocked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: todaysSessions } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .select('duration_minutes, clocked_in_at, clocked_out_at')
      .eq('employee_id', employeeId)
      .eq('shift_date', today);

    let todaysMinutes = 0;
    for (const s of todaysSessions || []) {
      if (s.duration_minutes != null) {
        todaysMinutes += s.duration_minutes;
      } else if (s.clocked_in_at && !s.clocked_out_at) {
        todaysMinutes += Math.round(
          (Date.now() - new Date(s.clocked_in_at).getTime()) / 60000
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        employee: stripPinHash(employee),
        current_session: openSession ?? null,
        is_clocked_in: !!openSession,
        todays_minutes: todaysMinutes,
      },
    });
  } catch (error) {
    console.error('GET /api/clocking/status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
