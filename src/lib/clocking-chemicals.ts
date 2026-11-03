import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { formatSastTime, getSastDateString } from '@/lib/clocking-utils';
import { validateSchemaSafe } from '@/lib/validation/schemas';
import type { ChemicalWeighIn } from '@/types/database';

const ALREADY_WEIGHED = 'Already weighed today — ask an admin to correct it';
const END_ABOVE_START =
  'End weight is higher than start weight. If you topped up the container, enter how many litres you added.';

export class KioskChemicalError extends Error {
  readonly statusCode: number;
  readonly body: Record<string, unknown>;

  constructor(message: string, statusCode: number, body?: Record<string, unknown>) {
    super(message);
    this.name = 'KioskChemicalError';
    this.statusCode = statusCode;
    this.body = body ?? { success: false, error: message };
  }
}

export function kioskChemicalErrorResponse(error: unknown, logLabel: string) {
  if (error instanceof KioskChemicalError) {
    return NextResponse.json(error.body, { status: error.statusCode });
  }
  console.error(logLabel, error);
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}

export function parseKioskBody<T>(body: unknown, schema: ZodType<T>): T {
  const parsed = validateSchemaSafe(schema, body);
  if (!parsed.success || parsed.data === undefined) {
    throw new KioskChemicalError(parsed.error || 'Validation failed', 400);
  }
  return parsed.data;
}

export type KioskOpenWeighIn = {
  id: string;
  start_kg: number;
  added_l: number;
  start_employee_name: string;
  start_recorded_at: string;
};

export type KioskClosedToday = {
  id: string;
  used_l: number | null;
  end_employee_name: string;
};

export type KioskChemicalProduct = {
  id: string;
  name: string;
  container_size_l: number;
  sort_order: number;
  avg_daily_use_l_14d: number;
  /** Used only to preview litres. Not shown on the kiosk. */
  kg_per_litre: number;
  suggested_start_kg: number | null;
  open_weigh_in: KioskOpenWeighIn | null;
  closed_today: KioskClosedToday | null;
};

type NameEmbed = { full_name?: string | null } | { full_name?: string | null }[] | null;

type OpenRow = {
  id: string;
  product_id: string;
  start_kg: number | string;
  added_l: number | string;
  start_recorded_at: string;
  start_employee: NameEmbed;
};

type ClosedTodayRow = {
  id: string;
  product_id: string;
  used_l: number | string | null;
  end_employee: NameEmbed;
};

type StockLevelRow = {
  id: string;
  name: string;
  container_size_l: number | string;
  sort_order: number | string;
  avg_daily_use_l_14d: number | string | null;
  kg_per_litre: number | string | null;
  is_active: boolean | string;
};

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0;
}

function requiredNumber(value: unknown, label: string): number {
  const parsed = numberOrNull(value);
  if (parsed == null) {
    throw new Error(`${label} is not a valid number`);
  }
  return parsed;
}

function blankToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstName(fullName: string | null | undefined): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0];
  return first || 'Unknown';
}

function embeddedFullName(value: NameEmbed): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row.full_name !== 'string') return null;
  return row.full_name;
}

function startedByMessage(fullName: string | null | undefined, recordedAt: string): string {
  const name = firstName(fullName);
  if (Number.isNaN(Date.parse(recordedAt))) {
    return `Already started by ${name}`;
  }
  return `Already started by ${name} at ${formatSastTime(recordedAt)}`;
}

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '23505' ||
    (typeof error.message === 'string' && error.message.includes('duplicate key'))
  );
}

function isActiveFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 't';
}

function serializeWeighIn(row: ChemicalWeighIn): ChemicalWeighIn {
  return {
    ...row,
    start_kg: numberOrZero(row.start_kg),
    added_l: numberOrZero(row.added_l),
    end_kg: row.end_kg == null ? null : numberOrZero(row.end_kg),
    used_kg: row.used_kg == null ? null : numberOrZero(row.used_kg),
    used_l: row.used_l == null ? null : numberOrZero(row.used_l),
  };
}

