/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import {
  getExpenseById,
  updateExpense,
  deleteExpense,
} from '@/lib/services/expenses';
import type {
  ExpenseServiceResponse,
  CreateExpenseRequest,
} from '@/lib/services/expenses';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expense ID is required',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }

    const result = await getExpenseById(id);

    if (!result.success) {
      const statusCode =
        result.error?.includes('not found') ? 404
        : result.error?.includes('Invalid') ? 400 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as ExpenseServiceResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/expenses/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as ExpenseServiceResponse<null>,
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expense ID is required',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Request body must be a valid JSON object',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }

    const updateData: Partial<CreateExpenseRequest> = {};
    if (body.category_id !== undefined) updateData.category_id = body.category_id;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.expense_date !== undefined) updateData.expense_date = body.expense_date;
    if (body.period_month !== undefined) updateData.period_month = body.period_month;
    if (body.period_year !== undefined) updateData.period_year = body.period_year;
    if (body.is_recurring !== undefined) updateData.is_recurring = body.is_recurring;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.receipt_url !== undefined) updateData.receipt_url = body.receipt_url;

    const result = await updateExpense(id, updateData);

    if (!result.success) {
      const statusCode =
        result.error?.includes('not found') ? 404
        : result.error?.includes('Validation') ? 400 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as ExpenseServiceResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT /api/expenses/[id] error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as ExpenseServiceResponse<null>,
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expense ID is required',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }

    const result = await deleteExpense(id);

    if (!result.success) {
      const statusCode =
        result.error?.includes('not found') ? 404
        : result.error?.includes('Invalid') ? 400 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: null,
      } as ExpenseServiceResponse<null>,
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as ExpenseServiceResponse<null>,
      { status: 500 }
    );
  }
}
