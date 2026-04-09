/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { updateSalaryPayment, deleteSalaryPayment } from '@/lib/services/staff/salary';
import type { StaffServiceResponse } from '@/lib/services/staff/salary';

// PUT /api/staff/salary/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Salary payment ID is required', data: null } as StaffServiceResponse<null>,
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

    const payload: { status?: 'pending' | 'paid' | 'skipped'; deductions?: number; notes?: string | null } = {};
    if (body.status && ['pending', 'paid', 'skipped'].includes(body.status)) {
      payload.status = body.status;
    }
    if (body.deductions !== undefined) payload.deductions = Number(body.deductions);
    if (body.notes !== undefined) payload.notes = body.notes == null ? null : String(body.notes);

    const result = await updateSalaryPayment(id, payload);

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
    console.error('PUT /api/staff/salary/[id] error:', error);
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

// DELETE /api/staff/salary/[id] — only if status is pending
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Salary payment ID is required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const result = await deleteSalaryPayment(id);

    if (!result.success) {
      const statusCode = result.error === 'not found' ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error, data: null } as StaffServiceResponse<null>,
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { success: true, error: null, data: null } as StaffServiceResponse<null>,
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/staff/salary/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      { status: 500 }
    );
  }
}