async function suggestedStartKg(productId: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from('chemical_weigh_ins')
    .select('end_kg')
    .eq('product_id', productId)
    .eq('status', 'closed')
    .order('shift_date', { ascending: false })
    .order('end_recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch last closed weigh-in: ${error.message}`);
  }
  if (!data || data.end_kg == null) return null;
  return round3(requiredNumber(data.end_kg, 'end weight'));
}

export async function listKioskChemicals(): Promise<KioskChemicalProduct[]> {
  const today = getSastDateString();

  const { data, error } = await supabaseAdmin
    .from('chemical_stock_levels')
    .select('id, name, container_size_l, sort_order, avg_daily_use_l_14d, kg_per_litre, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch chemicals: ${error.message}`);
  }

  const products = ((data ?? []) as StockLevelRow[]).filter((row) => isActiveFlag(row.is_active));
  if (products.length === 0) return [];

  const productIds = products.map((product) => product.id);

  const [openResult, closedResult, suggested] = await Promise.all([
    supabaseAdmin
      .from('chemical_weigh_ins')
      .select(`
        id,
        product_id,
        start_kg,
        added_l,
        start_recorded_at,
        start_employee:employees!chemical_weigh_ins_start_employee_id_fkey(full_name)
      `)
      .eq('status', 'open')
      .in('product_id', productIds)
      .order('start_recorded_at', { ascending: false }),
    supabaseAdmin
      .from('chemical_weigh_ins')
      .select(`
        id,
        product_id,
        used_l,
        end_employee:employees!chemical_weigh_ins_end_employee_id_fkey(full_name)
      `)
      .eq('status', 'closed')
      .eq('shift_date', today)
      .in('product_id', productIds),
    Promise.all(products.map(async (product) => [product.id, await suggestedStartKg(product.id)] as const)),
  ]);

  if (openResult.error) {
    throw new Error(`Failed to fetch open weigh-ins: ${openResult.error.message}`);
  }
  if (closedResult.error) {
    throw new Error(`Failed to fetch today's weigh-ins: ${closedResult.error.message}`);
  }

  const openByProduct = new Map<string, OpenRow>();
  for (const row of (openResult.data ?? []) as unknown as OpenRow[]) {
    if (!openByProduct.has(row.product_id)) openByProduct.set(row.product_id, row);
  }

  const closedByProduct = new Map<string, ClosedTodayRow>();
  for (const row of (closedResult.data ?? []) as unknown as ClosedTodayRow[]) {
    if (!closedByProduct.has(row.product_id)) closedByProduct.set(row.product_id, row);
  }

  const suggestedByProduct = new Map<string, number | null>(suggested);

  const rows = products.map((product) => {
    const open = openByProduct.get(product.id);
    const closed = closedByProduct.get(product.id);
    return {
      id: product.id,
      name: product.name,
      container_size_l: round3(numberOrZero(product.container_size_l)),
      sort_order: numberOrZero(product.sort_order),
      avg_daily_use_l_14d: round3(numberOrZero(product.avg_daily_use_l_14d)),
      kg_per_litre: round3(numberOrZero(product.kg_per_litre)) || 1,
      suggested_start_kg: suggestedByProduct.get(product.id) ?? null,
      open_weigh_in: open
        ? {
            id: open.id,
            start_kg: round3(numberOrZero(open.start_kg)),
            added_l: round3(numberOrZero(open.added_l)),
            start_employee_name: firstName(embeddedFullName(open.start_employee)),
            start_recorded_at: open.start_recorded_at,
          }
        : null,
      closed_today: closed
        ? {
            id: closed.id,
            used_l: closed.used_l == null ? null : round3(numberOrZero(closed.used_l)),
            end_employee_name: firstName(embeddedFullName(closed.end_employee)),
          }
        : null,
    };
  });

  rows.sort((a, b) => {
    const byOrder = a.sort_order - b.sort_order;
    if (byOrder !== 0) return byOrder;
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  });

  return rows;
}

