/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import {
  getExpenses,
  createExpense,
  getRecurringExpenses,
} from '@/lib/services/expenses';
import type {
  ExpenseServiceResponse,
  CreateExpenseRequest,
} from '@/lib/services/expenses';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const monthFromParam = searchParams.get('month_from');
    const monthToParam = searchParams.get('month_to');

    const recurringParam = searchParams.get('recurring');
    const filters: {
      month?: number;
      year?: number;
      month_from?: number;
      month_to?: number;
    } = {};
    if (yearParam) {
      const y = parseInt(yearParam, 10);
      if (!isNaN(y)) filters.year = y;
    }
    if (monthFromParam && monthToParam) {
      const mFrom = parseInt(monthFromParam, 10);
      const mTo = parseInt(monthToParam, 10);
      if (
        !isNaN(mFrom) &&
        !isNaN(mTo) &&
        mFrom >= 1 &&
        mFrom <= 12 &&
        mTo >= 1 &&
        mTo <= 12 &&
        mFrom <= mTo
      ) {
        filters.month_from = mFrom;
        filters.month_to = mTo;
      }
    } else if (monthParam) {
      const m = parseInt(monthParam, 10);
      if (!isNaN(m) && m >= 1 && m <= 12) filters.month = m;
    }

    const result = recurringParam === 'true'
      ? await getRecurringExpenses()
      : await getExpenses(filters);

    if (!result.success) {
      return cachedJsonResponse(
        {
          success: false,
          error: result.error,
          data: null,
        } as ExpenseServiceResponse<null>,
        'noCache',
        500
      );
    }

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: result.data,
      } as ExpenseServiceResponse<any>,
      'semiStatic'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/expenses error:', error);
    return cachedJsonResponse(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' ? message : 'Internal server error',
        data: null,
      } as ExpenseServiceResponse<null>,
      'noCache',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Description (name) is required',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }

    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amount is required',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }

    if (!body.category_id || typeof body.category_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Category is required',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }

    if (!body.expense_date || typeof body.expense_date !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Expense date is required',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }

    const date = new Date(body.expense_date);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid expense date format',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }

    const periodMonth = body.period_month ?? date.getMonth() + 1;
    const periodYear = body.period_year ?? date.getFullYear();

    const createData: CreateExpenseRequest = {
      category_id: body.category_id,
      name: body.name.trim(),
      amount: Number(body.amount),
      expense_date: body.expense_date,
      period_month: periodMonth,
      period_year: periodYear,
      is_recurring: body.is_recurring ?? false,
      notes: body.notes || undefined,
      receipt_url: body.receipt_url || undefined,
    };

    const result = await createExpense(createData);

    if (!result.success) {
      const statusCode = result.error?.includes('Validation') ? 400 : 500;
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
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/expenses error:', error);
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
