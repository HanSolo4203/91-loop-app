import { supabase } from '@/lib/supabase';

/** True when Supabase cannot refresh because local storage has a broken session. */
export function isRefreshTokenError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : '';
  return message.toLowerCase().includes('refresh token');
}

let clearingStaleSession = false;

/** Clears invalid auth state from local storage (idempotent). */
export async function clearStaleAuthSession(): Promise<void> {
  if (clearingStaleSession) return;
  clearingStaleSession = true;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore — storage may already be empty
  } finally {
    clearingStaleSession = false;
  }
}
