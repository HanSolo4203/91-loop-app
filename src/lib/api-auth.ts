import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/clocking';

type AdminAuthSuccess = { userId: string };

function unauthorized(status: 401 | 403, error: 'Unauthorized' | 'Forbidden') {
  return NextResponse.json(
    { success: false, error, data: null },
    { status }
  );
}

/**
 * Require an authenticated admin for an API route.
 * Returns `{ userId }` or a 401/403 JSON response.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AdminAuthSuccess | NextResponse> {
  const { userId, isAdmin } = await getCurrentUser(request);

  if (!userId) {
    return unauthorized(401, 'Unauthorized');
  }

  if (!isAdmin) {
    return unauthorized(403, 'Forbidden');
  }

  return { userId };
}

export function isAuthError(
  result: AdminAuthSuccess | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
