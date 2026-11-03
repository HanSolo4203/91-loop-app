/* eslint-disable @typescript-eslint/no-explicit-any */
import { densityForUnit, stockUnit, type StockUnit } from '@/lib/chemical-unit';
import { supabaseAdmin } from '@/lib/supabase';
import type {
  ChemicalMovementType,
  ChemicalProduct,
  ChemicalStockLevel,
  ChemicalStockMovement,
  ChemicalWeighIn,
} from '@/types/database';

export class InventoryServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'InventoryServiceError';
  }
}

export interface InventoryServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  statusCode?: number;
}

export interface StockLevelFilters {
  includeArchived?: boolean;
}

export interface MovementFilters {
  product_id?: string;
  from?: string;
  to?: string;
  type?: ChemicalMovementType;
}

export interface WeighInFilters {
  product_id?: string;
  employee_id?: string;
  from?: string;
  to?: string;
  status?: 'open' | 'closed';
}

export interface UsageFilters {
  from?: string;
  to?: string;
}

export interface CreateProductRequest {
  name: string;
  supplier?: string | null;
  container_size_l: number;
  reorder_level_l?: number;
  reorder_qty_containers?: number | null;
  cost_per_container?: number | null;
  kg_per_litre?: number;
  notes?: string | null;
  is_active?: boolean;
  sort_order?: number;
  tracking_mode?: 'container' | 'decant';
  issue_size_l?: number;
  /** L for liquids. kg for powders. */
  unit?: StockUnit;
  /** Litres in the working bottle right now. Sets the bottle baseline. */
  jug_baseline_l?: number | null;
  /** Litres already on hand. Writes an opening_balance movement when greater than 0. */
  opening_stock_l?: number | null;
  /** Public photo URL. Blank clears the photo. */
  image_url?: string | null;
}

export interface UpdateProductRequest {
  name?: string;
  supplier?: string | null;
  container_size_l?: number;
  reorder_level_l?: number;
  reorder_qty_containers?: number | null;
  cost_per_container?: number | null;
  kg_per_litre?: number;
  notes?: string | null;
  is_active?: boolean;
  sort_order?: number;
  tracking_mode?: 'container' | 'decant';
  issue_size_l?: number;
  unit?: StockUnit;
  /** Litres in the working bottle right now. Resets the bottle baseline. */
  jug_baseline_l?: number | null;
  /** Public photo URL. Blank clears the photo. */
  image_url?: string | null;
}

export interface RecordDeliveryRequest {
  product_id: string;
  containers: number;
  litres?: number;
  unit_cost?: number | null;
  reference?: string | null;
  occurred_on: string;
  note?: string | null;
  created_by: string | null;
}

export interface RecordStockTakeRequest {
  product_id: string;
  counted_litres: number;
  note?: string | null;
  created_by: string | null;
}

export interface StockTakeResult {
  movement: ChemicalStockMovement | null;
  difference: number;
}

export interface AdminUpdateWeighInRequest {
  start_kg?: number;
  end_kg?: number | null;
  added_l?: number;
  /** Litres poured from the drum before the start weight. Not part of the usage formula. */
  poured_l?: number;
  notes?: string | null;
}

export type DeleteOrArchiveResult = { deleted: true } | { archived: true };

export interface EmployeeName {
  id: string;
  full_name: string;
}

export interface ChemicalWeighInProduct {
  id: string;
  name: string;
  kg_per_litre: number;
  tracking_mode: 'container' | 'decant';
  unit: StockUnit;
}

export interface ChemicalWeighInWithEmployees extends ChemicalWeighIn {
  start_employee: EmployeeName | null;
  end_employee: EmployeeName | null;
  product: ChemicalWeighInProduct | null;
}

export interface ChemicalMovementListItem extends ChemicalStockMovement {
  product_name: string;
  unit: StockUnit;
  /** Admin email. Usage rows prefer the employee who recorded the weigh-in. */
  recorded_by: string | null;
}

