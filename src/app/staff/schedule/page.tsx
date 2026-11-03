'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import Navigation from '@/components/navigation';
import WeekNavigator from '@/components/staff/week-navigator';
import ScheduleGrid from '@/components/staff/schedule-grid';
import SchedulePrint from '@/components/staff/schedule-print';
import AbsenceDialog from '@/components/staff/absence-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingTable } from '@/components/ui/loading-spinner';
import { CalendarDays, Printer, RefreshCw } from 'lucide-react';
import { useCopySchedule, useCreateAbsence, useSaveSchedule, useSchedule } from '@/lib/hooks/use-schedule';
import { useEmployees } from '@/lib/hooks/use-employees';
import type { ScheduleShift, WeekSchedule } from '@/lib/services/staff/schedule';
import type { Employee } from '@/types/database';

function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date): string {
  const weekday = date.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return formatISODate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff));
}

function shiftWeek(weekStart: string, weeks: number): string {
  const [year, month, day] = weekStart.split('-').map(Number);
  return formatISODate(new Date(year, month - 1, day + weeks * 7));
}

function serializeShifts(shifts: ScheduleShift[]): string {
  return shifts
    .map((shift) => `${shift.day_of_week}:${shift.shift_type}:${shift.employee_id}`)
    .sort()
    .join('|');
}

interface DraftModel {
  week: string;
  shifts: ScheduleShift[];
  baseline: string;
}

