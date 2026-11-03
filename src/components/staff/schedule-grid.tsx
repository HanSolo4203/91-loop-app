'use client';

import { Fragment, useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { UserMinus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ScheduleAbsence, ScheduleShift } from '@/lib/services/staff/schedule';
import type { Employee } from '@/types/database';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const SHIFT_ROWS = [
  { type: 'day' as const, label: 'Day shift' },
  { type: 'night' as const, label: 'Night shift' },
];

interface ScheduleGridProps {
  weekStart: string;
  shifts: ScheduleShift[];
  absences: ScheduleAbsence[];
  employees: Employee[];
  onShiftsChange: (shifts: ScheduleShift[]) => void;
  onMarkAbsent: (date: string, shiftType: 'day' | 'night', employee: Employee) => void;
}

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  });
}

function hasShift(
  shifts: ScheduleShift[],
  day: number,
  shiftType: 'day' | 'night',
  employeeId: string
): boolean {
  return shifts.some(
    (shift) =>
      shift.day_of_week === day && shift.shift_type === shiftType && shift.employee_id === employeeId
  );
}

function withoutShift(
  shifts: ScheduleShift[],
  day: number,
  shiftType: 'day' | 'night',
  employeeId: string
): ScheduleShift[] {
  return shifts.filter(
    (shift) =>
      !(
        shift.day_of_week === day &&
        shift.shift_type === shiftType &&
        shift.employee_id === employeeId
      )
  );
}

type DragSource =
  | { kind: 'pool'; employeeId: string }
  | { kind: 'placed'; day: number; shiftType: 'day' | 'night'; employeeId: string };

function parseDragId(id: string): DragSource | null {
  if (id.startsWith('pool:')) {
    const employeeId = id.slice('pool:'.length);
    return employeeId ? { kind: 'pool', employeeId } : null;
  }
  if (id.startsWith('placed:')) {
    const [, dayText, shiftType, employeeId] = id.split(':');
    const day = Number(dayText);
    if ((shiftType === 'day' || shiftType === 'night') && employeeId && Number.isInteger(day)) {
      return { kind: 'placed', day, shiftType, employeeId };
    }
  }
  return null;
}

function parseDropId(
  id: string
): { kind: 'pool' } | { kind: 'cell'; day: number; shiftType: 'day' | 'night' } | null {
  if (id === 'pool' || id.startsWith('pool:')) return { kind: 'pool' };
  if (id.startsWith('cell:')) {
    const [, dayText, shiftType] = id.split(':');
    const day = Number(dayText);
    if ((shiftType === 'day' || shiftType === 'night') && Number.isInteger(day)) {
      return { kind: 'cell', day, shiftType };
    }
  }
  return null;
}

