import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSastDateString } from '@/lib/clocking';
import type { ShiftType } from '@/lib/shift-constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

const VALID_SHIFTS: ShiftType[] = ['day', 'night'];

// POST /api/clocking/clock-in
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const employeeId = typeof body?.employee_id === 'string' ? body.employee_id : '';
    const shiftType = body?.shift_type as ShiftType | undefined;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required' },
        { status: 400 }
      );
    }

    if (!shiftType || !VALID_SHIFTS.includes(shiftType)) {
      return NextResponse.json(
        { success: false, error: 'shift_type must be "day" or "night"' },
        { status: 400 }
      );
    }

    const { data: employee, error: empError } = await (supabaseAdmin as any)
      .from('employees')
      .select('id, full_name, status')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (employee.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Employee is inactive' },
        { status: 400 }
      );
    }

    const { data: openSession } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .select('id')
      .eq('employee_id', employeeId)
      .is('clocked_out_at', null)
      .maybeSingle();

    if (openSession) {
      return NextResponse.json(
        { success: false, error: 'Already clocked in' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const shiftDate = getSastDateString();
    const scheduledStart = shiftType === 'day' ? '09:00:00' : '17:00:00';
    const scheduledEnd = shiftType === 'day' ? '17:00:00' : '05:00:00';
    const isOvernight = shiftType === 'night';

    const { data: event, error: eventError } = await (supabaseAdmin as any)
      .from('clock_events')
      .insert({
        employee_id: employeeId,
        event_type: 'clock_in',
        clocked_at: now,
        shift_date: shiftDate,
      })
      .select()
      .single();

    if (eventError || !event) {
      console.error('clock-in event error:', eventError);
      return NextResponse.json(
        { success: false, error: 'Failed to record clock-in' },
        { status: 500 }
      );
    }

    const { data: session, error: sessionError } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .insert({
        employee_id: employeeId,
        clock_in_id: event.id,
        clocked_in_at: now,
        shift_date: shiftDate,
        shift_type: shiftType,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        is_overnight: isOvernight,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('clock-in session error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
      clocked_at: now,
      shift_type: shiftType,
      scheduled_end: shiftType === 'day' ? '17:00' : '05:00',
    });
  } catch (error) {
    console.error('POST /api/clocking/clock-in error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
