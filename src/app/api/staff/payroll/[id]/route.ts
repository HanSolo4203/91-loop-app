/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getPayrollRunById, updatePayrollRun } from '@/lib/services/staff/payroll';
import type { StaffServiceResponse, UpdatePayrollRunRequest } from '@/lib/services/staff/payroll';

// GET /api/staff/payroll/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payroll run ID is required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const result = await getPayrollRunById(id);

    if (!result.success) {
      const statusCode = result.error === 'not found' ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error, data: null } as StaffServiceResponse<null>,
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { success: true, error: null, data: result.data } as StaffServiceResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/staff/payroll/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      { status: 500 }
    );
  }
}

// PUT /api/staff/payroll/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payroll run ID is required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const payload: UpdatePayrollRunRequest = {};
    if (body.status && ['draft', 'approved', 'paid'].includes(body.status)) {
      payload.status = body.status;
    }
    if (Array.isArray(body.entries)) {
      payload.entries = body.entries.map((e: { id: string; deductions?: number; notes?: string | null }) => ({
        id: e.id,
        deductions: e.deductions,
        notes: e.notes,
      }));
    }

    const result = await updatePayrollRun(id, payload);

    if (!result.success) {
      const statusCode = result.error === 'not found' ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error, data: null } as StaffServiceResponse<null>,
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { success: true, error: null, data: result.data } as StaffServiceResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT /api/staff/payroll/[id] error:', error);
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