function StaffChip({ employee, count }: { employee: Employee; count: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool:${employee.id}`,
  });

  return (
    <div ref={setNodeRef} className={cn(isDragging && 'opacity-40')}>
      <button
        type="button"
        className="w-full cursor-grab touch-none rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-900 shadow-sm active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        {employee.full_name}
      </button>
      <p className="mt-1 text-xs text-slate-500">
        {count} {count === 1 ? 'shift' : 'shifts'}
      </p>
    </div>
  );
}

function StaffPanel({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' });

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        'staff-panel w-full shrink-0 rounded-md border border-slate-200 bg-slate-50 p-3 lg:w-56',
        isOver && 'ring-2 ring-blue-400'
      )}
    >
      <h2 className="text-sm font-semibold text-slate-900">Staff</h2>
      <p className="mb-3 text-xs text-slate-500">Drag onto a shift, or drop here to remove.</p>
      <div className="flex flex-row flex-wrap gap-3 lg:flex-col">{children}</div>
    </aside>
  );
}

function ShiftCell({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-24 border-b border-r border-slate-200 bg-white p-2 last:border-r-0',
        isOver && 'bg-blue-50 ring-2 ring-inset ring-blue-400'
      )}
    >
      {children}
    </div>
  );
}

function PlacedChip({
  employee,
  dayOfWeek,
  shiftType,
  absent,
  onRemove,
  onMarkAbsent,
}: {
  employee: Employee;
  dayOfWeek: number;
  shiftType: 'day' | 'night';
  absent: boolean;
  onRemove: () => void;
  onMarkAbsent?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `placed:${dayOfWeek}:${shiftType}:${employee.id}`,
  });
  const dayShift = shiftType === 'day';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 rounded-md border px-1.5 py-1',
        absent
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : dayShift
            ? 'border-blue-200 bg-blue-50 text-blue-800'
            : 'border-slate-200 bg-slate-100 text-slate-800',
        isDragging && 'opacity-40'
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none px-1 text-left text-sm font-medium active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        {employee.full_name}
      </button>
      {absent && (
        <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          Absent
        </span>
      )}
      {onMarkAbsent && !absent && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 w-6 min-h-0 p-0',
            dayShift ? 'text-blue-600 hover:text-red-600' : 'text-slate-600 hover:text-red-600'
          )}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onMarkAbsent}
          title="Mark absent"
          aria-label={`Mark ${employee.full_name} absent`}
        >
          <UserMinus className="h-3 w-3" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 min-h-0 p-0 text-slate-500 hover:text-red-600"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onRemove}
        aria-label={`Remove ${employee.full_name}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function ScheduleGrid({
  weekStart,
  shifts,
  absences,
  employees,
  onShiftsChange,
  onMarkAbsent,
}: ScheduleGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const employeesById = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const employee of employees) map.set(employee.id, employee);
    return map;
  }, [employees]);

  const activeEmployees = useMemo(
    () =>
      employees
        .filter((employee) => employee.status === 'active')
        .slice()
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [employees]
  );

  const shiftCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const shift of shifts) {
      counts.set(shift.employee_id, (counts.get(shift.employee_id) ?? 0) + 1);
    }
    return counts;
  }, [shifts]);

  const absenceKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const absence of absences) {
      keys.add(`${absence.employee_id}:${absence.absence_date}:${absence.shift_type}`);
    }
    return keys;
  }, [absences]);

  const days = useMemo(
    () =>
      DAY_NAMES.map((name, dayOfWeek) => {
        const date = addDays(weekStart, dayOfWeek);
        return { name, dayOfWeek, date, label: formatShortDate(date) };
      }),
    [weekStart]
  );

  const activeEmployee = activeId
    ? employeesById.get(parseDragId(activeId)?.employeeId ?? '')
    : undefined;

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (!event.over) return;

    const source = parseDragId(String(event.active.id));
    const target = parseDropId(String(event.over.id));
    if (!source || !target) return;

    if (target.kind === 'pool') {
      if (source.kind === 'placed') {
        onShiftsChange(withoutShift(shifts, source.day, source.shiftType, source.employeeId));
      }
      return;
    }

    if (source.kind === 'pool') {
      if (hasShift(shifts, target.day, target.shiftType, source.employeeId)) return;
      onShiftsChange([
        ...shifts,
        {
          day_of_week: target.day,
          shift_type: target.shiftType,
          employee_id: source.employeeId,
        },
      ]);
      return;
    }

    if (source.day === target.day && source.shiftType === target.shiftType) return;

    const remaining = withoutShift(shifts, source.day, source.shiftType, source.employeeId);
    if (hasShift(remaining, target.day, target.shiftType, source.employeeId)) {
      onShiftsChange(remaining);
      return;
    }
    onShiftsChange([
      ...remaining,
      {
        day_of_week: target.day,
        shift_type: target.shiftType,
        employee_id: source.employeeId,
      },
    ]);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <StaffPanel>
          {activeEmployees.length === 0 ? (
            <p className="text-sm text-slate-400">No active staff</p>
          ) : (
            activeEmployees.map((employee) => (
              <StaffChip
                key={employee.id}
                employee={employee}
                count={shiftCounts.get(employee.id) ?? 0}
              />
            ))
          )}
        </StaffPanel>

        <div className="min-w-0 flex-1 overflow-x-auto rounded-md border border-slate-200">
          <div className="grid min-w-[880px] grid-cols-[5.5rem_repeat(7,minmax(0,1fr))]">
            <div className="border-b border-r border-slate-200 bg-slate-50" />
            {days.map((day) => (
              <div
                key={day.date}
                className="border-b border-r border-slate-200 bg-slate-50 p-2 text-center last:border-r-0"
              >
                <div className="text-sm font-medium text-slate-900">{day.name}</div>
                <div className="text-xs text-slate-500">{day.label}</div>
              </div>
            ))}

            {SHIFT_ROWS.map((row) => (
              <Fragment key={row.type}>
                <div className="flex items-center border-b border-r border-slate-200 bg-slate-50 p-2 text-xs font-semibold uppercase leading-tight tracking-wide text-slate-600">
                  {row.label}
                </div>
                {days.map((day) => {
                  const placed = shifts.filter(
                    (shift) => shift.day_of_week === day.dayOfWeek && shift.shift_type === row.type
                  );
                  return (
                    <ShiftCell key={`${row.type}-${day.date}`} id={`cell:${day.dayOfWeek}:${row.type}`}>
                      {placed.length === 0 ? (
                        <span className="text-xs text-slate-300">Drop here</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {placed.map((shift) => {
                            const employee = employeesById.get(shift.employee_id);
                            if (!employee) {
                              return (
                                <span
                                  key={shift.employee_id}
                                  className="text-xs text-slate-400"
                                >
                                  Unknown
                                </span>
                              );
                            }
                            const absent = absenceKeys.has(
                              `${employee.id}:${day.date}:${row.type}`
                            );
                            return (
                              <PlacedChip
                                key={employee.id}
                                employee={employee}
                                dayOfWeek={day.dayOfWeek}
                                shiftType={row.type}
                                absent={absent}
                                onRemove={() =>
                                  onShiftsChange(
                                    withoutShift(shifts, day.dayOfWeek, row.type, employee.id)
                                  )
                                }
                                onMarkAbsent={() => onMarkAbsent(day.date, row.type, employee)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </ShiftCell>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeEmployee ? (
          <div className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-lg">
            {activeEmployee.full_name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
