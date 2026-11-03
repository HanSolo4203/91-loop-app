import { NextRequest } from 'next/server';
import { isAuthError, requireAdmin } from '@/lib/api-auth';
import {
  inventoryError,
  inventoryResult,
  parseBody,
  parseId,
} from '@/lib/api/inventory-route';
import { adminDeleteWeighIn, adminUpdateWeighIn } from '@/lib/services/inventory';
import { AdminUpdateWeighInSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id: rawId } = await params;
    const idResult = parseId(rawId, 'Weigh-in ID');
    if (idResult.response) return idResult.response;

    const parsed = await parseBody(
      request,
      AdminUpdateWeighInSchema,
      'PATCH /api/inventory/weigh-ins/[id] error:'
    );
    if (parsed.response) return parsed.response;

    const result = await adminUpdateWeighIn(idResult.id, parsed.data, auth.userId);
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'PATCH /api/inventory/weigh-ins/[id] error:');
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
    const idResult = parseId(rawId, 'Weigh-in ID');
    if (idResult.response) return idResult.response;

    const result = await adminDeleteWeighIn(idResult.id);
    return inventoryResult(result);
  } catch (error) {
    return inventoryError(error, 'DELETE /api/inventory/weigh-ins/[id] error:');
  }
}
