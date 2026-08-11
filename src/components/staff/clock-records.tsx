'use client';

import { Fragment, useMemo, useState } from 'react';
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
import {
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  Timer,
  Award,
} from 'lucide-react';
import { useClockStats } from '@/lib/hooks/use-clocking';
import {
  formatDurationMinutes,
  formatSastDateTime,
  formatSastTime,
} from '@/lib/clocking-utils';
import type { ClockStats, ClockSession } from '@/types/database';
import { cn } from '@/lib/utils';

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

function minutesToTimeLabel(mins: number | null): string {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function exportCsv(stats: ClockStats[], month: number, year: number) {
  const monthName = monthOptions.find((m) => m.value === month)?.label ?? String(month);
  const rows: string[][] = [
    ['Employee', 'Role', 'Date', 'Clock In', 'Clock Out', 'Duration (minutes)', 'Duration'],
  ];

  for (const emp of stats) {
    if (emp.sessions.length === 0) {
      rows.push([emp.full_name, emp.role ?? '', '', '', '', '0', '0h 0m']);
      continue;
    }
    for (const s of emp.sessions) {
      rows.push([
        emp.full_name,
        emp.role ?? '',
        s.shift_date,
        s.clocked_in_at ? formatSastDateTime(s.clocked_in_at) : '',
        s.clocked_out_at ? formatSastDateTime(s.clocked_out_at) : 'Open',
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
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="pl-8 text-slate-700">{s.shift_date}</TableCell>
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

export default function ClockRecords() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch, isFetching } = useClockStats(month, year);
  const stats = data?.success && Array.isArray(data.data) ? data.data : [];

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const summary = useMemo(() => {
    const totalMinutes = stats.reduce((sum, s) => sum + s.total_minutes, 0);
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
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
      punctualName: punctual?.full_name ?? '—',
      punctualAvg: punctual ? minutesToTimeLabel(punctual.avg_clock_in_minutes) : null,
    };
  }, [stats]);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
      </div>

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
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Employee</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Total hours</TableHead>
                <TableHead>Avg / day</TableHead>
                <TableHead>Last clock-in</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-10">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((emp) => {
                  const isOpen = expanded.has(emp.employee_id);
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
                        <TableCell className="tabular-nums">{emp.total_days}</TableCell>
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
                          <TableCell colSpan={7} className="p-0">
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
      )}
    </div>
  );
}
