/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getAllPayrollRuns, createPayrollRun } from '@/lib/services/staff/payroll';
import type { StaffServiceResponse, CreatePayrollRunRequest } from '@/lib/services/staff/payroll';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

export const revalidate = 60;

// GET /api/staff/payroll
export async function GET() {
  try {
    const result = await getAllPayrollRuns();

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
    console.error('GET /api/staff/payroll error:', error);
    return cachedJsonResponse(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      'noCache',
      500
    );
  }
}

// POST /api/staff/payroll
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    if (!body.period_start) {
      return NextResponse.json(
        { success: false, error: 'period_start (YYYY-MM-DD) is required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    if (!body.period_end) {
      return NextResponse.json(
        { success: false, error: 'period_end (YYYY-MM-DD) is required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const payload: CreatePayrollRunRequest = {
      period_start: body.period_start,
      period_end: body.period_end,
    };

    const result = await createPayrollRun(payload);

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
    console.error('POST /api/staff/payroll error:', error);
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
