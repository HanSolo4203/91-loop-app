/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceSummaryByMonth } from '@/lib/services/analytics';
import type { AnalyticsServiceResponse } from '@/lib/services/analytics';

// GET /api/dashboard/reports?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // YYYY-MM

    let targetYear: number;
    let targetMonth: number;

    if (monthParam) {
      const parts = monthParam.split('-');
      if (parts.length !== 2) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid month format. Use YYYY-MM',
            data: null,
          } as AnalyticsServiceResponse<null>,
          { status: 400 }
        );
      }
      targetYear = parseInt(parts[0], 10);
      targetMonth = parseInt(parts[1], 10);
      if (isNaN(targetYear) || isNaN(targetMonth)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid month format. Use YYYY-MM',
            data: null,
          } as AnalyticsServiceResponse<null>,
          { status: 400 }
        );
      }
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    const result = await getInvoiceSummaryByMonth(targetYear, targetMonth);
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

    return NextResponse.json(
      {
        success: true,
        error: null,
        data: result.data,
      } as AnalyticsServiceResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/dashboard/reports error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      } as AnalyticsServiceResponse<null>,
      { status: 500 }
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


