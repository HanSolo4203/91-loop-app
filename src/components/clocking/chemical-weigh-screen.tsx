'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Check, Delete, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSastTime } from '@/lib/clocking-utils';
import { playClockInCheer } from '@/lib/utils/sounds';
import { fireClockInConfetti } from '@/lib/utils/confetti';
import { BlueAuthBackdrop } from '@/components/auth/blue-auth-backdrop';
import NumericKeypad from '@/components/ui/numeric-keypad';

const SAST = 'Africa/Johannesburg';
const PIN_LENGTH = 4;
const IDLE_CLEAR_MS = 3000;
const SIGN_OUT_IDLE_MS = 90_000;
const SUCCESS_RETURN_MS = 1800;
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

const keypadBtnClass =
  'aspect-square w-full h-16 max-h-[4.5rem] rounded-2xl bg-white/15 active:bg-white/30 text-white flex items-center justify-center disabled:opacity-50 touch-manipulation select-none border border-white/20 [-webkit-tap-highlight-color:transparent]';

const touchKeyClass = 'h-16 min-h-16 text-2xl font-bold text-slate-900';

type Screen = 'pin' | 'grid' | 'start' | 'end' | 'success';
type WeightField = 'end' | 'added';

interface VerifiedEmployee {
  id: string;
  full_name: string;
  role: string | null;
  photo_url: string | null;
}

interface OpenWeighIn {
  id: string;
  start_kg: number;
  added_l: number;
  start_employee_name: string;
  start_recorded_at: string;
}

interface ClosedToday {
  id: string;
  used_l: number | null;
  end_employee_name: string;
}

interface ChemicalProduct {
  id: string;
  name: string;
  container_size_l: number;
  kg_per_litre: number;
  suggested_start_kg: number | null;
  open_weigh_in: OpenWeighIn | null;
  closed_today: ClosedToday | null;
}

interface HighUsagePrompt {
  usedL: number;
  avg: number;
}

interface SuccessInfo {
  title: string;
  detail: string;
}

function employeeInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function formatOneDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function formatContainer(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** One decimal place. A trailing dot counts as the digits before it. */
function parseAmount(raw: string): number | null {
  const trimmed = raw.trim().replace(/\.$/, '');
  if (!/^\d+(\.\d)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

function usedLitres(startKg: number, endKg: number, addedL: number, kgPerLitre: number): number {
  const density = kgPerLitre > 0 ? kgPerLitre : 1;
  return (startKg + addedL * density - endKg) / density;
}

function normalizeProduct(raw: unknown): ChemicalProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;

  const openRaw = row.open_weigh_in;
  let open: OpenWeighIn | null = null;
  if (openRaw && typeof openRaw === 'object') {
    const openRow = openRaw as Record<string, unknown>;
    if (typeof openRow.id === 'string') {
      open = {
        id: openRow.id,
        start_kg: asNumber(openRow.start_kg),
        added_l: asNumber(openRow.added_l),
        start_employee_name:
          typeof openRow.start_employee_name === 'string' ? openRow.start_employee_name : 'Unknown',
        start_recorded_at:
          typeof openRow.start_recorded_at === 'string' ? openRow.start_recorded_at : '',
      };
    }
  }

  const closedRaw = row.closed_today;
  let closed: ClosedToday | null = null;
  if (closedRaw && typeof closedRaw === 'object') {
    const closedRow = closedRaw as Record<string, unknown>;
    if (typeof closedRow.id === 'string') {
      closed = {
        id: closedRow.id,
        used_l: closedRow.used_l == null ? null : asNumber(closedRow.used_l),
        end_employee_name:
          typeof closedRow.end_employee_name === 'string' ? closedRow.end_employee_name : 'Unknown',
      };
    }
  }

  return {
    id: row.id,
    name: row.name,
    container_size_l: asNumber(row.container_size_l),
    kg_per_litre: asNumber(row.kg_per_litre, 1) || 1,
    suggested_start_kg: row.suggested_start_kg == null ? null : asNumber(row.suggested_start_kg),
    open_weigh_in: open,
    closed_today: closed,
  };
}

function tileMode(product: ChemicalProduct): 'needed' | 'open' | 'done' {
  // An open container still needs an end weight, even if another row closed today.
  if (product.open_weigh_in) return 'open';
  if (product.closed_today) return 'done';
  return 'needed';
}

function startedClock(iso: string): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return '';
  return formatSastTime(iso);
}

function openStateLabel(open: OpenWeighIn): string {
  const clock = startedClock(open.start_recorded_at);
  if (!clock) return `In use — started by ${open.start_employee_name}`;
  return `In use — started ${clock} by ${open.start_employee_name}`;
}

function doneStateLabel(closed: ClosedToday): string {
  if (closed.used_l == null) return 'Done tonight ✓';
  return `Done tonight ✓ ${formatOneDecimal(closed.used_l)} L used`;
}

async function readBody(res: Response): Promise<Record<string, unknown>> {
  try {
    const data = await res.json();
    if (data && typeof data === 'object') return data as Record<string, unknown>;
  } catch {
    // Non-JSON bodies still need a plain message below.
  }
  return {};
}

const KioskLiveClock = memo(function KioskLiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-center mb-3">
      <p className="text-5xl font-bold tabular-nums tracking-tight text-white">
        {timeFormatter.format(now)}
      </p>
      <p className="mt-1 text-blue-100/80 text-base px-2">
        {dateFormatter.format(now)}
      </p>
    </div>
  );
});

