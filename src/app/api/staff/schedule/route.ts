/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getScheduleForWeek, seedDefaultSchedule } from '@/lib/services/staff/schedule';
import type { StaffServiceResponse } from '@/lib/services/staff/schedule';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

export const revalidate = 60;

// GET /api/staff/schedule?week=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');

    if (!week) {
      return cachedJsonResponse(
        { success: false, error: 'week query parameter (YYYY-MM-DD) is required', data: null } as StaffServiceResponse<null>,
        'noCache',
        400
      );
    }

    const result = await getScheduleForWeek(week);

    if (!result.success) {
      return cachedJsonResponse(
        { success: false, error: result.error, data: null } as StaffServiceResponse<null>,
        'noCache',
        400
      );
    }

    return cachedJsonResponse(
      { success: true, error: null, data: result.data } as StaffServiceResponse<any>,
      'dynamic'
    );
  } catch (error) {
    console.error('GET /api/staff/schedule error:', error);
    return cachedJsonResponse(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      'noCache',
      500
    );
  }
}

// POST /api/staff/schedule - seed default schedule
export async function POST() {
  try {
    const result = await seedDefaultSchedule();

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
    console.error('POST /api/staff/schedule error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      { status: 500 }
    );
  }
}
