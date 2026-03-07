'use client';

import { Button } from '@/components/ui/button';
import { UserMinus } from 'lucide-react';
import type { Employee } from '@/types/database';
import type { DayRoster } from '@/types/database';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ScheduleGridProps {
  roster: DayRoster[];
  employees: Employee[];
  onMarkAbsent: (date: string, shiftType: 'day' | 'night', employee: Employee) => void;
}

export default function ScheduleGrid({ roster, employees, onMarkAbsent }: ScheduleGridProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="text-left p-3 font-medium text-slate-700 w-20">Day</th>
            <th className="text-left p-3 font-medium text-slate-700">Day Shift</th>
            <th className="text-left p-3 font-medium text-slate-700">Night Shift</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((day) => (
            <tr key={day.date} className="border-b last:border-0 hover:bg-slate-50/50">
              <td className="p-3 align-top">
                <div className="text-sm font-medium text-slate-900">
                  {DAY_NAMES[day.dayOfWeek]}
                </div>
                <div className="text-xs text-slate-500">{day.date}</div>
              </td>
              <td className="p-3 align-top">
                <div className="flex flex-wrap gap-2">
                  {day.day.length === 0 ? (
                    <span className="text-sm text-slate-400">—</span>
                  ) : (
                    day.day.map((emp) => (
                      <div
                        key={emp.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200"
                      >
                        <span className="text-sm font-medium">{emp.full_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-blue-600 hover:text-red-600"
                          onClick={() => onMarkAbsent(day.date, 'day', emp)}
                          title="Mark absent"
                        >
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </td>
              <td className="p-3 align-top">
                <div className="flex flex-wrap gap-2">
                  {day.night.length === 0 ? (
                    <span className="text-sm text-slate-400">—</span>
                  ) : (
                    day.night.map((emp) => (
                      <div
                        key={emp.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200"
                      >
                        <span className="text-sm font-medium">{emp.full_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-600 hover:text-red-600"
                          onClick={() => onMarkAbsent(day.date, 'night', emp)}
                          title="Mark absent"
                        >
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
