export const SHIFTS = {
  day: {
    label: 'Day Shift',
    hours: '09:00 – 17:00',
    start: { hour: 9, minute: 0 },
    end: { hour: 17, minute: 0 },
    duration_minutes: 480,
    is_overnight: false,
  },
  night: {
    label: 'Night Shift',
    hours: '17:00 – 05:00',
    start: { hour: 17, minute: 0 },
    end: { hour: 5, minute: 0 },
    duration_minutes: 720,
    is_overnight: true,
  },
} as const;

export type ShiftType = keyof typeof SHIFTS;

export function calculateShiftMinutes(
  clockedInAt: Date,
  clockedOutAt: Date,
  shiftType: ShiftType,
  timezone = 'Africa/Johannesburg'
): { regular_minutes: number; overtime_minutes: number; total_minutes: number } {
  const shift = SHIFTS[shiftType];

  const inSast = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(clockedInAt);

  const [year, month, day] = inSast.split('-').map(Number);

  // Build shift start/end in UTC (SAST = UTC+2)
  const shiftStart = new Date(
    Date.UTC(year, month - 1, day, shift.start.hour - 2, shift.start.minute)
  );
  const endDayOffset = shift.is_overnight ? 1 : 0;
  const shiftEnd = new Date(
    Date.UTC(year, month - 1, day + endDayOffset, shift.end.hour - 2, shift.end.minute)
  );

  const total_minutes = Math.max(
    0,
    Math.round((clockedOutAt.getTime() - clockedInAt.getTime()) / 60000)
  );

  const effectiveStart = clockedInAt < shiftStart ? shiftStart : clockedInAt;
  const effectiveEnd = clockedOutAt > shiftEnd ? shiftEnd : clockedOutAt;
  const regular_minutes = Math.max(
    0,
    Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / 60000)
  );

  const overtime_minutes =
    clockedOutAt > shiftEnd
      ? Math.round((clockedOutAt.getTime() - shiftEnd.getTime()) / 60000)
      : 0;

  return { regular_minutes, overtime_minutes, total_minutes };
}
