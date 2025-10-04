import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { LinenCategory } from '@/types/database';

// GET /api/categories/[id] - Get a specific linen category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const { data: category, error } = await supabaseAdmin
      .from('linen_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Category not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching category:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch category' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/categories/[id] - Update a specific linen category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Validate input
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Category name must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.price_per_item !== undefined) {
      if (typeof body.price_per_item !== 'number' || body.price_per_item < 0) {
        return NextResponse.json(
          { success: false, error: 'Price per item must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.price_per_item = body.price_per_item;
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'is_active must be a boolean' },
          { status: 400 }
        );
      }
      updateData.is_active = body.is_active;
    }

    // Check if category exists
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('linen_categories')
      .select('id, name')
      .eq('id', id)
      .single() as { data: Pick<LinenCategory, 'id' | 'name'> | null; error: unknown };

    if (checkError) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && existingCategory && updateData.name !== existingCategory.name) {
      const { data: duplicateCategory, error: duplicateError } = await supabaseAdmin
        .from('linen_categories')
        .select('id')
        .eq('name', updateData.name)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        console.error('Error checking duplicate category:', duplicateError);
        return NextResponse.json(
          { success: false, error: 'Failed to check duplicate category' },
          { status: 500 }
        );
      }

      if (duplicateCategory) {
        return NextResponse.json(
          { success: false, error: 'Category with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update category
    const { data: updatedCategory, error } = await (supabaseAdmin as any)
      .from('linen_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update category' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete a specific linen category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const { data: existingCategory, error: checkError } = await supabaseAdmin
      .from('linen_categories')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category is being used in batch_items
    const { data: batchItems, error: batchItemsError } = await supabaseAdmin
      .from('batch_items')
      .select('id')
      .eq('linen_category_id', id)
      .limit(1);

    if (batchItemsError) {
      console.error('Error checking batch items:', batchItemsError);
      return NextResponse.json(
        { success: false, error: 'Failed to check category usage' },
        { status: 500 }
      );
    }

    if (batchItems && batchItems.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete category that is being used in batch items. Consider deactivating it instead.' 
        },
        { status: 409 }
      );
    }

    // Delete category
    const { error } = await supabaseAdmin
      .from('linen_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete category' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}