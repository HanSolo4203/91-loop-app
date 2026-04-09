/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import {
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '@/lib/services/staff/employees';
import type { StaffServiceResponse, CreateEmployeeRequest } from '@/lib/services/staff/employees';

// GET /api/staff/employees/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const result = await getEmployeeById(id);

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
    console.error('GET /api/staff/employees/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      { status: 500 }
    );
  }
}

// PUT /api/staff/employees/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required', data: null } as StaffServiceResponse<null>,
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

    const payload: Partial<CreateEmployeeRequest> = {};
    if (body.full_name !== undefined) payload.full_name = body.full_name;
    if (body.phone !== undefined) payload.phone = body.phone;
    if (body.email !== undefined) payload.email = body.email;
    if (body.role !== undefined) payload.role = body.role;
    if (body.shift_type !== undefined) payload.shift_type = body.shift_type;
    if (body.bi_weekly_salary !== undefined) payload.bi_weekly_salary = body.bi_weekly_salary;
    if (body.monthly_salary !== undefined) payload.monthly_salary = body.monthly_salary;
    if (body.salary_payment_day_1 !== undefined) payload.salary_payment_day_1 = body.salary_payment_day_1;
    if (body.salary_payment_day_2 !== undefined) payload.salary_payment_day_2 = body.salary_payment_day_2;
    if (body.bank_reference !== undefined) payload.bank_reference = body.bank_reference;
    if (body.bank_name !== undefined) payload.bank_name = body.bank_name;
    if (body.bank_account_number !== undefined) payload.bank_account_number = body.bank_account_number;
    if (body.bank_branch_code !== undefined) payload.bank_branch_code = body.bank_branch_code;
    if (body.account_type !== undefined) payload.account_type = body.account_type;
    if (body.id_number !== undefined) payload.id_number = body.id_number;
    if (body.id_document_url !== undefined) payload.id_document_url = body.id_document_url;
    if (body.status !== undefined) payload.status = body.status;

    const result = await updateEmployee(id, payload);

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
    console.error('PUT /api/staff/employees/[id] error:', error);
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

// DELETE /api/staff/employees/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const result = await deleteEmployee(id);

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
    console.error('DELETE /api/staff/employees/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      { status: 500 }
    );
  }
}
