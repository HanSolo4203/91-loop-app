'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Image from 'next/image';
import { Check, Delete, Loader2, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatDurationMinutes,
  formatShiftBadge,
  formatShiftShort,
} from '@/lib/clocking-utils';
import { useActiveClockEntries, type ActiveClockEntry } from '@/lib/hooks/use-clocking';
import { playClockInCheer, playLogoutChime } from '@/lib/utils/sounds';
import { fireClockInConfetti } from '@/lib/utils/confetti';
import { BlueAuthBackdrop } from '@/components/auth/blue-auth-backdrop';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SAST = 'Africa/Johannesburg';
const PIN_LENGTH = 4;
const IDLE_CLEAR_MS = 3000;
const SUCCESS_RETURN_MS = 3000;
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SAST,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SAST,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const hmFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SAST,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

type Screen = 'pin' | 'confirm' | 'success';

interface VerifiedEmployee {
  id: string;
  full_name: string;
  role: string | null;
  shift_type: string;
  photo_url: string | null;
  is_clocked_in: boolean;
  clocked_in_at?: string | null;
}

interface SuccessInfo {
  type: 'clock_in' | 'clock_out';
  timeLabel: string;
  shiftType?: 'day' | 'night';
  durationLabel?: string;
  regularLabel?: string;
  overtimeLabel?: string;
  hadOvertime?: boolean;
}

function employeeInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

function formatSastHm(iso: string) {
  return hmFormatter.format(new Date(iso));
}

/** Own timer so the keypad does not re-render every second. */
const KioskLiveClock = memo(function KioskLiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-center mb-3 sm:mb-6 md:mb-8">
      <p className="text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight text-white">
        {timeFormatter.format(now)}
      </p>
      <p className="mt-1 sm:mt-2 text-blue-100/80 text-sm sm:text-base md:text-lg px-2">
        {dateFormatter.format(now)}
      </p>
    </div>
  );
});

