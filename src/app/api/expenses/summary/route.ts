/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyExpenseSummary } from '@/lib/services/expenses';
import type { ExpenseServiceResponse } from '@/lib/services/expenses';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    const now = new Date();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    if (isNaN(month) || month < 1 || month > 12) {
      return cachedJsonResponse(
        {
          success: false,
          error: 'Invalid month. Must be 1-12.',
          data: null,
        } as ExpenseServiceResponse<null>,
        'noCache',
        400
      );
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return cachedJsonResponse(
        {
          success: false,
          error: 'Invalid year.',
          data: null,
        } as ExpenseServiceResponse<null>,
        'noCache',
        400
      );
    }

    const result = await getMonthlyExpenseSummary(month, year);

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
      'dynamic'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/expenses/summary error:', error);
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
