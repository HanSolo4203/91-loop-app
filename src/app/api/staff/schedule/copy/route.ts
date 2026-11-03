import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAdmin } from '@/lib/api-auth';
import { copyWeekSchedule } from '@/lib/services/staff/schedule';

export const dynamic = 'force-dynamic';

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error, data: null }, { status });
}

// POST /api/staff/schedule/copy  { from_week, to_week }
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return jsonError('Request body must be a valid JSON object', 400);
    }

    const { from_week: fromWeek, to_week: toWeek } = body as {
      from_week?: unknown;
      to_week?: unknown;
    };

    if (typeof fromWeek !== 'string' || fromWeek.length === 0) {
      return jsonError('from_week (YYYY-MM-DD) is required', 400);
    }
    if (typeof toWeek !== 'string' || toWeek.length === 0) {
      return jsonError('to_week (YYYY-MM-DD) is required', 400);
    }

    const result = await copyWeekSchedule(fromWeek, toWeek);
    if (!result.success) {
      const status = result.error?.startsWith('Invalid') ? 400 : 500;
      return jsonError(result.error || 'Failed to copy schedule', status);
    }

    return NextResponse.json({ success: true, error: null, data: result.data });
  } catch (error) {
    console.error('POST /api/staff/schedule/copy error:', error);
    if (error instanceof SyntaxError) {
      return jsonError('Invalid JSON in request body', 400);
    }
    return jsonError('Internal server error', 500);
  }
}
