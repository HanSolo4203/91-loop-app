'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import MetricCard from '@/components/dashboard/metric-card';
import {
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  Timer,
  Award,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useActiveClockEntries, useClockStats } from '@/lib/hooks/use-clocking';
import {
  formatDurationMinutes,
  formatSastDateTime,
  formatSastTime,
  formatShiftShort,
  getSastDateString,
} from '@/lib/clocking-utils';
import type { ClockStats, ClockSession } from '@/types/database';
import { cn } from '@/lib/utils';
import { BLUR_DATA_URL } from '@/lib/utils/image-helpers';

const ShiftHoursChart = dynamic(() => import('./shift-hours-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center text-slate-500">
      Loading charts...
    </div>
  ),
});

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

interface DaySessionEntry {
  employee_id: string;
  full_name: string;
  photo_url: string | null;
  clocked_in_at: string;
  clocked_out_at: string | null;
  duration_minutes: number | null;
  shift_date: string;
  shift_type: 'day' | 'night' | null;
  regular_minutes: number | null;
  overtime_minutes: number | null;
}

function employeeInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

function LiveDuration({
  clockedInAt,
  className,
}: {
  clockedInAt: string;
  className?: string;
}) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      const mins = Math.round((Date.now() - new Date(clockedInAt).getTime()) / 60000);
      setLabel(formatDurationMinutes(mins));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clockedInAt]);
  return <span className={cn('tabular-nums', className)}>{label}</span>;
}

function EmployeeAvatar({
  fullName,
  photoUrl,
  size = 32,
  ringClassName,
}: {
  fullName: string;
  photoUrl: string | null;
  size?: number;
  ringClassName?: string;
}) {
  const sizeClass = size === 24 ? 'h-6 w-6' : 'h-8 w-8';
  const textClass = size === 24 ? 'text-[10px]' : 'text-xs';

  if (photoUrl) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-full shrink-0',
          sizeClass,
          ringClassName
        )}
      >
        <Image
          src={photoUrl}
          alt={fullName}
          fill
          className="object-cover rounded-full"
          sizes={`${size}px`}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-slate-200 flex items-center justify-center font-semibold text-slate-600 shrink-0',
        sizeClass,
        textClass,
        ringClassName
      )}
    >
      {employeeInitials(fullName)}
    </div>
  );
}

