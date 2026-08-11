'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Moon, Sun } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  useDeleteClockSession,
  useEditClockSession,
} from '@/lib/hooks/use-clocking';
import { formatDurationMinutes } from '@/lib/clocking-utils';
import { calculateShiftMinutes, type ShiftType } from '@/lib/shift-constants';
import type { ClockSession } from '@/types/database';
import { cn } from '@/lib/utils';

export interface EditSessionDialogSession extends ClockSession {
  employee: { full_name: string; photo_url: string | null };
}

export interface EditSessionDialogProps {
  session: EditSessionDialogSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Convert ISO UTC string to datetime-local value in SAST */
export function toSastLocalInput(iso: string): string {
  const sast = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
  return sast.replace(' ', 'T').substring(0, 16);
}

/** Convert datetime-local value (SAST) back to ISO UTC */
export function fromSastLocalInput(localStr: string): string {
  const [datePart, timePart] = localStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  // SAST = UTC+2, so subtract 2 hours for UTC
  const utc = new Date(Date.UTC(year, month - 1, day, hour - 2, minute));
  return utc.toISOString();
}

function formatSessionDate(shiftDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${shiftDate}T12:00:00`));
}

export default function EditSessionDialog({
  session,
  open,
  onOpenChange,
  onSaved,
}: EditSessionDialogProps) {
  const editMutation = useEditClockSession();
  const deleteMutation = useDeleteClockSession();

  const [shiftType, setShiftType] = useState<ShiftType>('day');
  const [clockInLocal, setClockInLocal] = useState('');
  const [clockOutLocal, setClockOutLocal] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isOpenSession = session ? session.clocked_out_at == null : false;

  useEffect(() => {
    if (!session || !open) return;
    setShiftType(session.shift_type === 'night' ? 'night' : 'day');
    setClockInLocal(toSastLocalInput(session.clocked_in_at));
    setClockOutLocal(
      session.clocked_out_at ? toSastLocalInput(session.clocked_out_at) : ''
    );
    setNotes(session.admin_notes ?? '');
    setConfirmDelete(false);
    setFormError(null);
    editMutation.reset();
    deleteMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset form when dialog opens for a session
  }, [session?.id, open]);

  const preview = useMemo(() => {
    if (!clockInLocal) return null;
    if (isOpenSession && !clockOutLocal) return null;

    try {
      const inIso = fromSastLocalInput(clockInLocal);
      const outIso = clockOutLocal
        ? fromSastLocalInput(clockOutLocal)
        : null;
      if (!outIso) return null;

      const inAt = new Date(inIso);
      const outAt = new Date(outIso);
      if (outAt.getTime() < inAt.getTime()) {
        return { error: 'Clock-out must be after clock-in' } as const;
      }

      const result = calculateShiftMinutes(inAt, outAt, shiftType);
      return {
        duration: formatDurationMinutes(result.total_minutes),
        regular: formatDurationMinutes(result.regular_minutes),
        overtime: formatDurationMinutes(result.overtime_minutes),
        overtimeMinutes: result.overtime_minutes,
      } as const;
    } catch {
      return null;
    }
  }, [clockInLocal, clockOutLocal, shiftType, isOpenSession]);

  const busy = editMutation.isPending || deleteMutation.isPending;

  const handleSave = async () => {
    if (!session) return;
    setFormError(null);

    if (!clockInLocal) {
      setFormError('Clock-in time is required');
      return;
    }

    try {
      const payload: {
        clocked_in_at: string;
        clocked_out_at?: string;
        shift_type: ShiftType;
        notes?: string;
      } = {
        clocked_in_at: fromSastLocalInput(clockInLocal),
        shift_type: shiftType,
        notes: notes.trim() || undefined,
      };

      if (clockOutLocal) {
        payload.clocked_out_at = fromSastLocalInput(clockOutLocal);
      }

      if (
        payload.clocked_out_at &&
        new Date(payload.clocked_out_at).getTime() <
          new Date(payload.clocked_in_at).getTime()
      ) {
        setFormError('Clock-out must be after clock-in');
        return;
      }

      await editMutation.mutateAsync({ id: session.id, payload });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    setFormError(null);
    try {
      await deleteMutation.mutateAsync(session.id);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Clock Session — {session.employee.full_name}
          </DialogTitle>
          <p className="text-sm text-slate-500">{formatSessionDate(session.shift_date)}</p>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label>Shift Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShiftType('day')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-colors',
                  shiftType === 'day'
                    ? 'border-amber-400 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                <Sun className="w-5 h-5 mb-1" />
                <span className="text-sm font-semibold">Day Shift</span>
                <span className="text-xs opacity-70">09:00–17:00</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShiftType('night')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-colors',
                  shiftType === 'night'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                <Moon className="w-5 h-5 mb-1" />
                <span className="text-sm font-semibold">Night Shift</span>
                <span className="text-xs opacity-70">17:00–05:00</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-clock-in">Clock In Time</Label>
            <Input
              id="edit-clock-in"
              type="datetime-local"
              value={clockInLocal}
              onChange={(e) => setClockInLocal(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-clock-out">Clock Out Time</Label>
            <Input
              id="edit-clock-out"
              type="datetime-local"
              value={clockOutLocal}
              onChange={(e) => setClockOutLocal(e.target.value)}
              disabled={busy || isOpenSession}
              placeholder={isOpenSession ? 'Still on shift' : undefined}
              className={cn(isOpenSession && 'bg-slate-100 text-slate-400')}
            />
            {isOpenSession && (
              <p className="text-xs text-slate-500">
                Still on shift — use Force Clock-Out to close this session.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional admin notes"
              rows={2}
              disabled={busy}
            />
          </div>

          {preview && 'error' in preview ? (
            <p className="text-sm text-red-600">{preview.error}</p>
          ) : preview ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Duration: {preview.duration} · Regular: {preview.regular} · Overtime:{' '}
              {preview.overtimeMinutes > 0 ? (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {preview.overtime}
                </span>
              ) : (
                preview.overtime
              )}
            </div>
          ) : null}

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {formError}
            </p>
          )}

          {confirmDelete && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Are you sure? This cannot be undone.
            </div>
          )}
        </div>

        <DialogFooter className="flex !flex-col gap-3 sm:!flex-row sm:justify-between sm:items-center">
          <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-1">
            {!confirmDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                Delete Session
              </Button>
            ) : (
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <p className="text-xs text-red-700">Click again to permanently delete</p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleDelete();
                  }}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Confirm Delete'
                  )}
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void handleSave()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
