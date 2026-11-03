import { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { cachedJsonResponse } from '@/lib/utils/api-cache';
import { validateSchemaSafe, BaseIdSchema } from '@/lib/validation/schemas';
import type { InventoryServiceResponse } from '@/lib/services/inventory';

export function inventoryResult<T>(
  result: InventoryServiceResponse<T>,
  successStatus?: number
) {
  const status = result.success
    ? (successStatus ?? result.statusCode ?? 200)
    : (result.statusCode ?? 500);

  return cachedJsonResponse(
    {
      success: result.success,
      error: result.error,
      data: result.success ? result.data : null,
    },
    'noCache',
    status
  );
}

export function inventoryError(error: unknown, logLabel: string) {
  console.error(logLabel, error);
  if (error instanceof SyntaxError) {
    return cachedJsonResponse(
      { success: false, error: 'Invalid JSON in request body', data: null },
      'noCache',
      400
    );
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return cachedJsonResponse(
    {
      success: false,
      error: process.env.NODE_ENV === 'development' ? message : 'Internal server error',
      data: null,
    },
    'noCache',
    500
  );
}

function validationError(message: string) {
  return cachedJsonResponse(
    { success: false, error: message, data: null },
    'noCache',
    400
  );
}

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodType<T>,
  logLabel: string
): Promise<{ data: T; response?: undefined } | { data?: undefined; response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return { response: inventoryError(error, logLabel) };
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { response: validationError('Request body must be a valid JSON object') };
  }

  const parsed = validateSchemaSafe(schema, body);
  if (!parsed.success || parsed.data === undefined) {
    return { response: validationError(parsed.error || 'Validation failed') };
  }
  return { data: parsed.data };
}

export function parseQuery<T>(
  searchParams: URLSearchParams,
  keys: readonly string[],
  schema: ZodType<T>
): { data: T; response?: undefined } | { data?: undefined; response: NextResponse } {
  const raw: Record<string, string> = {};
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null && value.trim() !== '') {
      raw[key] = value.trim();
    }
  }
  const parsed = validateSchemaSafe(schema, raw);
  if (!parsed.success || parsed.data === undefined) {
    return { response: validationError(parsed.error || 'Invalid query parameters') };
  }
  return { data: parsed.data };
}

export function parseId(
  id: string | undefined,
  label = 'ID'
): { id: string; response?: undefined } | { id?: undefined; response: NextResponse } {
  if (!id) {
    return { response: validationError(`${label} is required`) };
  }
  const parsed = validateSchemaSafe(BaseIdSchema, id);
  if (!parsed.success || !parsed.data) {
    return { response: validationError(parsed.error || `Invalid ${label} format`) };
  }
  return { id: parsed.data };
}
