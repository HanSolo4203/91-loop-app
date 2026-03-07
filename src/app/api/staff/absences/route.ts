/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getAbsences, createAbsence } from '@/lib/services/staff/absences';
import type { StaffServiceResponse, CreateAbsenceRequest } from '@/lib/services/staff/absences';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

export const revalidate = 60;

// GET /api/staff/absences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const result = await getAbsences({
      employee_id: employeeId || undefined,
      from: from || undefined,
      to: to || undefined,
    });

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
    console.error('GET /api/staff/absences error:', error);
    return cachedJsonResponse(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      'noCache',
      500
    );
  }
}

// POST /api/staff/absences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    if (!body.employee_id) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    if (!body.absence_date) {
      return NextResponse.json(
        { success: false, error: 'absence_date (YYYY-MM-DD) is required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    if (!body.shift_type || !['day', 'night'].includes(body.shift_type)) {
      return NextResponse.json(
        { success: false, error: 'shift_type must be day or night', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const payload: CreateAbsenceRequest = {
      employee_id: body.employee_id,
      absence_date: body.absence_date,
      shift_type: body.shift_type,
      cover_employee_id: body.cover_employee_id ?? null,
      reason: body.reason ?? null,
    };

    const result = await createAbsence(payload);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, error: null, data: result.data } as StaffServiceResponse<any>,
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/staff/absences error:', error);
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