function LiveDuration({ clockedInAt }: { clockedInAt: string }) {
  const [label, setLabel] = useState(() =>
    formatDurationMinutes(Math.round((Date.now() - new Date(clockedInAt).getTime()) / 60000))
  );
  useEffect(() => {
    const tick = () => {
      setLabel(
        formatDurationMinutes(Math.round((Date.now() - new Date(clockedInAt).getTime()) / 60000))
      );
    };
    tick();
    // Minute precision — no need to re-render every second on mobile
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [clockedInAt]);
  return <span className="text-slate-400 text-[11px] sm:text-xs tabular-nums">{label}</span>;
}

interface ActiveShiftPanelProps {
  entries: ActiveClockEntry[];
}

const ActiveShiftPanel = memo(function ActiveShiftPanel({ entries }: ActiveShiftPanelProps) {
  return (
    <div className="bg-slate-800 border-t border-slate-700 px-3 sm:px-4 py-2 sm:py-3 shrink-0">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-slate-300 text-xs sm:text-sm font-medium truncate">
            Currently On Shift
          </span>
        </div>
        <span className="bg-emerald-900/60 text-emerald-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full shrink-0">
          {entries.length} staff
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="text-slate-500 text-xs sm:text-sm py-1.5 sm:py-2 text-center">
          No staff currently on shift
        </p>
      ) : (
        <div className="flex gap-2 sm:gap-3 overflow-x-auto overscroll-x-contain pb-0.5 sm:pb-1 mt-1.5 sm:mt-2 -mx-0.5 px-0.5 touch-pan-x">
          {entries.map((entry) => (
            <div
              key={entry.session_id}
              className="flex-shrink-0 flex items-center gap-2 bg-slate-700 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2"
            >
              {entry.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.photo_url}
                  alt=""
                  width={40}
                  height={40}
                  decoding="async"
                  loading="lazy"
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs sm:text-sm font-semibold shrink-0">
                  {employeeInitials(entry.full_name)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-white text-xs sm:text-sm font-medium max-w-[88px] sm:max-w-[100px] truncate">
                  {entry.full_name}
                </p>
                <p className="text-emerald-400 text-[11px] sm:text-xs">
                  In at {formatSastHm(entry.clocked_in_at)}
                </p>
                <p className="text-slate-500 text-xs">{formatShiftShort(entry.shift_type)}</p>
                <LiveDuration clockedInAt={entry.clocked_in_at} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const keypadBtnClass =
  'aspect-square w-full max-h-[4.5rem] sm:max-h-[5rem] md:max-h-[5.5rem] rounded-2xl bg-white/15 active:bg-white/30 text-white flex items-center justify-center disabled:opacity-50 touch-manipulation select-none border border-white/20 [-webkit-tap-highlight-color:transparent]';

interface PinKeypadProps {
  verifying: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
}

const PinKeypad = memo(function PinKeypad({ verifying, onDigit, onBackspace }: PinKeypadProps) {
  const press = useCallback(
    (e: React.PointerEvent, action: () => void) => {
      if (e.button !== 0 || verifying) return;
      e.preventDefault();
      action();
    },
    [verifying]
  );

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[260px] sm:max-w-[300px] md:max-w-[340px]">
      {KEYPAD_KEYS.map((key, idx) => {
        if (key === '') {
          return <div key={`empty-${idx}`} />;
        }
        if (key === 'back') {
          return (
            <button
              key="back"
              type="button"
              onPointerDown={(e) => press(e, onBackspace)}
              disabled={verifying}
              className={keypadBtnClass}
              aria-label="Backspace"
            >
              <Delete className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          );
        }
        return (
          <button
            key={key}
            type="button"
            onPointerDown={(e) => press(e, () => onDigit(key))}
            disabled={verifying}
            className={cn(keypadBtnClass, 'text-2xl sm:text-3xl font-semibold')}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
});

interface KioskScreenProps {
  isKioskMode?: boolean;
}

export default function KioskScreen({ isKioskMode = false }: KioskScreenProps) {
  const [screen, setScreen] = useState<Screen>('pin');
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [exitingKiosk, setExitingKiosk] = useState(false);
  const [kioskLocked, setKioskLocked] = useState(isKioskMode);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitPin, setExitPin] = useState('');
  const [exitError, setExitError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<VerifiedEmployee | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [elapsedLabel, setElapsedLabel] = useState('');
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [selectedShift, setSelectedShift] = useState<'day' | 'night' | null>(null);
  const [sessionShiftType, setSessionShiftType] = useState<string | null>(null);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  const { data: activeData } = useActiveClockEntries({ refetchInterval: 60_000 });
  const activeEntries = Array.isArray(activeData?.data) ? activeData.data : [];

  useEffect(() => {
    setKioskLocked(isKioskMode);
  }, [isKioskMode]);

  // Confirm lock state from the server (httpOnly cookie is not readable in JS)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/kiosk-mode', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.active) setKioskLocked(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Lock browser history when in kiosk mode so back cannot leave /clocking
  useEffect(() => {
    if (!kioskLocked) return;
    window.history.pushState(null, '', '/clocking');
    const handlePopState = () => {
      window.history.pushState(null, '', '/clocking');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [kioskLocked]);

  const handleExitKioskMode = async () => {
    if (exitingKiosk) return;
    const pinValue = exitPin.trim();
    if (!/^\d{4}$/.test(pinValue)) {
      setExitError('Enter your 4-digit admin kiosk PIN');
      return;
    }

    setExitingKiosk(true);
    setExitError(null);
    try {
      const res = await fetch('/api/kiosk-mode', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: pinValue, action: 'exit' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setExitError(
          data?.error ||
            (res.status === 401 ? 'Invalid admin PIN' : 'Could not exit kiosk mode. Try again.')
        );
        setExitingKiosk(false);
        return;
      }

      setKioskLocked(false);
      setExitDialogOpen(false);
      setExitPin('');
      window.location.assign('/dashboard');
    } catch {
      setExitError('Could not exit kiosk mode. Try again.');
      setExitingKiosk(false);
    }
  };

  useEffect(() => {
    if (screen !== 'confirm' || !sessionStartedAt) {
      setElapsedLabel('');
      return;
    }
    const tick = () => {
      const mins = Math.round((Date.now() - new Date(sessionStartedAt).getTime()) / 60000);
      setElapsedLabel(formatDurationMinutes(mins));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [screen, sessionStartedAt]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const resetToPin = useCallback(() => {
    clearIdleTimer();
    setScreen('pin');
    setPin('');
    setError(null);
    setShake(false);
    setEmployee(null);
    setSessionStartedAt(null);
    setSuccess(null);
    setSelectedShift(null);
    setSessionShiftType(null);
    setVerifying(false);
    setActionLoading(false);
    submittingRef.current = false;
  }, [clearIdleTimer]);

  const scheduleIdleClear = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      setPin('');
      setError(null);
    }, IDLE_CLEAR_MS);
  }, [clearIdleTimer]);

  useEffect(() => () => clearIdleTimer(), [clearIdleTimer]);

  useEffect(() => {
    if (screen !== 'success') return;
    const id = setTimeout(resetToPin, SUCCESS_RETURN_MS);
    return () => clearTimeout(id);
  }, [screen, resetToPin]);

  const verifyPin = useCallback(
    async (fullPin: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setVerifying(true);
      setError(null);

      try {
        const res = await fetch('/api/clocking/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: fullPin }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setShake(true);
          setError(data.error || 'Invalid PIN');
          setTimeout(() => {
            setShake(false);
            setPin('');
            setError(null);
            submittingRef.current = false;
          }, 500);
          scheduleIdleClear();
          return;
        }

        const emp = data.employee as VerifiedEmployee;
        setEmployee(emp);
        setSessionStartedAt(emp.is_clocked_in ? emp.clocked_in_at ?? null : null);
        setSelectedShift(null);
        setSessionShiftType(null);

        if (emp.is_clocked_in) {
          try {
            const statusRes = await fetch(
              `/api/clocking/status?employee_id=${encodeURIComponent(emp.id)}`
            );
            const statusData = await statusRes.json();
            setSessionShiftType(statusData?.data?.current_session?.shift_type ?? null);
          } catch {
            setSessionShiftType(null);
          }
        }

        setPin('');
        setScreen('confirm');
        submittingRef.current = false;
      } catch {
        setShake(true);
        setError('Something went wrong');
        setTimeout(() => {
          setShake(false);
          setPin('');
          submittingRef.current = false;
        }, 500);
      } finally {
        setVerifying(false);
      }
    },
    [scheduleIdleClear]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (verifying || submittingRef.current) return;
      clearIdleTimer();
      setError(null);
      setPin((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = prev + digit;
        if (next.length === PIN_LENGTH) {
          void verifyPin(next);
        } else {
          scheduleIdleClear();
        }
        return next;
      });
    },
    [verifying, clearIdleTimer, scheduleIdleClear, verifyPin]
  );

  const handleBackspace = useCallback(() => {
    if (verifying || submittingRef.current) return;
    clearIdleTimer();
    setError(null);
    setPin((prev) => {
      const next = prev.slice(0, -1);
      if (next.length > 0) scheduleIdleClear();
      return next;
    });
  }, [verifying, clearIdleTimer, scheduleIdleClear]);

  const handleClear = useCallback(() => {
    if (verifying || submittingRef.current) return;
    clearIdleTimer();
    setPin('');
    setError(null);
  }, [verifying, clearIdleTimer]);

  const handleClockAction = async (action: 'clock_in' | 'clock_out') => {
    if (!employee || actionLoading) return;
    if (action === 'clock_in' && !selectedShift) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/clocking/${action === 'clock_in' ? 'clock-in' : 'clock-out'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'clock_in'
            ? { employee_id: employee.id, shift_type: selectedShift }
            : { employee_id: employee.id }
        ),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Action failed');
        setActionLoading(false);
        return;
      }

      const clockedAt = data.clocked_at || new Date().toISOString();
      if (action === 'clock_in') {
        setSuccess({
          type: 'clock_in',
          timeLabel: formatSastHm(clockedAt),
          shiftType: selectedShift ?? data.shift_type ?? undefined,
        });
        setScreen('success');
        // Fire celebration — both run simultaneously (fire-and-forget)
        playClockInCheer();
        void fireClockInConfetti();
      } else {
        setSuccess({
          type: 'clock_out',
          timeLabel: formatSastHm(clockedAt),
          shiftType: data.shift_type ?? undefined,
          durationLabel: data.duration_formatted,
          regularLabel: data.regular_formatted,
          overtimeLabel: data.overtime_formatted,
          hadOvertime: !!data.had_overtime,
        });
        setScreen('success');
        playLogoutChime();
      }
    } catch {
      setError('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  let mainContent: React.ReactNode;

  if (screen === 'success' && success) {
    const isIn = success.type === 'clock_in';
    mainContent = (
      <div
        className={cn(
          'min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-6',
          isIn ? 'bg-emerald-600' : 'bg-sky-600'
        )}
      >
        {isIn && <div className="text-5xl sm:text-6xl mb-4">🎉</div>}
        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-white/20 flex items-center justify-center mb-6 sm:mb-8">
          <Check className="w-12 h-12 sm:w-16 sm:h-16 text-white" strokeWidth={3} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-2 sm:mb-3 px-2">
          {isIn
            ? `Clocked In at ${success.timeLabel}`
            : `Clocked Out — You worked ${success.durationLabel ?? ''}`}
        </h1>
        {isIn && success.shiftType && (
          <span className="mt-2 px-4 py-1.5 rounded-full bg-white/20 text-white text-sm sm:text-base">
            {formatShiftBadge(success.shiftType)}
          </span>
        )}
        {!isIn && success.hadOvertime && success.overtimeLabel && (
          <div className="mt-4 px-4 py-2 rounded-xl bg-amber-400/90 text-amber-950 text-sm sm:text-base font-medium text-center">
            Includes {success.overtimeLabel} overtime
          </div>
        )}
        {!isIn && !success.hadOvertime && (
          <p className="mt-4 text-emerald-100 text-sm sm:text-base font-medium">
            Within shift hours
          </p>
        )}
        <p className="mt-6 sm:mt-8 text-white/70 text-sm">Returning to PIN entry…</p>
      </div>
    );
  } else if (screen === 'confirm' && employee) {
    mainContent = (
      <div className="min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-4 sm:py-8 md:py-10 w-full max-w-lg mx-auto bg-blue-900">
        <Image
          src="/rsllogo.png"
          alt="RSL Express"
          width={280}
          height={36}
          className="h-6 sm:h-8 w-auto object-contain mb-4 sm:mb-8 md:mb-10 brightness-0 invert opacity-90"
          priority
        />

        <div className="mb-3 sm:mb-5 md:mb-6">
          {employee.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={employee.photo_url}
              alt={employee.full_name}
              width={160}
              height={160}
              decoding="async"
              className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 rounded-full object-cover mx-auto"
            />
          ) : (
            <div className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 rounded-full bg-blue-700 flex items-center justify-center text-white text-3xl sm:text-4xl md:text-5xl font-bold mx-auto">
              {employeeInitials(employee.full_name)}
            </div>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-1 sm:mb-2 px-2">
          {employee.full_name}
        </h2>
        {employee.role && (
          <p className="text-blue-200 text-sm sm:text-base mb-4 sm:mb-6">{employee.role}</p>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-300 text-center" role="alert">
            {error}
          </p>
        )}

        {employee.is_clocked_in ? (
          <div className="w-full space-y-4">
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-center">
              <p className="text-blue-100 text-sm">Clocked in</p>
              <p className="text-white text-lg font-semibold tabular-nums">
                {sessionStartedAt ? formatSastHm(sessionStartedAt) : '—'}
                {elapsedLabel ? ` · ${elapsedLabel}` : ''}
              </p>
              {sessionShiftType && (
                <p className="text-blue-200 text-sm mt-1">
                  {formatShiftBadge(sessionShiftType as 'day' | 'night')}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void handleClockAction('clock_out')}
              className="w-full h-14 sm:h-16 rounded-2xl bg-red-500 active:bg-red-600 text-white text-lg sm:text-xl font-bold disabled:opacity-60 touch-manipulation [-webkit-tap-highlight-color:transparent]"
            >
              {actionLoading ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              ) : (
                'CLOCK OUT'
              )}
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedShift('day')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-2xl border-2 p-4 touch-manipulation [-webkit-tap-highlight-color:transparent]',
                  selectedShift === 'day'
                    ? 'border-amber-300 bg-amber-400/20 text-white'
                    : 'border-white/20 bg-white/10 text-blue-100'
                )}
              >
                <Sun className="w-7 h-7 mb-2" />
                <span className="font-semibold">Day</span>
                <span className="text-xs opacity-80">09:00–17:00</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedShift('night')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-2xl border-2 p-4 touch-manipulation [-webkit-tap-highlight-color:transparent]',
                  selectedShift === 'night'
                    ? 'border-indigo-300 bg-indigo-400/20 text-white'
                    : 'border-white/20 bg-white/10 text-blue-100'
                )}
              >
                <Moon className="w-7 h-7 mb-2" />
                <span className="font-semibold">Night</span>
                <span className="text-xs opacity-80">17:00–05:00</span>
              </button>
            </div>

            <button
              type="button"
              disabled={actionLoading || !selectedShift}
              onClick={() => void handleClockAction('clock_in')}
              className="w-full h-14 sm:h-16 rounded-2xl bg-emerald-500 active:bg-emerald-600 text-white text-lg sm:text-xl font-bold disabled:opacity-40 disabled:bg-slate-600 touch-manipulation [-webkit-tap-highlight-color:transparent]"
            >
              {actionLoading ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              ) : (
                'CLOCK IN'
              )}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={resetToPin}
          disabled={actionLoading}
          className="mt-5 sm:mt-8 text-slate-400 active:text-white text-sm sm:text-base underline-offset-4 touch-manipulation min-h-[44px] px-4"
        >
          Cancel
        </button>
      </div>
    );
  } else {
    mainContent = (
      <div className="min-h-full relative overflow-hidden">
        <BlueAuthBackdrop animated={false} />
        <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-3 sm:px-4 py-3 sm:py-6 md:py-8 w-full max-w-md md:max-w-lg mx-auto">
          <Image
            src="/rsllogo.png"
            alt="RSL Express"
            width={280}
            height={36}
            className="h-6 sm:h-8 md:h-9 w-auto object-contain mb-3 sm:mb-6 md:mb-8 brightness-0 invert opacity-90"
            priority
          />

          <KioskLiveClock />

          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-white mb-3 sm:mb-5 md:mb-6">
            Enter Your PIN
          </h2>

          <div
            className={cn(
              'flex items-center justify-center gap-3 sm:gap-4 mb-2 sm:mb-3',
              shake && 'animate-[shake_0.35s_ease-in-out]'
            )}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2',
                  i < pin.length ? 'bg-white border-white' : 'bg-transparent border-white/40'
                )}
              />
            ))}
          </div>

          <p className="h-5 sm:h-6 mb-3 sm:mb-5 md:mb-6 text-xs sm:text-sm text-red-300 text-center">
            {error || (verifying ? 'Verifying…' : '')}
          </p>

          <PinKeypad verifying={verifying} onDigit={handleDigit} onBackspace={handleBackspace} />

          <button
            type="button"
            onPointerDown={(e) => {
              if (e.button !== 0 || verifying || pin.length === 0) return;
              e.preventDefault();
              handleClear();
            }}
            disabled={verifying || pin.length === 0}
            className="mt-3 sm:mt-5 md:mt-6 text-blue-100/70 active:text-white text-sm sm:text-base disabled:opacity-40 touch-manipulation min-h-[44px] px-4 [-webkit-tap-highlight-color:transparent]"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col relative">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {mainContent}
      </div>
      <ActiveShiftPanel entries={activeEntries} />
      {kioskLocked && screen === 'pin' && (
        <button
          type="button"
          onClick={() => {
            setExitError(null);
            setExitPin('');
            setExitDialogOpen(true);
          }}
          disabled={exitingKiosk}
          className="absolute top-3 right-3 z-20 rounded-md px-2.5 py-1.5 text-xs text-white/75 underline underline-offset-2 active:text-white active:bg-white/10 disabled:opacity-50 touch-manipulation"
        >
          Exit Kiosk Mode
        </button>
      )}

      <Dialog
        open={exitDialogOpen}
        onOpenChange={(open) => {
          if (exitingKiosk) return;
          setExitDialogOpen(open);
          if (!open) {
            setExitError(null);
            setExitPin('');
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exit Kiosk Mode</DialogTitle>
            <DialogDescription>
              Enter the admin kiosk PIN to unlock this device and return to the main site.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="kiosk-exit-pin">Admin kiosk PIN</Label>
            <Input
              id="kiosk-exit-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={exitPin}
              onChange={(e) => {
                setExitPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                if (exitError) setExitError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleExitKioskMode();
                }
              }}
              disabled={exitingKiosk}
              placeholder="••••"
              className="text-center text-lg tracking-[0.4em]"
              autoFocus
            />
          </div>
          {exitError && (
            <p className="text-sm text-red-600" role="alert">
              {exitError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExitDialogOpen(false)}
              disabled={exitingKiosk}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleExitKioskMode()}
              disabled={exitingKiosk || exitPin.length !== 4}
            >
              {exitingKiosk ? 'Exiting…' : 'Exit Kiosk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
