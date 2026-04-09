/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import {
  getSalaryPaymentsForPeriod,
  generateSalarySchedule,
} from '@/lib/services/staff/salary';
import type { StaffServiceResponse } from '@/lib/services/staff/salary';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

export const revalidate = 60;

function parseMonthYear(searchParams: URLSearchParams): { month: number; year: number } | null {
  const monthStr = searchParams.get('month');
  const yearStr = searchParams.get('year');
  if (monthStr == null || yearStr == null) return null;
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(month) || Number.isNaN(year)) return null;
  if (month < 1 || month > 12) return null;
  return { month, year };
}

// GET /api/staff/salary?month=1&year=2025
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseMonthYear(searchParams);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Query params month (1-12) and year are required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const result = await getSalaryPaymentsForPeriod(parsed.month, parsed.year);

    if (!result.success) {
      return cachedJsonResponse(
        { success: false, error: result.error, data: null } as StaffServiceResponse<null>,
        'noCache',
        500
      );
    }

    return cachedJsonResponse(
      { success: true, error: null, data: result.data } as StaffServiceResponse<any>,
      'dynamic'
    );
  } catch (error) {
    console.error('GET /api/staff/salary error:', error);
    return cachedJsonResponse(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      'noCache',
      500
    );
  }
}

// POST /api/staff/salary — body: { month: number (1-12), year: number }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const month = typeof body.month === 'number' ? body.month : parseInt(body.month, 10);
    const year = typeof body.year === 'number' ? body.year : parseInt(body.year, 10);

    if (Number.isNaN(month) || Number.isNaN(year)) {
      return NextResponse.json(
        { success: false, error: 'month (1-12) and year are required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }
    if (month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: 'month must be 1-12', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const result = await generateSalarySchedule(month, year);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, data: null } as StaffServiceResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, error: null, data: result.data } as StaffServiceResponse<any>,
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/staff/salary error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      { status: 500 }
    );
  }
}
