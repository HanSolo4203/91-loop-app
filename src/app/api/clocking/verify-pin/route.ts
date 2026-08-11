import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

    const { data: employees, error } = await (supabaseAdmin as any)
      .from('employees')
      .select('id, full_name, role, shift_type, photo_url, status, pin_hash')
      .eq('status', 'active')
      .not('pin_hash', 'is', null);

    if (error) {
      console.error('verify-pin query error:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to verify PIN' },
        { status: 500 }
      );
    }

    let matched: {
      id: string;
      full_name: string;
      role: string | null;
      shift_type: string;
      photo_url: string | null;
    } | null = null;

    for (const emp of employees || []) {
      if (!emp.pin_hash) continue;
      const ok = await bcrypt.compare(pin, emp.pin_hash);
      if (ok) {
        matched = {
          id: emp.id,
          full_name: emp.full_name,
          role: emp.role,
          shift_type: emp.shift_type,
          photo_url: emp.photo_url ?? null,
        };
        break;
      }
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
      .select('id')
      .eq('employee_id', matched.id)
      .is('clocked_out_at', null)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      employee: {
        ...stripPinHash({ ...matched, pin_hash: null }),
        is_clocked_in: !!openSession,
        open_session_id: openSession?.id ?? null,
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
