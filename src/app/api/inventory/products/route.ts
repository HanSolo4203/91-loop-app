import { NextRequest } from 'next/server';
import { isAuthError, requireAdmin } from '@/lib/api-auth';
import { inventoryError, inventoryResult, parseBody } from '@/lib/api/inventory-route';
import { createProduct, getStockLevels } from '@/lib/services/inventory';
import { CreateChemicalProductSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const includeArchived = new URL(request.url).searchParams.get('includeArchived');
    const result = await getStockLevels({
      includeArchived: includeArchived === '1',
    });
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'GET /api/inventory/products error:');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const parsed = await parseBody(
      request,
      CreateChemicalProductSchema,
      'POST /api/inventory/products error:'
    );
    if (parsed.response) return parsed.response;

    const result = await createProduct(parsed.data, auth.userId);
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'POST /api/inventory/products error:');
  }
}
