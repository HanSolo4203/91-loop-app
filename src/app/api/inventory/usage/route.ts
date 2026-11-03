import { NextRequest } from 'next/server';
import { isAuthError, requireAdmin } from '@/lib/api-auth';
import { inventoryError, inventoryResult, parseQuery } from '@/lib/api/inventory-route';
import { getUsageByDay } from '@/lib/services/inventory';
import { UsageQuerySchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const parsed = parseQuery(
      new URL(request.url).searchParams,
      ['from', 'to'],
      UsageQuerySchema
    );
    if (parsed.response) return parsed.response;

    const result = await getUsageByDay(parsed.data);
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'GET /api/inventory/usage error:');
  }
}
