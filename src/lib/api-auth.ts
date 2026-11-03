import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/clocking';

type AdminAuthSuccess = { userId: string };
type AdminCheck = { userId: string | null; isAdmin: boolean };

const ADMIN_CACHE_MS = 60_000;
const ADMIN_CACHE_KEY = '__ADMIN_AUTH_CACHE__';

type AdminCache = Map<string, { expiresAt: number; result: Promise<AdminCheck> }>;

const adminCheckCache: AdminCache =
  ((globalThis as Record<string, unknown>)[ADMIN_CACHE_KEY] as AdminCache | undefined) ??
  new Map();
(globalThis as Record<string, unknown>)[ADMIN_CACHE_KEY] = adminCheckCache;

function unauthorized(status: 401 | 403, error: 'Unauthorized' | 'Forbidden') {
  return NextResponse.json(
    { success: false, error, data: null },
    { status }
  );
}

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

function pruneAdminCache(now: number) {
  if (adminCheckCache.size < 32) return;
  for (const [token, entry] of adminCheckCache) {
    if (entry.expiresAt <= now) adminCheckCache.delete(token);
  }
}

function adminCheck(request: NextRequest): Promise<AdminCheck> {
  const token = bearerToken(request);
  if (!token) return getCurrentUser(request);

  const now = Date.now();
  pruneAdminCache(now);
  const cached = adminCheckCache.get(token);
  if (cached && cached.expiresAt > now) return cached.result;

  const result = getCurrentUser(request).then((check) => {
    if (!check.userId) adminCheckCache.delete(token);
    return check;
  });
  adminCheckCache.set(token, { expiresAt: now + ADMIN_CACHE_MS, result });
  return result;
}

/**
 * Require an authenticated admin for an API route.
 * Returns `{ userId }` or a 401/403 JSON response.
 * Bearer-token checks are reused for 60 seconds, including when several
 * requests on the same page start together.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AdminAuthSuccess | NextResponse> {
  const { userId, isAdmin } = await adminCheck(request);

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
