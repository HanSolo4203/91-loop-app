import { supabaseAdmin } from '@/lib/supabase';

export interface ClientLayoutResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function getClientLinenLayout(
  clientId: string
): Promise<ClientLayoutResponse<string[] | null>> {
  try {
    if (!isValidUuid(clientId)) {
      return {
        data: null,
        error: 'Invalid client ID format',
        success: false,
      };
    }

    const { data, error } = await supabaseAdmin
      .from('client_linen_layouts')
      .select('linen_category_id, sort_order')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true });

    if (error) {
      return {
        data: null,
        error: `Failed to fetch layout: ${error.message}`,
        success: false,
      };
    }

    if (!data || data.length === 0) {
      return {
        data: null,
        error: null,
        success: true,
      };
    }

    return {
      data: data.map((row) => row.linen_category_id),
      error: null,
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      success: false,
    };
  }
}

export async function replaceClientLinenLayout(
  clientId: string,
  categoryIds: string[]
): Promise<ClientLayoutResponse<string[]>> {
  try {
    if (!isValidUuid(clientId)) {
      return {
        data: null,
        error: 'Invalid client ID format',
        success: false,
      };
    }

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return {
        data: null,
        error: 'Layout must include at least one category',
        success: false,
      };
    }

    const uniqueIds: string[] = [];
    const seen = new Set<string>();
    for (const categoryId of categoryIds) {
      if (typeof categoryId !== 'string' || !isValidUuid(categoryId)) {
        return {
          data: null,
          error: 'Invalid linen category ID format',
          success: false,
        };
      }
      if (seen.has(categoryId)) {
        return {
          data: null,
          error: 'Layout category ids must be unique',
          success: false,
        };
      }
      seen.add(categoryId);
      uniqueIds.push(categoryId);
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('client_linen_layouts')
      .select('linen_category_id, sort_order')
      .eq('client_id', clientId);

    if (existingError) {
      return {
        data: null,
        error: `Failed to read current layout: ${existingError.message}`,
        success: false,
      };
    }

    const { error: deleteError } = await supabaseAdmin
      .from('client_linen_layouts')
      .delete()
      .eq('client_id', clientId);

    if (deleteError) {
      return {
        data: null,
        error: `Failed to replace layout: ${deleteError.message}`,
        success: false,
      };
    }

    const rows = uniqueIds.map((linenCategoryId, index) => ({
      client_id: clientId,
      linen_category_id: linenCategoryId,
      sort_order: index,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('client_linen_layouts')
      .insert(rows);

    if (insertError) {
      if (existing && existing.length > 0) {
        await supabaseAdmin.from('client_linen_layouts').insert(
          existing.map((row) => ({
            client_id: clientId,
            linen_category_id: row.linen_category_id,
            sort_order: row.sort_order,
          }))
        );
      }

      return {
        data: null,
        error: `Failed to save layout: ${insertError.message}`,
        success: false,
      };
    }

    return {
      data: uniqueIds,
      error: null,
      success: true,
    };
  } catch (err) {
    return {
      data: null,
      error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      success: false,
    };
  }
}
