import { NextRequest } from 'next/server';
import { isAuthError, requireAdmin } from '@/lib/api-auth';
import { inventoryError, inventoryResult, parseId } from '@/lib/api/inventory-route';
import { restoreProduct } from '@/lib/services/inventory';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id: rawId } = await params;
    const idResult = parseId(rawId, 'Product ID');
    if (idResult.response) return idResult.response;

    const result = await restoreProduct(idResult.id);
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'POST /api/inventory/products/[id]/restore error:');
  }
}