function EmployeePhoto({
  employee,
  className,
}: {
  employee: VerifiedEmployee;
  className: string;
}) {
  if (employee.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={employee.photo_url}
        alt=""
        width={80}
        height={80}
        decoding="async"
        className={cn('rounded-full object-cover shrink-0', className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-full bg-blue-700 flex items-center justify-center text-white font-bold shrink-0',
        className
      )}
    >
      {employeeInitials(employee.full_name)}
    </div>
  );
}

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
        if (key === '') return <div key={`empty-${idx}`} />;
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

function BackToClockIn({ className }: { className?: string }) {
  return (
    <Link
      href="/clocking"
      className={cn(
        'inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 text-lg font-semibold text-white active:bg-white/25 touch-manipulation [-webkit-tap-highlight-color:transparent]',
        className
      )}
    >
      <ArrowLeft className="h-6 w-6 shrink-0" aria-hidden />
      Back to clock in
    </Link>
  );
}

function ScaleKeypad({
  value,
  onChange,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}) {
  return (
    <NumericKeypad
      value={value}
      onChange={onChange}
      allowDecimal
      decimalPlaces={1}
      maxLength={maxLength}
      placeholder="0.0"
      buttonClassName={touchKeyClass}
      displayClassName="min-h-20 text-5xl font-bold tracking-tight font-sans"
      className="w-full max-w-md border-white/40 shadow-xl"
    />
  );
}

function PlainError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-xl font-semibold text-red-200 text-center" role="alert">
      {message}
    </p>
  );
}

interface ChemicalWeighScreenProps {
  isKioskMode?: boolean;
}