function minutesToTimeLabel(mins: number | null): string {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function sessionMinutes(session: {
  duration_minutes: number | null;
  clocked_in_at: string;
  clocked_out_at: string | null;
}): number {
  if (session.duration_minutes != null) return session.duration_minutes;
  if (!session.clocked_out_at) {
    return Math.max(
      0,
      Math.round((Date.now() - new Date(session.clocked_in_at).getTime()) / 60000)
    );
  }
  return 0;
}

function dominantShiftLabel(emp: ClockStats): string {
  const day = emp.shift_breakdown?.day_sessions ?? 0;
  const night = emp.shift_breakdown?.night_sessions ?? 0;
  if (day > 0 && night > 0) return 'Both';
  if (night > 0) return '🌙 Night';
  if (day > 0) return '☀️ Day';
  return '—';
}

function shiftRingClass(shiftType: string | null): string | undefined {
  if (shiftType === 'night') return 'ring-1 ring-indigo-400';
  if (shiftType === 'day') return 'ring-1 ring-amber-400';
  return undefined;
}

function exportCsv(stats: ClockStats[], month: number, year: number) {
  const monthName = monthOptions.find((m) => m.value === month)?.label ?? String(month);
  const rows: string[][] = [
    [
      'Employee',
      'Role',
      'Date',
      'Shift',
      'Clock In',
      'Clock Out',
      'Regular (minutes)',
      'Overtime (minutes)',
      'Duration (minutes)',
      'Duration',
    ],
  ];

  for (const emp of stats) {
    if (emp.sessions.length === 0) {
      rows.push([emp.full_name, emp.role ?? '', '', '', '', '', '0', '0', '0', '0h 0m']);
      continue;
    }
    for (const s of emp.sessions) {
      rows.push([
        emp.full_name,
        emp.role ?? '',
        s.shift_date,
        s.shift_type ?? '',
        s.clocked_in_at ? formatSastDateTime(s.clocked_in_at) : '',
        s.clocked_out_at ? formatSastDateTime(s.clocked_out_at) : 'Open',
        String(s.regular_minutes ?? ''),
        String(s.overtime_minutes ?? ''),
        String(s.duration_minutes ?? ''),
        s.duration_minutes != null ? formatDurationMinutes(s.duration_minutes) : '',
      ]);
    }
  }

  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clock-records-${monthName}-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-slate-900 truncate">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

function SessionsSubTable({ sessions }: { sessions: ClockSession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-slate-500 px-4 py-3">No sessions this month</p>
    );
  }

  return (
    <div className="bg-slate-50 border-t border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-8">Date</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Regular</TableHead>
            <TableHead>Overtime</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="pl-8 text-slate-700">{s.shift_date}</TableCell>
              <TableCell>
                <Badge variant="outline">{formatShiftShort(s.shift_type)}</Badge>
              </TableCell>
              <TableCell className="tabular-nums">
                {s.clocked_in_at ? formatSastTime(s.clocked_in_at) : '—'}
              </TableCell>
              <TableCell className="tabular-nums">
                {s.clocked_out_at ? (
                  formatSastTime(s.clocked_out_at)
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">Open</Badge>
                )}
              </TableCell>
              <TableCell className="tabular-nums">
                {s.regular_minutes != null
                  ? formatDurationMinutes(s.regular_minutes)
                  : '—'}
              </TableCell>
              <TableCell
                className={cn(
                  'tabular-nums',
                  (s.overtime_minutes ?? 0) > 0 && 'text-amber-600 font-medium'
                )}
              >
                {(s.overtime_minutes ?? 0) > 0
                  ? formatDurationMinutes(s.overtime_minutes ?? 0)
                  : '—'}
              </TableCell>
              <TableCell className="tabular-nums">
                {s.duration_minutes != null
                  ? formatDurationMinutes(s.duration_minutes)
                  : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AttendanceCalendar({
  year,
  month,
  daySessionsMap,
}: {
  year: number;
  month: number;
  daySessionsMap: Map<string, DaySessionEntry[]>;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const todayKey = getSastDateString();
  const monthName = monthOptions.find((m) => m.value === month)?.label ?? String(month);

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const selectedSessions = selectedDate ? daySessionsMap.get(selectedDate) ?? [] : [];
  const selectedTotalMins = selectedSessions.reduce((sum, s) => sum + sessionMinutes(s), 0);
  const selectedEmployees = new Set(selectedSessions.map((s) => s.employee_id)).size;

  const selectedTitle = selectedDate
    ? new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${selectedDate}T12:00:00`))
    : '';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Attendance — {monthName} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAY_HEADERS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-slate-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: totalCells }).map((_, index) => {
              const dayNumber = index - startOffset + 1;
              if (dayNumber < 1 || dayNumber > daysInMonth) {
                return <div key={`empty-${index}`} className="min-h-[80px]" />;
              }

              const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
              const sessions = daySessionsMap.get(dateKey) ?? [];
              const isToday = dateKey === todayKey;
              const isFuture = dateKey > todayKey;
              const isPastEmpty = dateKey < todayKey && sessions.length === 0;

              const uniqueEmployees = new Map<string, DaySessionEntry>();
              for (const s of sessions) {
                if (!uniqueEmployees.has(s.employee_id)) {
                  uniqueEmployees.set(s.employee_id, s);
                }
              }
              const employeeList = Array.from(uniqueEmployees.values());
              const visible = employeeList.slice(0, 3);
              const overflow = employeeList.length - visible.length;
              const dayMins = sessions.reduce((sum, s) => sum + sessionMinutes(s), 0);
              const dayHours = Math.round((dayMins / 60) * 10) / 10;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(dateKey)}
                  className={cn(
                    'border border-slate-200 rounded-lg p-2 min-h-[80px] text-left cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors',
                    isPastEmpty && 'opacity-50 bg-slate-50',
                    isFuture && 'opacity-30'
                  )}
                >
                  <div
                    className={cn(
                      'text-sm text-slate-500',
                      isToday && 'text-blue-600 font-bold'
                    )}
                  >
                    {dayNumber}
                  </div>
                  {employeeList.length > 0 && (
                    <div className="flex items-center mt-1">
                      {visible.map((emp, i) => (
                        <div
                          key={emp.employee_id}
                          className={cn(i > 0 && '-ml-1.5')}
                          style={{ zIndex: visible.length - i }}
                        >
                          <EmployeeAvatar
                            fullName={emp.full_name}
                            photoUrl={emp.photo_url}
                            size={24}
                            ringClassName={shiftRingClass(emp.shift_type)}
                          />
                        </div>
                      ))}
                      {overflow > 0 && (
                        <span className="-ml-1.5 h-6 min-w-6 px-1 rounded-full bg-slate-200 text-[10px] font-medium text-slate-600 flex items-center justify-center">
                          +{overflow}
                        </span>
                      )}
                    </div>
                  )}
                  {sessions.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{dayHours}h total</p>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTitle}</DialogTitle>
          </DialogHeader>
          {selectedSessions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No sessions on this day</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Regular</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSessions.map((s, idx) => (
                    <TableRow key={`${s.employee_id}-${s.clocked_in_at}-${idx}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EmployeeAvatar
                            fullName={s.full_name}
                            photoUrl={s.photo_url}
                            size={32}
                          />
                          <span className="font-medium text-slate-900">{s.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.shift_type === 'night' ? '🌙 Night Shift' : '☀️ Day Shift'}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatSastTime(s.clocked_in_at)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {s.clocked_out_at ? (
                          formatSastTime(s.clocked_out_at)
                        ) : (
                          <span className="text-emerald-600">Still on shift</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDurationMinutes(s.regular_minutes ?? 0)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {(s.overtime_minutes ?? 0) > 0 ? (
                          <span className="text-amber-600 font-medium">
                            {formatDurationMinutes(s.overtime_minutes ?? 0)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDurationMinutes(sessionMinutes(s))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-sm text-slate-600 mt-2">
                Total: {formatDurationMinutes(selectedTotalMins)} across {selectedEmployees}{' '}
                {selectedEmployees === 1 ? 'employee' : 'employees'}
              </p>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDate(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ClockRecords() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch, isFetching } = useClockStats(month, year);
  const { data: activeData } = useActiveClockEntries();
  const stats = data?.success && Array.isArray(data.data) ? data.data : [];
  const activeEntries = Array.isArray(activeData?.data) ? activeData.data : [];

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const summary = useMemo(() => {
    const totalMinutes = stats.reduce((sum, s) => sum + s.total_minutes, 0);
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const totalRegularMinutes = stats.reduce(
      (sum, s) => sum + (s.total_regular_minutes ?? 0),
      0
    );
    const totalOvertimeMinutes = stats.reduce(
      (sum, s) => sum + (s.total_overtime_minutes ?? 0),
      0
    );
    const withHours = stats.filter((s) => s.total_days > 0);
    const avgPerEmployee =
      withHours.length > 0
        ? Math.round(
            (withHours.reduce((sum, s) => sum + s.total_hours, 0) / withHours.length) * 100
          ) / 100
        : 0;
    const totalSessions = stats.reduce((sum, s) => sum + s.sessions.length, 0);

    const punctual = [...stats]
      .filter((s) => s.avg_clock_in_minutes != null && s.total_days > 0)
      .sort(
        (a, b) => (a.avg_clock_in_minutes ?? 9999) - (b.avg_clock_in_minutes ?? 9999)
      )[0];

    return {
      totalHours,
      avgPerEmployee,
      totalSessions,
      totalRegularHours: Math.round((totalRegularMinutes / 60) * 100) / 100,
      totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
      punctualName: punctual?.full_name ?? '—',
      punctualAvg: punctual ? minutesToTimeLabel(punctual.avg_clock_in_minutes) : null,
    };
  }, [stats]);

  const daySessionsMap = useMemo(() => {
    const map = new Map<string, DaySessionEntry[]>();
    for (const empStat of stats) {
      for (const session of empStat.sessions) {
        const dateKey = session.shift_date;
        const list = map.get(dateKey) || [];
        list.push({
          employee_id: empStat.employee_id,
          full_name: empStat.full_name,
          photo_url: empStat.photo_url ?? null,
          clocked_in_at: session.clocked_in_at,
          clocked_out_at: session.clocked_out_at,
          duration_minutes: session.duration_minutes,
          shift_date: session.shift_date,
          shift_type: session.shift_type,
          regular_minutes: session.regular_minutes,
          overtime_minutes: session.overtime_minutes,
        });
        map.set(dateKey, list);
      }
    }
    return map;
  }, [stats]);

  const overtimeSessions = useMemo(() => {
    const rows: Array<{
      employee_id: string;
      full_name: string;
      shift_date: string;
      shift_type: 'day' | 'night' | null;
      clocked_out_at: string | null;
      regular_minutes: number;
      overtime_minutes: number;
      duration_minutes: number;
    }> = [];

    for (const emp of stats) {
      for (const s of emp.sessions) {
        if ((s.overtime_minutes ?? 0) > 0) {
          rows.push({
            employee_id: emp.employee_id,
            full_name: emp.full_name,
            shift_date: s.shift_date,
            shift_type: s.shift_type,
            clocked_out_at: s.clocked_out_at,
            regular_minutes: s.regular_minutes ?? 0,
            overtime_minutes: s.overtime_minutes ?? 0,
            duration_minutes: s.duration_minutes ?? 0,
          });
        }
      }
    }

    return rows.sort((a, b) => b.overtime_minutes - a.overtime_minutes);
  }, [stats]);

  const overtimeTotal = useMemo(
    () => overtimeSessions.reduce((sum, r) => sum + r.overtime_minutes, 0),
    [overtimeSessions]
  );

  const chartData = useMemo(
    () =>
      stats
        .filter((s) => (s.total_regular_minutes ?? 0) > 0 || (s.total_overtime_minutes ?? 0) > 0)
        .map((s) => {
          const regular = Math.round(((s.total_regular_minutes ?? 0) / 60) * 100) / 100;
          const overtime = Math.round(((s.total_overtime_minutes ?? 0) / 60) * 100) / 100;
          return {
            name: s.full_name.split(' ')[0] || s.full_name,
            regular,
            overtime,
            total: Math.round((regular + overtime) * 100) / 100,
          };
        }),
    [stats]
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(month)}
            onValueChange={(v) => setMonth(parseInt(v, 10))}
          >
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(parseInt(v, 10))}
          >
            <SelectTrigger className="w-[100px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(stats, month, year)}
          disabled={stats.length === 0}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <SummaryCard
          title="Total hours"
          value={`${summary.totalHours}h`}
          subtitle="All staff this month"
          icon={Timer}
        />
        <SummaryCard
          title="Avg per employee"
          value={`${summary.avgPerEmployee}h`}
          subtitle="Among those who worked"
          icon={Users}
        />
        <SummaryCard
          title="Most punctual"
          value={summary.punctualName}
          subtitle={
            summary.punctualAvg
              ? `Avg clock-in ${summary.punctualAvg}`
              : 'No data yet'
          }
          icon={Award}
        />
        <SummaryCard
          title="Sessions"
          value={String(summary.totalSessions)}
          subtitle="Clock-in events this month"
          icon={Clock}
        />
        <MetricCard
          title="Regular Hours"
          value={`${summary.totalRegularHours}h`}
          icon={Clock}
          variant="batches"
        />
        <MetricCard
          title="Total Overtime Hours"
          value={`${summary.totalOvertimeHours}h`}
          icon={AlertTriangle}
          variant="discrepancies"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Currently Clocked In
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-400 font-normal hidden sm:inline">
                auto-refreshes every 30s
              </span>
              <Badge className="bg-emerald-100 text-emerald-800">
                {activeEntries.length} on shift
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeEntries.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-8 h-8" />}
              title="No staff currently on shift"
              description="When staff clock in on the kiosk, they will appear here live."
              size="sm"
              variant="minimal"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Clocked In</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEntries.map((entry) => (
                  <TableRow key={entry.session_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <EmployeeAvatar
                          fullName={entry.full_name}
                          photoUrl={entry.photo_url}
                          size={32}
                        />
                        <div>
                          <div className="font-medium text-slate-900">{entry.full_name}</div>
                          {entry.role && (
                            <div className="text-xs text-slate-500 sm:hidden">{entry.role}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {entry.role ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          entry.shift_type === 'night'
                            ? 'border-indigo-300 text-indigo-700 bg-indigo-50'
                            : 'border-amber-300 text-amber-700 bg-amber-50'
                        )}
                      >
                        {formatShiftShort(entry.shift_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {formatSastTime(entry.clocked_in_at)}
                    </TableCell>
                    <TableCell>
                      <LiveDuration
                        clockedInAt={entry.clocked_in_at}
                        className="text-sm text-slate-700"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading clock records…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error instanceof Error ? error.message : 'Failed to load clock records'}
        </div>
      ) : (
        <>
          <AttendanceCalendar
            year={year}
            month={month}
            daySessionsMap={daySessionsMap}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overtime This Month</CardTitle>
            </CardHeader>
            <CardContent>
              {overtimeSessions.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle className="w-8 h-8 text-emerald-500" />}
                  title="No overtime recorded this month"
                  description="All completed shifts finished within scheduled hours."
                  size="sm"
                  variant="minimal"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Clocked Out</TableHead>
                      <TableHead>Regular</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overtimeSessions.map((row, idx) => (
                      <TableRow key={`${row.employee_id}-${row.shift_date}-${idx}`}>
                        <TableCell className="font-medium text-slate-900">
                          {row.full_name}
                        </TableCell>
                        <TableCell>{row.shift_date}</TableCell>
                        <TableCell>{formatShiftShort(row.shift_type)}</TableCell>
                        <TableCell className="tabular-nums">
                          {row.clocked_out_at
                            ? formatSastTime(row.clocked_out_at)
                            : '—'}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatDurationMinutes(row.regular_minutes)}
                        </TableCell>
                        <TableCell className="tabular-nums text-amber-600 font-medium">
                          {formatDurationMinutes(row.overtime_minutes)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatDurationMinutes(row.duration_minutes)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-semibold">
                      <TableCell colSpan={5}>Total overtime</TableCell>
                      <TableCell className="tabular-nums text-amber-700">
                        {formatDurationMinutes(overtimeTotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regular vs Overtime Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <ShiftHoursChart data={chartData} />
            </CardContent>
          </Card>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Employee</TableHead>
                  <TableHead>Shift Type</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Regular Hours</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Total hours</TableHead>
                  <TableHead>Avg / day</TableHead>
                  <TableHead>Last clock-in</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-500 py-10">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.map((emp) => {
                    const isOpen = expanded.has(emp.employee_id);
                    const ot = emp.total_overtime_minutes ?? 0;
                    return (
                      <Fragment key={emp.employee_id}>
                        <TableRow
                          className={cn(isOpen && 'bg-slate-50')}
                        >
                          <TableCell className="pr-0">
                            <button
                              type="button"
                              onClick={() => toggleExpand(emp.employee_id)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500"
                              aria-label={isOpen ? 'Collapse' : 'Expand'}
                            >
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900">{emp.full_name}</div>
                            {emp.role && (
                              <div className="text-xs text-slate-500">{emp.role}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{dominantShiftLabel(emp)}</Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">{emp.total_days}</TableCell>
                          <TableCell className="tabular-nums">
                            {formatDurationMinutes(emp.total_regular_minutes ?? 0)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'tabular-nums',
                              ot > 0 && 'text-amber-600 font-medium'
                            )}
                          >
                            {ot > 0 ? formatDurationMinutes(ot) : '—'}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {emp.total_hours}h
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {emp.avg_hours_per_day}h
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {emp.last_clock_in
                              ? formatSastDateTime(emp.last_clock_in)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpand(emp.employee_id)}
                            >
                              View Sessions
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow>
                            <TableCell colSpan={10} className="p-0">
                              <SessionsSubTable sessions={emp.sessions} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
