/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { getClientBatchesByMonth, getClientBatchesByYear } from '@/lib/services/analytics';
import type { AnalyticsServiceResponse } from '@/lib/services/analytics';
import { cachedJsonResponse } from '@/lib/utils/api-cache';

// This route depends on request URL params; force dynamic rendering to avoid static optimization errors
export const dynamic = 'force-dynamic';

// Revalidate every 60 seconds
export const revalidate = 60;

// GET /api/dashboard/reports/client-batches?clientId=...&month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const monthParam = searchParams.get('month');

    if (!clientId) {
      return cachedJsonResponse(
        {
          success: false,
          error: 'clientId is required',
          data: null,
        } as AnalyticsServiceResponse<null>,
        'noCache',
        400
      );
    }

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
      ? await getClientBatchesByYear(clientId, targetYear)
      : await getClientBatchesByMonth(clientId, targetYear, targetMonth as number);
    if (!result.success) {
      return cachedJsonResponse(
        {
          success: false,
          error: result.error,
          data: null,
        } as AnalyticsServiceResponse<null>,
        'noCache',
        500
      );
    }

    return cachedJsonResponse(
      {
        success: true,
        error: null,
        data: result.data,
      } as AnalyticsServiceResponse<any>,
      'dynamic' // Client batches change frequently
    );
  } catch (error) {
    console.error('GET /api/dashboard/reports/client-batches error:', error);
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


