import { supabaseAdmin } from '@/lib/supabase';
import type { BusinessSettings } from '@/types/database';

export interface BusinessSettingsResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  statusCode?: number;
}

export interface BusinessSettingsPayload {
  id?: string;
  company_name?: string;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

class BusinessSettingsServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'BusinessSettingsServiceError';
  }
}

const sanitize = (value?: string | null) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  // Reject placeholder URLs
  if (trimmed.includes('via.placeholder.com')) {
    return null;
  }
  // Basic URL validation for logo_url
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      // Invalid URL, return null
      return null;
    }
  }
  return trimmed;
};

export async function getBusinessSettings(): Promise<BusinessSettingsResponse<BusinessSettings>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('business_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new BusinessSettingsServiceError(`Failed to load business settings: ${error.message}`);
    }

    return {
      data: data || null,
      error: null,
      success: true,
      statusCode: 200,
    };
  } catch (error) {
    if (error instanceof BusinessSettingsServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
        statusCode: error.statusCode,
      };
    }

    return {
      data: null,
      error: 'Unexpected error while loading business settings',
      success: false,
      statusCode: 500,
    };
  }
}

export async function upsertBusinessSettings(
  payload: BusinessSettingsPayload
): Promise<BusinessSettingsResponse<BusinessSettings>> {
  try {
    if (!payload.company_name || payload.company_name.trim().length === 0) {
      throw new BusinessSettingsServiceError('Company name is required', 400);
    }

    const upsertPayload = {
      id: payload.id || undefined,
      company_name: payload.company_name.trim(),
      logo_url: sanitize(payload.logo_url ?? null),
      address: sanitize(payload.address ?? null),
      phone: sanitize(payload.phone ?? null),
      email: sanitize(payload.email ?? null),
      website: sanitize(payload.website ?? null),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('business_settings')
      .upsert(upsertPayload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw new BusinessSettingsServiceError(`Failed to save business settings: ${error.message}`);
    }

    return {
      data: data as BusinessSettings,
      error: null,
      success: true,
      statusCode: 200,
    };
  } catch (error) {
    if (error instanceof BusinessSettingsServiceError) {
      return {
        data: null,
        error: error.message,
        success: false,
        statusCode: error.statusCode,
      };
    }

    return {
      data: null,
      error: 'Unexpected error while saving business settings',
      success: false,
      statusCode: 500,
    };
  }
}