export default function ChemicalWeighScreen({ isKioskMode = false }: ChemicalWeighScreenProps) {
  const [screen, setScreen] = useState<Screen>('pin');
  const [pin, setPin] = useState('');
  // Kept in memory for each save. Never written to localStorage or sessionStorage.
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [employee, setEmployee] = useState<VerifiedEmployee | null>(null);
  const [kioskLocked, setKioskLocked] = useState(isKioskMode);
  const [products, setProducts] = useState<ChemicalProduct[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChemicalProduct | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [addedInput, setAddedInput] = useState('');
  const [toppedUp, setToppedUp] = useState(false);
  const [activeField, setActiveField] = useState<WeightField>('end');
  const [highUsage, setHighUsage] = useState<HighUsagePrompt | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const sessionRef = useRef(0);

  useEffect(() => {
    setKioskLocked(isKioskMode);
  }, [isKioskMode]);

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

  useEffect(() => {
    if (!kioskLocked) return;
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/clocking')) return;
      window.history.pushState(null, '', '/clocking/chemicals');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [kioskLocked]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const signOut = useCallback(() => {
    sessionRef.current += 1;
    clearIdleTimer();
    submittingRef.current = false;
    setVerifiedPin(null);
    setPin('');
    setEmployee(null);
    setScreen('pin');
    setError(null);
    setShake(false);
    setProducts(null);
    setLoadError(null);
    setSelected(null);
    setStartInput('');
    setEndInput('');
    setAddedInput('');
    setToppedUp(false);
    setActiveField('end');
    setHighUsage(null);
    setSaving(false);
    setSuccess(null);
    setVerifying(false);
  }, [clearIdleTimer]);

  const employeeId = employee?.id ?? null;

  useEffect(() => {
    if (!employeeId) return;
    let timer = window.setTimeout(signOut, SIGN_OUT_IDLE_MS);
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(signOut, SIGN_OUT_IDLE_MS);
    };
    window.addEventListener('pointerdown', bump);
    window.addEventListener('keydown', bump);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', bump);
      window.removeEventListener('keydown', bump);
    };
  }, [employeeId, signOut]);

  const scheduleIdleClear = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      setPin('');
      setError(null);
    }, IDLE_CLEAR_MS);
  }, [clearIdleTimer]);

  useEffect(() => () => clearIdleTimer(), [clearIdleTimer]);

  const loadProducts = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/clocking/chemicals', { cache: 'no-store' });
      const data = await readBody(res);
      if (!res.ok || data.success === false) {
        setLoadError(
          typeof data.error === 'string' ? data.error : 'Could not load the chemicals. Try again.'
        );
        return;
      }
      const rows = Array.isArray(data.products) ? data.products : [];
      setProducts(rows.map(normalizeProduct).filter((row): row is ChemicalProduct => row != null));
    } catch {
      setLoadError('Could not load the chemicals. Try again.');
    }
  }, []);

  useEffect(() => {
    if (screen !== 'grid') return;
    void loadProducts();
  }, [screen, loadProducts]);

  useEffect(() => {
    if (screen !== 'success') return;
    const id = window.setTimeout(() => {
      setSuccess(null);
      setScreen('grid');
    }, SUCCESS_RETURN_MS);
    return () => window.clearTimeout(id);
  }, [screen]);

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
        const data = await readBody(res);

        if (!res.ok || data.success === false) {
          setShake(true);
          setError(typeof data.error === 'string' ? data.error : 'Invalid PIN');
          setTimeout(() => {
            setShake(false);
            setPin('');
            setError(null);
            submittingRef.current = false;
          }, 500);
          scheduleIdleClear();
          return;
        }

        const emp = data.employee as VerifiedEmployee | undefined;
        if (!emp?.id || !emp.full_name) {
          setShake(true);
          setError('Unable to verify PIN');
          setTimeout(() => {
            setShake(false);
            setPin('');
            submittingRef.current = false;
          }, 500);
          return;
        }

        setVerifiedPin(fullPin);
        setEmployee({
          id: emp.id,
          full_name: emp.full_name,
          role: emp.role ?? null,
          photo_url: emp.photo_url ?? null,
        });
        setPin('');
        setScreen('grid');
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

  const openStart = (product: ChemicalProduct) => {
    setSelected(product);
    setStartInput(
      product.suggested_start_kg == null ? '' : formatOneDecimal(product.suggested_start_kg)
    );
    setError(null);
    setScreen('start');
  };

  const openEnd = (product: ChemicalProduct) => {
    setSelected(product);
    setEndInput('');
    setAddedInput('');
    setToppedUp(false);
    setActiveField('end');
    setHighUsage(null);
    setError(null);
    setScreen('end');
  };

  const showSaved = (info: SuccessInfo) => {
    setSuccess(info);
    setScreen('success');
    setSaving(false);
    playClockInCheer();
    void fireClockInConfetti();
  };

  const saveStart = async () => {
    if (!selected || !verifiedPin || saving) return;
    const startKg = parseAmount(startInput);
    if (startKg == null) {
      setError('Enter the start weight.');
      return;
    }
    if (startKg >= 100) {
      setError('Weight must be below 100');
      return;
    }

    const session = sessionRef.current;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/clocking/chemicals/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: verifiedPin,
          product_id: selected.id,
          start_kg: startKg,
        }),
      });
      const data = await readBody(res);
      if (sessionRef.current !== session) return;
      if (!res.ok || data.success === false) {
        setError(
          typeof data.error === 'string' ? data.error : 'Could not save the start weight. Try again.'
        );
        setSaving(false);
        return;
      }
      showSaved({
        title: 'Start weight saved',
        detail: `${selected.name} · ${formatOneDecimal(startKg)} kg`,
      });
    } catch {
      if (sessionRef.current !== session) return;
      setError('Could not save the start weight. Try again.');
      setSaving(false);
    }
  };

  const saveEnd = async (confirmHighUsage: boolean) => {
    if (!selected?.open_weigh_in || !verifiedPin || saving) return;
    const endKg = parseAmount(endInput);
    if (endKg == null) {
      setError('Enter the end weight.');
      return;
    }
    if (endKg >= 100) {
      setError('Weight must be below 100');
      return;
    }
    const addedL = toppedUp ? parseAmount(addedInput) ?? 0 : 0;
    if (toppedUp && addedInput.trim() !== '' && parseAmount(addedInput) == null) {
      setError('Enter how many litres you added.');
      return;
    }
    if (addedL >= 1000) {
      setError('Litres must be below 1000');
      return;
    }

    const session = sessionRef.current;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/clocking/chemicals/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: verifiedPin,
          weigh_in_id: selected.open_weigh_in.id,
          end_kg: endKg,
          added_l: addedL,
          ...(confirmHighUsage ? { confirm_high_usage: true } : {}),
        }),
      });
      const data = await readBody(res);
      if (sessionRef.current !== session) return;

      if (data.needsConfirmation === true) {
        const usedL =
          typeof data.used_l === 'number'
            ? data.used_l
            : usedLitres(selected.open_weigh_in.start_kg, endKg, addedL, selected.kg_per_litre);
        const avg = typeof data.avg === 'number' ? data.avg : 0;
        setHighUsage({ usedL, avg });
        setSaving(false);
        return;
      }

      if (!res.ok || data.success === false) {
        setError(
          typeof data.error === 'string' ? data.error : 'Could not save the end weight. Try again.'
        );
        setSaving(false);
        return;
      }

      const savedUsed =
        data.weigh_in && typeof data.weigh_in === 'object'
          ? (data.weigh_in as { used_l?: unknown }).used_l
          : null;
      const fallbackUsed = usedLitres(
        selected.open_weigh_in.start_kg,
        endKg,
        addedL,
        selected.kg_per_litre
      );
      const usedLabel = formatOneDecimal(
        savedUsed == null ? fallbackUsed : asNumber(savedUsed, fallbackUsed)
      );
      setHighUsage(null);
      showSaved({
        title: 'End weight saved',
        detail: `${selected.name} · Used: ${usedLabel} L`,
      });
    } catch {
      if (sessionRef.current !== session) return;
      setError('Could not save the end weight. Try again.');
      setSaving(false);
    }
  };

  const doneCount = products?.filter((product) => tileMode(product) === 'done').length ?? 0;
  const totalCount = products?.length ?? 0;

  let main: React.ReactNode;

  if (screen === 'success' && success) {
    main = (
      <div className="min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-6 bg-emerald-600">
        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-white/20 flex items-center justify-center mb-6 sm:mb-8">
          <Check className="w-12 h-12 sm:w-16 sm:h-16 text-white" strokeWidth={3} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-3">{success.title}</h1>
        <p className="text-xl sm:text-2xl text-emerald-50 text-center">{success.detail}</p>
        <p className="mt-8 text-white/80 text-lg">Back to the list…</p>
      </div>
    );
  } else if (screen === 'pin' || !employee) {
    main = (
      <div className="min-h-full relative overflow-hidden">
        <BlueAuthBackdrop animated={false} />
        <BackToClockIn className="absolute top-3 left-3 z-20" />
        <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-3 sm:px-4 py-4 w-full max-w-md md:max-w-lg mx-auto">
          <Image
            src="/rsllogo.png"
            alt="RSL Express"
            width={280}
            height={36}
            className="h-7 w-auto object-contain mb-3 brightness-0 invert opacity-90"
            style={{ width: 'auto' }}
            priority
          />
          <KioskLiveClock />
          <h2 className="text-2xl sm:text-3xl font-semibold text-white text-center mb-3 px-2">
            Enter your PIN to weigh chemicals
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
          <p className="h-7 mb-3 text-base text-red-300 text-center">
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
            className="mt-3 text-blue-100/70 active:text-white text-base disabled:opacity-40 touch-manipulation min-h-16 px-4 [-webkit-tap-highlight-color:transparent]"
          >
            Clear
          </button>
        </div>
      </div>
    );
  } else if (screen === 'start' && selected) {
    const suggested = selected.suggested_start_kg;
    main = (
      <div className="min-h-full px-4 py-4 sm:px-6 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => setScreen('grid')}
          className="self-start min-h-16 px-5 rounded-2xl bg-white/10 border border-white/25 text-lg font-semibold active:bg-white/25 touch-manipulation"
        >
          All chemicals
        </button>
        <h2 className="text-3xl sm:text-4xl font-bold text-center">{selected.name}</h2>
        <p className="text-xl text-blue-100">{formatContainer(selected.container_size_l)} L container</p>
        <p className="text-2xl font-semibold">Start weight (kg)</p>
        <ScaleKeypad
          value={startInput}
          maxLength={4}
          onChange={(value) => {
            setStartInput(value);
            setError(null);
          }}
        />
        {suggested != null && (
          <p className="max-w-md text-center text-lg text-blue-100">
            Last end weight: {formatOneDecimal(suggested)} kg — change it if the container was refilled
          </p>
        )}
        <PlainError message={error} />
        <button
          type="button"
          disabled={saving || parseAmount(startInput) == null}
          onClick={() => void saveStart()}
          className="w-full max-w-md min-h-16 rounded-2xl bg-emerald-500 active:bg-emerald-600 text-white text-2xl font-bold disabled:opacity-40 disabled:bg-slate-600 touch-manipulation"
        >
          {saving ? <Loader2 className="w-7 h-7 animate-spin mx-auto" /> : 'Save'}
        </button>
      </div>
    );
  } else if (screen === 'end' && selected?.open_weigh_in) {
    const open = selected.open_weigh_in;
    const endKg = parseAmount(endInput);
    const addedL = toppedUp ? parseAmount(addedInput) ?? 0 : 0;
    const preview =
      endKg == null ? null : usedLitres(open.start_kg, endKg, addedL, selected.kg_per_litre);
    const clock = startedClock(open.start_recorded_at);
    const keypadValue = activeField === 'added' ? addedInput : endInput;

    main = (
      <div className="min-h-full px-4 py-4 sm:px-6 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => setScreen('grid')}
          className="self-start min-h-16 px-5 rounded-2xl bg-white/10 border border-white/25 text-lg font-semibold active:bg-white/25 touch-manipulation"
        >
          All chemicals
        </button>
        <h2 className="text-3xl sm:text-4xl font-bold text-center">{selected.name}</h2>
        <div className="w-full max-w-md rounded-2xl bg-white/10 border border-white/20 px-4 py-4 text-center">
          <p className="text-lg text-blue-100">Start weight</p>
          <p className="text-4xl font-bold tabular-nums">{formatOneDecimal(open.start_kg)} kg</p>
          <p className="mt-1 text-xl text-blue-100">
            Recorded by {open.start_employee_name}
            {clock ? ` at ${clock}` : ''}
          </p>
        </div>

        <div className={cn('grid w-full max-w-md gap-3', toppedUp ? 'grid-cols-2' : 'grid-cols-1')}>
          <button
            type="button"
            onClick={() => setActiveField('end')}
            className={cn(
              'min-h-16 rounded-2xl border-2 px-4 py-3 text-left touch-manipulation',
              activeField === 'end'
                ? 'border-white bg-white text-blue-950'
                : 'border-white/25 bg-white/10 text-white'
            )}
          >
            <span className="block text-base font-medium opacity-80">End weight</span>
            <span className="block text-3xl font-bold tabular-nums">{endInput || '0.0'} kg</span>
          </button>
          {toppedUp && (
            <button
              type="button"
              onClick={() => setActiveField('added')}
              className={cn(
                'min-h-16 rounded-2xl border-2 px-4 py-3 text-left touch-manipulation',
                activeField === 'added'
                  ? 'border-white bg-white text-blue-950'
                  : 'border-white/25 bg-white/10 text-white'
              )}
            >
              <span className="block text-base font-medium opacity-80">Litres added</span>
              <span className="block text-3xl font-bold tabular-nums">{addedInput || '0.0'} L</span>
            </button>
          )}
        </div>

        <button
          type="button"
          aria-pressed={toppedUp}
          onClick={() => {
            setToppedUp((on) => {
              const next = !on;
              if (next) {
                setActiveField('added');
              } else {
                setAddedInput('');
                setActiveField('end');
              }
              return next;
            });
            setHighUsage(null);
            setError(null);
          }}
          className={cn(
            'w-full max-w-md min-h-16 rounded-2xl text-xl font-bold touch-manipulation',
            toppedUp
              ? 'bg-amber-400 text-amber-950'
              : 'bg-white/10 border border-white/25 text-white active:bg-white/20'
          )}
        >
          Topped up during shift? {toppedUp ? 'Yes' : 'No'}
        </button>

        <p
          className={cn(
            'text-3xl sm:text-4xl font-bold tabular-nums text-center',
            preview != null && preview < 0 ? 'text-amber-200' : 'text-white'
          )}
        >
          {preview == null ? 'Used: —' : `Used: ${formatOneDecimal(preview)} L`}
        </p>

        <ScaleKeypad
          value={keypadValue}
          maxLength={activeField === 'added' ? 5 : 4}
          onChange={(value) => {
            if (activeField === 'added') setAddedInput(value);
            else setEndInput(value);
            setHighUsage(null);
            setError(null);
          }}
        />

        <PlainError message={error} />

        {highUsage ? (
          <div className="w-full max-w-md rounded-3xl bg-amber-400 text-amber-950 p-5">
            <p className="text-2xl font-bold text-center leading-snug">
              That&apos;s much more than usual (avg {formatOneDecimal(highUsage.avg)} L/day). Is{' '}
              {formatOneDecimal(highUsage.usedL)} L correct?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEnd(true)}
                className="min-h-16 rounded-2xl bg-emerald-700 text-white text-xl font-bold active:bg-emerald-800 disabled:opacity-60 touch-manipulation"
              >
                {saving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Yes, save'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setHighUsage(null);
                  setEndInput('');
                  setActiveField('end');
                  setError(null);
                }}
                className="min-h-16 rounded-2xl bg-white text-amber-950 text-xl font-bold active:bg-amber-50 disabled:opacity-60 touch-manipulation"
              >
                Re-weigh
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={saving || endKg == null}
            onClick={() => void saveEnd(false)}
            className="w-full max-w-md min-h-16 rounded-2xl bg-emerald-500 active:bg-emerald-600 text-white text-2xl font-bold disabled:opacity-40 disabled:bg-slate-600 touch-manipulation"
          >
            {saving ? <Loader2 className="w-7 h-7 animate-spin mx-auto" /> : 'Save'}
          </button>
        )}
      </div>
    );
  } else {
    main = (
      <div className="min-h-full px-4 py-4 sm:px-6">
        <p className="text-center text-2xl sm:text-3xl font-bold mb-4">
          {products == null
            ? loadError
              ? 'Could not load chemicals'
              : 'Loading chemicals…'
            : `${doneCount} of ${totalCount} done tonight`}
        </p>
        {loadError && (
          <div className="max-w-xl mx-auto mb-4 space-y-3">
            <PlainError message={loadError} />
            <button
              type="button"
              onClick={() => void loadProducts()}
              className="w-full min-h-16 rounded-2xl bg-white text-blue-900 text-xl font-bold active:bg-blue-50 touch-manipulation"
            >
              Try again
            </button>
          </div>
        )}
        {products == null && !loadError ? (
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-white" />
        ) : products && products.length === 0 && !loadError ? (
          <p className="text-center text-xl text-blue-100">No chemicals to weigh tonight.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
            {(products ?? []).map((product) => {
              const mode = tileMode(product);
              const stateText =
                mode === 'done' && product.closed_today
                  ? doneStateLabel(product.closed_today)
                  : mode === 'open' && product.open_weigh_in
                    ? openStateLabel(product.open_weigh_in)
                    : 'Start weight needed';
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={mode === 'done'}
                  onClick={() => {
                    if (mode === 'open') openEnd(product);
                    else if (mode === 'needed') openStart(product);
                  }}
                  className={cn(
                    'min-h-28 rounded-3xl border-2 p-5 text-left touch-manipulation [-webkit-tap-highlight-color:transparent]',
                    mode === 'needed' && 'bg-slate-700 border-slate-500 text-white active:bg-slate-600',
                    mode === 'open' && 'bg-blue-600 border-blue-300 text-white active:bg-blue-500',
                    mode === 'done' &&
                      'bg-emerald-600 border-emerald-300 text-white cursor-not-allowed disabled:opacity-100'
                  )}
                >
                  <span className="block text-2xl font-bold leading-tight">{product.name}</span>
                  <span className="mt-1 block text-lg opacity-90">
                    {formatContainer(product.container_size_l)} L
                  </span>
                  <span
                    className={cn(
                      'mt-3 block text-lg font-semibold',
                      mode === 'needed' && 'text-slate-300'
                    )}
                  >
                    {stateText}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-blue-900">
      {employee && screen !== 'pin' && screen !== 'success' && (
        <header className="shrink-0 flex flex-wrap items-center gap-3 px-3 py-3 border-b border-white/15 bg-blue-950/40">
          <BackToClockIn />
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <EmployeePhoto employee={employee} className="h-16 w-16 text-xl" />
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold truncate">{employee.full_name}</p>
              {employee.role && <p className="text-base text-blue-100 truncate">{employee.role}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="min-h-16 px-4 rounded-2xl bg-white text-blue-900 text-lg font-bold active:bg-blue-50 touch-manipulation"
          >
            Done / Sign out
          </button>
        </header>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{main}</div>
    </div>
  );
}
