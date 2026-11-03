import type { ChemicalMovementType, ChemicalStockLevel } from '@/types/database';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/formatters';

export function asNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function asNumberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isArchived(product: { is_active: unknown }): boolean {
  return product.is_active === false || product.is_active === 'false' || product.is_active === 'f';
}

export function isLowFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 't';
}

export type StockStatus = 'out' | 'low' | 'ok';

export function stockStatus(product: ChemicalStockLevel): StockStatus {
  if (asNumber(product.on_hand_l) <= 0) return 'out';
  if (isLowFlag(product.is_low) || asNumber(product.on_hand_l) <= asNumber(product.reorder_level_l)) {
    return 'low';
  }
  return 'ok';
}

export function needsReorder(product: ChemicalStockLevel): boolean {
  return !isArchived(product) && stockStatus(product) !== 'ok';
}

export function formatLitres(value: unknown): string {
  return `${formatNumber(asNumber(value), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} L`;
}

export function formatKg(value: unknown): string {
  return `${formatNumber(asNumber(value), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 3,
  })} kg`;
}

export function formatShiftDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatDayTick(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatTimeOfDay(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return formatDate(value, 'time');
  } catch {
    return '—';
  }
}

export function formatActorWhen(name: string | null | undefined, at: string | null | undefined): string {
  const who = name?.trim() || '';
  const when = at ? formatTimeOfDay(at) : '';
  const hasWhen = when !== '' && when !== '—';
  if (!who && !hasWhen) return '—';
  if (!who) return when;
  if (!hasWhen) return who;
  return `${who} · ${when}`;
}

export function eachIsoDate(from: string, to: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return [];
  }
  const dates: string[] = [];
  const [year, month, day] = from.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  const [endYear, endMonth, endDay] = to.split('-').map(Number);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  while (cursor.getTime() <= end && dates.length < 400) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Matches the litres stored when an admin closes or corrects a weigh-in. */
export function previewUsedLitres(
  startKg: number,
  addedLitres: number,
  endKg: number | null,
  kgPerLitre: number
): number | null {
  if (endKg == null || !Number.isFinite(startKg) || !Number.isFinite(addedLitres) || !Number.isFinite(endKg)) {
    return null;
  }
  const density = Number.isFinite(kgPerLitre) && kgPerLitre > 0 ? kgPerLitre : 1;
  const usedKg = round3(startKg + addedLitres * density - endKg);
  const usedLitres = round3(usedKg / density);
  return Number.isFinite(usedLitres) ? usedLitres : null;
}

const STALE_OPEN_MS = 24 * 60 * 60 * 1000;

export function isUnclosedWeighIn(
  status: string,
  startRecordedAt: string | null | undefined,
  now = Date.now()
): boolean {
  if (status !== 'open' || !startRecordedAt) return false;
  const started = new Date(startRecordedAt).getTime();
  if (!Number.isFinite(started)) return false;
  return now - started > STALE_OPEN_MS;
}

export const MOVEMENT_TYPE_LABEL: Record<ChemicalMovementType, string> = {
  delivery: 'Delivery',
  usage: 'Usage',
  adjustment: 'Adjustment',
  opening_balance: 'Opening',
};

export const MOVEMENT_TYPE_CLASS: Record<ChemicalMovementType, string> = {
  delivery: 'bg-green-100 text-green-800',
  usage: 'bg-slate-200 text-slate-700',
  adjustment: 'bg-amber-100 text-amber-800',
  opening_balance: 'bg-blue-100 text-blue-800',
};

export function formatSignedLitres(value: number): string {
  const formatted = formatNumber(Math.abs(value), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if (value > 0) return `+${formatted} L`;
  if (value < 0) return `−${formatted} L`;
  return `${formatted} L`;
}

export function formatContainers(value: unknown): string {
  const count = asNumberOrNull(value);
  if (count == null) return '—';
  return formatNumber(count, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatContainerLine(containers: unknown, sizeLitres: unknown): string {
  const count = formatNumber(asNumber(containers), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const size = asNumber(sizeLitres);
  const sizeLabel = formatNumber(size, {
    minimumFractionDigits: Number.isInteger(size) ? 0 : 1,
    maximumFractionDigits: 1,
  });
  return `${count} × ${sizeLabel} L`;
}

export function formatDaysLeft(value: unknown): string {
  const days = asNumberOrNull(value);
  if (days == null) return '—';
  return formatNumber(days, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

export function formatRands(value: unknown): string {
  return formatCurrency(asNumber(value));
}

export function formatWeighedAt(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return formatDate(value, 'medium');
  } catch {
    return '—';
  }
}

export function formatCount(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 0 });
}

/** Fill against 3× the reorder level, capped at 100%. */
export function stockFillPercent(onHand: number, reorderLevel: number): number {
  const target = reorderLevel > 0 ? reorderLevel * 3 : onHand > 0 ? onHand : 1;
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, (Math.max(onHand, 0) / target) * 100));
}

export function johannesburgDate(dayOffset = 0): string {
  const shifted = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted);
}

export function reorderBannerText(products: ChemicalStockLevel[]): string | null {
  const low = products.filter(needsReorder);
  if (low.length === 0) return null;
  const noun = low.length === 1 ? 'product needs' : 'products need';
  const details = low
    .map(
      (product) =>
        `${product.name} (${formatLitres(product.on_hand_l)} left, reorder at ${formatLitres(product.reorder_level_l)})`
    )
    .join(', ');
  return `${formatCount(low.length)} ${noun} reordering: ${details}`;
}

export function stockValue(products: ChemicalStockLevel[]): number {
  return products.reduce((sum, product) => {
    if (isArchived(product)) return sum;
    const cost = asNumberOrNull(product.cost_per_container);
    if (cost == null) return sum;
    return sum + asNumber(product.containers_on_hand) * cost;
  }, 0);
}
