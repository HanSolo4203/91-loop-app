/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase';
import type { Employee, ShiftSchedule } from '@/types/database';
import type { DayRoster } from '@/types/database';

export interface StaffServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

const MONDAY = 1; // ISO weekday: 1 = Monday, 7 = Sunday
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseWeekStart(week: string): Date {
  const d = new Date(week + 'T00:00:00Z');
  if (isNaN(d.getTime())) {
    throw new Error('Invalid week format. Use YYYY-MM-DD.');
  }
  // Adjust to Monday
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getScheduleForWeek(week: string): Promise<StaffServiceResponse<DayRoster[]>> {
  try {
    const weekStart = parseWeekStart(week);

    const [defaultSchedule, absences, employeesList] = await Promise.all([
      supabaseAdmin
        .from('shift_schedule')
        .select('*')
        .eq('is_default', true)
        .is('week_start_date', null),
      supabaseAdmin
        .from('absences')
        .select('*')
        .gte('absence_date', formatDate(weekStart))
        .lte('absence_date', formatDate(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))),
      supabaseAdmin.from('employees').select('*').eq('status', 'active'),
    ]);

    const employeesMap = new Map<string, Employee>();
    (employeesList.data || []).forEach((e) => employeesMap.set(e.id, e));

    const absenceSet = new Set<string>();
    (absences.data || []).forEach((a: { employee_id: string; absence_date: string; shift_type: string }) => {
      absenceSet.add(`${a.employee_id}-${a.absence_date}-${a.shift_type}`);
    });

    const defaultByDay: Record<number, { day: string[]; night: string[] }> = {
      0: { day: [], night: [] },
      1: { day: [], night: [] },
      2: { day: [], night: [] },
      3: { day: [], night: [] },
      4: { day: [], night: [] },
      5: { day: [], night: [] },
      6: { day: [], night: [] },
    };

    (defaultSchedule.data || []).forEach((s: ShiftSchedule) => {
      const key = s.shift_type as 'day' | 'night';
      if (!defaultByDay[s.day_of_week][key].includes(s.employee_id)) {
        defaultByDay[s.day_of_week][key].push(s.employee_id);
      }
    });

    const roster: DayRoster[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = formatDate(d);

      const dayIds = defaultByDay[i].day.filter(
        (id) => !absenceSet.has(`${id}-${dateStr}-day`)
      );
      const nightIds = defaultByDay[i].night.filter(
        (id) => !absenceSet.has(`${id}-${dateStr}-night`)
      );

      roster.push({
        dayOfWeek: i,
        date: dateStr,
        day: dayIds.map((id) => employeesMap.get(id)!).filter(Boolean),
        night: nightIds.map((id) => employeesMap.get(id)!).filter(Boolean),
      });
    }

    return { data: roster, error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      success: false,
    };
  }
}

export interface SeedScheduleItem {
  employeeName: string;
  shiftType: 'day' | 'night';
  daysOfWeek: number[]; // 0=Mon, 6=Sun
}

const DEFAULT_SCHEDULE: SeedScheduleItem[] = [
  { employeeName: 'Jacque', shiftType: 'day', daysOfWeek: [0, 1, 2, 3, 4] },
  { employeeName: 'Wowo', shiftType: 'day', daysOfWeek: [5, 6] },
  { employeeName: 'Noms', shiftType: 'night', daysOfWeek: [0, 1, 4, 5, 6] },
  { employeeName: 'Minenhle', shiftType: 'night', daysOfWeek: [0, 1, 2, 3, 4] },
  { employeeName: 'Mandisa', shiftType: 'night', daysOfWeek: [2, 3, 4, 5, 6] },
];

export async function seedDefaultSchedule(): Promise<StaffServiceResponse<ShiftSchedule[]>> {
  try {
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, full_name')
      .eq('status', 'active');

    const byName = new Map<string, string>();
    (employees || []).forEach((e: { id: string; full_name: string }) => {
      byName.set(e.full_name.trim().toLowerCase(), e.id);
    });

    const inserts: { employee_id: string; day_of_week: number; shift_type: 'day' | 'night'; is_default: boolean }[] = [];

    for (const item of DEFAULT_SCHEDULE) {
      const id = byName.get(item.employeeName.toLowerCase());
      if (!id) continue;

      for (const dayOfWeek of item.daysOfWeek) {
        inserts.push({
          employee_id: id,
          day_of_week: dayOfWeek,
          shift_type: item.shiftType,
          is_default: true,
        });
      }
    }

    const { data: existing } = await supabaseAdmin
      .from('shift_schedule')
      .select('*')
      .eq('is_default', true);

    if (existing && existing.length > 0) {
      return {
        data: existing as ShiftSchedule[],
        error: null,
        success: true,
      };
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('shift_schedule')
      .insert(inserts)
      .select();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data || [], error: null, success: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      success: false,
    };
  }
}
