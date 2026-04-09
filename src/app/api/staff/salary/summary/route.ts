/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSalarySummary } from '@/lib/services/staff/salary';
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

// GET /api/staff/salary/summary?month=1&year=2025
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

    const result = await getSalarySummary(parsed.month, parsed.year);

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
    console.error('GET /api/staff/salary/summary error:', error);
    return cachedJsonResponse(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      'noCache',
      500
    );
  }
}
