import { NextRequest, NextResponse } from 'next/server';
import { getBusinessSettings, upsertBusinessSettings } from '@/lib/services/business-settings';
import type { BusinessSettingsPayload } from '@/lib/services/business-settings';

export async function GET() {
  const result = await getBusinessSettings();

  return NextResponse.json(
    {
      success: result.success,
      data: result.data,
      error: result.error,
    },
    { status: result.statusCode || (result.success ? 200 : 500) }
  );
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as BusinessSettingsPayload;

    const result = await upsertBusinessSettings(body);

    return NextResponse.json(
      {
        success: result.success,
        data: result.data,
        error: result.error,
      },
      { status: result.statusCode || (result.success ? 200 : 500) }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Invalid JSON payload',
      },
      { status: 400 }
    );
  }
}

