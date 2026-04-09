/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import {
  getExpenseCategories,
  createExpenseCategory,
} from '@/lib/services/expenses';
import type {
  ExpenseServiceResponse,
  CreateExpenseCategoryRequest,
} from '@/lib/services/expenses';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

export const revalidate = 300;

export async function GET() {
  try {
    const result = await getExpenseCategories();

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
    console.error('GET /api/expenses/categories error:', error);
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
          error: 'Category name is required',
          data: null,
        } as ExpenseServiceResponse<null>,
        { status: 400 }
      );
    }

    const createData: CreateExpenseCategoryRequest = {
      name: body.name.trim(),
      icon: body.icon || undefined,
      is_fixed: body.is_fixed ?? false,
    };

    const result = await createExpenseCategory(createData);

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
    console.error('POST /api/expenses/categories error:', error);
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
