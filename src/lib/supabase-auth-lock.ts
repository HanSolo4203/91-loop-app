import { navigatorLock, type LockFunc } from '@supabase/auth-js';

/** Max wait when another tab holds the auth lock (GoTrue passes -1 = infinite). */
const DEFAULT_MAX_LOCK_WAIT_MS = 5000;

/**
 * Wraps Supabase's navigator lock so multi-tab auth does not block indefinitely.
 * On timeout, runs the operation without the lock (same fallback as auth-js).
 */
export function createAuthLockWithTimeout(
  maxWaitMs = DEFAULT_MAX_LOCK_WAIT_MS
): LockFunc {
  return async (name, acquireTimeout, fn) => {
    const effectiveTimeout = acquireTimeout < 0 ? maxWaitMs : acquireTimeout;

    try {
      return await navigatorLock(name, effectiveTimeout, fn);
    } catch (error) {
      const isTimeout =
        error &&
        typeof error === 'object' &&
        'isAcquireTimeout' in error &&
        (error as { isAcquireTimeout: boolean }).isAcquireTimeout;

      if (isTimeout) {
        console.warn(
          `[auth] Lock "${name}" timed out after ${effectiveTimeout}ms; continuing without lock.`
        );
        return await fn();
      }
      throw error;
    }
  };
}
