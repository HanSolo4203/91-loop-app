import { navigatorLock, type LockFunc } from '@supabase/auth-js';

/**
 * Pass Supabase lock timeouts through unchanged.
 *
 * GoTrue uses acquireTimeout 0 for the auto-refresh tick: if the lock is
 * busy, that tick must be skipped. acquireTimeout -1 means wait until the
 * lock is free. Running the callback without the lock races refresh-token
 * rotation and surfaces "Invalid Refresh Token: Refresh Token Not Found",
 * and aborting a -1 wait can leave navigator.locks.request pending so
 * getSession never settles.
 */
export function createAuthLockWithTimeout(): LockFunc {
  return (name, acquireTimeout, fn) => navigatorLock(name, acquireTimeout, fn);
}
