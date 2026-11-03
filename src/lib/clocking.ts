import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export {
  getSastDateString,
  formatSastTime,
  formatSastDateTime,
  formatDurationMinutes,
  getSastMinutesSinceMidnight,
  stripPinHash,
  formatShiftBadge,
  formatShiftShort,
  isOvertime,
  SAST_TIMEZONE,
} from '@/lib/clocking-utils';

function isAdminRole(
  profileRole: string | null | undefined,
  userMetadataRole: unknown
): boolean {
  return (
    profileRole === 'admin' ||
    userMetadataRole === 'admin'
  );
}

export async function getCurrentUser(
  request: NextRequest
): Promise<{ userId: string | null; isAdmin: boolean }> {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const {
          data: { user },
          error,
        } = await supabaseAdmin.auth.getUser(token);

        if (!error && user) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          return {
            userId: user.id,
            isAdmin: isAdminRole(profile?.role, user.user_metadata?.role),
          };
        }
      }
    }

    const response = new NextResponse();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return { userId: null, isAdmin: false };
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    return {
      userId: session.user.id,
      isAdmin: isAdminRole(profile?.role, session.user.user_metadata?.role),
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { userId: null, isAdmin: false };
  }
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const PIN_RATE_WINDOW_MS = 60_000;
const PIN_RATE_MAX_FAILURES = 5;
const pinFailuresByIp = new Map<string, number[]>();

/** Shared by verify-pin and the chemical kiosk routes. One process, one window. */
export function checkPinRateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (pinFailuresByIp.get(ip) || []).filter((t) => now - t < PIN_RATE_WINDOW_MS);
  pinFailuresByIp.set(ip, recent);
  return recent.length >= PIN_RATE_MAX_FAILURES;
}

export function recordPinFailure(ip: string): void {
  const now = Date.now();
  const recent = (pinFailuresByIp.get(ip) || []).filter((t) => now - t < PIN_RATE_WINDOW_MS);
  recent.push(now);
  pinFailuresByIp.set(ip, recent);
}

export type ClockingEmployee = {
  id: string;
  full_name: string;
  photo_url: string | null;
};

/**
 * Active employees only, matched on clock_pin.
 * Returns null when the PIN is wrong. Throws when the query itself fails.
 */
export async function verifyEmployeePin(pin: string): Promise<ClockingEmployee | null> {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id, full_name, role, shift_type, photo_url, status, clock_pin')
    .eq('status', 'active')
    .eq('clock_pin', pin)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) return null;

  return {
    id: data.id,
    full_name: data.full_name,
    photo_url: data.photo_url,
  };
}

/**
 * Rate-limit, then resolve a kiosk PIN. The raw JSON body is returned for the
 * route to validate. Wrong PINs are 401; a PIN that is not 4 digits is 400.
 */
export async function authenticateClockingPin(
  request: NextRequest,
  logLabel: string
): Promise<
  | { employee: ClockingEmployee; body: unknown; response?: undefined }
  | { response: NextResponse; employee?: undefined; body?: undefined }
> {
  const ip = getClientIp(request);
  if (checkPinRateLimit(ip)) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Too many attempts. Please wait a minute.' },
        { status: 429 }
      ),
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      response: NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object' },
        { status: 400 }
      ),
    };
  }

  const pin = typeof (body as { pin?: unknown }).pin === 'string'
    ? (body as { pin: string }).pin.trim()
    : '';

  if (!/^\d{4}$/.test(pin)) {
    recordPinFailure(ip);
    return {
      response: NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 400 }
      ),
    };
  }

  try {
    const employee = await verifyEmployeePin(pin);
    if (!employee) {
      recordPinFailure(ip);
      return {
        response: NextResponse.json(
          { success: false, error: 'Invalid PIN' },
          { status: 401 }
        ),
      };
    }
    return { employee, body };
  } catch (error) {
    console.error(logLabel, error);
    return {
      response: NextResponse.json(
        { success: false, error: 'Unable to verify PIN' },
        { status: 500 }
      ),
    };
  }
}
