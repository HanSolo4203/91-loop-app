import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser, getSastMinutesSinceMidnight } from '@/lib/clocking';
import type { ClockStats } from '@/types/database';

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET /api/clocking/stats?month=&year= — admin only
export async function GET(request: NextRequest) {
  try {
    const { isAdmin } = await getCurrentUser(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const now = new Date();
    const monthParam = request.nextUrl.searchParams.get('month');
    const yearParam = request.nextUrl.searchParams.get('year');
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    if (month < 1 || month > 12 || !year || year < 2000) {
      return NextResponse.json(
        { success: false, error: 'Invalid month or year' },
        { status: 400 }
      );
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data: employees, error: empError } = await (supabaseAdmin as any)
      .from('employees')
      .select('id, full_name, role, shift_type, photo_url, status')
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    if (empError) {
      return NextResponse.json(
        { success: false, error: empError.message },
        { status: 500 }
      );
    }

    const { data: sessions, error: sessError } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .select('*')
      .gte('shift_date', startDate)
      .lt('shift_date', endDate)
      .order('clocked_in_at', { ascending: true });

    if (sessError) {
      return NextResponse.json(
        { success: false, error: sessError.message },
        { status: 500 }
      );
    }

    const sessionsByEmployee = new Map<string, any[]>();
    for (const s of sessions || []) {
      const list = sessionsByEmployee.get(s.employee_id) || [];
      list.push(s);
      sessionsByEmployee.set(s.employee_id, list);
    }

    const stats: ClockStats[] = (employees || []).map((emp: any) => {
      const empSessions = sessionsByEmployee.get(emp.id) || [];
      const completed = empSessions.filter((s: any) => s.duration_minutes != null);
      const totalMinutes = completed.reduce(
        (sum: number, s: any) => sum + (s.duration_minutes || 0),
        0
      );
      const uniqueDays = new Set(empSessions.map((s: any) => s.shift_date));
      const totalDays = uniqueDays.size;
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
      const avgHoursPerDay =
        totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0;

      const clockInMinutes = empSessions.map((s: any) =>
        getSastMinutesSinceMidnight(s.clocked_in_at)
      );
      const avgClockInMinutes =
        clockInMinutes.length > 0
          ? Math.round(
              clockInMinutes.reduce((a: number, b: number) => a + b, 0) /
                clockInMinutes.length
            )
          : null;

      const lastSession = [...empSessions].sort(
        (a: any, b: any) =>
          new Date(b.clocked_in_at).getTime() - new Date(a.clocked_in_at).getTime()
      )[0];

      return {
        employee_id: emp.id,
        full_name: emp.full_name,
        role: emp.role,
        photo_url: emp.photo_url ?? null,
        shift_type: emp.shift_type ?? null,
        total_days: totalDays,
        total_hours: totalHours,
        total_minutes: totalMinutes,
        avg_hours_per_day: avgHoursPerDay,
        last_clock_in: lastSession?.clocked_in_at ?? null,
        avg_clock_in_minutes: avgClockInMinutes,
        sessions: empSessions,
      };
    });

    return NextResponse.json({ success: true, data: stats, month, year });
  } catch (error) {
    console.error('GET /api/clocking/stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
