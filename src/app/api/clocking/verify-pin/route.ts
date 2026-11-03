import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  checkPinRateLimit,
  getClientIp,
  getSastDateString,
  recordPinFailure,
  stripPinHash,
  verifyEmployeePin,
} from '@/lib/clocking';

// POST /api/clocking/verify-pin
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (checkPinRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';

    if (!/^\d{4}$/.test(pin)) {
      recordPinFailure(ip);
      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 400 }
      );
    }

    let matched: Awaited<ReturnType<typeof verifyEmployeePin>>;
    try {
      matched = await verifyEmployeePin(pin);
    } catch (error) {
      console.error('verify-pin query error:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to verify PIN' },
        { status: 500 }
      );
    }

    if (!matched) {
      recordPinFailure(ip);
      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Same payload as before: role, shift, and clock status stay on this response.
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, role, shift_type, photo_url, status, clock_pin')
      .eq('id', matched.id)
      .maybeSingle();

    if (employeeError || !employee) {
      console.error('verify-pin query error:', employeeError);
      return NextResponse.json(
        { success: false, error: 'Unable to verify PIN' },
        { status: 500 }
      );
    }

    const today = getSastDateString();
    const { data: openSession } = await supabaseAdmin
      .from('clock_sessions')
      .select('id, clocked_in_at')
      .eq('employee_id', employee.id)
      .is('clocked_out_at', null)
      .order('clocked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      employee: {
        ...stripPinHash({ ...employee, pin_hash: null }),
        is_clocked_in: !!openSession,
        open_session_id: openSession?.id ?? null,
        clocked_in_at: openSession?.clocked_in_at ?? null,
        today,
      },
    });
  } catch (error) {
    console.error('POST /api/clocking/verify-pin error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
