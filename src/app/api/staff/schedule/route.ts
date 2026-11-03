import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAdmin } from '@/lib/api-auth';
import {
  getScheduleForWeek,
  parseScheduleShifts,
  saveWeekSchedule,
} from '@/lib/services/staff/schedule';

export const dynamic = 'force-dynamic';

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error, data: null }, { status });
}

// GET /api/staff/schedule?week=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const week = new URL(request.url).searchParams.get('week');
    if (!week) {
      return jsonError('week query parameter (YYYY-MM-DD) is required', 400);
    }

    const result = await getScheduleForWeek(week);
    if (!result.success) {
      const status = result.error?.startsWith('Invalid') ? 400 : 500;
      return jsonError(result.error || 'Failed to load schedule', status);
    }

    return NextResponse.json(
      { success: true, error: null, data: result.data },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('GET /api/staff/schedule error:', error);
    return jsonError('Internal server error', 500);
  }
}

// PUT /api/staff/schedule  { week, shifts: [{ day_of_week, shift_type, employee_id }] }
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return jsonError('Request body must be a valid JSON object', 400);
    }

    const week = (body as { week?: unknown }).week;
    if (typeof week !== 'string' || week.length === 0) {
      return jsonError('week (YYYY-MM-DD) is required', 400);
    }

    const parsed = parseScheduleShifts((body as { shifts?: unknown }).shifts);
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const result = await saveWeekSchedule(week, parsed.shifts);
    if (!result.success) {
      const status = result.error?.startsWith('Invalid') ? 400 : 500;
      return jsonError(result.error || 'Failed to save schedule', status);
    }

    return NextResponse.json({ success: true, error: null, data: result.data });
  } catch (error) {
    console.error('PUT /api/staff/schedule error:', error);
    if (error instanceof SyntaxError) {
      return jsonError('Invalid JSON in request body', 400);
    }
    return jsonError('Internal server error', 500);
  }
}
