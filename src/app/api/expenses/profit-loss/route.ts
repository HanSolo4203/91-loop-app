/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getProfitLoss } from '@/lib/services/expenses';
import type { ExpenseServiceResponse } from '@/lib/services/expenses';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthsParam = searchParams.get('months');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const monthFromParam = searchParams.get('month_from');
    const monthToParam = searchParams.get('month_to');

    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    const monthFrom = monthFromParam ? parseInt(monthFromParam, 10) : undefined;
    const monthTo = monthToParam ? parseInt(monthToParam, 10) : undefined;

    if (year != null && month != null) {
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return cachedJsonResponse(
          {
            success: false,
            error: 'Invalid year or month.',
            data: null,
          } as ExpenseServiceResponse<null>,
          'noCache',
          400
        );
      }
      const result = await getProfitLoss({ year, month });
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
    }

    if (
      year != null &&
      monthFrom != null &&
      monthTo != null &&
      !isNaN(year) &&
      !isNaN(monthFrom) &&
      !isNaN(monthTo) &&
      monthFrom >= 1 &&
      monthFrom <= 12 &&
      monthTo >= 1 &&
      monthTo <= 12 &&
      monthFrom <= monthTo
    ) {
      const result = await getProfitLoss({
        year,
        month_from: monthFrom,
        month_to: monthTo,
      });
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
    }

    const months = monthsParam ? parseInt(monthsParam, 10) : 6;
    if (isNaN(months) || months < 1 || months > 24) {
      return cachedJsonResponse(
        {
          success: false,
          error: 'Invalid months. Must be 1-24.',
          data: null,
        } as ExpenseServiceResponse<null>,
        'noCache',
        400
      );
    }

    const result = await getProfitLoss(months);

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
    console.error('GET /api/expenses/profit-loss error:', error);
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