export interface UsageByDayRow {
  product_id: string;
  product_name: string;
  shift_date: string;
  litres: number;
  unit: StockUnit;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ok<T>(data: T, statusCode = 200): InventoryServiceResponse<T> {
  return { data, error: null, success: true, statusCode };
}

function fail(error: unknown): InventoryServiceResponse<never> {
  if (error instanceof InventoryServiceError) {
    return {
      data: null,
      error: error.message,
      success: false,
      statusCode: error.statusCode,
    };
  }
  return {
    data: null,
    error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    success: false,
    statusCode: 500,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function blankToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertUuid(id: string, label: string) {
  if (!UUID_RE.test(id)) {
    throw new InventoryServiceError(`Invalid ${label} ID format`, 'INVALID_ID', 400);
  }
}

function isDuplicateKey(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '23505' ||
    (typeof error.message === 'string' && error.message.includes('duplicate key'))
  );
}

function isLowStock(value: unknown): boolean {
  return value === true || value === 'true' || value === 't';
}

function sortStockLevels(rows: ChemicalStockLevel[]): ChemicalStockLevel[] {
  return [...rows].sort((a, b) => {
    const aLow = isLowStock(a.is_low);
    const bLow = isLowStock(b.is_low);
    if (aLow !== bLow) return aLow ? -1 : 1;
    const sortDiff = Number(a.sort_order) - Number(b.sort_order);
    if (sortDiff !== 0) return sortDiff;
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  });
}

function assertLitreAmount(litres: number) {
  if (!Number.isFinite(litres) || litres < 0 || litres >= 1000) {
    throw new InventoryServiceError(
      'Litres must be 0 or more and below 1000',
      'VALIDATION_ERROR',
      400
    );
  }
}

function assertIssueSize(litres: number) {
  if (!Number.isFinite(litres) || litres <= 0 || litres >= 1000) {
    throw new InventoryServiceError(
      'Pour size must be greater than 0 and below 1000 L',
      'VALIDATION_ERROR',
      400
    );
  }
}

function assertTrackingMode(mode: string): 'container' | 'decant' {
  if (mode !== 'container' && mode !== 'decant') {
    throw new InventoryServiceError('Tracking mode is not valid', 'VALIDATION_ERROR', 400);
  }
  return mode;
}

function todayInJohannesburg(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function oneEmployee(value: unknown): EmployeeName | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const employee = row as { id?: string; full_name?: string };
  if (!employee.id) return null;
  return { id: employee.id, full_name: employee.full_name ?? '' };
}

function oneProduct(value: unknown): ChemicalWeighInProduct | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const product = row as {
    id?: string;
    name?: string | null;
    kg_per_litre?: number | string | null;
    tracking_mode?: string | null;
    unit?: string | null;
  };
  if (!product.id) return null;
  const unit = stockUnit(product.unit);
  return {
    id: product.id,
    name: product.name?.trim() || 'Unknown product',
    kg_per_litre: densityForUnit(unit, Number(product.kg_per_litre)),
    tracking_mode: product.tracking_mode === 'decant' ? 'decant' : 'container',
    unit,
  };
}

function embedLabel(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const record = row as { full_name?: string | null; name?: string | null };
  const label = record.full_name ?? record.name;
  if (typeof label !== 'string') return null;
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function usageEmployeeName(weighIn: unknown): string | null {
  const row = Array.isArray(weighIn) ? weighIn[0] : weighIn;
  if (!row || typeof row !== 'object') return null;
  const record = row as { end_employee?: unknown; start_employee?: unknown };
  return embedLabel(record.end_employee) ?? embedLabel(record.start_employee);
}

async function getProductOrThrow(id: string): Promise<ChemicalProduct> {
  const { data, error } = await supabaseAdmin
    .from('chemical_products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new InventoryServiceError(
      `Failed to fetch product: ${error.message}`,
      'FETCH_ERROR',
      500
    );
  }
  if (!data) {
    throw new InventoryServiceError('Product not found', 'NOT_FOUND', 404);
  }
  return data;
}

async function assertUniqueName(name: string, excludeId?: string) {
  let query = supabaseAdmin
    .from('chemical_products')
    .select('id')
    .eq('name', name);
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new InventoryServiceError(
      `Failed to check product name: ${error.message}`,
      'CHECK_NAME_ERROR',
      500
    );
  }
  if (data) {
    throw new InventoryServiceError(
      'A product with this name already exists',
      'DUPLICATE_NAME',
      409
    );
  }
}