async function getActiveProduct(productId: string): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from('chemical_products')
    .select('id, is_active')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch product: ${error.message}`);
  }
  if (!data || !isActiveFlag(data.is_active)) {
    throw new KioskChemicalError('Product not found', 404);
  }
  return { id: data.id };
}

async function assertWeighInCanStart(productId: string, today: string): Promise<void> {
  const [openResult, todayResult] = await Promise.all([
    supabaseAdmin
      .from('chemical_weigh_ins')
      .select(`
        id,
        start_recorded_at,
        start_employee:employees!chemical_weigh_ins_start_employee_id_fkey(full_name)
      `)
      .eq('product_id', productId)
      .eq('status', 'open')
      .order('start_recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('chemical_weigh_ins')
      .select('id, status, start_recorded_at, start_employee:employees!chemical_weigh_ins_start_employee_id_fkey(full_name)')
      .eq('product_id', productId)
      .eq('shift_date', today)
      .maybeSingle(),
  ]);

  if (openResult.error) {
    throw new Error(`Failed to fetch open weigh-in: ${openResult.error.message}`);
  }
  if (todayResult.error) {
    throw new Error(`Failed to fetch today's weigh-in: ${todayResult.error.message}`);
  }

  const open = openResult.data as unknown as {
    start_recorded_at: string;
    start_employee: NameEmbed;
  } | null;

  if (open) {
    throw new KioskChemicalError(
      startedByMessage(embeddedFullName(open.start_employee), open.start_recorded_at),
      409
    );
  }

  const todayRow = todayResult.data as unknown as {
    status: string;
    start_recorded_at: string;
    start_employee: NameEmbed;
  } | null;

  if (todayRow?.status === 'closed') {
    throw new KioskChemicalError(ALREADY_WEIGHED, 409);
  }
  if (todayRow?.status === 'open') {
    throw new KioskChemicalError(
      startedByMessage(embeddedFullName(todayRow.start_employee), todayRow.start_recorded_at),
      409
    );
  }
}

export async function startKioskWeighIn(input: {
  employeeId: string;
  productId: string;
  startKg: number;
  notes?: string | null;
}): Promise<ChemicalWeighIn> {
  const product = await getActiveProduct(input.productId);
  const today = getSastDateString();
  await assertWeighInCanStart(product.id, today);

  const { data, error } = await supabaseAdmin
    .from('chemical_weigh_ins')
    .insert({
      product_id: product.id,
      shift_date: today,
      status: 'open',
      start_kg: round3(input.startKg),
      start_employee_id: input.employeeId,
      added_l: 0,
      notes: blankToNull(input.notes),
    })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error)) {
      await assertWeighInCanStart(product.id, today);
    }
    throw new Error(`Failed to start weigh-in: ${error.message}`);
  }
  if (!data) {
    throw new Error('Failed to start weigh-in');
  }
  return serializeWeighIn(data);
}

async function readAvgDailyUse(productId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('chemical_stock_levels')
    .select('avg_daily_use_l_14d')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch usage average: ${error.message}`);
  }
  return round3(numberOrZero(data?.avg_daily_use_l_14d));
}

async function readOnHand(productId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('chemical_stock_levels')
    .select('on_hand_l')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch stock on hand: ${error.message}`);
  }
  if (!data) {
    throw new Error('Stock level missing after usage');
  }
  return round3(numberOrZero(data.on_hand_l));
}

