'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Check, Delete, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDurationMinutes } from '@/lib/clocking-utils';

const SAST = 'Africa/Johannesburg';
const PIN_LENGTH = 4;
const IDLE_CLEAR_MS = 3000;
const SUCCESS_RETURN_MS = 3000;

type Screen = 'pin' | 'confirm' | 'success';

interface VerifiedEmployee {
  id: string;
  full_name: string;
  role: string | null;
  shift_type: string;
  photo_url: string | null;
  is_clocked_in: boolean;
}

interface SuccessInfo {
  type: 'clock_in' | 'clock_out';
  timeLabel: string;
  durationLabel?: string;
}

function employeeInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

function formatLiveClock(date: Date) {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: SAST,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: SAST,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  return { time, dateLabel };
}

function formatSastHm(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SAST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export default function KioskScreen() {
  const [screen, setScreen] = useState<Screen>('pin');
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [employee, setEmployee] = useState<VerifiedEmployee | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [elapsedLabel, setElapsedLabel] = useState('');
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  // Live clock — only after mount to avoid SSR/client time hydration mismatch
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Live session duration when clocked in
  useEffect(() => {
    if (screen !== 'confirm' || !sessionStartedAt) {
      setElapsedLabel('');
      return;
    }
    const tick = () => {
      const mins = Math.round(
        (Date.now() - new Date(sessionStartedAt).getTime()) / 60000
      );
      setElapsedLabel(formatDurationMinutes(mins));
    };
    tick();
    const id = setInterval(tick, 1000);
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

  // Auto-return from success
  useEffect(() => {
    if (screen !== 'success') return;
    const id = setTimeout(resetToPin, SUCCESS_RETURN_MS);
    return () => clearTimeout(id);
  }, [screen, resetToPin]);

  const verifyPin = useCallback(async (fullPin: string) => {
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
        }, 800);
        scheduleIdleClear();
        return;
      }

      const emp = data.employee as VerifiedEmployee;
      setEmployee(emp);

      if (emp.is_clocked_in) {
        const statusRes = await fetch(`/api/clocking/status?employee_id=${emp.id}`);
        const statusData = await statusRes.json();
        const started =
          statusData?.data?.current_session?.clocked_in_at ?? null;
        setSessionStartedAt(started);
      } else {
        setSessionStartedAt(null);
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
      }, 800);
    } finally {
      setVerifying(false);
    }
  }, [scheduleIdleClear]);

  const handleDigit = (digit: string) => {
    if (verifying || screen !== 'pin') return;
    clearIdleTimer();
    setError(null);
    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = prev + digit;
      if (next.length === PIN_LENGTH) {
        setTimeout(() => void verifyPin(next), 50);
      } else {
        scheduleIdleClear();
      }
      return next;
    });
  };

  const handleBackspace = () => {
    if (verifying || screen !== 'pin') return;
    clearIdleTimer();
    setError(null);
    setPin((prev) => {
      const next = prev.slice(0, -1);
      if (next.length > 0) scheduleIdleClear();
      return next;
    });
  };

  const handleClear = () => {
    if (verifying || screen !== 'pin') return;
    clearIdleTimer();
    setPin('');
    setError(null);
  };

  const handleClockAction = async (action: 'clock_in' | 'clock_out') => {
    if (!employee || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/clocking/${action === 'clock_in' ? 'clock-in' : 'clock-out'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employee.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Action failed');
        setActionLoading(false);
        return;
      }

      const clockedAt = data.clocked_at || new Date().toISOString();
      setSuccess({
        type: action,
        timeLabel: formatSastHm(clockedAt),
        durationLabel: action === 'clock_out' ? data.duration_formatted : undefined,
      });
      setScreen('success');
    } catch {
      setError('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const { time, dateLabel } = now
    ? formatLiveClock(now)
    : { time: '--:--:--', dateLabel: '\u00A0' };


  if (screen === 'success' && success) {
    const isIn = success.type === 'clock_in';
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center px-6 transition-colors duration-500',
          isIn ? 'bg-emerald-600' : 'bg-sky-600'
        )}
      >
        <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-8 animate-bounce">
          <Check className="w-16 h-16 text-white" strokeWidth={3} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-3">
          {isIn ? `Clocked In at ${success.timeLabel}` : 'Clocked Out'}
        </h1>
        {!isIn && success.durationLabel && (
          <p className="text-xl sm:text-2xl text-white/90 text-center">
            You worked {success.durationLabel}
          </p>
        )}
        <p className="mt-8 text-white/70 text-sm">Returning to PIN entry…</p>
      </div>
    );
  }

  if (screen === 'confirm' && employee) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 max-w-lg mx-auto">
        <Image
          src="/rsllogo.png"
          alt="RSL Express"
          width={280}
          height={36}
          className="h-8 w-auto object-contain mb-10 brightness-0 invert opacity-90"
          priority
        />

        <div className="mb-6">
          {employee.photo_url ? (
            <div className="relative h-40 w-40 overflow-hidden rounded-full mx-auto">
              <Image
                src={employee.photo_url}
                alt={employee.full_name}
                fill
                className="object-cover"
                sizes="160px"
                priority
              />
            </div>
          ) : (
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-slate-700 text-4xl font-semibold text-white">
              {employeeInitials(employee.full_name)}
            </div>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-3">
          {employee.full_name}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {employee.role && (
            <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-200 text-sm">
              {employee.role}
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-200 text-sm capitalize">
            {employee.shift_type} shift
          </span>
        </div>

        {error && (
          <p className="mb-4 text-red-400 text-sm text-center">{error}</p>
        )}

        {employee.is_clocked_in ? (
          <div className="w-full space-y-6">
            <div className="text-center space-y-1">
              <p className="text-slate-400 text-sm">Clocked in since</p>
              <p className="text-2xl font-semibold text-white">
                {sessionStartedAt ? formatSastHm(sessionStartedAt) : '—'}
              </p>
              <p className="text-emerald-400 text-lg font-medium tabular-nums">
                {elapsedLabel || '0h 0m'}
              </p>
            </div>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void handleClockAction('clock_out')}
              className="w-full h-16 rounded-2xl bg-red-500 hover:bg-red-400 active:bg-red-600 text-white text-xl font-bold transition-colors disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              ) : (
                'CLOCK OUT'
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => void handleClockAction('clock_in')}
            className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white text-xl font-bold transition-colors disabled:opacity-60"
          >
            {actionLoading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : (
              'CLOCK IN'
            )}
          </button>
        )}

        <button
          type="button"
          onClick={resetToPin}
          disabled={actionLoading}
          className="mt-8 text-slate-400 hover:text-white text-base underline-offset-4 hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  // STATE 1 — PIN Entry
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full">
      <Image
        src="/rsllogo.png"
        alt="RSL Express"
        width={280}
        height={36}
        className="h-8 sm:h-9 w-auto object-contain mb-8 brightness-0 invert opacity-90"
        priority
      />

      <div className="text-center mb-8">
        <p
          className={cn(
            'text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-white',
            !mounted && 'invisible'
          )}
          suppressHydrationWarning
        >
          {time}
        </p>
        <p
          className={cn(
            'mt-2 text-slate-400 text-base sm:text-lg',
            !mounted && 'invisible'
          )}
          suppressHydrationWarning
        >
          {dateLabel}
        </p>
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold text-white mb-6">
        Enter Your PIN
      </h2>

      <div
        className={cn(
          'flex items-center justify-center gap-4 mb-3',
          shake && 'animate-[shake_0.4s_ease-in-out]'
        )}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 transition-colors',
              i < pin.length
                ? 'bg-white border-white'
                : 'bg-transparent border-slate-500'
            )}
          />
        ))}
      </div>

      <p className="h-6 mb-6 text-sm text-red-400 text-center">
        {error || (verifying ? 'Verifying…' : '')}
      </p>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
        {keys.map((key, idx) => {
          if (key === '') {
            return <div key={`empty-${idx}`} />;
          }
          if (key === 'back') {
            return (
              <button
                key="back"
                type="button"
                onClick={handleBackspace}
                disabled={verifying}
                className="min-h-[72px] min-w-[72px] rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                aria-label="Backspace"
              >
                <Delete className="w-7 h-7" />
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleDigit(key)}
              disabled={verifying}
              className="min-h-[72px] min-w-[72px] rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white text-3xl font-semibold transition-colors disabled:opacity-50"
            >
              {key}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleClear}
        disabled={verifying || pin.length === 0}
        className="mt-6 text-slate-400 hover:text-white text-base disabled:opacity-40"
      >
        Clear
      </button>
    </div>
  );
}
