/** Max time to show "Checking authentication..." before giving up. */
export const AUTH_CHECK_TIMEOUT_MS = 8000;

export function withAuthTimeout<T>(
  promise: Promise<T>,
  timeoutMs = AUTH_CHECK_TIMEOUT_MS,
  label = 'Auth check'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs
      );
    }),
  ]);
}
