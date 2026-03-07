'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import Navigation from '@/components/navigation';
import WeekNavigator from '@/components/staff/week-navigator';
import ScheduleGrid from '@/components/staff/schedule-grid';
import AbsenceDialog from '@/components/staff/absence-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingTable } from '@/components/ui/loading-spinner';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { useSchedule, useSeedSchedule, useCreateAbsence } from '@/lib/hooks/use-schedule';
import { useEmployees } from '@/lib/hooks/use-employees';
import type { Employee } from '@/types/database';

function getWeekStart(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function ScheduleContent() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [absenceState, setAbsenceState] = useState<{
    open: boolean;
    date: string;
    shiftType: 'day' | 'night';
    employeeId: string;
    employeeName: string;
  } | null>(null);
  const [seeded, setSeeded] = useState(false);

  const { data: scheduleData, isLoading: scheduleLoading, refetch: refetchSchedule } = useSchedule(weekStart);
  const { data: employeesData } = useEmployees();
  const seedMutation = useSeedSchedule();
  const createAbsenceMutation = useCreateAbsence();

  const roster = scheduleData?.success && Array.isArray(scheduleData.data) ? scheduleData.data : [];
  const employees = employeesData?.success && Array.isArray(employeesData.data) ? employeesData.data : [];

  useEffect(() => {
    if (!seeded && roster.length > 0 && roster.every((d) => d.day.length === 0 && d.night.length === 0)) {
      seedMutation.mutate(undefined!, {
        onSuccess: () => {
          setSeeded(true);
          refetchSchedule();
        },
      });
    }
  }, [roster, seeded, seedMutation, refetchSchedule]);

  const handlePrev = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(getWeekStart(d));
  };

  const handleNext = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(getWeekStart(d));
  };

  const handleMarkAbsent = (date: string, shiftType: 'day' | 'night', emp: Employee) => {
    setAbsenceState({
      open: true,
      date,
      shiftType,
      employeeId: emp.id,
      employeeName: emp.full_name,
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
    refetchSchedule();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
            Weekly shift roster. Default schedule is seeded on first load.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Weekly roster</CardTitle>
                <CardDescription>
                  Mon–Sun × Day / Night shifts. Click &quot;Mark absent&quot; next to an employee to record an absence.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refetchSchedule()}
                  disabled={scheduleLoading}
                  className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                >
                  <RefreshCw className={`w-4 h-4 ${scheduleLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WeekNavigator weekStart={weekStart} onPrev={handlePrev} onNext={handleNext} />

            {scheduleLoading ? (
              <LoadingTable rows={7} columns={3} />
            ) : (
              <ScheduleGrid
                roster={roster}
                employees={employees}
                onMarkAbsent={handleMarkAbsent}
              />
            )}
          </CardContent>
        </Card>

        {absenceState && (
          <AbsenceDialog
            open={absenceState.open}
            onOpenChange={(o) => !o && setAbsenceState(null)}
            date={absenceState.date}
            shiftType={absenceState.shiftType}
            employeeId={absenceState.employeeId}
            employeeName={absenceState.employeeName}
            employees={employees}
            onSubmit={handleAbsenceSubmit}
          />
        )}
      </div>
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
