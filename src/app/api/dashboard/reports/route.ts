/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceSummaryByMonth, getInvoiceSummaryByYear } from '@/lib/services/analytics';
import type { AnalyticsServiceResponse } from '@/lib/services/analytics';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

// GET /api/dashboard/reports?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // YYYY-MM

    let targetYear: number;
    let targetMonth: number | null = null;
    let isAllMonths = false;

    if (monthParam) {
      const parts = monthParam.split('-');
      if (parts.length !== 2) {
        return cachedJsonResponse(
          {
            success: false,
            error: 'Invalid month format. Use YYYY-MM',
            data: null,
          } as AnalyticsServiceResponse<null>,
          'noCache',
          400
        );
      }
      targetYear = parseInt(parts[0], 10);
      const monthPart = parts[1].toLowerCase();
      if (monthPart === 'all') {
        isAllMonths = true;
      } else {
        targetMonth = parseInt(monthPart, 10);
      }
      if (isNaN(targetYear) || (!isAllMonths && (targetMonth === null || isNaN(targetMonth)))) {
        return cachedJsonResponse(
          {
            success: false,
            error: 'Invalid month format. Use YYYY-MM',
            data: null,
          } as AnalyticsServiceResponse<null>,
          'noCache',
          400
        );
      }
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    const result = isAllMonths
      ? await getInvoiceSummaryByYear(targetYear)
      : await getInvoiceSummaryByMonth(targetYear, targetMonth as number);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: null,
        } as AnalyticsServiceResponse<null>,
        { status: 500 }
      );
    }

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: result.data,
      } as AnalyticsServiceResponse<any>,
      'dynamic' // Reports change frequently
    );
  } catch (error) {
    console.error('GET /api/dashboard/reports error:', error);
    return cachedJsonResponse(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as AnalyticsServiceResponse<null>,
      'noCache',
      500
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use GET to retrieve reports.',
      data: null,
    } as AnalyticsServiceResponse<null>,
    { status: 405 }
  );
}