export async function endKioskWeighIn(input: {
  employeeId: string;
  weighInId: string;
  endKg: number;
  addedL: number;
  notes?: string | null;
  confirmHighUsage: boolean;
}): Promise<{ weigh_in: ChemicalWeighIn; on_hand_l: number }> {
  const { data: weighIn, error: weighInError } = await supabaseAdmin
    .from('chemical_weigh_ins')
    .select('*')
    .eq('id', input.weighInId)
    .maybeSingle();

  if (weighInError) {
    throw new Error(`Failed to fetch weigh-in: ${weighInError.message}`);
  }
  if (!weighIn) {
    throw new KioskChemicalError('Weigh-in not found', 404);
  }
  if (weighIn.status !== 'open') {
    throw new KioskChemicalError('This weigh-in is already closed', 409);
  }

  const { data: product, error: productError } = await supabaseAdmin
    .from('chemical_products')
    .select('id, kg_per_litre')
    .eq('id', weighIn.product_id)
    .maybeSingle();

  if (productError) {
    throw new Error(`Failed to fetch product: ${productError.message}`);
  }
  if (!product) {
    throw new KioskChemicalError('Product not found', 404);
  }

  const kgPerLitre = requiredNumber(product.kg_per_litre, 'kg per litre');
  if (kgPerLitre <= 0) {
    throw new Error('Product is missing a valid kg per litre');
  }

  const startKg = round3(requiredNumber(weighIn.start_kg, 'start weight'));
  const addedL = round3(input.addedL);
  const endKg = round3(input.endKg);
  const usedKg = round3(startKg + addedL * kgPerLitre - endKg);
  const usedL = round3(usedKg / kgPerLitre);

  if (usedKg < 0) {
    throw new KioskChemicalError(END_ABOVE_START, 400);
  }
  if (Math.abs(usedKg) > 99999.999 || Math.abs(usedL) > 99999.999) {
    throw new KioskChemicalError('Calculated usage is outside the allowed range', 400);
  }

  const avg = await readAvgDailyUse(product.id);
  if (avg > 0 && usedL > 3 * avg && input.confirmHighUsage !== true) {
    throw new KioskChemicalError('Usage needs confirmation', 422, {
      success: false,
      needsConfirmation: true,
      used_l: usedL,
      avg,
    });
  }

  const now = new Date().toISOString();
  const update: {
    status: 'closed';
    end_kg: number;
    added_l: number;
    end_employee_id: string;
    end_recorded_at: string;
    used_kg: number;
    used_l: number;
    notes?: string | null;
  } = {
    status: 'closed',
    end_kg: endKg,
    added_l: addedL,
    end_employee_id: input.employeeId,
    end_recorded_at: now,
    used_kg: usedKg,
    used_l: usedL,
  };
  if (input.notes !== undefined) {
    update.notes = blankToNull(input.notes);
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('chemical_weigh_ins')
    .update(update)
    .eq('id', weighIn.id)
    .eq('status', 'open')
    .select('*')
    .maybeSingle();

  if (updateError) {
    throw new Error(`Failed to close weigh-in: ${updateError.message}`);
  }
  if (!updated) {
    throw new KioskChemicalError('This weigh-in is already closed', 409);
  }

  const { error: movementError } = await supabaseAdmin.from('chemical_stock_movements').insert({
    product_id: updated.product_id,
    movement_type: 'usage',
    litres: round3(-usedL),
    weigh_in_id: updated.id,
    occurred_on: updated.shift_date,
    created_by: null,
  });

  if (movementError) {
    const { error: rollbackError } = await supabaseAdmin
      .from('chemical_weigh_ins')
      .update({
        status: 'open',
        end_kg: null,
        end_employee_id: null,
        end_recorded_at: null,
        used_kg: null,
        used_l: null,
        added_l: numberOrZero(weighIn.added_l),
        notes: weighIn.notes,
      })
      .eq('id', weighIn.id)
      .eq('status', 'closed');

    if (rollbackError) {
      console.error('Failed to roll weigh-in back to open:', rollbackError);
    }
    throw new Error(`Failed to record usage: ${movementError.message}`);
  }

  const onHand = await readOnHand(updated.product_id);
  return { weigh_in: serializeWeighIn(updated), on_hand_l: onHand };
}
