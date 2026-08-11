const SAST_TZ = 'Africa/Johannesburg';

/** YYYY-MM-DD for today in Africa/Johannesburg */
export function getSastDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatSastTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SAST_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function formatSastDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SAST_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function formatDurationMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}h ${m}m`;
}

/** Minutes since midnight in SAST for a given ISO timestamp */
export function getSastMinutesSinceMidnight(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SAST_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export function stripPinHash<T extends { pin_hash?: string | null }>(
  employee: T
): Omit<T, 'pin_hash'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pin_hash, ...rest } = employee;
  return rest;
}

export const SAST_TIMEZONE = SAST_TZ;
