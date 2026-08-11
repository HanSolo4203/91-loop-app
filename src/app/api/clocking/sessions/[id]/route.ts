import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/clocking';
import { calculateShiftMinutes, type ShiftType } from '@/lib/shift-constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

const VALID_SHIFTS: ShiftType[] = ['day', 'night'];

function shiftScheduleFields(shiftType: ShiftType) {
  return {
    shift_type: shiftType,
    scheduled_start: shiftType === 'day' ? '09:00:00' : '17:00:00',
    scheduled_end: shiftType === 'day' ? '17:00:00' : '05:00:00',
    is_overnight: shiftType === 'night',
  };
}

// PUT /api/clocking/sessions/[id] — admin only: edit times / force clock-out
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin } = await getCurrentUser(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Session id is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const clockedInAtRaw =
      typeof body?.clocked_in_at === 'string' ? body.clocked_in_at : undefined;
    const clockedOutAtRaw =
      typeof body?.clocked_out_at === 'string' ? body.clocked_out_at : undefined;
    const shiftTypeRaw = body?.shift_type as ShiftType | undefined;
    const notes =
      typeof body?.notes === 'string'
        ? body.notes
        : body?.notes === null
          ? null
          : undefined;

    if (shiftTypeRaw !== undefined && !VALID_SHIFTS.includes(shiftTypeRaw)) {
      return NextResponse.json(
        { success: false, error: 'shift_type must be "day" or "night"' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const wasOpen = existing.clocked_out_at == null;
    const nextClockedInAt = clockedInAtRaw ?? existing.clocked_in_at;
    const nextClockedOutAt =
      clockedOutAtRaw !== undefined ? clockedOutAtRaw : existing.clocked_out_at;
    const nextShiftType: ShiftType =
      shiftTypeRaw ??
      (existing.shift_type === 'night' ? 'night' : 'day');

    const updates: Record<string, unknown> = {
      is_manual_edit: true,
      ...shiftScheduleFields(nextShiftType),
    };

    if (clockedInAtRaw !== undefined) {
      updates.clocked_in_at = clockedInAtRaw;
    }
    if (clockedOutAtRaw !== undefined) {
      updates.clocked_out_at = clockedOutAtRaw;
    }
    if (notes !== undefined) {
      updates.admin_notes = notes;
    }

    let newOvertimeMinutes = existing.overtime_minutes ?? 0;

    if (nextClockedOutAt) {
      const inAt = new Date(nextClockedInAt);
      const outAt = new Date(nextClockedOutAt);

      if (Number.isNaN(inAt.getTime()) || Number.isNaN(outAt.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid datetime value' },
          { status: 400 }
        );
      }

      if (outAt.getTime() < inAt.getTime()) {
        return NextResponse.json(
          { success: false, error: 'Clock-out must be after clock-in' },
          { status: 400 }
        );
      }

      const { total_minutes, regular_minutes, overtime_minutes } =
        calculateShiftMinutes(inAt, outAt, nextShiftType);

      updates.duration_minutes = total_minutes;
      updates.regular_minutes = regular_minutes;
      updates.overtime_minutes = overtime_minutes;
      newOvertimeMinutes = overtime_minutes;
    } else if (clockedInAtRaw !== undefined || shiftTypeRaw !== undefined) {
      // Open session — clear duration fields if times/shift changed without closing
      updates.duration_minutes = null;
      updates.regular_minutes = null;
      updates.overtime_minutes = 0;
      newOvertimeMinutes = 0;
    }

    let clockOutEventId: string | null = existing.clock_out_id;

    if (wasOpen && clockedOutAtRaw) {
      const { data: event, error: eventError } = await (supabaseAdmin as any)
        .from('clock_events')
        .insert({
          employee_id: existing.employee_id,
          event_type: 'clock_out',
          clocked_at: clockedOutAtRaw,
          shift_date: existing.shift_date,
          notes: 'Manual clock-out by admin',
        })
        .select()
        .single();

      if (eventError || !event) {
        console.error('PUT session manual clock-out event error:', eventError);
        return NextResponse.json(
          { success: false, error: 'Failed to record clock-out event' },
          { status: 500 }
        );
      }

      clockOutEventId = event.id;
      updates.clock_out_id = event.id;

      if (newOvertimeMinutes > 0) {
        const { data: employee } = await (supabaseAdmin as any)
          .from('employees')
          .select('total_overtime_minutes')
          .eq('id', existing.employee_id)
          .single();

        const currentOt = employee?.total_overtime_minutes ?? 0;
        const { error: otError } = await (supabaseAdmin as any)
          .from('employees')
          .update({ total_overtime_minutes: currentOt + newOvertimeMinutes })
          .eq('id', existing.employee_id);

        if (otError) {
          console.error('PUT session overtime update error:', otError);
        }
      }
    }

    if (clockOutEventId && clockedOutAtRaw && !wasOpen) {
      // Keep linked clock_out event time in sync when editing a closed session
      await (supabaseAdmin as any)
        .from('clock_events')
        .update({ clocked_at: clockedOutAtRaw })
        .eq('id', clockOutEventId);
    }

    if (clockedInAtRaw && existing.clock_in_id) {
      await (supabaseAdmin as any)
        .from('clock_events')
        .update({ clocked_at: clockedInAtRaw })
        .eq('id', existing.clock_in_id);
    }

    const { data: updatedSession, error: updateError } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        employee:employees!clock_sessions_employee_id_fkey (
          id,
          full_name,
          role,
          photo_url
        )
      `
      )
      .single();

    if (updateError || !updatedSession) {
      console.error('PUT session update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updatedSession });
  } catch (error) {
    console.error('PUT /api/clocking/sessions/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/clocking/sessions/[id] — admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin } = await getCurrentUser(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Session id is required' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .select('id, clock_in_id, clock_out_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const eventIds = [existing.clock_in_id, existing.clock_out_id].filter(
      Boolean
    ) as string[];

    // Clear FKs first so related clock_events can be removed safely
    if (eventIds.length > 0) {
      const { error: clearFkError } = await (supabaseAdmin as any)
        .from('clock_sessions')
        .update({ clock_in_id: null, clock_out_id: null })
        .eq('id', id);

      if (clearFkError) {
        console.error('DELETE session clear FK error:', clearFkError);
        return NextResponse.json(
          { success: false, error: 'Failed to prepare session for delete' },
          { status: 500 }
        );
      }
    }

    const { data: deletedRows, error: deleteSessionError } = await (supabaseAdmin as any)
      .from('clock_sessions')
      .delete()
      .eq('id', id)
      .select('id');

    if (deleteSessionError) {
      console.error('DELETE session error:', deleteSessionError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete session' },
        { status: 500 }
      );
    }

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found or already deleted' },
        { status: 404 }
      );
    }

    if (eventIds.length > 0) {
      const { error: deleteEventsError } = await (supabaseAdmin as any)
        .from('clock_events')
        .delete()
        .in('id', eventIds);

      if (deleteEventsError) {
        console.error('DELETE related clock_events error:', deleteEventsError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/clocking/sessions/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
