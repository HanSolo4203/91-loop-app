import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatDurationMinutes, getSastDateString } from '@/lib/clocking';

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST /api/clocking/clock-out
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const employeeId = typeof body?.employee_id === 'string' ? body.employee_id : '';

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
      console.error('clock-out session lookup error:', sessionLookupError);
      return NextResponse.json(
        { success: false, error: 'Failed to find open session' },
        { status: 500 }
      );
    }

    if (!openSession) {
      return NextResponse.json(
        { success: false, error: 'Not currently clocked in' },
        { status: 400 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const shiftDate = openSession.shift_date || getSastDateString();
    const clockedInAt = new Date(openSession.clocked_in_at);
    const durationMinutes = Math.round((now.getTime() - clockedInAt.getTime()) / 60000);

    const { data: event, error: eventError } = await (supabaseAdmin as any)
      .from('clock_events')
      .insert({
        employee_id: employeeId,
        event_type: 'clock_out',
        clocked_at: nowIso,
        shift_date: shiftDate,
      })
      .select()
      .single();

    if (eventError || !event) {
      console.error('clock-out event error:', eventError);
      return NextResponse.json(
        { success: false, error: 'Failed to record clock-out' },
        { status: 500 }
      );
    }

    const { data: session, error: updateError } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .update({
        clock_out_id: event.id,
        clocked_out_at: nowIso,
        duration_minutes: durationMinutes,
      })
      .eq('id', openSession.id)
      .select()
      .single();

    if (updateError || !session) {
      console.error('clock-out session update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to close session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
      duration_formatted: formatDurationMinutes(durationMinutes),
      clocked_at: nowIso,
    });
  } catch (error) {
    console.error('POST /api/clocking/clock-out error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