function ScheduleContent() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [model, setModel] = useState<DraftModel | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [absenceState, setAbsenceState] = useState<{
    open: boolean;
    date: string;
    shiftType: 'day' | 'night';
    employeeId: string;
    employeeName: string;
  } | null>(null);

  const { data: scheduleData, isLoading: scheduleLoading, error: scheduleError, refetch } = useSchedule(weekStart);
  const { data: employeesData } = useEmployees();
  const saveMutation = useSaveSchedule();
  const copyMutation = useCopySchedule();
  const createAbsenceMutation = useCreateAbsence();

  const server: WeekSchedule | null =
    scheduleData?.success && scheduleData.data ? scheduleData.data : null;
  const employees = employeesData?.success && Array.isArray(employeesData.data) ? employeesData.data : [];
  const dirty =
    !!model && model.week === weekStart && serializeShifts(model.shifts) !== model.baseline;
  const showingDefault = !!server && server.isDefault && server.week === weekStart && !!model && model.week === weekStart;
  const pending = saveMutation.isPending || copyMutation.isPending;

  useEffect(() => {
    if (!server || server.week !== weekStart) return;
    const baseline = serializeShifts(server.shifts);
    setModel((current) => {
      if (current?.week === weekStart) return current;
      return { week: weekStart, shifts: server.shifts, baseline };
    });
  }, [server, weekStart]);

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      const url = new URL(href, window.location.href);
      if (
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      if (!window.confirm('You have unsaved changes. Leave this page without saving?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  const applyWeek = (next: WeekSchedule) => {
    setModel({
      week: next.week,
      shifts: next.shifts,
      baseline: serializeShifts(next.shifts),
    });
  };

  const changeWeek = (weeks: number) => {
    if (dirty && !window.confirm('You have unsaved changes. Leave this week without saving?')) return;
    setActionError(null);
    setWeekStart(shiftWeek(weekStart, weeks));
  };

  const handleRefresh = async () => {
    if (dirty && !window.confirm('Discard unsaved changes and reload this week?')) return;
    setActionError(null);
    const result = await refetch();
    const next = result.data?.success ? result.data.data : null;
    if (next) applyWeek(next);
  };

  const handleSave = async () => {
    if (!model || model.week !== weekStart || (!dirty && !showingDefault)) return;
    setActionError(null);
    try {
      const saved = await saveMutation.mutateAsync({ week: weekStart, shifts: model.shifts });
      applyWeek(saved);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save schedule');
    }
  };

  const handleCopy = async (weeksAgo: number) => {
    const label = weeksAgo === 1 ? 'last week' : '2 weeks ago';
    if (!window.confirm(`Replace this week with the schedule from ${label}?`)) return;
    setActionError(null);
    try {
      const copied = await copyMutation.mutateAsync({
        from_week: shiftWeek(weekStart, -weeksAgo),
        to_week: weekStart,
      });
      applyWeek(copied);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to copy schedule');
    }
  };

  const handleMarkAbsent = (date: string, shiftType: 'day' | 'night', employee: Employee) => {
    setAbsenceState({
      open: true,
      date,
      shiftType,
      employeeId: employee.id,
      employeeName: employee.full_name,
    });
  };

  const handleAbsenceSubmit = async (payload: {
    employee_id: string;
    absence_date: string;
    shift_type: 'day' | 'night';
    cover_employee_id: string | null;
    reason: string | null;
  }) => {
    await createAbsenceMutation.mutateAsync(payload);
  };

  const showGrid = model?.week === weekStart;
  const loadError = scheduleError instanceof Error ? scheduleError.message : null;

  return (
    <div className="schedule-page min-h-screen bg-slate-50">
      <Navigation />
      <div className="schedule-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <nav className="flex items-center gap-2 text-sm text-slate-600 mb-8">
          <CalendarDays className="w-4 h-4" />
          <span>/</span>
          <span className="text-slate-900 font-medium">Schedule</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CalendarDays className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            Staff – Schedule
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Weekly shift roster. Drag staff onto a shift, then save the week.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <CardTitle>Weekly roster</CardTitle>
                  <CardDescription>
                    Mon–Sun, day and night. Drop someone on a cell to add them, drag between cells to move them, or drop them back on Staff to remove them.
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={scheduleLoading || pending}
                  className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${scheduleLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {dirty && (
                  <span className="text-sm font-medium text-amber-700">Unsaved changes</span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(1)}
                  disabled={pending || scheduleLoading}
                >
                  Copy from last week
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(2)}
                  disabled={pending || scheduleLoading}
                >
                  Copy from 2 weeks ago
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  disabled={!showGrid || !model || scheduleLoading}
                >
                  <Printer className="w-4 h-4" />
                  Print schedule
                </Button>
                <Button type="button" size="sm" onClick={handleSave} disabled={(!dirty && !showingDefault) || pending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save week'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WeekNavigator
              weekStart={weekStart}
              onPrev={() => changeWeek(-1)}
              onNext={() => changeWeek(1)}
            />

            {server?.isDefault && server.week === weekStart && (
              <p className="mb-3 text-sm text-slate-600">
                This week has no saved roster, so the default schedule is shown. Save week to keep a copy for these dates.
              </p>
            )}

            {actionError && (
              <p className="mb-3 text-sm text-red-600" role="alert">
                {actionError}
              </p>
            )}
            {loadError && (
              <p className="mb-3 text-sm text-red-600" role="alert">
                {loadError}
              </p>
            )}

            {scheduleLoading || !showGrid || !model ? (
              <LoadingTable rows={2} columns={8} />
            ) : (
              <ScheduleGrid
                weekStart={weekStart}
                shifts={model.shifts}
                absences={server?.absences ?? []}
                employees={employees}
                onShiftsChange={(shifts) =>
                  setModel((current) => (current ? { ...current, shifts } : current))
                }
                onMarkAbsent={handleMarkAbsent}
              />
            )}
          </CardContent>
        </Card>

        {absenceState && (
          <AbsenceDialog
            open={absenceState.open}
            onOpenChange={(open) => !open && setAbsenceState(null)}
            date={absenceState.date}
            shiftType={absenceState.shiftType}
            employeeId={absenceState.employeeId}
            employeeName={absenceState.employeeName}
            employees={employees}
            onSubmit={handleAbsenceSubmit}
          />
        )}
      </div>
      {showGrid && model && (
        <SchedulePrint weekStart={weekStart} shifts={model.shifts} employees={employees} />
      )}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <AuthGuard>
      <ScheduleContent />
    </AuthGuard>
  );
}
