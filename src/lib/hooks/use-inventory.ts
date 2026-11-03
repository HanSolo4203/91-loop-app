import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { authFetch } from '@/lib/auth-fetch';
import { johannesburgDate } from '@/components/inventory/stock-display';
import type {
  ChemicalProduct,
  ChemicalStockLevel,
  ChemicalStockMovement,
  ChemicalWeighIn,
  ChemicalMovementType,
} from '@/types/database';
import type {
  AdminUpdateWeighInRequest,
  ChemicalMovementListItem,
  ChemicalWeighInWithEmployees,
  CreateProductRequest,
  DeleteOrArchiveResult,
  StockTakeResult,
  UpdateProductRequest,
  UsageByDayRow,
} from '@/lib/services/inventory';

interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface MovementQuery {
  product_id?: string;
  from?: string;
  to?: string;
  type?: ChemicalMovementType;
}

export interface WeighInQuery {
  product_id?: string;
  employee_id?: string;
  from?: string;
  to?: string;
  status?: 'open' | 'closed';
}

export interface DeliveryQuery {
  product_id?: string;
  from?: string;
  to?: string;
}

export interface UsageQuery {
  from?: string;
  to?: string;
}

export interface RecordDeliveryPayload {
  product_id: string;
  containers: number;
  litres?: number;
  unit_cost?: number | null;
  reference?: string | null;
  occurred_on: string;
  note?: string | null;
}

export interface RecordStockTakePayload {
  product_id: string;
  counted_litres: number;
  note?: string | null;
}

const STOCK_LEVELS_KEY = ['inventory', 'stock-levels'] as const;
const MOVEMENTS_KEY = ['inventory', 'movements'] as const;
const WEIGH_INS_KEY = ['inventory', 'weigh-ins'] as const;

const listQueryOptions = {
  staleTime: 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  placeholderData: keepPreviousData,
} as const;

function stockLevelsQueryKey(includeArchived: boolean) {
  return [...STOCK_LEVELS_KEY, { includeArchived }] as const;
}

export function invalidateInventory(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: STOCK_LEVELS_KEY }),
    queryClient.invalidateQueries({ queryKey: MOVEMENTS_KEY }),
    queryClient.invalidateQueries({ queryKey: WEIGH_INS_KEY }),
    queryClient.invalidateQueries({ queryKey: ['inventory', 'usage'] }),
    queryClient.invalidateQueries({ queryKey: ['inventory', 'deliveries'] }),
  ]);
}

function definedParams(params: object): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    next[key] = String(value);
  }
  return next;
}

function withQuery(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await authFetch(path, { ...init, headers });
  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error('The server returned an unreadable response');
  }

  if (!response.ok || !envelope.success) {
    throw new Error(envelope.error || 'Request failed');
  }
  return envelope;
}

export function prefetchStockLevels(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: stockLevelsQueryKey(false),
    queryFn: () => apiRequest<ChemicalStockLevel[]>('/api/inventory/products'),
    staleTime: listQueryOptions.staleTime,
  });
}

async function apiData<T>(path: string, init?: RequestInit): Promise<T> {
  const envelope = await apiRequest<T>(path, init);
  if (envelope.data == null) {
    throw new Error(envelope.error || 'Request failed');
  }
  return envelope.data;
}

export function useStockLevels(includeArchived = false) {
  return useQuery({
    queryKey: stockLevelsQueryKey(includeArchived),
    queryFn: () =>
      apiRequest<ChemicalStockLevel[]>(
        includeArchived ? '/api/inventory/products?includeArchived=1' : '/api/inventory/products'
      ),
    ...listQueryOptions,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductRequest) =>
      apiData<ChemicalProduct>('/api/inventory/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductRequest }) =>
      apiData<ChemicalProduct>(`/api/inventory/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiData<DeleteOrArchiveResult>(`/api/inventory/products/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useRestoreProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiData<ChemicalProduct>(`/api/inventory/products/${id}/restore`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useDeliveries(filters: DeliveryQuery = {}, options?: { enabled?: boolean }) {
  const params = definedParams(filters);
  return useQuery({
    queryKey: ['inventory', 'deliveries', params],
    queryFn: () =>
      apiRequest<ChemicalStockMovement[]>(withQuery('/api/inventory/deliveries', params)),
    enabled: options?.enabled ?? true,
    ...listQueryOptions,
  });
}

export function useRecordDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordDeliveryPayload) =>
      apiData<ChemicalStockMovement>('/api/inventory/deliveries', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useRecordStockTake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordStockTakePayload) =>
      apiData<StockTakeResult>('/api/inventory/stock-take', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useMovements(filters: MovementQuery = {}, options?: { enabled?: boolean }) {
  const params = definedParams(filters);
  return useQuery({
    queryKey: [...MOVEMENTS_KEY, params],
    queryFn: () =>
      apiRequest<ChemicalMovementListItem[]>(withQuery('/api/inventory/movements', params)),
    enabled: options?.enabled ?? true,
    ...listQueryOptions,
  });
}

export function defaultWeighInRange(): { from: string; to: string } {
  return { from: johannesburgDate(-13), to: johannesburgDate(0) };
}

export function weighInsQueryOptions(filters: WeighInQuery = {}) {
  const params = definedParams(filters);
  return {
    queryKey: [...WEIGH_INS_KEY, params],
    queryFn: () =>
      apiRequest<ChemicalWeighInWithEmployees[]>(withQuery('/api/inventory/weigh-ins', params)),
    ...listQueryOptions,
  };
}

export function useWeighIns(filters: WeighInQuery = {}, options?: { enabled?: boolean }) {
  return useQuery({
    ...weighInsQueryOptions(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateWeighIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUpdateWeighInRequest }) =>
      apiData<ChemicalWeighIn>(`/api/inventory/weigh-ins/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useDeleteWeighIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiData<{ id: string }>(`/api/inventory/weigh-ins/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateInventory(queryClient),
  });
}

export function useUsage(filters: UsageQuery = {}, options?: { enabled?: boolean }) {
  const params = definedParams({
    from: filters.from ?? johannesburgDate(-13),
    to: filters.to ?? johannesburgDate(0),
  });
  return useQuery({
    queryKey: ['inventory', 'usage', params],
    queryFn: () => apiRequest<UsageByDayRow[]>(withQuery('/api/inventory/usage', params)),
    enabled: options?.enabled ?? true,
    ...listQueryOptions,
  });
}