function duplicateNameError(error: { code?: string; message?: string }): boolean {
  return isDuplicateKey(error);
}

async function countForProduct(
  table: 'chemical_weigh_ins' | 'chemical_stock_movements',
  productId: string
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (error) {
    throw new InventoryServiceError(
      `Failed to check product history: ${error.message}`,
      'FETCH_ERROR',
      500
    );
  }
  return count ?? 0;
}

async function assertNoOpenWeighIn(productId: string) {
  const open = await countOpenWeighIns(productId);
  if (open > 0) {
    throw new InventoryServiceError(
      'Close the open weigh-in before changing litres in the bottle.',
      'WEIGH_IN_OPEN',
      409
    );
  }
}

async function countOpenWeighIns(productId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('chemical_weigh_ins')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('status', 'open');

  if (error) {
    throw new InventoryServiceError(
      `Failed to check open weigh-ins: ${error.message}`,
      'FETCH_ERROR',
      500
    );
  }
  return count ?? 0;
}

async function readOnHandLitres(productId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('chemical_stock_levels')
    .select('on_hand_l')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    throw new InventoryServiceError(
      `Failed to fetch stock on hand: ${error.message}`,
      'FETCH_ERROR',
      500
    );
  }
  return round3(Number(data?.on_hand_l ?? 0));
}

async function archiveProduct(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('chemical_products')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new InventoryServiceError(
      `Failed to archive product: ${error.message}`,
      'UPDATE_ERROR',
      500
    );
  }
  if (!data) {
    throw new InventoryServiceError('Product not found', 'NOT_FOUND', 404);
  }
}

/**
 * Stock on hand comes from chemical_stock_levels.
 * Low products are listed first, then sort_order, then name.
 */
