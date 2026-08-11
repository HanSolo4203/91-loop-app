import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getClientIp } from '@/lib/clocking';

/* eslint-disable @typescript-eslint/no-explicit-any */

const COOKIE_NAME = 'rsl_kiosk_mode';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_FAILURES = 5;
const failedAttempts = new Map<string, number[]>();

function kioskCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    secure: process.env.NODE_ENV === 'production',
  };
}

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

async function verifyAdminKioskPin(
  request: NextRequest,
  body?: { pin?: unknown }
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Too many attempts. Please wait a minute.' },
        { status: 429 }
      ),
    };
  }

  let parsed = body;
  if (!parsed) {
    try {
      parsed = await request.json();
    } catch {
      parsed = {};
    }
  }

  const pin = typeof parsed?.pin === 'string' ? parsed.pin.trim() : '';

  if (!/^\d{4}$/.test(pin)) {
    recordFailure(ip);
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Enter a valid 4-digit admin PIN' },
        { status: 400 }
      ),
    };
  }

  const { data: matched, error } = await (supabaseAdmin as any)
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('kiosk_pin', pin)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('kiosk-mode PIN verify error:', error);
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Unable to verify PIN' },
        { status: 500 }
      ),
    };
  }

  if (!matched) {
    recordFailure(ip);
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Invalid admin PIN' },
        { status: 401 }
      ),
    };
  }

  return { ok: true };
}

// GET /api/kiosk-mode — whether this device has kiosk mode active
export async function GET(request: NextRequest) {
  const active = request.cookies.get(COOKIE_NAME)?.value === '1';
  return NextResponse.json({ success: true, active });
}

// POST /api/kiosk-mode — { pin } enables; { pin, action: 'exit' } disables
export async function POST(request: NextRequest) {
  try {
    let body: { pin?: unknown; action?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const verified = await verifyAdminKioskPin(request, body);
    if (!verified.ok) return verified.response;

    const exiting = body?.action === 'exit';
    const response = NextResponse.json({ success: true });
    if (exiting) {
      response.cookies.set(COOKIE_NAME, '', kioskCookieOptions(0));
    } else {
      response.cookies.set(COOKIE_NAME, '1', kioskCookieOptions(COOKIE_MAX_AGE));
    }
    return response;
  } catch (error) {
    console.error('Error updating kiosk mode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update kiosk mode' },
      { status: 500 }
    );
  }
}

// DELETE /api/kiosk-mode — verify admin kiosk PIN and clear cookie
export async function DELETE(request: NextRequest) {
  try {
    const verified = await verifyAdminKioskPin(request);
    if (!verified.ok) return verified.response;

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, '', kioskCookieOptions(0));
    return response;
  } catch (error) {
    console.error('Error disabling kiosk mode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disable kiosk mode' },
      { status: 500 }
    );
  }
}
