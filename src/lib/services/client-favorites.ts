import { supabaseAdmin } from '@/lib/supabase';
import type { ClientFavoriteCategory } from '@/types/database';

export interface ClientFavoriteResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function getClientFavoriteCategoryIds(
  clientId: string
): Promise<ClientFavoriteResponse<string[]>> {
  try {
    if (!isValidUuid(clientId)) {
      return {
        data: null,
        error: 'Invalid client ID format',
        success: false,
      };
    }

    const { data, error } = await supabaseAdmin
      .from('client_favorite_categories')
      .select('linen_category_id')
      .eq('client_id', clientId);

    if (error) {
      return {
        data: null,
        error: `Failed to fetch favorites: ${error.message}`,
        success: false,
      };
    }

    const ids = (data || []).map((row) => row.linen_category_id);

    return {
      data: ids,
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

export async function setClientFavoriteCategory(
  clientId: string,
  linenCategoryId: string,
  favorite: boolean,
  createdBy?: string | null
): Promise<ClientFavoriteResponse<{ favorite: boolean }>> {
  try {
    if (!isValidUuid(clientId)) {
      return {
        data: null,
        error: 'Invalid client ID format',
        success: false,
      };
    }

    if (!isValidUuid(linenCategoryId)) {
      return {
        data: null,
        error: 'Invalid linen category ID format',
        success: false,
      };
    }

    if (favorite) {
      const { error } = await supabaseAdmin
        .from('client_favorite_categories')
        .upsert(
          {
            client_id: clientId,
            linen_category_id: linenCategoryId,
            created_by: createdBy || null,
          } as ClientFavoriteCategory,
          { onConflict: 'client_id,linen_category_id' }
        );

      if (error) {
        return {
          data: null,
          error: `Failed to save favorite: ${error.message}`,
          success: false,
        };
      }
    } else {
      const { error } = await supabaseAdmin
        .from('client_favorite_categories')
        .delete()
        .eq('client_id', clientId)
        .eq('linen_category_id', linenCategoryId);

      if (error) {
        return {
          data: null,
          error: `Failed to remove favorite: ${error.message}`,
          success: false,
        };
      }
    }

    return {
      data: { favorite },
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


