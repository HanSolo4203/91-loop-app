import { NextRequest } from 'next/server';
import { isAuthError, requireAdmin } from '@/lib/api-auth';
import { inventoryError, inventoryResult, parseQuery } from '@/lib/api/inventory-route';
import { listMovements } from '@/lib/services/inventory';
import { MovementListQuerySchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const parsed = parseQuery(
      new URL(request.url).searchParams,
      ['product_id', 'from', 'to', 'type'],
      MovementListQuerySchema
    );
    if (parsed.response) return parsed.response;

    const result = await listMovements({
      product_id: parsed.data.product_id,
      from: parsed.data.from,
      to: parsed.data.to,
      type: parsed.data.type,
    });
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'GET /api/inventory/movements error:');
  }
}
