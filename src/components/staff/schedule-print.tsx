import { SHIFTS } from '@/lib/shift-constants';
import type { ScheduleShift } from '@/lib/services/staff/schedule';
import type { Employee } from '@/types/database';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

type CellKind = 'day' | 'night' | 'both' | 'none';

interface PrintRow {
  id: string;
  name: string;
  cells: CellKind[];
  total: number;
}

interface SchedulePrintProps {
  weekStart: string;
  shifts: ScheduleShift[];
  employees: Employee[];
}

function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatWeekRange(weekStart: string): string {
  const start = parseISODate(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

function formatColumnDate(date: Date, spansMonth: boolean): string {
  if (!spansMonth) return String(date.getDate());
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function buildRows(shifts: ScheduleShift[], employees: Employee[]): PrintRow[] {
  const names = new Map(employees.map((employee) => [employee.id, employee.full_name]));
  const byEmployee = new Map<string, { day: Set<number>; night: Set<number> }>();

  for (const shift of shifts) {
    if (shift.day_of_week < 0 || shift.day_of_week > 6) continue;
    let entry = byEmployee.get(shift.employee_id);
    if (!entry) {
      entry = { day: new Set(), night: new Set() };
      byEmployee.set(shift.employee_id, entry);
    }
    entry[shift.shift_type].add(shift.day_of_week);
  }

  return [...byEmployee.entries()]
    .map(([id, entry]) => {
      const cells: CellKind[] = DAY_NAMES.map((_, day) => {
        const hasDay = entry.day.has(day);
        const hasNight = entry.night.has(day);
        if (hasDay && hasNight) return 'both';
        if (hasDay) return 'day';
        if (hasNight) return 'night';
        return 'none';
      });
      return {
        id,
        name: names.get(id) || 'Unknown',
        cells,
        total: entry.day.size + entry.night.size,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

function ShiftMarks({ kind }: { kind: CellKind }) {
  if (kind === 'none') return null;
  if (kind === 'both') {
    return (
      <span className="schedule-print-marks">
        <span>Day</span>
        <span>Night</span>
      </span>
    );
  }
  return <span className="schedule-print-marks">{kind === 'day' ? 'Day' : 'Night'}</span>;
}

export default function SchedulePrint({ weekStart, shifts, employees }: SchedulePrintProps) {
  const start = parseISODate(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const spansMonth = start.getMonth() !== end.getMonth() || start.getFullYear() !== end.getFullYear();
  const days = DAY_NAMES.map((name, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    return { name, dateLabel: formatColumnDate(date, spansMonth) };
  });
  const rows = buildRows(shifts, employees);

  return (
    <section className="schedule-print-sheet" aria-label="Printable staff schedule">
      <h1 className="schedule-print-heading">RSL Express — Staff Schedule</h1>
      <p className="schedule-print-week">{formatWeekRange(weekStart)}</p>
      <p className="schedule-print-times">
        {SHIFTS.day.label} {SHIFTS.day.hours}
        {' · '}
        {SHIFTS.night.label} {SHIFTS.night.hours}
      </p>
      {rows.length === 0 ? (
        <p className="schedule-print-empty">No shifts scheduled this week.</p>
      ) : (
        <table>
          <colgroup>
            <col className="schedule-print-name" />
            {days.map((day) => (
              <col key={day.name} />
            ))}
            <col className="schedule-print-total" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="schedule-print-name">
                Employee
              </th>
              {days.map((day) => (
                <th key={day.name} scope="col">
                  <span className="schedule-print-day">{day.name}</span>
                  <span className="schedule-print-date">{day.dateLabel}</span>
                </th>
              ))}
              <th scope="col" className="schedule-print-total">
                Shifts
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className="schedule-print-name">
                  {row.name}
                </th>
                {row.cells.map((kind, index) => (
                  <td key={days[index].name} className={kind === 'none' ? undefined : `is-${kind}`}>
                    <ShiftMarks kind={kind} />
                  </td>
                ))}
                <td className="schedule-print-total">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