export async function getStockLevels(
  filters: StockLevelFilters = {}
): Promise<InventoryServiceResponse<ChemicalStockLevel[]>> {
  try {
    let query = (supabaseAdmin as any).from('chemical_stock_levels').select('*');
    if (!filters.includeArchived) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query
      .order('is_low', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new InventoryServiceError(
        `Failed to fetch stock levels: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    return ok(sortStockLevels((data || []) as ChemicalStockLevel[]));
  } catch (error) {
    return fail(error);
  }
}

export async function createProduct(
  input: CreateProductRequest,
  createdBy: string | null = null
): Promise<InventoryServiceResponse<ChemicalProduct>> {
  try {
    const name = input.name.trim();
    if (!name) {
      throw new InventoryServiceError('Product name is required', 'VALIDATION_ERROR', 400);
    }
    const containerSize = round2(input.container_size_l);
    if (!(containerSize > 0)) {
      throw new InventoryServiceError(
        'Container size must be greater than 0',
        'VALIDATION_ERROR',
        400
      );
    }

    let openingLitres: number | null = null;
    if (input.opening_stock_l != null) {
      openingLitres = round3(input.opening_stock_l);
      assertLitreAmount(openingLitres);
    }

    const unit = stockUnit(input.unit);
    const trackingMode =
      input.tracking_mode === undefined ? 'container' : assertTrackingMode(input.tracking_mode);
    let issueSize: number | undefined;
    if (input.issue_size_l !== undefined) {
      issueSize = round2(input.issue_size_l);
      assertIssueSize(issueSize);
    }
    let jugBaseline: number | undefined;
    if (trackingMode === 'decant') {
      jugBaseline = round3(input.jug_baseline_l ?? 0);
      assertLitreAmount(jugBaseline);
      const opening = openingLitres ?? 0;
      if (jugBaseline > opening) {
        throw new InventoryServiceError(
          'Litres in the bottle cannot be more than opening stock',
          'VALIDATION_ERROR',
          400
        );
      }
    }

    await assertUniqueName(name);

    const { data, error } = await supabaseAdmin
      .from('chemical_products')
      .insert({
        name,
        supplier: blankToNull(input.supplier),
        container_size_l: containerSize,
        reorder_level_l:
          input.reorder_level_l === undefined ? undefined : round2(input.reorder_level_l),
        reorder_qty_containers: input.reorder_qty_containers,
        cost_per_container:
          input.cost_per_container == null ? input.cost_per_container : round2(input.cost_per_container),
        kg_per_litre: unit === 'kg' ? 1 : input.kg_per_litre,
        notes: blankToNull(input.notes),
        is_active: input.is_active,
        sort_order: input.sort_order,
        tracking_mode: trackingMode,
        unit,
        issue_size_l: issueSize,
        jug_baseline_l: jugBaseline,
        jug_baseline_at: trackingMode === 'decant' ? new Date().toISOString() : undefined,
        image_url: blankToNull(input.image_url),
      })
      .select()
      .single();

    if (error) {
      if (duplicateNameError(error)) {
        throw new InventoryServiceError(
          'A product with this name already exists',
          'DUPLICATE_NAME',
          409
        );
      }
      throw new InventoryServiceError(
        `Failed to create product: ${error.message}`,
        'CREATE_ERROR',
        500
      );
    }

    if (openingLitres != null && openingLitres > 0) {
      const { error: movementError } = await supabaseAdmin
        .from('chemical_stock_movements')
        .insert({
          product_id: data.id,
          movement_type: 'opening_balance',
          litres: openingLitres,
          occurred_on: todayInJohannesburg(),
          note: 'Opening stock',
          created_by: createdBy,
        });

      if (movementError) {
        await supabaseAdmin.from('chemical_products').delete().eq('id', data.id);
        throw new InventoryServiceError(
          `Failed to record opening stock: ${movementError.message}`,
          'CREATE_ERROR',
          500
        );
      }
    }

    return ok(data, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductRequest
): Promise<InventoryServiceResponse<ChemicalProduct>> {
  try {
    assertUuid(id, 'product');
    const existing = await getProductOrThrow(id);

    const update: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new InventoryServiceError('Product name is required', 'VALIDATION_ERROR', 400);
      }
      if (name !== existing.name) {
        await assertUniqueName(name, id);
      }
      update.name = name;
    }
    if (input.supplier !== undefined) update.supplier = blankToNull(input.supplier);
    if (input.container_size_l !== undefined) {
      const containerSize = round2(input.container_size_l);
      if (!(containerSize > 0)) {
        throw new InventoryServiceError(
          'Container size must be greater than 0',
          'VALIDATION_ERROR',
          400
        );
      }
      update.container_size_l = containerSize;
    }
    if (input.reorder_level_l !== undefined) update.reorder_level_l = round2(input.reorder_level_l);
    if (input.reorder_qty_containers !== undefined) {
      update.reorder_qty_containers = input.reorder_qty_containers;
    }
    if (input.cost_per_container !== undefined) {
      update.cost_per_container =
        input.cost_per_container == null ? null : round2(input.cost_per_container);
    }
    if (input.kg_per_litre !== undefined) update.kg_per_litre = input.kg_per_litre;
    if (input.unit !== undefined) update.unit = stockUnit(input.unit);
    if (input.notes !== undefined) update.notes = blankToNull(input.notes);
    if (input.is_active !== undefined) update.is_active = input.is_active;
    if (input.sort_order !== undefined) update.sort_order = input.sort_order;
    if (input.tracking_mode !== undefined) {
      update.tracking_mode = assertTrackingMode(input.tracking_mode);
    }
    if (input.issue_size_l !== undefined) {
      const issueSize = round2(input.issue_size_l);
      assertIssueSize(issueSize);
      update.issue_size_l = issueSize;
    }
    if (input.image_url !== undefined) update.image_url = blankToNull(input.image_url);

    const nextUnit = stockUnit((update.unit as string | undefined) ?? existing.unit);
    if (nextUnit === 'kg') update.kg_per_litre = 1;

    const nextMode = (update.tracking_mode as string | undefined) ?? existing.tracking_mode;
    const enablingDecant = nextMode === 'decant' && existing.tracking_mode !== 'decant';
    if (input.jug_baseline_l !== undefined || enablingDecant) {
      await assertNoOpenWeighIn(id);
      const jugBaseline = round3(input.jug_baseline_l ?? 0);
      assertLitreAmount(jugBaseline);
      const onHand = await readOnHandLitres(id);
      if (jugBaseline > onHand) {
        throw new InventoryServiceError(
          'Litres in the bottle cannot be more than stock on hand',
          'VALIDATION_ERROR',
          400
        );
      }
      update.jug_baseline_l = jugBaseline;
      update.jug_baseline_at = new Date().toISOString();
    }

    if (Object.keys(update).length === 0) {
      throw new InventoryServiceError('At least one field is required', 'VALIDATION_ERROR', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('chemical_products')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      if (duplicateNameError(error)) {
        throw new InventoryServiceError(
          'A product with this name already exists',
          'DUPLICATE_NAME',
          409
        );
      }
      throw new InventoryServiceError(
        `Failed to update product: ${error.message}`,
        'UPDATE_ERROR',
        500
      );
    }
    if (!data) {
      throw new InventoryServiceError('Product not found', 'NOT_FOUND', 404);
    }

    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Hard-delete a product with no history. Otherwise mark it inactive.
 */
export async function deleteOrArchiveProduct(
  id: string
): Promise<InventoryServiceResponse<DeleteOrArchiveResult>> {
  try {
    assertUuid(id, 'product');
    await getProductOrThrow(id);

    const [weighIns, movements] = await Promise.all([
      countForProduct('chemical_weigh_ins', id),
      countForProduct('chemical_stock_movements', id),
    ]);

    if (weighIns === 0 && movements === 0) {
      const { error } = await supabaseAdmin.from('chemical_products').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') {
          await archiveProduct(id);
          return ok({ archived: true });
        }
        throw new InventoryServiceError(
          `Failed to delete product: ${error.message}`,
          'DELETE_ERROR',
          500
        );
      }
      return ok({ deleted: true });
    }

    await archiveProduct(id);
    return ok({ archived: true });
  } catch (error) {
    return fail(error);
  }
}

export async function restoreProduct(
  id: string
): Promise<InventoryServiceResponse<ChemicalProduct>> {
  try {
    assertUuid(id, 'product');
    const { data, error } = await supabaseAdmin
      .from('chemical_products')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new InventoryServiceError(
        `Failed to restore product: ${error.message}`,
        'UPDATE_ERROR',
        500
      );
    }
    if (!data) {
      throw new InventoryServiceError('Product not found', 'NOT_FOUND', 404);
    }
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Record a delivery. Litres default to containers × container size.
 * Delivery litres are positive (stock in).
 */
export async function recordDelivery(
  input: RecordDeliveryRequest
): Promise<InventoryServiceResponse<ChemicalStockMovement>> {
  try {
    assertUuid(input.product_id, 'product');
    const product = await getProductOrThrow(input.product_id);
    const containers = round2(input.containers);
    if (!(containers > 0)) {
      throw new InventoryServiceError(
        'Containers must be greater than 0',
        'VALIDATION_ERROR',
        400
      );
    }

    const litres = round3(
      input.litres ?? containers * Number(product.container_size_l)
    );
    assertLitreAmount(litres);

    const { data, error } = await supabaseAdmin
      .from('chemical_stock_movements')
      .insert({
        product_id: input.product_id,
        movement_type: 'delivery',
        litres,
        containers,
        unit_cost: input.unit_cost == null ? null : round2(input.unit_cost),
        reference: blankToNull(input.reference),
        occurred_on: input.occurred_on,
        note: blankToNull(input.note),
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) {
      throw new InventoryServiceError(
        `Failed to record delivery: ${error.message}`,
        'CREATE_ERROR',
        500
      );
    }

    return ok(data, 201);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Set on-hand litres to the counted amount via an adjustment movement.
 * A zero difference writes nothing.
 */
export async function recordStockTake(
  input: RecordStockTakeRequest
): Promise<InventoryServiceResponse<StockTakeResult>> {
  try {
    assertUuid(input.product_id, 'product');
    await getProductOrThrow(input.product_id);
    assertLitreAmount(round3(input.counted_litres));

    const { data: level, error: levelError } = await (supabaseAdmin as any)
      .from('chemical_stock_levels')
      .select('on_hand_l')
      .eq('id', input.product_id)
      .maybeSingle();

    if (levelError) {
      throw new InventoryServiceError(
        `Failed to fetch stock level: ${levelError.message}`,
        'FETCH_ERROR',
        500
      );
    }
    if (!level) {
      throw new InventoryServiceError('Product not found', 'NOT_FOUND', 404);
    }

    const onHand = round3(Number(level.on_hand_l ?? 0));
    if (!Number.isFinite(onHand)) {
      throw new InventoryServiceError(
        'Current stock level is not a valid number',
        'FETCH_ERROR',
        500
      );
    }
    const counted = round3(input.counted_litres);
    const difference = round3(counted - onHand);
    if (difference === 0) {
      return ok({ movement: null, difference: 0 });
    }

    const { data, error } = await supabaseAdmin
      .from('chemical_stock_movements')
      .insert({
        product_id: input.product_id,
        movement_type: 'adjustment',
        litres: difference,
        occurred_on: todayInJohannesburg(),
        note: blankToNull(input.note),
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) {
      throw new InventoryServiceError(
        `Failed to record stock take: ${error.message}`,
        'CREATE_ERROR',
        500
      );
    }

    return ok({ movement: data, difference }, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function listMovements(
  filters: MovementFilters = {}
): Promise<InventoryServiceResponse<ChemicalMovementListItem[]>> {
  try {
    if (filters.product_id) assertUuid(filters.product_id, 'product');

    let query = supabaseAdmin
      .from('chemical_stock_movements')
      .select(`
        *,
        product:chemical_products!chemical_stock_movements_product_id_fkey(name, unit),
        weigh_in:chemical_weigh_ins!chemical_stock_movements_weigh_in_id_fkey(
          start_employee:employees!chemical_weigh_ins_start_employee_id_fkey(full_name),
          end_employee:employees!chemical_weigh_ins_end_employee_id_fkey(full_name)
        )
      `)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.product_id) query = query.eq('product_id', filters.product_id);
    if (filters.type) query = query.eq('movement_type', filters.type);
    if (filters.from) query = query.gte('occurred_on', filters.from);
    if (filters.to) query = query.lte('occurred_on', filters.to);

    const { data, error } = await query;
    if (error) {
      throw new InventoryServiceError(
        `Failed to fetch movements: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    const rows = (data || []) as any[];
    const adminIds = [
      ...new Set(
        rows
          .map((row) => row.created_by)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      ),
    ];
    const emails = new Map<string, string | null>();
    if (adminIds.length > 0) {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .in('id', adminIds);
      if (profileError) {
        throw new InventoryServiceError(
          `Failed to fetch movement authors: ${profileError.message}`,
          'FETCH_ERROR',
          500
        );
      }
      for (const profile of profiles ?? []) {
        const email = profile.email?.trim() ?? '';
        emails.set(profile.id, email.length > 0 ? email : null);
      }
    }

    const items: ChemicalMovementListItem[] = rows.map((row) => {
      const { product, weigh_in, ...movement } = row;
      const email = typeof row.created_by === 'string' ? emails.get(row.created_by) ?? null : null;
      const recordedBy =
        row.movement_type === 'usage' ? usageEmployeeName(weigh_in) ?? email : email;
      const productRow = Array.isArray(product) ? product[0] : product;
      const productUnit =
        productRow && typeof productRow === 'object' ? (productRow as { unit?: unknown }).unit : null;
      return {
        ...(movement as ChemicalStockMovement),
        product_name: embedLabel(product) ?? 'Unknown product',
        unit: stockUnit(productUnit),
        recorded_by: recordedBy,
      };
    });

    return ok(items);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Weigh-ins with the employee who recorded the start and, when set, the end.
 * employee_id matches either of those people.
 */
export async function listWeighIns(
  filters: WeighInFilters = {}
): Promise<InventoryServiceResponse<ChemicalWeighInWithEmployees[]>> {
  try {
    if (filters.product_id) assertUuid(filters.product_id, 'product');
    if (filters.employee_id) assertUuid(filters.employee_id, 'employee');

    let query = supabaseAdmin
      .from('chemical_weigh_ins')
      .select(`
        *,
        product:chemical_products!chemical_weigh_ins_product_id_fkey(id, name, kg_per_litre, tracking_mode, unit),
        start_employee:employees!chemical_weigh_ins_start_employee_id_fkey(id, full_name),
        end_employee:employees!chemical_weigh_ins_end_employee_id_fkey(id, full_name)
      `)
      .order('shift_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.product_id) query = query.eq('product_id', filters.product_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.from) query = query.gte('shift_date', filters.from);
    if (filters.to) query = query.lte('shift_date', filters.to);
    if (filters.employee_id) {
      query = query.or(
        `start_employee_id.eq.${filters.employee_id},end_employee_id.eq.${filters.employee_id}`
      );
    }

    const { data, error } = await query;
    if (error) {
      throw new InventoryServiceError(
        `Failed to fetch weigh-ins: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    const rows = ((data || []) as any[]).map((row) => ({
      ...row,
      product: oneProduct(row.product),
      start_employee: oneEmployee(row.start_employee),
      end_employee: oneEmployee(row.end_employee),
    })) as ChemicalWeighInWithEmployees[];

    return ok(rows);
  } catch (error) {
    return fail(error);
  }
}

async function getWeighInOrThrow(id: string): Promise<ChemicalWeighIn> {
  const { data, error } = await supabaseAdmin
    .from('chemical_weigh_ins')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new InventoryServiceError(
      `Failed to fetch weigh-in: ${error.message}`,
      'FETCH_ERROR',
      500
    );
  }
  if (!data) {
    throw new InventoryServiceError('Weigh-in not found', 'NOT_FOUND', 404);
  }
  return data;
}

/**
 * Usage litres on the ledger are negative (stock out).
 * Closing a weigh-in creates that row; reopening deletes it.
 */
async function syncUsageMovement(
  weighIn: ChemicalWeighIn,
  usedLitres: number | null,
  isClosed: boolean,
  adminUserId: string
) {
  const { data: existing, error } = await supabaseAdmin
    .from('chemical_stock_movements')
    .select('id')
    .eq('weigh_in_id', weighIn.id)
    .maybeSingle();

  if (error) {
    throw new InventoryServiceError(
      `Failed to fetch usage movement: ${error.message}`,
      'FETCH_ERROR',
      500
    );
  }

  if (!isClosed || usedLitres == null) {
    if (!existing) return;
    const { error: deleteError } = await supabaseAdmin
      .from('chemical_stock_movements')
      .delete()
      .eq('id', existing.id);
    if (deleteError) {
      throw new InventoryServiceError(
        `Failed to remove usage movement: ${deleteError.message}`,
        'DELETE_ERROR',
        500
      );
    }
    return;
  }

  const litres = round3(-usedLitres);
  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from('chemical_stock_movements')
      .update({ litres })
      .eq('id', existing.id);
    if (updateError) {
      throw new InventoryServiceError(
        `Failed to update usage movement: ${updateError.message}`,
        'UPDATE_ERROR',
        500
      );
    }
    return;
  }

  const { error: insertError } = await supabaseAdmin.from('chemical_stock_movements').insert({
    product_id: weighIn.product_id,
    movement_type: 'usage',
    litres,
    weigh_in_id: weighIn.id,
    occurred_on: weighIn.shift_date,
    created_by: adminUserId,
  });
  if (insertError) {
    throw new InventoryServiceError(
      `Failed to create usage movement: ${insertError.message}`,
      'CREATE_ERROR',
      500
    );
  }
}

export async function adminUpdateWeighIn(
  id: string,
  input: AdminUpdateWeighInRequest,
  adminUserId: string
): Promise<InventoryServiceResponse<ChemicalWeighIn>> {
  try {
    assertUuid(id, 'weigh-in');
    const weighIn = await getWeighInOrThrow(id);
    const product = await getProductOrThrow(weighIn.product_id);

    const startKg = round3(
      input.start_kg !== undefined ? input.start_kg : Number(weighIn.start_kg)
    );
    const addedL = round3(
      input.added_l !== undefined ? input.added_l : Number(weighIn.added_l)
    );
    const pouredL = round3(
      input.poured_l !== undefined ? input.poured_l : Number(weighIn.poured_l ?? 0)
    );
    if (input.poured_l !== undefined) assertLitreAmount(pouredL);
    const endKg =
      input.end_kg !== undefined
        ? input.end_kg == null
          ? null
          : round3(input.end_kg)
        : weighIn.end_kg == null
          ? null
          : round3(Number(weighIn.end_kg));
    const isClosed = endKg !== null;

    let usedKg: number | null = null;
    let usedL: number | null = null;
    if (isClosed) {
      const kgPerLitre = densityForUnit(product.unit, Number(product.kg_per_litre));
      usedKg = round3(startKg + addedL * kgPerLitre - Number(endKg));
      usedL = round3(usedKg / kgPerLitre);
      if (!Number.isFinite(usedKg) || Math.abs(usedKg) > 99999.999 || Math.abs(usedL) > 99999.999) {
        throw new InventoryServiceError(
          'Calculated usage is outside the allowed range',
          'VALIDATION_ERROR',
          400
        );
      }
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      edited_by_admin: true,
      edited_at: now,
      edited_by: adminUserId,
      status: isClosed ? 'closed' : 'open',
      used_kg: usedKg,
      used_l: usedL,
    };
    if (input.start_kg !== undefined) update.start_kg = startKg;
    if (input.added_l !== undefined) update.added_l = addedL;
    if (input.poured_l !== undefined) update.poured_l = pouredL;
    if (input.notes !== undefined) update.notes = blankToNull(input.notes);
    if (input.end_kg !== undefined) update.end_kg = endKg;

    if (isClosed) {
      if (!weighIn.end_recorded_at) update.end_recorded_at = now;
    } else {
      update.end_kg = null;
      update.end_recorded_at = null;
      update.end_employee_id = null;
    }

    const { data, error } = await supabaseAdmin
      .from('chemical_weigh_ins')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new InventoryServiceError(
        `Failed to update weigh-in: ${error.message}`,
        'UPDATE_ERROR',
        500
      );
    }
    if (!data) {
      throw new InventoryServiceError('Weigh-in not found', 'NOT_FOUND', 404);
    }

    await syncUsageMovement(data, usedL, isClosed, adminUserId);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Deletes the weigh-in. The linked usage movement is removed by ON DELETE CASCADE.
 */
export async function adminDeleteWeighIn(
  id: string
): Promise<InventoryServiceResponse<{ id: string }>> {
  try {
    assertUuid(id, 'weigh-in');
    const { data, error } = await supabaseAdmin
      .from('chemical_weigh_ins')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new InventoryServiceError(
        `Failed to delete weigh-in: ${error.message}`,
        'DELETE_ERROR',
        500
      );
    }
    if (!data) {
      throw new InventoryServiceError('Weigh-in not found', 'NOT_FOUND', 404);
    }
    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Litres used per product per shift date, for charting.
 * Values come from closed weigh-ins (positive means chemical was used).
 */
export async function getUsageByDay(
  filters: UsageFilters = {}
): Promise<InventoryServiceResponse<UsageByDayRow[]>> {
  try {
    let query = supabaseAdmin
      .from('chemical_weigh_ins')
      .select(`
        product_id,
        shift_date,
        used_l,
        product:chemical_products!chemical_weigh_ins_product_id_fkey(name, unit)
      `)
      .eq('status', 'closed')
      .not('used_l', 'is', null)
      .order('shift_date', { ascending: true });

    if (filters.from) query = query.gte('shift_date', filters.from);
    if (filters.to) query = query.lte('shift_date', filters.to);

    const { data, error } = await query;
    if (error) {
      throw new InventoryServiceError(
        `Failed to fetch usage: ${error.message}`,
        'FETCH_ERROR',
        500
      );
    }

    const rows: UsageByDayRow[] = ((data || []) as any[]).map((row) => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      return {
        product_id: row.product_id,
        product_name: product?.name ?? 'Unknown product',
        shift_date: row.shift_date,
        litres: round3(Number(row.used_l ?? 0)),
        unit: stockUnit(product?.unit),
      };
    });

    rows.sort((a, b) => {
      const byDate = a.shift_date.localeCompare(b.shift_date);
      if (byDate !== 0) return byDate;
      return a.product_name.localeCompare(b.product_name, 'en', { sensitivity: 'base' });
    });

    return ok(rows);
  } catch (error) {
    return fail(error);
  }
}
