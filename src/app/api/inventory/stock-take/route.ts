import { NextRequest } from 'next/server';
import { isAuthError, requireAdmin } from '@/lib/api-auth';
import { inventoryError, inventoryResult, parseBody } from '@/lib/api/inventory-route';
import { recordStockTake } from '@/lib/services/inventory';
import { RecordStockTakeSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const parsed = await parseBody(
      request,
      RecordStockTakeSchema,
      'POST /api/inventory/stock-take error:'
    );
    if (parsed.response) return parsed.response;

    const result = await recordStockTake({
      ...parsed.data,
      created_by: auth.userId,
    });
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'POST /api/inventory/stock-take error:');
  }
}
