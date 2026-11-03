import { NextRequest } from 'next/server';
import { isAuthError, requireAdmin } from '@/lib/api-auth';
import {
  inventoryError,
  inventoryResult,
  parseBody,
  parseId,
} from '@/lib/api/inventory-route';
import { deleteOrArchiveProduct, updateProduct } from '@/lib/services/inventory';
import { UpdateChemicalProductSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id: rawId } = await params;
    const idResult = parseId(rawId, 'Product ID');
    if (idResult.response) return idResult.response;

    const parsed = await parseBody(
      request,
      UpdateChemicalProductSchema,
      'PATCH /api/inventory/products/[id] error:'
    );
    if (parsed.response) return parsed.response;

    const result = await updateProduct(idResult.id, parsed.data);
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'PATCH /api/inventory/products/[id] error:');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id: rawId } = await params;
    const idResult = parseId(rawId, 'Product ID');
    if (idResult.response) return idResult.response;

    const result = await deleteOrArchiveProduct(idResult.id);
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'DELETE /api/inventory/products/[id] error:');
  }
}
