import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getClientIp, getSastDateString, stripPinHash } from '@/lib/clocking';

/* eslint-disable @typescript-eslint/no-explicit-any */

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_FAILURES = 5;
const failedAttempts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (failedAttempts.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  failedAttempts.set(ip, recent);
  return recent.length >= RATE_MAX_FAILURES;
}

function recordFailure(ip: string) {
  const now = Date.now();
  const recent = (failedAttempts.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  failedAttempts.set(ip, recent);
}

// POST /api/clocking/verify-pin
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';

    if (!/^\d{4}$/.test(pin)) {
      recordFailure(ip);
      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 400 }
      );
    }

    // Indexed lookup on clock_pin — avoids slow bcrypt scan across all employees
    const { data: matched, error } = await (supabaseAdmin as any)
      .from('employees')
      .select('id, full_name, role, shift_type, photo_url, status, clock_pin')
      .eq('status', 'active')
      .eq('clock_pin', pin)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('verify-pin query error:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to verify PIN' },
        { status: 500 }
      );
    }

    if (!matched) {
      recordFailure(ip);
      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    const today = getSastDateString();
    const { data: openSession } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .select('id, clocked_in_at')
      .eq('employee_id', matched.id)
      .is('clocked_out_at', null)
      .order('clocked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      employee: {
        ...stripPinHash({ ...matched, pin_hash: null }),
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
