import { NextRequest } from 'next/server';
import { isAuthError, requireAdmin } from '@/lib/api-auth';
import {
  inventoryError,
  inventoryResult,
  parseBody,
  parseQuery,
} from '@/lib/api/inventory-route';
import { listMovements, recordDelivery } from '@/lib/services/inventory';
import { DeliveryListQuerySchema, RecordDeliverySchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const parsed = parseQuery(
      new URL(request.url).searchParams,
      ['product_id', 'from', 'to'],
      DeliveryListQuerySchema
    );
    if (parsed.response) return parsed.response;

    const result = await listMovements({
      product_id: parsed.data.product_id,
      from: parsed.data.from,
      to: parsed.data.to,
      type: 'delivery',
    });
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'GET /api/inventory/deliveries error:');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const parsed = await parseBody(
      request,
      RecordDeliverySchema,
      'POST /api/inventory/deliveries error:'
    );
    if (parsed.response) return parsed.response;

    const result = await recordDelivery({
      ...parsed.data,
      created_by: auth.userId,
    });
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'POST /api/inventory/deliveries error:');
  }
}
