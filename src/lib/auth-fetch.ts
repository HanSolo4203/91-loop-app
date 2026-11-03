import { getAccessToken } from '@/lib/auth-session';

/**
 * Client-side fetch that attaches the current Supabase access token
 * as `Authorization: Bearer <token>`.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be logged in');
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? 'include',
  });
}
