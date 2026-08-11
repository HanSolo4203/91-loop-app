import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatDurationMinutes, getCurrentUser } from '@/lib/clocking';
import { calculateShiftMinutes, type ShiftType } from '@/lib/shift-constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST /api/clocking/sessions/force-clockout — admin only
export async function POST(request: NextRequest) {
  try {
    const { isAdmin } = await getCurrentUser(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const employeeId = typeof body?.employee_id === 'string' ? body.employee_id : '';
    const clockedOutAtRaw =
      typeof body?.clocked_out_at === 'string' && body.clocked_out_at
        ? body.clocked_out_at
        : null;
    const notes =
      typeof body?.notes === 'string' && body.notes.trim()
        ? body.notes.trim()
        : 'Force clock-out by admin';

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required' },
        { status: 400 }
      );
    }

    const { data: openSession, error: sessionLookupError } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .select('*')
      .eq('employee_id', employeeId)
      .is('clocked_out_at', null)
      .order('clocked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionLookupError) {
      console.error('force-clockout session lookup error:', sessionLookupError);
      return NextResponse.json(
        { success: false, error: 'Failed to find open session' },
        { status: 500 }
      );
    }

    if (!openSession) {
      return NextResponse.json(
        { success: false, error: 'Employee is not currently clocked in' },
        { status: 400 }
      );
    }

    const outAt = clockedOutAtRaw ? new Date(clockedOutAtRaw) : new Date();
    if (Number.isNaN(outAt.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid clocked_out_at' },
        { status: 400 }
      );
    }

    const outIso = outAt.toISOString();
    const clockedInAt = new Date(openSession.clocked_in_at);
    const shiftType: ShiftType =
      openSession.shift_type === 'night' ? 'night' : 'day';

    if (outAt.getTime() < clockedInAt.getTime()) {
      return NextResponse.json(
        { success: false, error: 'Clock-out must be after clock-in' },
        { status: 400 }
      );
    }

    const { total_minutes, regular_minutes, overtime_minutes } = calculateShiftMinutes(
      clockedInAt,
      outAt,
      shiftType
    );

    const { data: event, error: eventError } = await (supabaseAdmin as any)
      .from('clock_events')
      .insert({
        employee_id: employeeId,
        event_type: 'clock_out',
        clocked_at: outIso,
        shift_date: openSession.shift_date,
        notes,
      })
      .select()
      .single();

    if (eventError || !event) {
      console.error('force-clockout event error:', eventError);
      return NextResponse.json(
        { success: false, error: 'Failed to record clock-out' },
        { status: 500 }
      );
    }

    const { data: session, error: updateError } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .update({
        clock_out_id: event.id,
        clocked_out_at: outIso,
        duration_minutes: total_minutes,
        regular_minutes,
        overtime_minutes,
        is_manual_edit: true,
        admin_notes: notes,
      })
      .eq('id', openSession.id)
      .select()
      .single();

    if (updateError || !session) {
      console.error('force-clockout session update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to close session' },
        { status: 500 }
      );
    }

    if (overtime_minutes > 0) {
      const { data: employee } = await (supabaseAdmin as any)
        .from('employees')
        .select('total_overtime_minutes')
        .eq('id', employeeId)
        .single();

      const currentOt = employee?.total_overtime_minutes ?? 0;
      const { error: otError } = await (supabaseAdmin as any)
        .from('employees')
        .update({ total_overtime_minutes: currentOt + overtime_minutes })
        .eq('id', employeeId);

      if (otError) {
        console.error('force-clockout overtime update error:', otError);
      }
    }

    const hadOvertime = overtime_minutes > 0;

    return NextResponse.json({
      success: true,
      data: {
        session,
        duration_formatted: formatDurationMinutes(total_minutes),
        overtime_formatted: formatDurationMinutes(overtime_minutes),
        had_overtime: hadOvertime,
      },
    });
  } catch (error) {
    console.error('POST /api/clocking/sessions/force-clockout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
