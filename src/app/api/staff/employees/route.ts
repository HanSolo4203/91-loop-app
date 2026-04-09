/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees, createEmployee } from '@/lib/services/staff/employees';
import type { StaffServiceResponse, CreateEmployeeRequest } from '@/lib/services/staff/employees';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

export const revalidate = 300;

// GET /api/staff/employees
export async function GET() {
  try {
    const result = await getAllEmployees();

    if (!result.success) {
      return cachedJsonResponse(
        { success: false, error: result.error, data: null } as StaffServiceResponse<null>,
        'noCache',
        500
      );
    }

    return cachedJsonResponse(
      { success: true, error: null, data: result.data } as StaffServiceResponse<any>,
      'semiStatic'
    );
  } catch (error) {
    console.error('GET /api/staff/employees error:', error);
    return cachedJsonResponse(
      { success: false, error: 'Internal server error', data: null } as StaffServiceResponse<null>,
      'noCache',
      500
    );
  }
}

// POST /api/staff/employees
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    if (!body.full_name || typeof body.full_name !== 'string' || body.full_name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'full_name is required', data: null } as StaffServiceResponse<null>,
        { status: 400 }
      );
    }

    const payload: CreateEmployeeRequest = {
      full_name: body.full_name,
      phone: body.phone,
      email: body.email,
      role: body.role,
      shift_type: body.shift_type ?? 'both',
      bi_weekly_salary: body.bi_weekly_salary,
      monthly_salary: body.monthly_salary,
      salary_payment_day_1: body.salary_payment_day_1,
      salary_payment_day_2: body.salary_payment_day_2,
      bank_reference: body.bank_reference,
      bank_name: body.bank_name,
      bank_account_number: body.bank_account_number,
      bank_branch_code: body.bank_branch_code,
      account_type: body.account_type,
      id_number: body.id_number,
      id_document_url: body.id_document_url,
      status: body.status ?? 'active',
    };

    const result = await createEmployee(payload);

    if (!result.success) {
      const statusCode = result.error?.includes('Validation') ? 400 : 500;
      return NextResponse.json(
        { success: false, error: result.error, data: null } as StaffServiceResponse<null>,
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { success: true, error: null, data: result.data } as StaffServiceResponse<any>,
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/staff/employees error:', error);
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
