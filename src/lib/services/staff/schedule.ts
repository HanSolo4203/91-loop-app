import { supabaseAdmin } from '@/lib/supabase';

export interface StaffServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface ScheduleShift {
  day_of_week: number;
  shift_type: 'day' | 'night';
  employee_id: string;
}

export interface ScheduleAbsence {
  employee_id: string;
  absence_date: string;
  shift_type: 'day' | 'night';
}

export interface WeekSchedule {
  week: string;
  isDefault: boolean;
  shifts: ScheduleShift[];
  absences: ScheduleAbsence[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail<T>(error: string): StaffServiceResponse<T> {
  return { data: null, error, success: false };
}

/** Calendar Monday (YYYY-MM-DD) for the week that contains `week`. */
export function normalizeWeekStart(week: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    throw new Error('Invalid week format. Use YYYY-MM-DD.');
  }
  const [year, month, day] = week.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Invalid week format. Use YYYY-MM-DD.');
  }
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function shiftKey(shift: ScheduleShift): string {
  return `${shift.day_of_week}:${shift.shift_type}:${shift.employee_id}`;
}

function dedupeShifts(shifts: ScheduleShift[]): ScheduleShift[] {
  const seen = new Set<string>();
  const unique: ScheduleShift[] = [];
  for (const shift of shifts) {
    const key = shiftKey(shift);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(shift);
  }
  return unique;
}

function toShift(row: {
  day_of_week: number;
  shift_type: string;
  employee_id: string;
}): ScheduleShift | null {
  if (!Number.isInteger(row.day_of_week) || row.day_of_week < 0 || row.day_of_week > 6) return null;
  if (row.shift_type !== 'day' && row.shift_type !== 'night') return null;
  if (!row.employee_id) return null;
  return {
    day_of_week: row.day_of_week,
    shift_type: row.shift_type,
    employee_id: row.employee_id,
  };
}

function toAbsence(row: {
  employee_id: string;
  absence_date: string;
  shift_type: string;
}): ScheduleAbsence | null {
  if (row.shift_type !== 'day' && row.shift_type !== 'night') return null;
  if (!row.employee_id || !row.absence_date) return null;
  return {
    employee_id: row.employee_id,
    absence_date: row.absence_date.slice(0, 10),
    shift_type: row.shift_type,
  };
}

export function parseScheduleShifts(
  input: unknown
): { ok: true; shifts: ScheduleShift[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: 'shifts must be an array' };
  }

  const shifts: ScheduleShift[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Each shift must include day_of_week, shift_type, and employee_id' };
    }
    const row = item as Record<string, unknown>;
    const day = row.day_of_week;
    const shiftType = row.shift_type;
    const employeeId = row.employee_id;

    if (typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6) {
      return { ok: false, error: 'day_of_week must be an integer from 0 (Monday) to 6 (Sunday)' };
    }
    if (shiftType !== 'day' && shiftType !== 'night') {
      return { ok: false, error: 'shift_type must be day or night' };
    }
    if (typeof employeeId !== 'string' || !UUID_REGEX.test(employeeId)) {
      return { ok: false, error: 'employee_id must be a valid id' };
    }

    shifts.push({ day_of_week: day, shift_type: shiftType, employee_id: employeeId });
  }

  return { ok: true, shifts: dedupeShifts(shifts) };
}

export async function getScheduleForWeek(week: string): Promise<StaffServiceResponse<WeekSchedule>> {
  try {
    const monday = normalizeWeekStart(week);
    const sunday = addDays(monday, 6);

    const [weekRows, defaultRows, absenceRows] = await Promise.all([
      supabaseAdmin
        .from('shift_schedule')
        .select('day_of_week, shift_type, employee_id')
        .eq('is_default', false)
        .eq('week_start_date', monday),
      supabaseAdmin
        .from('shift_schedule')
        .select('day_of_week, shift_type, employee_id')
        .eq('is_default', true)
        .is('week_start_date', null),
      supabaseAdmin
        .from('absences')
        .select('employee_id, absence_date, shift_type')
        .gte('absence_date', monday)
        .lte('absence_date', sunday),
    ]);

    if (weekRows.error) return fail(weekRows.error.message);
    if (absenceRows.error) return fail(absenceRows.error.message);

    const hasWeek = (weekRows.data ?? []).length > 0;
    if (!hasWeek && defaultRows.error) return fail(defaultRows.error.message);

    const source = hasWeek ? weekRows.data : defaultRows.data;
    const shifts = dedupeShifts(
      (source ?? [])
        .map((row) => toShift(row))
        .filter((row): row is ScheduleShift => row !== null)
    );
    const absences = (absenceRows.data ?? [])
      .map((row) => toAbsence(row))
      .filter((row): row is ScheduleAbsence => row !== null);

    return {
      data: {
        week: monday,
        isDefault: !hasWeek,
        shifts,
        absences,
      },
      error: null,
      success: true,
    };
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Unknown error');
  }
}

async function replaceWeekShifts(
  monday: string,
  shifts: ScheduleShift[]
): Promise<StaffServiceResponse<WeekSchedule>> {
  const { error: deleteError } = await supabaseAdmin
    .from('shift_schedule')
    .delete()
    .eq('is_default', false)
    .eq('week_start_date', monday);

  if (deleteError) return fail(deleteError.message);

  if (shifts.length > 0) {
    const { error: insertError } = await supabaseAdmin.from('shift_schedule').insert(
      shifts.map((shift) => ({
        employee_id: shift.employee_id,
        day_of_week: shift.day_of_week,
        shift_type: shift.shift_type,
        is_default: false,
        week_start_date: monday,
      }))
    );
    if (insertError) return fail(insertError.message);
  }

  return getScheduleForWeek(monday);
}

export async function saveWeekSchedule(
  week: string,
  shifts: ScheduleShift[]
): Promise<StaffServiceResponse<WeekSchedule>> {
  try {
    const monday = normalizeWeekStart(week);
    return await replaceWeekShifts(monday, dedupeShifts(shifts));
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Unknown error');
  }
}

export async function copyWeekSchedule(
  fromWeek: string,
  toWeek: string
): Promise<StaffServiceResponse<WeekSchedule>> {
  try {
    const source = await getScheduleForWeek(fromWeek);
    if (!source.success || !source.data) return fail(source.error || 'Failed to read the source week');
    const monday = normalizeWeekStart(toWeek);
    return await replaceWeekShifts(monday, source.data.shifts);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Unknown error');
  }
}
