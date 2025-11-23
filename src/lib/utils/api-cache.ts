import { NextResponse } from 'next/server';

/**
 * Cache control headers for different data types
 */
export const CACHE_HEADERS = {
  // Static data that rarely changes (categories, business settings)
  static: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // 1 hour cache, 24h stale
  },
  // Semi-static data that changes occasionally (clients, pricing)
  semiStatic: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600', // 5 min cache, 1h stale
  },
  // Dynamic data that changes frequently (batches, stats)
  dynamic: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // 1 min cache, 5min stale
  },
  // Real-time data that should not be cached
  noCache: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
} as const;

/**
 * Helper function to add cache headers to NextResponse
 */
export function withCacheHeaders(
  response: NextResponse,
  cacheType: keyof typeof CACHE_HEADERS = 'dynamic'
): NextResponse {
  const headers = CACHE_HEADERS[cacheType];
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Create a cached JSON response
 */
export function cachedJsonResponse<T>(
  data: T,
  cacheType: keyof typeof CACHE_HEADERS = 'dynamic',
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return withCacheHeaders(response, cacheType);
}

